# Changelog

## Unreleased: Helpdesk AI rewrite (from the BookLeaf author portal)
### Changed
- Dashboard rebuilt as "Paper & Aurora" (see `docs/DESIGN.md`): warm paper theme with a designed dark mode, icon dock and Cmd-K command palette, split-view inbox with keyboard shortcuts, tabbed ticket workspace with full state handling, and a shared aurora glow reserved for AI features. Login, signup, invite, sandbox setup, knowledge base, settings, analytics and the customer portal were redesigned on the same design system (`components/ds`).
- Domain generalised from a publishing-specific author portal to a multi-workspace helpdesk: authors, books and royalties became requesters, generic records and configurable categories.
- Infrastructure simplified for permanent free hosting: Celery and Redis replaced by a Postgres-backed job table with an in-process pool; Channels uses the in-memory layer; cache is local memory. Render's Postgres/Redis blocks removed (`render.yaml` expects a Neon `DATABASE_URL`).
- AI pipeline now triages (category, priority, sentiment, summary), embeds tickets, and drafts from retrieved knowledge-base chunks with citations instead of a fixed YAML knowledge base.

### Added
- Workspaces with owner/admin/agent/requester roles, signup, invites, per-workspace categories, SLA hours, tone and AI toggle; non-members get 404.
- Knowledge-base articles with chunking, embeddings (keyword fallback), staff-only articles, a search endpoint, and requester self-service suggestions.
- Duplicate detection, sentiment, summaries, CSAT, macros, per-workspace analytics including AI override rate, cost and draft accept/edit rate.
- Free-tier AI budget caps (global and per workspace) and a live usage endpoint.
- Demo sandbox: one click creates an isolated, pre-filled workspace (SaaS, IT helpdesk, e-commerce templates) that expires after 24 hours; `build_demo_embeddings` and `purge_demos` commands.
- Inbound email webhook (`POST /api/v1/inbound/email/`, shared secret).
- Dockerfile, docker-compose, GitHub Actions CI and keep-alive workflow, regenerated OpenAPI schema, new README and architecture write-up.

### Removed
- Celery, Redis, channels-redis, the BookLeaf catalog app, royalty logic and sample data, `kb.yaml`.
