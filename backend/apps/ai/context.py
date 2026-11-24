"""Builds the compact, deterministic fact sheet the LLM is allowed to quote.

The model phrases facts; Python supplies them. Numbers, dates and statuses come from the
requester's profile and the ticket's linked record, never from the model's imagination.
"""

from datetime import date, datetime

from apps.workspaces.models import Membership

MAX_ITEMS = 5


def format_value(value) -> str:
    if isinstance(value, bool):
        return "yes" if value else "no"
    if isinstance(value, (list, tuple)):
        return ", ".join(format_value(v) for v in value) or "none"
    if isinstance(value, dict):
        return "; ".join(f"{k}: {format_value(v)}" for k, v in value.items())
    if value in (None, ""):
        return "n/a"
    return str(value)


def format_date(value: date | datetime | None) -> str:
    return value.strftime("%d %b %Y") if value else "not yet"


def label(key: str) -> str:
    return key.replace("_", " ").strip().capitalize()


def record_lines(record) -> list[str]:
    lines = [f'{record.kind}: "{record.title}"' + (f" ({record.reference})" if record.reference else "")]
    if record.status:
        lines.append(f"Status: {record.status}")
    lines.extend(f"{label(k)}: {format_value(v)}" for k, v in (record.data or {}).items())
    return lines


def build_fact_sheet(ticket, today: date | None = None) -> str:
    today = today or date.today()
    requester = ticket.requester
    membership = Membership.objects.filter(workspace_id=ticket.workspace_id, user=requester).first()
    lines = [f"Today's date: {format_date(today)}", f"Customer first name: {requester.first_name_display}"]
    if membership:
        if membership.company:
            lines.append(f"Company: {membership.company}")
        lines.extend(f"{label(k)}: {format_value(v)}" for k, v in (membership.profile or {}).items())
        lines.append(f"Customer since: {format_date(membership.joined_at)}")

    if ticket.record:
        lines.extend(record_lines(ticket.record))
    else:
        records = list(requester.records.filter(workspace_id=ticket.workspace_id)[:MAX_ITEMS])
        if records:
            lines.append("Question is account-level (no specific item selected). Customer's items:")
            lines.extend(f"- {r.kind}: {r.title}" + (f" [{r.status}]" if r.status else "") for r in records)
    return "\n".join(lines)
