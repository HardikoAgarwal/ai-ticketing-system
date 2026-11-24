"""Builds a fully populated sandbox workspace from a template.

Everything a visitor sees on first load is pre-baked: realistic customers and tickets, AI triage
and drafts already attached, a month of history for analytics. Live AI is then a bonus on top of
a demo that never looks empty, even when the free-tier AI budget is spent.
"""

import hashlib
import json
import random
from datetime import timedelta
from decimal import Decimal
from pathlib import Path

from django.conf import settings
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import User
from apps.ai.models import AIDraft, AIFeature, AIRequestLog
from apps.ai.prompts import PROMPT_VERSION
from apps.kb.indexing import chunk_hash, reindex_article, split_text
from apps.kb.models import Article
from apps.tickets.models import (
    ActivityAction,
    AIStatus,
    ClassificationSource,
    MessageKind,
    Ticket,
    TicketActivity,
    TicketMessage,
    TicketStatus,
)
from apps.tickets.models import Macro
from apps.workspaces.models import Membership, Record, Role, Workspace
from apps.workspaces.services import create_workspace

from .templates_data import TEMPLATES

DATA_DIR = Path(__file__).parent / "templates_data"
DEMO_EMAIL_DOMAIN = "demo.helpdesk.example"


def text_hash(text: str) -> str:
    return hashlib.sha256(text.encode()).hexdigest()


def ticket_embedding_key(subject: str, description: str) -> str:
    return text_hash(f"{subject}\n{description}"[:2000])


def load_embeddings(template_key: str) -> dict:
    path = DATA_DIR / f"{template_key}.embeddings.json"
    return json.loads(path.read_text()) if path.exists() else {}


def _user(local: str, full_name: str, slug: str) -> User:
    user = User(email=f"{local}.{slug}@{DEMO_EMAIL_DOMAIN}", full_name=full_name, is_demo=True)
    user.set_unusable_password()
    user.save()
    return user


@transaction.atomic
def build_workspace(template_key: str, *, now=None) -> dict:
    spec = TEMPLATES[template_key]
    now = now or timezone.now()
    embeddings = load_embeddings(template_key)
    rng = random.Random(f"{template_key}-{now.timestamp()}")

    ws = create_workspace(
        name=spec["name"],
        categories=spec["categories"],
        template=template_key,
        tagline=spec["tagline"],
        agent_title=spec["agent_title"],
        tone=spec["tone"],
        is_demo=True,
        expires_at=now + timedelta(hours=settings.DEMO_TTL_HOURS),
    )
    cats = {c.key: c for c in ws.categories.all()}

    # --- Team ---------------------------------------------------------------
    visitor = _user("you", spec["visitor_name"], ws.slug)
    Membership.objects.create(workspace=ws, user=visitor, role=Role.OWNER, joined_at=now - timedelta(days=200))
    staff = [visitor]
    for i, (name, role) in enumerate(spec["team"]):
        u = _user(name.split()[0].lower(), name, ws.slug)
        Membership.objects.create(workspace=ws, user=u, role=role, joined_at=now - timedelta(days=150 - i * 20))
        staff.append(u)

    # --- Knowledge base -----------------------------------------------------
    articles = {}
    for a in spec["articles"]:
        art = Article.objects.create(
            workspace=ws, category=cats.get(a.get("category")), title=a["title"], body=a["body"].strip(),
            is_internal=a.get("internal", False),
        )
        vectors = {chunk_hash(art.title, t): embeddings["chunks"][chunk_hash(art.title, t)]
                   for t in split_text(art.body) if chunk_hash(art.title, t) in embeddings.get("chunks", {})}
        reindex_article(art, embeddings=vectors, embed=False)
        articles[a["title"]] = art

    for m in spec.get("macros", []):
        Macro.objects.create(workspace=ws, title=m["title"], body=m["body"].strip())

    # --- Customers + their records -------------------------------------------
    customers = []
    for c in spec["customers"]:
        user = _user(c["email_local"], c["name"], ws.slug)
        Membership.objects.create(
            workspace=ws, user=user, role=Role.REQUESTER, company=c.get("company", ""), profile=c.get("profile", {}),
            joined_at=now - timedelta(days=c.get("days_ago", 120)),
        )
        recs = [
            Record.objects.create(
                workspace=ws, owner=user, kind=r["kind"], reference=r.get("reference", ""), title=r["title"],
                status=r.get("status", ""), data=r.get("data", {}), created_at=now - timedelta(days=r.get("days_ago", 60)),
            )
            for r in c.get("records", [])
        ]
        customers.append((user, recs))

    # --- Featured tickets (hand-written, fully conversational) --------------------
    number = 0
    for t in spec["tickets"]:
        number += 1
        user, recs = customers[t["customer"]]
        _create_ticket(ws, number, user, recs, t, cats, articles, staff, embeddings, now, rng)

    # --- Historical tickets (procedural, for analytics) ---------------------------
    for _ in range(spec.get("history_count", 40)):
        number += 1
        user, recs = rng.choice(customers)
        pool = rng.choice(spec["history_pool"])
        t = {
            "subject": pool["subject"], "description": pool["description"], "category": pool["category"],
            "priority": rng.choices(["CRITICAL", "HIGH", "MEDIUM", "LOW"], [1, 3, 5, 3])[0],
            "status": rng.choices(["CLOSED", "RESOLVED", "IN_PROGRESS"], [7, 2, 1])[0],
            "age_hours": rng.randint(30, 24 * 29), "history": True,
            "reply": pool.get("reply", "Thanks for flagging this. We've sorted it out on our side. Let us know if anything still looks off."),
        }
        _create_ticket(ws, number, user, recs, t, cats, articles, staff, embeddings, now, rng)

    ws.ticket_counter = number
    ws.save(update_fields=["ticket_counter"])
    return {"workspace": ws, "visitor": visitor, "customer": customers[0][0]}


def _create_ticket(ws, number, user, recs, t, cats, articles, staff, embeddings, now, rng):
    created = now - timedelta(hours=t["age_hours"])
    history = t.get("history", False)
    category = cats[t["category"]]
    ai_category = cats[t.get("ai_category", t["category"])]
    overridden = (not history and t.get("overridden", False)) or (history and rng.random() < 0.1)
    if history and overridden:
        ai_category = rng.choice(list(cats.values()))
    status = t["status"]
    record = recs[t["record"]] if t.get("record") is not None and recs else None
    sentiment = t.get("sentiment") or rng.choice(["NEUTRAL", "NEUTRAL", "NEGATIVE", "POSITIVE"])

    ticket = Ticket(
        workspace=ws, number=number, requester=user, record=record, subject=t["subject"], description=t["description"],
        status=status, category=category, ai_category=ai_category, ai_priority=t.get("ai_priority", t["priority"]),
        ai_confidence=round(t.get("confidence", rng.uniform(0.72, 0.97)), 2),
        ai_reasoning=t.get("reasoning", f"Matches {ai_category.name.lower()} signals and urgency cues in the message."),
        ai_summary=t.get("summary", t["subject"]), sentiment=sentiment,
        category_source=ClassificationSource.STAFF if overridden else ClassificationSource.AI,
        priority_source=ClassificationSource.AI, ai_status=AIStatus.COMPLETED, ai_draft_status=AIStatus.COMPLETED,
        created_at=created, last_requester_activity_at=created, requester_last_seen_at=created,
        embedding=embeddings.get("tickets", {}).get(ticket_embedding_key(t["subject"], t["description"])),
    )
    ticket.set_priority(t["priority"])
    ticket.save()
    TicketActivity.objects.create(ticket=ticket, actor=user, action=ActivityAction.CREATED, created_at=created)
    TicketActivity.objects.create(
        ticket=ticket, action=ActivityAction.AI_CLASSIFIED, created_at=created + timedelta(seconds=9),
        to_value=f"{ai_category.name} / {t.get('ai_priority', t['priority']).title()}",
    )
    TicketMessage.objects.create(ticket=ticket, sender=user, kind=MessageKind.REPLY, body=t["description"], created_at=created)

    agent = staff[0] if t.get("mine") else rng.choice(staff[1:] or staff)
    if status != TicketStatus.OPEN or t.get("conversation"):
        ticket.assigned_to = agent
    last = created
    for i, turn in enumerate(t.get("conversation", [])):
        when = created + timedelta(minutes=turn["after_min"])
        last = when
        from_customer = turn["from"] == "customer"
        kind = MessageKind.NOTE if turn["from"] == "note" else MessageKind.REPLY
        sender = user if from_customer else agent
        TicketMessage.objects.create(ticket=ticket, sender=sender, kind=kind, body=turn["body"], created_at=when)
        if from_customer:
            ticket.last_requester_activity_at = when
            TicketActivity.objects.create(ticket=ticket, actor=user, action=ActivityAction.REQUESTER_REPLIED, created_at=when)
        elif kind == MessageKind.NOTE:
            TicketActivity.objects.create(ticket=ticket, actor=agent, action=ActivityAction.NOTE_ADDED, created_at=when)
        else:
            ticket.first_response_at = ticket.first_response_at or when
            ticket.last_staff_reply_at = when
            ticket.staff_last_seen_at = when
            TicketActivity.objects.create(ticket=ticket, actor=agent, action=ActivityAction.REPLIED, created_at=when)

    if history:
        resp_min = rng.randint(8, int(ws.sla_for(t["priority"]).total_seconds() / 60 * 1.15))
        when = created + timedelta(minutes=resp_min)
        TicketMessage.objects.create(ticket=ticket, sender=agent, kind=MessageKind.REPLY, body=t["reply"], created_at=when)
        ticket.assigned_to = agent
        ticket.first_response_at = when
        ticket.last_staff_reply_at = when
        ticket.staff_last_seen_at = when
        ticket.requester_last_seen_at = when  # history is already read; only featured tickets show unread
        last = when
        TicketActivity.objects.create(ticket=ticket, actor=agent, action=ActivityAction.REPLIED, created_at=when)
        _log_ai(ws, ticket, created, rng)
        if rng.random() < 0.55:
            TicketMessage.objects.filter(ticket=ticket, sender=agent).update(ai_draft_edited=rng.random() < 0.6)

    if status in (TicketStatus.RESOLVED, TicketStatus.CLOSED):
        when = last + timedelta(minutes=rng.randint(20, 600))
        ticket.resolved_at = when
        TicketActivity.objects.create(ticket=ticket, actor=agent, action=ActivityAction.STATUS_CHANGED, from_value="In Progress",
                                      to_value="Resolved", created_at=when)
        if status == TicketStatus.CLOSED:
            ticket.closed_at = when + timedelta(hours=rng.randint(1, 30))
        if history and rng.random() < 0.6:
            ticket.csat_score = rng.choices([5, 4, 3, 2, 1], [8, 5, 2, 1, 1])[0]
    elif status == TicketStatus.IN_PROGRESS and not ticket.first_response_at and not t.get("conversation"):
        ticket.status = TicketStatus.OPEN
    ticket.save()

    if not history and t.get("draft"):
        cites = [{"article_id": articles[title].id, "title": title, "score": round(rng.uniform(0.74, 0.91), 3)}
                 for title in t.get("citations", [])]
        AIDraft.objects.create(
            ticket=ticket, content=t["draft"].strip(), model=settings.AI_MODEL, prompt_version=PROMPT_VERSION,
            citations=cites, input_hash="seed-" + text_hash(t["subject"])[:16],
        )
        _log_ai(ws, ticket, created, rng)


def _log_ai(ws, ticket, created, rng):
    """Plausible usage rows so the analytics page has history. Marked implicitly by the demo workspace."""
    for feature, p_in, p_out, ms in ((AIFeature.CLASSIFY, 575, 70, 1900), (AIFeature.DRAFT, 880, 235, 4200)):
        AIRequestLog.objects.create(
            workspace=ws, ticket=ticket, feature=feature, model=settings.AI_MODEL, prompt_version=PROMPT_VERSION,
            prompt_tokens=int(p_in * rng.uniform(0.85, 1.2)), completion_tokens=int(p_out * rng.uniform(0.8, 1.3)),
            cost_usd=Decimal("0"), latency_ms=int(ms * rng.uniform(0.7, 1.5)), success=rng.random() > 0.03,
            created_at=created + timedelta(seconds=rng.randint(4, 40)),
        )
