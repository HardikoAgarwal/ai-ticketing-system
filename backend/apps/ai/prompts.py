"""Versioned prompt templates.

Static instructions come first in every request so repeated calls share a prefix (eligible for
provider-side prompt caching); ticket-specific data comes last. Workspace specifics (name,
categories, tone, sign-off) are injected, so one prompt set serves every tenant.
"""

PROMPT_VERSION = "2026-11-24.v2"

PRIORITY_RUBRIC = """\
CRITICAL: serious harm needing same-day action: outage or inability to use the product for the whole account, data loss, security or privacy incidents, double charges or large unexpected billing, legal threats.
HIGH: the customer is blocked or something is wrong on our side: broken core feature, wrong/duplicate charge, failed delivery, defective item, SLA-relevant deadline, repeated unanswered follow-ups.
MEDIUM: needs investigation but is not blocking: unexpected behaviour with a workaround, status checks, billing questions, a delay within normal range.
LOW: informational or self-service: how-to questions, feature requests, profile or account updates, general feedback."""

MAX_DESCRIPTION_CHARS = 1500
MAX_MESSAGE_CHARS = 600


def truncate(text: str, limit: int) -> str:
    text = (text or "").strip()
    return text if len(text) <= limit else text[:limit].rstrip() + " [...]"


def classify_schema(category_keys: list[str]) -> dict:
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "ticket_triage",
            "strict": True,
            "schema": {
                "type": "object",
                "properties": {
                    "category": {"type": "string", "enum": category_keys},
                    "priority": {"type": "string", "enum": ["CRITICAL", "HIGH", "MEDIUM", "LOW"]},
                    "sentiment": {"type": "string", "enum": ["NEGATIVE", "NEUTRAL", "POSITIVE"]},
                    "confidence": {"type": "number"},
                    "reasoning": {"type": "string"},
                    "summary": {"type": "string"},
                },
                "required": ["category", "priority", "sentiment", "confidence", "reasoning", "summary"],
                "additionalProperties": False,
            },
        },
    }


def build_classification_messages(workspace, categories, subject: str, description: str, context: str | None) -> list[dict]:
    cats = "\n".join(f"- {c.key}: {c.name}. {c.description}".rstrip() for c in categories)
    system = f"""\
You triage support tickets for {workspace.name}{f" ({workspace.tagline})" if workspace.tagline else ""}.
Classify each ticket into exactly one category and one priority, and read the customer's sentiment.

Categories:
{cats}

Priority rubric:
{PRIORITY_RUBRIC}

Rules:
- Judge by the substance of the problem, using the customer facts when provided.
- Customer frustration can raise priority by at most one level; never lower priority because the customer is polite.
- If a ticket spans categories, choose the one the customer most needs resolved.
- sentiment: the customer's emotional tone (NEGATIVE when angry, upset or escalating).
- reasoning: one short sentence (max 25 words) a support agent can scan.
- summary: one neutral sentence (max 30 words) stating what the customer wants.
- confidence: 0.0-1.0, how sure you are of the category."""
    user = f"Subject: {subject}\nDescription: {truncate(description, MAX_DESCRIPTION_CHARS)}"
    if context:
        user += f"\n\nCustomer facts:\n{context}"
    return [{"role": "system", "content": system}, {"role": "user", "content": user}]


def build_draft_messages(
    *,
    workspace,
    subject: str,
    description: str,
    fact_sheet: str,
    articles: list,
    category_name: str,
    conversation: list[tuple[str, str]],
) -> list[dict]:
    tone = workspace.tone.strip() or "Warm, clear and professional. Plain language, no jargon."
    sign_off = workspace.agent_title
    system = f"""\
You are a senior member of the {workspace.name} support team writing a reply to a customer.

Tone guidelines (follow strictly):
{tone}

Writing rules:
- Start with "Hi <first name>," then acknowledge the specific concern in your own words before any explanation.
- Use ONLY the facts in CUSTOMER FACTS and KNOWLEDGE BASE. Quote exact amounts, dates and statuses from them.
- Never invent order numbers, tracking IDs, payment references, links, or promises. If something must be checked, say the team will verify it and give a timeline only if the knowledge base states one.
- If the knowledge base does not cover the question, say so honestly and explain what happens next instead of guessing.
- If {workspace.name} is at fault, own it plainly. Otherwise stay collaborative and blame-free.
- End with a clear next step.
- 90-200 words, plain text, short paragraphs. No markdown headings or bold. Use a short list only for steps the customer must take.
- Do not mention AI, internal notes, ticket categories, or priorities.
- Sign off exactly as:
Warm regards,
{sign_off}"""
    kb = "\n\n".join(f"[{a.title}]\n{a.text}" for a in articles) or "(no matching articles found)"
    parts = [
        f"KNOWLEDGE BASE:\n{kb}",
        f"CUSTOMER FACTS:\n{fact_sheet}",
        f"TICKET ({category_name}):\nSubject: {subject}\n{truncate(description, MAX_DESCRIPTION_CHARS)}",
    ]
    if conversation:
        thread = "\n".join(f"{who}: {truncate(body, MAX_MESSAGE_CHARS)}" for who, body in conversation)
        parts.append(f"RECENT CONVERSATION (oldest first; reply to the latest customer message):\n{thread}")
    parts.append("Write the reply now.")
    return [{"role": "system", "content": system}, {"role": "user", "content": "\n\n".join(parts)}]
