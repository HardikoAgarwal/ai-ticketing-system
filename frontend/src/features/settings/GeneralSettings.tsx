import { MessageSquareQuote } from 'lucide-react'

import { Chip } from '@/components/ds'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

import { Row, SettingsCard } from './rows'
import type { WorkspaceFormApi } from './use-workspace-form'

const TONE_EXAMPLES = [
  { label: 'Warm & friendly', text: 'Warm, friendly and personal. Use the customer’s first name, keep sentences short, and never sound like a template.' },
  { label: 'Concise & technical', text: 'Concise and technically precise. Talk like a capable colleague: no filler, no exclamation marks. Give the fix first, then the why.' },
  { label: 'Formal & reassuring', text: 'Formal, calm and reassuring. Acknowledge the impact first, apologise once when we are at fault, and state next steps clearly.' },
]

export function GeneralSettings({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { form, set } = f
  return (
    <div className="space-y-6">
      <SettingsCard title="Workspace" description="The name and one-line description of your business.">
        <Row label="Workspace name" htmlFor="ws-name" hint="Shown in the sidebar and to customers in their portal.">
          <Input id="ws-name" value={form.name} disabled={readOnly} maxLength={120} className="h-11 max-w-md" onChange={(e) => set('name', e.target.value)} />
        </Row>
        <Row label="Tagline" htmlFor="ws-tag" hint="One line describing what you do. The AI uses it for context.">
          <Input id="ws-tag" value={form.tagline} disabled={readOnly} maxLength={200} className="h-11 max-w-md" placeholder="e.g. Product analytics for modern teams" onChange={(e) => set('tagline', e.target.value)} />
        </Row>
      </SettingsCard>

      <SettingsCard title="Replies" description="How the AI drafts replies, and how every reply ends.">
        <Row label="Reply sign-off" htmlFor="ws-title" hint="The team name every reply ends with.">
          <Input id="ws-title" value={form.agent_title} disabled={readOnly} maxLength={80} className="h-11 max-w-md" onChange={(e) => set('agent_title', e.target.value)} />
          <div className="mt-3 max-w-md rounded-control bg-surface-2 p-4">
            <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">
              <MessageSquareQuote className="size-3.5" aria-hidden /> How a reply will end
            </p>
            <p className="text-sm leading-relaxed text-ink-2">
              …I’ll update you here as soon as it’s done, Alex.
              <br />
              <br />
              Warm regards,
              <br />
              <span className="font-semibold text-ink">{form.agent_title || 'Your team'}</span>
            </p>
          </div>
        </Row>
        <Row label="Tone of voice" htmlFor="ws-tone" hint="Written guidance the AI follows in every draft. Describe how you’d like replies to sound; agents can always edit before sending.">
          <Textarea id="ws-tone" rows={4} value={form.tone} disabled={readOnly} className="leading-relaxed" placeholder="e.g. Friendly and concise. Own mistakes plainly. Never promise timelines we haven’t committed to." onChange={(e) => set('tone', e.target.value)} />
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs text-ink-3">
              Start from an example:
              {TONE_EXAMPLES.map((t) => (
                <Chip key={t.label} size="sm" tone="slate" onClick={() => set('tone', t.text)}>
                  {t.label}
                </Chip>
              ))}
            </div>
          )}
        </Row>
      </SettingsCard>
    </div>
  )
}
