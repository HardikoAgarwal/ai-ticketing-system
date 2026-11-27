# Dashboard design spec ("Paper & Aurora")

Single source of truth for the dashboard rebuild. Everything under `frontend/src` except `components/landing` and `pages/LandingPage.tsx` is in scope: login, signup, invite, demo boot / workspace setup, agent app, customer portal.

## 1. Idea

A calm, warm paper workspace where **AI is the only thing that glows**. The canvas is the landing page's cream paper, text is its deep ink, state colours are its pastels. Anything produced or influenced by AI (triage, drafts, summaries, similar tickets, confidence, insights) wears one shared aurora treatment, so a user learns in a minute: *glow = AI*.

Not a classic admin: no wide left sidebar of text links, no stack of white cards. The product is an **inbox workspace**: a slim dock, a command bar, and a split view (list left, ticket right) that never loses your place.

## 2. Tokens (light is the primary theme; dark is a full second theme)

Defined once in `index.css` as CSS variables, exposed to Tailwind. Never hard-code hex in components.

Light:
- canvas `#f8f6f1` (page, warm white), surface `#ffffff` (panels), surface-2 `#f6f3ec` (inset/hover), sunken `#eeeae0`
- line `#e7e2d6`, line-strong `#d2cbba`
- ink `#0b0a1d` (text), ink-2 `#3d3b57` (secondary, AA on surface), ink-3 `#6b6985` (tertiary, AA for large/UI only)
- brand violet `#5b3df5` (focus, links, selection, primary accent), violet-soft `#ece8ff`
- primary button: ink background, paper text. Secondary: surface + line. Accent button (rare): violet.
- state pastels (bg / border / fg), from the landing page: lav, mint, peach, butter, rose, sky — each with a deep foreground meeting 4.5:1 on its bg. Semantic mapping: success=mint, warning=butter, danger=rose (+coral fg), info=sky, neutral=sunken, ai=lav.
- aurora: `#7c5cff → #22d3ee → #ff7ab8` (violet → cyan → pink), plus `--aurora-glow: 0 0 0 1px rgb(124 92 255 / .25), 0 8px 32px -8px rgb(124 92 255 / .35)`.

Dark: canvas `#0e0d1a`, surface `#161426`, surface-2 `#1d1a31`, line `#2b2745`, ink `#f4efe6`; same hues re-tuned (pastel bgs become 12-16% alpha tints); aurora is brighter and its glow stronger.

Shape: panels 14px, controls 10px, chips 8px, avatars 10px squircle (users) / round only for presence dots. Shadows are low and warm (`0 1px 0 line, 0 8px 24px -16px rgb(40 30 110 / .25)`). Borders are 1px `line`.

Type: Geist (already installed). 12/13/14/16/20/28/40. Numbers `tabular-nums`. Headings tight tracking. Minimum text 12px, body 14px.

Motion: 120-200ms ease-out, springs only for the dock/panels. Everything animated respects `prefers-reduced-motion` (swap to opacity/instant). Aurora border animates slowly (12s rotate) and only while the AI is *working*; at rest it is a static gradient.

## 3. Shared primitives (`frontend/src/components/ds/`)

- `AiSurface` – wrapper with 1px aurora gradient border (mask technique) + soft glow; props: `working` (animates + shimmer), `tone="quiet|bold"`, `as`. Used by AI triage card, draft box, similar-ticket insight, KB playground, analytics insight.
- `AiChip`, `AiSpark` (icon), `AiBadgeInline` – small glowing chip: "AI · 95%" etc.
- `Chip` (tone, icon, size) – tinted bg, 1px tinted border, icon, semibold; the only badge look in the app. Status/priority/sla chips are derived from it and always pair **icon + text** (never colour alone).
- `Panel`, `PanelHeader`, `Section`, `KeyValue`, `Stat`, `EmptyState`, `ErrorState`, `Skeleton`, `Kbd`, `Avatar` (deterministic pastel from name), `SegmentedControl`, `Tabs` (accessible, roving tabindex), `IconButton` (36px min, tooltip + aria-label), `Toast` styling, `ProgressRing/Bar`.
- `CommandPalette` (Cmd/Ctrl-K): jump to ticket by id/subject, go to page, run actions on the open ticket (assign to me, resolve, reply, internal note, regenerate draft), switch theme, switch demo role. Built on the existing dialog; fully keyboard + screen-reader operable.
- `ShortcutsHelp` (`?`).

## 4. Shell and layout (agent app)

- **Dock** (64px, left, surface, line on the right): logo mark, icon nav (Inbox, Analytics, Knowledge, Settings) with tooltips + badge counts, bottom: theme, notifications, user menu. Expands to a 232px labelled rail on hover/focus-within or pin (persisted). Mobile: bottom tab bar.
- **Command bar** (top of the content, centred, 560px): search/Cmd-K trigger, shows workspace name, realtime status dot, demo pill. Not a traditional breadcrumb header.
- **Inbox workspace** (`/w/:slug/agent` and `/agent/tickets/:id`): resizable-width list pane (default 400px) + detail pane. Selecting a ticket updates the URL and the right pane without remounting the list or losing scroll/filters. Focus mode (`F`) hides the list. Under 1100px the panes stack: list → ticket with a back button.
- Other pages (Analytics, Knowledge, Settings) are full-width inside the shell with a page title row, no card boxes around every setting.
- Skip link, landmarks (`nav`, `main`, `complementary`), `aria-live=polite` region for realtime events.

## 5. Ticket detail (the centrepiece)

Full-width page (`features/ticket`), top to bottom:
1. **Header** (`TicketHeader`): the ticket's card from the list, opened up. Main part: first row = back, previous / next, state badges, fold, side panel toggle, overflow menu, Take / Resolve; then the subject; then the editable facts as coloured selects (status, priority, category, owner) beside the first-response clock (chip + share of the window used). Stub (dashed perforation with notches, tinted by priority): reference, barcode, and the customer as a button. Folds to one short row (`d`); starts folded when the screen is under 800px tall; under 1180px it is always the short row with badges.
2. **AI row** (`TriageStrip`, `AiSurface`), tucked under the header: boxes for the next step, the AI summary ("Why?" opens the reasoning) and the AI's read (category, priority, mood, confidence), plus Re-run. A value the agent replaced becomes a "Use ..." button. States: reading (working), done, low confidence, AI unavailable / budget used up / off (keyword fallback text). Under 1180px it closes to the next step with a button to open the rest.
3. **Conversation** (`Thread` + `Composer`): the main card, takes all remaining height. Thread with date dividers, customer bubbles (surface), agent (violet-soft), internal notes (butter, lock), state changes inline (assignment, status, AI triaged), attachments, "new messages" jump pill. Composer docked at the bottom: AI draft bar, the text, one bar with Reply | Internal note, macros and send (Cmd-Enter); failed send keeps the text and offers Retry; read-only and closed states.
4. **Side panel** (`SidePanel`, 340px, >= 1180px, scrolls on its own, `i` hides it): tabs with counts for Timeline (figures, rating, what the ticket is waiting on, every step newest first), Similar tickets and Notes. Under 1180px it is a drawer that also lists the customer and the editable facts.
5. **Customer dialog** (`CustomerDialog`, `c`): name, company, email, tickets / records / customer since, account facts, and the record linked to the ticket ("Used by AI").

States to design and implement for every element on this page: loading skeleton, empty, error + retry, optimistic update, rolled-back update, realtime update arriving (subtle highlight + live-region announcement), stale data banner when the socket is down, permission-limited (read only), resolved/closed, reassigned to someone else while viewing, AI working / done / failed / fallback / budget-limited, long unbroken text, many messages, many attachments, narrow viewport.

## 6. Inbox (queue)

- Toolbar: search, a segmented **view** control (Needs attention / Mine / Unassigned / All), one Filters popover (status, priority, category, SLA, owner) with applied filters as removable chips, sort.
- Rows (compact density option): avatar, subject, one-line AI summary (with spark) or preview, chips: SLA/attention, priority; secondary meta in muted text; unread dot; selected row has violet-soft bg + ring (never a left stripe).
- Grouping headers by urgency with counts; keyboard: J/K move, Enter open, E resolve, A assign to me; bulk select with checkboxes (assign, resolve).
- No ticket selected: right pane shows the "overview" empty state with queue health numbers (open, overdue, unassigned, AI handled today) – this replaces the KPI row.

## 7. Other pages

- **Knowledge**: article list + preview/editor split; AI-search readiness shown with `AiChip`; "test what the AI would read" playground in `AiSurface`.
- **Settings**: left sub-nav, right content as plain rows with dividers (label + help left, control right), sticky save bar, AI section highlighted with aurora hairline.
- **Analytics**: big numbers, clean charts using the pastel palette; AI insights block in `AiSurface`.
- **Customer portal**: same tokens, simpler shell (top bar, no dock); request list, new request (with AI duplicate/answer suggestions in `AiSurface`), ticket view.
- **Auth** (login, signup, invite) and **environment setup** (demo boot): split layout; one side the form on paper canvas, the other a deep-ink/violet panel echoing the landing hero with the aurora; the setup screen is a staged, animated checklist (create workspace → seed tickets → index KB → warm AI → open) with real-completion gating, error and retry states, and reduced-motion variant.
- Notifications popover, user menu, toasts, dialogs, confirm dialogs, dropdowns: restyled via the primitives.

## 8. Accessibility checklist (blocking)

WCAG 2.2 AA contrast for text and UI; every interactive element reachable by keyboard with a visible 2px violet focus ring (offset 2px); focus is moved sensibly after open/close of dialogs and after resolve/assign; roles/labels on icon-only buttons; chips carry text, never colour alone; status changes announced via live region; targets ≥ 36px (44px on touch); reduced motion honoured; works zoomed to 200% and at 320px; forms have labels, error text tied by `aria-describedby`; no information only in hover.

## 9. Code hygiene

- Delete dead components and duplicate badge/pill implementations; one `Chip`, one `Avatar`, one status mapping in `lib/ticket-ui.ts`.
- No inline hex colours; no `rounded-full` except avatars/dots; no left-border highlights; no per-page re-implementations of cards.
- Files under ~250 lines; split by feature folders: `features/inbox`, `features/ticket`, `features/kb`, `features/settings`, `features/analytics`, `features/auth`, `features/portal`, with shared stuff in `components/ds`.
- All data hooks remain in `lib/endpoints.ts`/`api.ts` (do not change the API contract); realtime provider unchanged unless needed.
