# Helpdesk AI: frontend

React 19 + Vite + TypeScript + Tailwind v4 + shadcn/ui + TanStack Query.

## Routes

| Path | Who | What |
|---|---|---|
| `/` | public | Landing page, demo launcher, request-a-workspace form (`/#request`; `/signup` redirects there) |
| `/login`, `/invite/:token` | public | Sign in and accept an invite (shared by agents and customers) |
| `/w/:slug/agent` | staff (owner/admin/agent) | Queue, ticket workspace, analytics, knowledge base, settings |
| `/w/:slug/help` | customers (requesters) | My tickets, new request with live KB suggestions, ticket thread, CSAT |

A role-based guard sends each user to the right area of `/w/:slug`; non-members never see a workspace.

## Demo sessions

`POST /demo/start` returns tokens for an agent and a customer in a fresh sandbox workspace. Both sessions are kept in
`localStorage` (`helpdesk.sessions.v1`), so the top bar can flip between "Agent view" and "Customer view" without logging in.
Expired demo workspaces (HTTP 410 `workspace_expired`) send the visitor back to the landing page.

## Develop

```bash
cp .env.example .env.local   # point VITE_API_URL at the API
npm install
npm run dev                  # http://localhost:5173
npm run lint && npm run build
```

## Deploy (Cloudflare Pages)

Build command `npm run build`, output directory `dist`, env var `VITE_API_URL=https://<api-host>`.
`public/_redirects` provides SPA routing (`vercel.json` is kept for Vercel).

## Structure

- `src/lib`: API client with a two-session store, typed endpoints (`wsApi(slug)`), types, constants
- `src/auth`: `AuthProvider`, `useWorkspace()` (slug, role, bound API) and the `RequireArea` guard
- `src/realtime`: one WebSocket per workspace (`?token=&workspace=`), React Query invalidation, polling fallback
- `src/pages/{customer,agent}`, `src/layouts`, `src/components`
