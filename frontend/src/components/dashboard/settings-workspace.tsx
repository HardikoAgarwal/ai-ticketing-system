import { useQuery } from '@tanstack/react-query'
import { Bot, Clock, Gauge, Info, MessageSquareQuote, Palette, ScanText, Sparkles, UserRoundCheck } from 'lucide-react'

import { useWorkspace } from '@/auth/workspace'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { PRIORITIES, PRIORITY_META } from '@/lib/constants'
import { cn } from '@/lib/utils'

import type { WorkspaceFormApi } from './settings-form'
import { Field, Section } from './settings-shared'

const TONE_EXAMPLES = [
  { label: 'Warm & friendly', text: 'Warm, friendly and personal. Use the customer’s first name, keep sentences short, and never sound like a template.' },
  { label: 'Concise & technical', text: 'Concise and technically precise. Talk like a capable colleague: no filler, no exclamation marks. Give the fix first, then the why.' },
  { label: 'Formal & reassuring', text: 'Formal, calm and reassuring. Acknowledge the impact first, apologise once when we are at fault, and state next steps clearly.' },
]

export function GeneralSection({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { form, set } = f
  const first = 'Alex'
  return (
    <Section id="general" icon={Palette} title="General" description="How your workspace and its replies are presented to customers.">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Workspace name" htmlFor="ws-name" hint="Shown in the sidebar and to customers in their portal.">
          <Input id="ws-name" value={form.name} disabled={readOnly} maxLength={120} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Tagline" htmlFor="ws-tag" hint="One line describing what you do. The AI uses it for context.">
          <Input id="ws-tag" value={form.tagline} disabled={readOnly} maxLength={200} placeholder="e.g. Product analytics for modern teams" onChange={(e) => set('tagline', e.target.value)} />
        </Field>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_1.1fr] lg:items-start">
        <Field label="Reply sign-off" htmlFor="ws-title" hint="The team name every reply ends with.">
          <Input id="ws-title" value={form.agent_title} disabled={readOnly} maxLength={80} onChange={(e) => set('agent_title', e.target.value)} />
        </Field>
        <div className="rounded-xl border bg-muted/30 p-4">
          <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            <MessageSquareQuote className="size-3.5" /> How a reply will end
          </p>
          <p className="text-sm leading-relaxed text-foreground/80">
            …I’ll update you here as soon as it’s done, {first}.
            <br />
            <br />
            Warm regards,
            <br />
            <span className="font-semibold text-foreground">{form.agent_title || 'Your team'}</span>
          </p>
        </div>
      </div>

      <Field label="Tone of voice" htmlFor="ws-tone" hint="Written guidance the AI follows in every draft. Describe how you’d like replies to sound; agents can always edit before sending.">
        <Textarea id="ws-tone" rows={4} value={form.tone} disabled={readOnly} className="leading-relaxed" placeholder="e.g. Friendly and concise. Own mistakes plainly. Never promise timelines we haven’t committed to." onChange={(e) => set('tone', e.target.value)} />
        {!readOnly && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-muted-foreground">
            Start from an example:
            {TONE_EXAMPLES.map((t) => (
              <button key={t.label} type="button" onClick={() => set('tone', t.text)} className="rounded-full border bg-background px-2.5 py-1 transition-colors hover:border-primary/40 hover:text-foreground">
                {t.label}
              </button>
            ))}
          </div>
        )}
      </Field>
    </Section>
  )
}

export function AiSection({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { slug, api, isDemo } = useWorkspace()
  const usage = useQuery({ queryKey: ['ai-usage', slug], queryFn: api.tickets.aiUsage })
  const { form, set } = f
  const u = usage.data
  const pct = u ? Math.min(100, Math.round((u.workspace_used / Math.max(1, u.workspace_cap)) * 100)) : 0
  return (
    <Section id="ai" icon={Bot} title="AI assistant" description="What the AI does for your team, and what happens when it can’t.">
      <label htmlFor="ai-on" className={cn('flex items-center gap-4 rounded-xl border p-4 transition-colors', form.ai_enabled ? 'border-primary/30 bg-accent/40' : 'bg-muted/30', !readOnly && 'cursor-pointer')}>
        <span className={cn('flex size-10 shrink-0 items-center justify-center rounded-xl', form.ai_enabled ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
          <Sparkles className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{form.ai_enabled ? 'AI assistant is on' : 'AI assistant is off'}</span>
          <span className="block text-xs text-muted-foreground">Turn it off at any time. Tickets keep working with simple rules, and agents write replies themselves.</span>
        </span>
        <Switch id="ai-on" checked={form.ai_enabled} disabled={readOnly} onCheckedChange={(v) => set('ai_enabled', v)} aria-label="AI assistant enabled" />
      </label>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          { icon: ScanText, title: 'Triages every ticket', body: 'Picks a category and priority, reads the customer’s mood and writes a one-line summary, in seconds.' },
          { icon: MessageSquareQuote, title: 'Drafts grounded replies', body: 'Writes from your knowledge base and the customer’s own details, and cites its sources. Never sent automatically.' },
          { icon: UserRoundCheck, title: 'Spots duplicates', body: 'Flags tickets that look like ones you already have, so the team can answer once.' },
        ].map(({ icon: Icon, title, body }) => (
          <div key={title} className="rounded-xl border p-4">
            <Icon className="mb-2 size-4 text-primary" />
            <p className="text-sm font-semibold">{title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border bg-muted/30 p-4">
        <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
          <Info className="size-4 text-muted-foreground" /> When the AI is off or out of budget
        </h3>
        <p className="text-xs leading-relaxed text-muted-foreground">
          Nothing breaks. New tickets are still categorised and prioritised instantly by <span className="font-medium text-foreground">keyword rules</span> (set in Categories), SLA timers still run, and the composer simply has no draft. Agents reply as usual.
        </p>
      </div>

      <div>
        <div className="mb-2 flex items-end justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Gauge className="size-4 text-muted-foreground" /> Live AI today
            </h3>
            <p className="text-xs text-muted-foreground">
              {isDemo ? 'Demo workspaces share a small free daily allowance so everyone can try it.' : 'A daily safety limit on live AI calls keeps costs predictable.'} Resets every day.
            </p>
          </div>
          <p className="text-sm font-semibold tabular-nums">{u ? `${u.workspace_used} / ${u.workspace_cap}` : '…'} <span className="text-xs font-normal text-muted-foreground">calls</span></p>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Live AI calls used today">
          <div className={cn('h-full rounded-full transition-all duration-700', pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-primary')} style={{ width: `${Math.max(pct, u ? 2 : 0)}%` }} />
        </div>
        {u && <p className="mt-1.5 text-[11px] text-muted-foreground">Across all workspaces on this server: {u.global_used} of {u.global_cap} today.</p>}
      </div>
    </Section>
  )
}

export function SlaSection({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { form, set } = f
  const max = Math.max(...PRIORITIES.map((p) => form.sla_hours[p]), 1)
  const orderWarning = PRIORITIES.some((p, i) => i > 0 && form.sla_hours[p] < form.sla_hours[PRIORITIES[i - 1]])
  return (
    <Section id="sla" icon={Clock} title="Response targets (SLA)" description="How quickly your team aims to send a first reply, by priority. These drive the countdowns and overdue flags in the queue.">
      <div className="space-y-3">
        {PRIORITIES.map((p) => {
          const hours = form.sla_hours[p]
          const atRisk = Math.round(hours * 0.75 * 10) / 10
          const width = Math.max(6, (hours / max) * 100)
          return (
            <div key={p} className="grid items-center gap-x-5 gap-y-2 rounded-xl border p-4 md:grid-cols-[9rem_1fr_8rem]">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <span className={cn('size-2.5 rounded-full', PRIORITY_META[p].dot)} /> {PRIORITY_META[p].label}
              </p>
              <div>
                <div className="relative h-3 overflow-hidden rounded-full bg-muted">
                  <div className={cn('absolute inset-y-0 left-0 rounded-full opacity-80 transition-all duration-500', PRIORITY_META[p].dot)} style={{ width: `${width}%` }} />
                  <div className="absolute inset-y-0 w-0.5 bg-background/90 transition-all duration-500" style={{ left: `${width * 0.75}%` }} />
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Reply within <span className="font-semibold text-foreground">{hours}h</span>. Marked <span className="font-medium text-amber-700">at risk</span> after {atRisk}h, <span className="font-medium text-red-700">overdue</span> after {hours}h.
                </p>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <Input id={`sla-${p}`} aria-label={`${PRIORITY_META[p].label} target in hours`} type="number" min={1} max={720} disabled={readOnly} value={hours} className="w-24 text-right tabular-nums" onChange={(e) => set('sla_hours', { ...form.sla_hours, [p]: Math.min(720, Math.max(1, Math.round(Number(e.target.value)) || 1)) })} />
                <span className="text-sm text-muted-foreground">hours</span>
              </div>
            </div>
          )
        })}
      </div>
      {orderWarning && <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 ring-1 ring-amber-600/15">Heads up: a lower priority has a shorter target than a higher one. That is allowed, but usually critical issues should have the tightest target.</p>}
      <div className="rounded-xl border bg-muted/30 p-4 text-xs leading-relaxed text-muted-foreground">
        <p>
          <span className="font-semibold text-foreground">First-response target</span> is the time from a ticket arriving to the first reply from your team. A ticket is flagged <span className="font-medium text-foreground">at risk</span> once 75% of that time has passed. Changing a target updates deadlines for new tickets and when a ticket’s priority changes.
        </p>
      </div>
    </Section>
  )
}
