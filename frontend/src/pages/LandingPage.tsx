import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Building2,
  CheckCircle2,
  Database,
  FileSearch,
  Gauge,
  GitBranch,
  LifeBuoy,
  Lightbulb,
  Radio,
  ShieldCheck,
  Sparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { API_URL } from '@/lib/api'
import { Link, useLocation } from 'react-router-dom'

import { homeFor, useAuth } from '@/auth/AuthContext'
import { DemoLauncher } from '@/components/DemoLauncher'
import { Button } from '@/components/ui/button'

const GITHUB_URL = 'https://github.com/your-username/helpdesk-ai'

function Section({ id, eyebrow, title, intro, children }: { id?: string; eyebrow: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 px-4 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">{eyebrow}</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h2>
        {intro && <p className="mt-3 max-w-2xl text-muted-foreground">{intro}</p>}
        <div className="mt-10">{children}</div>
      </div>
    </section>
  )
}

/** A faux ticket workspace: shows triage, the grounded draft and its citations without needing the API. */
function ProductPreview() {
  return (
    <div className="relative mx-auto w-full min-w-0 max-w-xl">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-linear-to-tr from-violet-200/60 via-fuchsia-100/50 to-sky-200/60 blur-2xl" aria-hidden />
      <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl">
        <div className="flex items-center gap-1.5 border-b bg-muted/40 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-red-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 truncate text-[11px] text-muted-foreground">TKT-0042 · Segment events missing since this morning</span>
        </div>
        <div className="space-y-4 p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-medium">
            <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700 ring-1 ring-red-600/20 ring-inset">Critical</span>
            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-cyan-700 ring-1 ring-cyan-600/20 ring-inset">Integrations & API</span>
            <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-700 ring-1 ring-rose-600/20 ring-inset">Frustrated</span>
            <span className="ml-auto flex items-center gap-1 text-muted-foreground">
              <Sparkles className="size-3 text-violet-500" /> Triaged in 2s · 93%
            </span>
          </div>
          <div className="rounded-xl border bg-muted/30 p-3 text-sm text-foreground/80">
            None of our Segment events have shown up since 6am. Our launch review is in a few hours…
          </div>
          <div className="ai-ring-still ai-ring rounded-2xl">
            <div className="rounded-[calc(var(--radius-2xl)-2px)] bg-card p-4">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <span className="flex size-5 items-center justify-center rounded-md bg-linear-to-br from-violet-500 via-fuchsia-500 to-sky-400 text-white">
                  <Sparkles className="size-3" />
                </span>
                <span className="bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">AI draft</span>
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                Hi Priya, I can see your Segment pipeline is <b>Degraded</b>: last sync <b>3 hours ago</b>, about <b>120,000</b> events delayed. Delayed events backfill automatically for up to 72 hours…
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5 text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium">
                  <BookOpenCheck className="size-3" /> Segment and warehouse sync troubleshooting
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium">
                  <BookOpenCheck className="size-3" /> Incident response and SLA targets
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

const FEATURES: { icon: LucideIcon; title: string; body: string }[] = [
  { icon: Building2, title: 'True multi-workspace', body: 'Every table is tenant-scoped, roles are per workspace, and cross-tenant access returns 404. Spin up your own in seconds.' },
  { icon: Sparkles, title: 'AI triage', body: 'Category, priority, sentiment and a one-line summary on every ticket, with confidence and reasoning. Staff overrides always win.' },
  { icon: FileSearch, title: 'Drafts with citations', body: 'Replies are grounded in your knowledge base via semantic retrieval, and show exactly which articles they used.' },
  { icon: Radio, title: 'Real-time everywhere', body: 'WebSocket events update queues and conversations instantly, with polling as a safety net when the socket drops.' },
  { icon: Gauge, title: 'SLA & analytics', body: 'Per-priority first-response targets, countdowns, breach rate, CSAT, sentiment trends and AI override rate.' },
  { icon: Lightbulb, title: 'Self-service deflection', body: 'Customers see relevant articles as they type, and agents see likely duplicate tickets before replying.' },
]

const FLOW = [
  { step: '1', title: 'Ticket arrives', body: 'A rule-based classifier assigns a provisional category, priority and SLA instantly, so nothing is ever untriaged.' },
  { step: '2', title: 'AI triages', body: 'A background job asks Gemini for strict-JSON triage: category, priority, sentiment, summary. Staff-set values are never overwritten.' },
  { step: '3', title: 'Retrieve & ground', body: 'The ticket is matched against embedded KB chunks. A fact sheet computed in Python supplies every number and date.' },
  { step: '4', title: 'Draft with receipts', body: 'The model only phrases the facts. The agent sees the draft with its citations, edits, and sends. Nothing auto-sends.' },
]

const GUARDRAILS = [
  'Facts are computed by code, never by the model',
  'Internal notes never reach prompts or customers',
  'Retries with backoff, then a circuit breaker',
  'Falls back to keyword rules when AI is down',
  'Hard daily caps protect the free Gemini quota',
  'Every call logged with tokens, latency and prompt version',
]

const STACK = [
  ['Frontend', 'React 19, Vite, TypeScript, Tailwind, shadcn/ui, TanStack Query'],
  ['API', 'Django 5, DRF, JWT, OpenAPI docs, Channels (WebSockets)'],
  ['Data', 'Postgres (Neon) with Postgres-backed jobs. No Redis, no Celery'],
  ['AI', 'Gemini Flash-Lite and embeddings via the OpenAI-compatible API'],
  ['Storage', 'S3-compatible attachments with short-lived signed URLs'],
  ['Hosting', 'Cloudflare Pages + a single free API container'],
]

export function LandingPage() {
  const { user } = useAuth()
  const { hash } = useLocation()
  const [notice, setNotice] = useState<string | null>(null)
  // Free hosts sleep when idle: wake the API while the visitor reads the page so "Try the demo" is instant.
  useEffect(() => {
    fetch(`${API_URL}/health/`, { mode: 'cors' }).catch(() => {})
  }, [])
  useEffect(() => {
    const n = sessionStorage.getItem('helpdesk.notice')
    if (n) {
      setNotice(n)
      sessionStorage.removeItem('helpdesk.notice')
      document.getElementById('demo')?.scrollIntoView()
    }
  }, [])

  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView()
  }, [hash])

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-4">
          <a href="#top" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LifeBuoy className="size-4" />
            </span>
            Helpdesk AI
          </a>
          <nav className="ml-6 hidden items-center gap-5 text-sm text-muted-foreground md:flex" aria-label="Sections">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#ai" className="hover:text-foreground">How the AI works</a>
            <a href="#architecture" className="hover:text-foreground">Architecture</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <a href={GITHUB_URL} target="_blank" rel="noreferrer">
                <GitBranch /> GitHub
              </a>
            </Button>
            {user ? (
              <Button asChild size="sm">
                <Link to={homeFor(user)}>Open workspace</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <a href="#demo">Try the demo</a>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main id="top">
        <section className="relative overflow-hidden px-4 pt-14 pb-16 sm:pt-20 sm:pb-24">
          <div className="absolute inset-x-0 top-0 -z-10 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,oklch(0.95_0.04_160),transparent)]" aria-hidden />
          <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs font-medium text-muted-foreground shadow-xs">
                <Sparkles className="size-3.5 text-violet-500" /> Multi-tenant · RAG-grounded · Runs on free tiers
              </span>
              <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
                The helpdesk that triages itself and answers <span className="bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">with receipts.</span>
              </h1>
              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                A production-style support platform: every ticket is classified, prioritised and drafted a reply grounded in your knowledge base, with citations. Agents stay in control.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild size="lg">
                  <a href="#demo">
                    Try the live demo <ArrowRight />
                  </a>
                </Button>
                <Button asChild size="lg" variant="outline">
                  <Link to="/signup">Create your workspace</Link>
                </Button>
              </div>
              <ul className="mt-8 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                {['No signup for the demo', 'Agent and customer views', 'Real-time updates', 'Open-source, free to host'].map((t) => (
                  <li key={t} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-primary" /> {t}
                  </li>
                ))}
              </ul>
            </div>
            <ProductPreview />
          </div>
        </section>

        <section id="demo" className="scroll-mt-16 border-y bg-muted/30 px-4 py-16">
          <div className="mx-auto max-w-6xl">
            <div className="mb-8 text-center">
              <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">Live demo</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Pick a company and start working tickets</h2>
              <p className="mx-auto mt-2 max-w-xl text-muted-foreground">You land in the agent workspace and can flip to the customer view any time from the top bar.</p>
            </div>
            {notice && <p role="status" className="mx-auto mb-6 max-w-xl rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-center text-sm text-amber-900">{notice}</p>}
            <DemoLauncher />
          </div>
        </section>

        <Section id="features" eyebrow="Features" title="Everything a support team needs, and nothing it doesn't" intro="Built like a product, not a prototype: permissions, SLAs, real-time, analytics and an AI layer that fails gracefully.">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => (
              <div key={f.title} className="rounded-2xl border bg-card p-6 shadow-xs transition-shadow hover:shadow-md">
                <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <f.icon className="size-5" />
                </span>
                <h3 className="mt-4 font-semibold">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </Section>

        <section id="ai" className="scroll-mt-16 border-y bg-muted/30 px-4 py-16 sm:py-20">
          <div className="mx-auto max-w-6xl">
            <p className="text-xs font-semibold tracking-[0.14em] text-primary uppercase">How the AI works</p>
            <h2 className="mt-2 max-w-2xl text-2xl font-semibold tracking-tight sm:text-3xl">Useful, auditable and safe to ship</h2>
            <p className="mt-3 max-w-2xl text-muted-foreground">The model does what it's good at (reading and phrasing). Everything that must be right is done in code.</p>
            <ol className="mt-10 grid gap-4 md:grid-cols-4">
              {FLOW.map((s) => (
                <li key={s.step} className="relative rounded-2xl border bg-card p-5 shadow-xs">
                  <span className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">{s.step}</span>
                  <h3 className="mt-3 font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{s.body}</p>
                </li>
              ))}
            </ol>
            <div className="mt-8 rounded-2xl border bg-card p-6 shadow-xs">
              <h3 className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="size-5 text-primary" /> Guardrails
              </h3>
              <ul className="mt-4 grid gap-x-8 gap-y-2.5 text-sm text-muted-foreground sm:grid-cols-2">
                {GUARDRAILS.map((g) => (
                  <li key={g} className="flex items-start gap-2">
                    <Zap className="mt-0.5 size-4 shrink-0 text-violet-500" /> {g}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <Section id="architecture" eyebrow="Architecture" title="One small container, a free Postgres, zero queues to babysit" intro="Designed to run permanently on free tiers: jobs live in Postgres, realtime is in-process, and the database can scale to zero.">
          <div className="grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="rounded-2xl border bg-card p-6 shadow-xs">
              <div className="grid items-stretch gap-3 text-center text-sm sm:grid-cols-[1fr_auto_1.3fr_auto_1fr]">
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="font-semibold">React SPA</p>
                  <p className="mt-1 text-xs text-muted-foreground">Cloudflare Pages</p>
                </div>
                <ArrowRight className="hidden self-center text-muted-foreground sm:block" />
                <div className="rounded-xl border-2 border-primary/30 bg-accent/50 p-4">
                  <p className="font-semibold">Django API</p>
                  <p className="mt-1 text-xs text-muted-foreground">REST + WebSockets + in-process job pool</p>
                </div>
                <ArrowRight className="hidden self-center text-muted-foreground sm:block" />
                <div className="rounded-xl border bg-muted/40 p-4">
                  <p className="flex items-center justify-center gap-1.5 font-semibold">
                    <Database className="size-4" /> Postgres
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">Data, jobs, vectors</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 text-center text-xs text-muted-foreground sm:grid-cols-2">
                <div className="rounded-xl border border-violet-200 bg-violet-50/50 p-3">Gemini (chat + embeddings) via OpenAI-compatible API</div>
                <div className="rounded-xl border bg-muted/40 p-3">S3-compatible storage for attachments</div>
              </div>
              <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
                <BarChart3 className="mt-0.5 size-4 shrink-0" /> Retrieval is cosine similarity over a few hundred chunks per tenant, computed in Python. No vector extension needed.
              </p>
            </div>
            <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {STACK.map(([k, v]) => (
                <div key={k} className="flex gap-4 rounded-xl border bg-card px-4 py-3 shadow-xs">
                  <dt className="w-20 shrink-0 text-xs font-semibold tracking-wide text-primary uppercase">{k}</dt>
                  <dd className="text-sm text-muted-foreground">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        </Section>

        <section className="px-4 pb-20">
          <div className="mx-auto max-w-4xl rounded-3xl bg-linear-to-br from-emerald-700 via-emerald-600 to-teal-600 p-8 text-center text-white shadow-xl sm:p-12">
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">See it work on real-looking tickets</h2>
            <p className="mx-auto mt-3 max-w-lg text-emerald-50/90">Open a demo workspace, reply with an AI draft, then flip to the customer view and watch it arrive live.</p>
            <Button asChild size="lg" variant="secondary" className="mt-7">
              <a href="#demo">
                Start the demo <ArrowRight />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t px-4 py-8 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
          <span>Helpdesk AI · a portfolio project</span>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-foreground">
            <GitBranch className="size-4" /> Source on GitHub
          </a>
        </div>
      </footer>
    </div>
  )
}
