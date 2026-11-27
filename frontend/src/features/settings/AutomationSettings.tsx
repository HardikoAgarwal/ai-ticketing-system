import { ArrowRight, Archive, CheckCheck, Timer } from 'lucide-react'

import { fill, on, SolidChip } from '@/components/ds'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'

import { Row, SettingsCard } from './rows'
import type { WorkspaceFormApi } from './use-workspace-form'

const DEFAULT_DAYS = 7

/** What the setting does, drawn as the life of one ticket: Resolved, then N quiet days, then Closed (or reopened by a reply). */
function Lifecycle({ days }: { days: number }) {
  const step = 'flex flex-col gap-2 rounded-control bg-surface p-4 shadow-card'
  return (
    <div className="grid items-stretch gap-3 rounded-control bg-sunken p-4 md:grid-cols-[1fr_auto_1fr_auto_1fr]" aria-label="How automatic closing works">
      <div className={step}>
        <SolidChip hue="mint" icon={CheckCheck}>
          Resolved
        </SolidChip>
        <p className="text-sm leading-5 text-ink-2">Your team marks the ticket resolved. It leaves the Active list and waits in History for the customer.</p>
      </div>
      <ArrowRight className="hidden size-5 self-center text-ink-3 md:block" aria-hidden />
      <div className={step}>
        <span className="inline-flex h-7 w-fit items-center gap-1.5 rounded-chip px-2.5 text-[13px] font-semibold" style={{ background: fill('butter'), color: on('butter') }}>
          <Timer className="size-3.5" aria-hidden />
          {days} quiet {days === 1 ? 'day' : 'days'}
        </span>
        <p className="text-sm leading-5 text-ink-2">If the customer writes back at any point, the ticket reopens as In progress and the clock stops.</p>
      </div>
      <ArrowRight className="hidden size-5 self-center text-ink-3 md:block" aria-hidden />
      <div className={step}>
        <SolidChip hue="slate" icon={Archive}>
          Closed
        </SolidChip>
        <p className="text-sm leading-5 text-ink-2">With no reply, it closes on its own. Closed is final: the true archive.</p>
      </div>
    </div>
  )
}

export function AutomationSettings({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { form, set } = f
  const on_ = form.auto_close_days > 0
  return (
    <div className="space-y-6">
      <SettingsCard title="Close resolved tickets" description="Moves a Resolved ticket to Closed once the customer has had time to reply.">
        <Row label="Close automatically" htmlFor="auto-close-on" hint="Off keeps Resolved tickets Resolved until the customer confirms or someone closes them.">
          <div className="flex items-center gap-3">
            <Switch id="auto-close-on" checked={on_} disabled={readOnly} onCheckedChange={(v) => set('auto_close_days', v ? DEFAULT_DAYS : 0)} />
            <span className="text-sm font-medium text-ink">{on_ ? 'On' : 'Off'}</span>
          </div>
        </Row>
        {on_ && (
          <Row label="Close after" htmlFor="auto-close-days" hint="Between 1 and 90 days. The countdown starts when the ticket is marked Resolved.">
            <div className="flex items-center gap-2">
              <Input
                id="auto-close-days"
                type="number"
                min={1}
                max={90}
                disabled={readOnly}
                value={form.auto_close_days}
                className="h-11 w-24 text-right tabular-nums"
                onChange={(e) => set('auto_close_days', Math.min(90, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
              />
              <span className="text-sm text-ink-3">{form.auto_close_days === 1 ? 'day' : 'days'} with no reply</span>
            </div>
          </Row>
        )}
      </SettingsCard>

      <SettingsCard title="How it works" description="The life of one ticket." flush>
        <Lifecycle days={on_ ? form.auto_close_days : DEFAULT_DAYS} />
        {!on_ && <p className="mt-3 text-[13px] text-ink-2">Shown with the suggested 7 days. Turn the switch on to use it.</p>}
        <p className="mt-3 text-[13px] leading-5 text-ink-2">Closing runs shortly after you save, and then about once an hour while your team is using the app. Closed tickets are listed under Tickets, History.</p>
      </SettingsCard>
    </div>
  )
}
