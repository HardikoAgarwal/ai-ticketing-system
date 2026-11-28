"""Measure triage quality against hand-labelled tickets.

    python manage.py eval_triage                  # every template, one run
    python manage.py eval_triage --templates saas --runs 3
    python manage.py eval_triage --out /tmp/triage-v4.json

It builds each demo workspace inside a transaction that is rolled back, so nothing is saved and the
daily AI budget is not spent. It scores the live model and, for comparison, the rule-based fallback.
Needs a real AI key. Free-tier models are rate limited, so calls are paced (`--pace`).
"""

import json
import statistics
import time
from collections import Counter

from django.core.management.base import BaseCommand
from django.db import transaction
from django.test import override_settings

from apps.ai import client, fallback
from apps.ai.classifier import classify_ticket
from apps.ai.eval_cases import CASES
from apps.ai.models import AIFeature, AIRequestLog
from apps.ai.prompts import PROMPT_VERSION
from apps.demo.seed import TEMPLATES, build_workspace
from apps.tickets.models import PRIORITY_RANK, Ticket


class _Rollback(Exception):
    pass


def _rank(priority: str) -> int:
    return PRIORITY_RANK[priority]


class Command(BaseCommand):
    help = "Score AI triage (category, priority, sentiment, confidence) against labelled tickets."

    def add_arguments(self, parser):
        parser.add_argument("--templates", nargs="*", default=list(CASES), help="saas helpdesk ecommerce")
        parser.add_argument("--runs", type=int, default=1, help="Repeat each ticket to measure consistency")
        parser.add_argument("--pace", type=float, default=4.0, help="Seconds between calls (free-tier rate limit)")
        parser.add_argument("--no-seeded", action="store_true", help="Skip the featured demo tickets")
        parser.add_argument("--out", help="Write every result to this JSON file")
        parser.add_argument("--quiet", action="store_true", help="Only the summary")

    def handle(self, *args, **opts):
        if not client.settings.AI_ENABLED:
            self.stderr.write("AI is disabled: set OPENAI_API_KEY first.")
            return
        rows = []
        with override_settings(AI_DAILY_CALL_CAP=10**9, AI_WORKSPACE_DAILY_CAP=10**9):
            for key in opts["templates"]:
                try:
                    with transaction.atomic():
                        rows += self._run_template(key, opts)
                        raise _Rollback
                except _Rollback:
                    pass
        self._report(rows, opts)
        if opts["out"]:
            with open(opts["out"], "w") as fh:
                json.dump({"prompt_version": PROMPT_VERSION, "model": client.settings.AI_MODEL, "rows": rows}, fh, indent=1)
            self.stdout.write(f"\nWrote {opts['out']}")

    # --- running ---------------------------------------------------------------------

    def _run_template(self, key, opts):
        built = build_workspace(key)
        ws = built["workspace"]
        spec = TEMPLATES[key]
        items = []
        if not opts["no_seeded"]:
            tickets = {t.number: t for t in Ticket.objects.filter(workspace=ws).select_related("record", "requester", "workspace")}
            for i, t in enumerate(spec["tickets"], start=1):
                items.append((tickets[i], {"category": t["category"], "priority": t["priority"], "sentiment": t.get("sentiment", ""), "also": (), "tag": "seeded"}))
        for c in CASES.get(key, []):
            items.append((Ticket(workspace=ws, subject=c["subject"], description=c["description"]), c))

        rows = []
        for ticket, gold in items:
            for run in range(opts["runs"]):
                rows.append(self._one(key, ws, ticket, gold, run, opts))
        return rows

    def _one(self, key, ws, ticket, gold, run, opts):
        guess = fallback.classify(ws, ticket.subject, ticket.description)
        row = {
            "template": key, "subject": ticket.subject, "tag": gold["tag"], "run": run,
            "gold": {"category": gold["category"], "priority": gold["priority"], "sentiment": gold["sentiment"], "also": list(gold["also"])},
            "rules": {"category": guess.category.key if guess.category else None, "priority": guess.priority.value},
            "ai": None, "error": None,
        }
        for attempt in range(5):
            started = time.monotonic()
            try:
                time.sleep(opts["pace"])
                res = classify_ticket(ticket)
            except client.AIUnavailableError as exc:
                row["error"] = str(exc)[:120]
                time.sleep(12 * (attempt + 1))
                client.circuit_breaker.record_success()  # a rate limit is not an outage
                continue
            except client.AIError as exc:
                row["error"] = str(exc)[:160]
                break
            log = AIRequestLog.objects.filter(feature=AIFeature.CLASSIFY).order_by("-id").first()
            row["error"] = None
            row["ai"] = {
                "category": res.category_key, "priority": res.priority, "sentiment": res.sentiment, "confidence": res.confidence,
                "reasoning": res.reasoning, "summary": res.summary, "latency_ms": int((time.monotonic() - started) * 1000 - opts["pace"] * 1000),
                "tokens_in": log.prompt_tokens if log else 0, "tokens_out": log.completion_tokens if log else 0,
            }
            break
        if not opts["quiet"]:
            self.stdout.write(self._line(row))
        return row

    # --- reporting -------------------------------------------------------------------

    @staticmethod
    def _cat_ok(row, who):
        pred = row[who]["category"] if row[who] else None
        return pred == row["gold"]["category"] or pred in row["gold"]["also"]

    @staticmethod
    def _gap(row, who):
        pred = row[who]["priority"]
        return _rank(pred) - _rank(row["gold"]["priority"])  # negative = more urgent than the label

    def _line(self, row):
        ai = row["ai"]
        if not ai:
            return f"  ERR  {row['subject'][:40]:40}  {row['error']}"
        cat = "ok " if self._cat_ok(row, "ai") else "CAT"
        gap = self._gap(row, "ai")
        pri = "ok " if gap == 0 else ("UP " if gap < 0 else "DWN")
        sent = "ok " if not row["gold"]["sentiment"] or row["tag"] == "seeded" or ai["sentiment"] == row["gold"]["sentiment"] else "SNT"
        return (f"  {cat} {pri} {sent}  {row['subject'][:34]:34} gold {row['gold']['category']}/{row['gold']['priority']:8}"
                f" ai {ai['category']}/{ai['priority']:8} conf {ai['confidence']:.2f}")

    def _report(self, rows, opts):
        scored = [r for r in rows if r["ai"]]
        failed = len(rows) - len(scored)
        n = len(scored)
        if not n:
            self.stdout.write("No tickets were scored.")
            return
        out = self.stdout.write
        out(f"\n=== {client.settings.AI_MODEL}  prompt {PROMPT_VERSION}  ({n} scored, {failed} failed) ===")

        def pct(k, total=None):
            return f"{100 * k / (total or n):5.1f}%"

        for who, label in (("ai", "AI   "), ("rules", "Rules")):
            sub = [r for r in rows if r[who]]
            cat = sum(self._cat_ok(r, who) for r in sub)
            exact = sum(self._gap(r, who) == 0 for r in sub)
            within = sum(abs(self._gap(r, who)) <= 1 for r in sub)
            out(f"{label} category {pct(cat, len(sub))}   priority exact {pct(exact, len(sub))}   within one level {pct(within, len(sub))}")

        crit = [r for r in scored if r["gold"]["priority"] == "CRITICAL"]
        if crit:
            caught = sum(r["ai"]["priority"] == "CRITICAL" for r in crit)
            near = sum(r["ai"]["priority"] in ("CRITICAL", "HIGH") for r in crit)
            rules_caught = sum(r["rules"]["priority"] == "CRITICAL" for r in crit)
            out(f"Critical tickets caught: AI {caught}/{len(crit)} (as critical or high {near}/{len(crit)}); rules {rules_caught}/{len(crit)}")
        over = [r for r in scored if self._gap(r, "ai") <= -2]
        under = [r for r in scored if self._gap(r, "ai") >= 2]
        out(f"Badly over-escalated (2+ levels): {len(over)}   badly under-escalated (2+ levels): {len(under)}")
        sent = [r for r in scored if r["gold"]["sentiment"] and r["tag"] != "seeded"]  # seeded labels are demo decoration
        out(f"Sentiment {pct(sum(r['ai']['sentiment'] == r['gold']['sentiment'] for r in sent), len(sent))}")

        def fully_right(r):
            return self._cat_ok(r, "ai") and self._gap(r, "ai") == 0

        right = [r["ai"]["confidence"] for r in scored if fully_right(r)]
        wrong = [r["ai"]["confidence"] for r in scored if not fully_right(r)]
        if right and wrong:
            out(f"Confidence when category and priority both right: {statistics.mean(right):.2f}   when either is off: {statistics.mean(wrong):.2f}")
            low = [r for r in scored if r["ai"]["confidence"] < 0.9]
            flagged_wrong = sum(not fully_right(r) for r in low)
            caught = flagged_wrong / len(wrong)
            out(f"Flagged for review (confidence under 0.9): {len(low)} tickets, {flagged_wrong} of the {len(wrong)} misses ({100 * caught:.0f}%); {len(low) - flagged_wrong} were actually right")
        lat = sorted(r["ai"]["latency_ms"] for r in scored)
        out(f"Latency median {statistics.median(lat)} ms   p95 {lat[int(0.95 * (len(lat) - 1))]} ms   "
            f"tokens per call: {statistics.mean(r['ai']['tokens_in'] for r in scored):.0f} in / {statistics.mean(r['ai']['tokens_out'] for r in scored):.0f} out")

        if opts["runs"] > 1:
            groups = {}
            for r in scored:
                groups.setdefault((r["template"], r["subject"]), []).append(r["ai"])
            flips = sum(1 for g in groups.values() if len({(a["category"], a["priority"]) for a in g}) > 1)
            out(f"Unstable across runs: {flips}/{len(groups)} tickets gave different category or priority")

        by_tag = {}
        for r in scored:
            by_tag.setdefault(r["tag"] or "plain", []).append(r)
        out("\nBy kind of ticket (category / priority within one level):")
        for tag, group in sorted(by_tag.items(), key=lambda kv: -len(kv[1])):
            c = sum(self._cat_ok(r, "ai") for r in group)
            p = sum(abs(self._gap(r, "ai")) <= 1 for r in group)
            out(f"  {tag:20} {len(group):3}   {c}/{len(group)}   {p}/{len(group)}")

        misses = [r for r in scored if not self._cat_ok(r, "ai") or abs(self._gap(r, "ai")) >= 1]
        if misses:
            out("\nTickets where the AI differs from the label:")
            for r in misses:
                ai = r["ai"]
                out(f"  [{r['template']}] {r['subject'][:44]}  ({r['tag'] or 'plain'})")
                out(f"      label {r['gold']['category']}/{r['gold']['priority']}   AI {ai['category']}/{ai['priority']}   rules {r['rules']['category']}/{r['rules']['priority']}")
                out(f"      AI said: {ai['reasoning']}")
        errs = Counter(r["error"] for r in rows if r["error"] and not r["ai"])
        if errs:
            out("\nFailures:")
            for e, k in errs.items():
                out(f"  {k}x {e}")
