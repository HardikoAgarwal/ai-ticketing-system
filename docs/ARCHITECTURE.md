# Architecture, trade-offs and evolution

**The problem as framed.** A support desk's bottleneck is not the ticket form; it is the time an agent spends working out *what* a request is, *how urgent* it is, *which policy applies*, and writing the same careful reply again. Helpdesk AI is built around one loop: a customer submits a ticket, it is triaged in seconds, an agent opens it to a correct, cited draft, edits and sends, and the customer sees the reply live. Everything else supports that loop.

## Shape of the system
- **SPA** (React, Vite, TypeScript, TanStack Query) talks REST + JWT to Django/DRF and listens on a WebSocket for "ticket X changed" signals.
- **One ASGI container** (Daphne) serves HTTP and WebSockets and hosts an in-process thread pool for background jobs.
- **Postgres** holds domain data, embeddings (JSON) and the durable job table.
- **Object storage** (S3 API) holds attachments; downloads go through an authorised endpoint that returns a short-lived signed URL.
- **LLM** behind the OpenAI SDK, so the provider is an environment variable.

## Multi-tenancy
Every tenant table has a `workspace` FK. `/api/v1/w/<slug>/...` resolves the caller's `Membership` once, in a view mixin; non-members get 404 so slugs are not discoverable. Roles (owner, admin, agent, requester) live on the membership, so one person can be staff in one workspace and a customer in another. Categories, SLA hours, tone, sign-off and the AI toggle are per-workspace data, not code. Ticket numbers (`TKT-0001`) are per workspace, allocated under a row lock.

## What I prioritised
1. **AI the team can trust and control.** Triage uses strict JSON-schema output whose category enum is the workspace's own keys. Agents see confidence and a one-line reason. Staff overrides always win and are counted. Drafts are grounded in retrieved KB chunks and a fact sheet computed in Python, and show their citations.
2. **Graceful degradation as a feature.** A keyword classifier runs at creation, so every ticket has a category, priority and SLA before any LLM call. Failures retry with backoff, then a circuit breaker and hard daily budget caps stop spending. A total AI outage changes one thing: agents see "write manually".
3. **Correct data boundaries.** Requesters get serializers with no triage fields or internal notes; foreign IDs 404; internal notes and staff-only KB articles are excluded from requester surfaces and prompts (tested).
4. **A demo that never looks empty.** Sandboxes are seeded with realistic tickets, conversations, AI results and a month of history, so the product is impressive even when the free AI quota is gone.

## Trade-offs
- **No Redis/Celery.** The job table plus in-process pool is durable (a sweeper re-dispatches leftovers on every health ping and start-up) and lets a serverless database sleep. Cost: single instance, no scheduling. Revisit with more than one instance or sustained throughput.
- **In-memory Channels layer.** Correct for one process; events from job threads hop onto the server loop. Revisit with a Postgres or Redis layer when scaling out.
- **Embeddings as JSON + Python cosine, not pgvector.** A workspace KB is tens to hundreds of chunks, so a scan is microseconds and no extension is needed. Keyword retrieval is the fallback when embeddings are missing or the API fails, so retrieval never hard-fails. Revisit at tens of thousands of chunks.
- **Small, fast model.** Triage and drafting are narrow tasks and the model only phrases facts that Python supplies. Cost is about two chat calls and one embedding per ticket; latency is hidden because the work is asynchronous.
- **Signals, not data, over WebSockets.** One extra fetch per update, but the socket can never bypass the API's permission checks.
- **Deliberately out of scope:** outbound email, SSO, automation rules, multi-language replies.

## Evolution plan
- **Measure AI quality:** build a labelled set from real tickets and run offline evals on every prompt change (`prompt_version` is on every draft and log row); alert on drift in override rate and draft accept rate.
- **Scale knowledge:** pgvector, ingestion from URLs/PDFs, feedback from approved replies into curated examples, a retrieval-quality dashboard.
- **Channels:** outbound email and Slack, real inbound parsing with threading, an embeddable widget.
- **Operations:** a separate autoscaled worker (Celery/RQ) and Redis channel layer, SLA breach escalation, per-tenant LLM budgets with alerts, Sentry and tracing across API, queue and LLM.
- **Safety:** PII redaction before prompts, an audit export of suggestions versus final replies, and a guardrail that blocks a draft quoting a figure not in the fact sheet.
