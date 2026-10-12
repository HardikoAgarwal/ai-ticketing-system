# BookLeaf Author Support Portal: Approach and Trade-offs

**The problem as I framed it.** BookLeaf's bottleneck isn't a missing ticket form; it's the time an agent spends working out *what* a query is, *how urgent* it is, and *what policy applies*, then writing the same careful reply again and again. So I built the system around one flow: an author submits a ticket, it's triaged in seconds, an agent opens it to a correct, on-brand draft, edits and sends, and the author sees the reply live. Everything else supports that loop.

## What I prioritised
1. **AI the team can trust and control.**
   - Classification uses strict JSON-schema output with a priority rubric. The agent sees the confidence and a one-line reason, and any override is recorded so the AI never overwrites a human.
   - Drafts are grounded in two inputs: only the KB sections relevant to the ticket's category, and a fact sheet computed in Python (exact royalty figures, next payout date, whether the amount is below the ₹1,000 threshold, the production stage). The model phrases facts but never derives them, which removes the most damaging failure: a confidently wrong number sent to an author.
2. **Graceful degradation as a feature, not an afterthought.**
   - A keyword classifier runs at creation, so every ticket has a category, priority and SLA deadline before any LLM call.
   - AI runs in Celery with backoff retries and a circuit breaker. A total LLM outage changes one thing: agents see "write manually" instead of a draft.
3. **Correct data boundaries.**
   - Authors get separate serializers that have no triage fields at all, and requests for other users' data return 404.
   - Internal notes are excluded from both the author's API and the AI prompt, and tests enforce this.
4. **Ops ergonomics.** The queue is ordered by priority, then age, with SLA countdowns, and has saved views, keyboard navigation, collision warnings, "send & resolve", and an activity log, because the brief says "most urgent and oldest should be easy to spot".

## Trade-offs I made
- **Category-scoped KB instead of embedding retrieval (RAG).** The KB fits in about 800 tokens, and a deterministic category→sections map is cheaper, debuggable, and impossible to retrieve wrongly. The cost is that a ticket spanning two categories only gets one category's policy. It's the right call at this KB size; see the evolution plan below.
- **A small, fast model over a frontier model.** Both tasks are narrow and templated, and the model only phrases facts that Python computes. The demo runs Gemini 3.1 Flash-Lite on its free tier, so it costs \$0 and reviewers can use it freely. The price is ~6 s latency, which is hidden because AI runs in the background, plus occasional rate limits, which the fallback design absorbs. At paid `gpt-4o-mini` prices it would be ≈ \$0.0004 per ticket. The provider and model are env vars and every call logs its prompt version, so switching is a measured decision rather than a guess.
- **Celery worker inside the web container.** This is purely a free-tier hosting constraint. The code is unchanged if the worker becomes its own service.
- **WebSocket events carry signals, not data.** This costs one extra fetch per update, but the socket can never bypass the API's permission checks.
- **Scope I deliberately left out:** email notifications, author self-service metadata edits, and multi-language replies.

## Evolving this into production
- **Measure AI quality.**
  - Build a labelled set from real tickets and run offline evaluations whenever a prompt changes. `prompt_version` is already on every draft and log row.
  - Track the override rate and the share of drafts sent as-is or edited (already on the Analytics page) as live quality signals, and alert when they drift.
- **Scale knowledge.** Move the KB into the database with an editor for the ops team. Add embedding retrieval (pgvector), with category scoping as a pre-filter. Feed agent-approved replies back in as curated examples.
- **Close the loop with authors.** Add email and WhatsApp notifications on replies, and connect the fact sheet to live royalty, production and distribution systems so drafts can state "your re-sync was triggered at 14:02" instead of "we will trigger".
- **Operations.**
  - Separate, autoscaled workers, and a per-tenant LLM budget with alerts (cost is already logged per call).
  - SLA breach escalation and on-call routing by category, with Sentry and OpenTelemetry tracing across the API → queue → LLM path.
- **Safety.** Run PII redaction before prompts, keep an audit export of all AI suggestions versus final replies, and add a guardrail check that blocks a draft quoting an amount that isn't in the fact sheet.
