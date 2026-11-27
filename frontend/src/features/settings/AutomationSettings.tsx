import { ArrowRight, Archive, CheckCheck, Route, Timer } from 'lucide-react'

import { fill, on, SegmentedControl, SolidChip } from '@/components/ds'
import { Input } from '@/components/ui/input'

import { InfoTip, Row, SettingsCard } from './rows'
import type { WorkspaceFormApi } from './use-workspace-form'

const DEFAULT_DAYS = 7

/** What the setting does, drawn as the life of one ticket: Resolved, then N quiet days, then Closed (or reopened by a reply). Flat: no boxes inside the card. */
function Lifecycle({ days }: { days: number }) {
  return (
    <ol className="grid items-start gap-5 md:grid-cols-[1fr_auto_1fr_auto_1fr]" aria-label="How automatic closing works">
      <li className="space-y-2.5">
        <SolidChip hue="mint" icon={CheckCheck}>
          Resolved
        </SolidChip>
        <p className="text-sm leading-6 text-ink-2">Your team marks the ticket resolved. It leaves the Active list and waits in History for the customer.</p>
      </li>
      <li aria-hidden className="hidden pt-1 md:block">
        <ArrowRight className="size-5 text-ink-3" />
      </li>
      <li className="space-y-2.5">
        <span className="inline-flex h-7 w-fit items-center gap-1.5 rounded-chip px-2.5 text-[13px] font-semibold" style={{ background: fill('butter'), color: on('butter') }}>
          <Timer className="size-3.5" aria-hidden />
          {days} quiet {days === 1 ? 'day' : 'days'}
        </span>
        <p className="text-sm leading-6 text-ink-2">If the customer writes back at any point, the ticket reopens as In progress and the clock stops.</p>
      </li>
      <li aria-hidden className="hidden pt-1 md:block">
        <ArrowRight className="size-5 text-ink-3" />
      </li>
      <li className="space-y-2.5">
        <SolidChip hue="slate" icon={Archive}>
          Closed
        </SolidChip>
        <p className="text-sm leading-6 text-ink-2">With no reply, it closes on its own. Closed is final: the true archive.</p>
      </li>
    </ol>
  )
}

export function AutomationSettings({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { form, set } = f
  const on_ = form.auto_close_days > 0
  return (
    <div className="space-y-6">
      <SettingsCard icon={Timer} title="Close resolved tickets" description="Moves a Resolved ticket to Closed once the customer has had time to reply.">
        <div className="space-y-2.5">
          <div className="flex items-center gap-1.5">
            <span id="auto-close-label" className="text-sm font-semibold text-ink">
              Close automatically
            </span>
            <InfoTip>Off keeps Resolved tickets Resolved until the customer confirms or someone closes them.</InfoTip>
          </div>
          <SegmentedControl
            ariaLabel="Close automatically"
            value={on_ ? 'on' : 'off'}
            onChange={(v) => set('auto_close_days', v === 'on' ? DEFAULT_DAYS : 0)}
            options={[
              { value: 'off', label: 'Off', disabled: readOnly },
              { value: 'on', label: 'On', disabled: readOnly },
            ]}
          />
        </div>
        <Row label="Close after" htmlFor="auto-close-days" hint="Between 1 and 90 days. The countdown starts when the ticket is marked Resolved.">
          <div className={on_ ? 'flex items-center gap-2' : 'flex items-center gap-2 opacity-50'}>
            <Input
              id="auto-close-days"
              type="number"
              min={1}
              max={90}
              disabled={readOnly || !on_}
              value={on_ ? form.auto_close_days : DEFAULT_DAYS}
              className="h-11 w-24 text-right tabular-nums"
              onChange={(e) => set('auto_close_days', Math.min(90, Math.max(1, Math.round(Number(e.target.value)) || 1)))}
            />
            <span className="text-sm text-ink-3">{(on_ ? form.auto_close_days : DEFAULT_DAYS) === 1 ? 'day' : 'days'} with no reply</span>
          </div>
        </Row>
      </SettingsCard>

      <SettingsCard icon={Route} title="How it works" description="The life of one ticket.">
        <Lifecycle days={on_ ? form.auto_close_days : DEFAULT_DAYS} />
        {!on_ && <p className="text-[13px] leading-5 text-ink-2">Shown with the suggested 7 days. Turn automatic closing on to use it.</p>}
      </SettingsCard>
    </div>
  )
}
