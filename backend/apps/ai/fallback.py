"""Rule-based triage used instantly at ticket creation and whenever the LLM is unavailable.

It guarantees every ticket has a sensible category and priority even with no AI at all; the LLM
result (when it arrives) refines it. Categories and their keywords are per workspace; the urgency
patterns are generic.
"""

import re
from dataclasses import dataclass

from apps.tickets.models import TicketPriority
from apps.workspaces.models import Category, Workspace

# Urgency patterns generic enough for any support desk.
CRITICAL_PATTERNS = (
    r"\b(outage|down for|completely down|can'?t (log ?in|access)|locked out|data loss|lost (all|my) data)\b",
    r"\b(security|breach|hacked|unauthori[sz]ed|fraud|scam|legal|lawyer|chargeback)\b",
    r"\b(charged|billed)\s+(twice|double|again)\b",
)
HIGH_PATTERNS = (
    r"\b(urgent|asap|immediately|blocking|blocked|production|broken|crash\w*|not working|stopped working)\b",
    r"\b(wrong|incorrect|duplicate|error|failed|failing|missing|not received|never received|overdue|damaged|defective)\b",
    r"\b(refund|cancel\w*)\b.*\b(still|again|weeks?|months?)\b",
)
LOW_PATTERNS = (
    r"^\s*(can|could|how|is it possible|may) i\b",
    r"\b(how (do|to)|where (do|can) i|feature request|suggestion|feedback|just (wanted|curious)|quick question)\b",
)


def _score(text: str, keywords: dict[str, int]) -> int:
    return sum(int(weight) for kw, weight in keywords.items() if re.search(r"(?<!\w)" + re.escape(kw.lower()), text))


@dataclass(frozen=True)
class FallbackResult:
    category: Category | None
    priority: str
    reasoning: str


def classify(workspace: Workspace, subject: str, description: str) -> FallbackResult:
    text = f"{subject}\n{description}".lower()
    categories = list(workspace.categories.all())

    category, best = None, 0
    for cat in categories:
        score = _score(text, cat.keywords or {})
        if score > best:
            category, best = cat, score
    if category is None:
        category = next((c for c in categories if c.is_default), categories[0] if categories else None)

    if any(re.search(p, text, re.S) for p in CRITICAL_PATTERNS):
        priority = TicketPriority.CRITICAL
    elif any(re.search(p, text) for p in HIGH_PATTERNS):
        priority = TicketPriority.HIGH
    elif any(re.search(p, text) for p in LOW_PATTERNS):
        priority = TicketPriority.LOW
    else:
        priority = TicketPriority.MEDIUM

    return FallbackResult(
        category=category,
        priority=priority,
        reasoning="Estimated by keyword rules while AI triage is pending or unavailable.",
    )
