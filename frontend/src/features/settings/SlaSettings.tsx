import { Clock } from 'lucide-react'

import { ProgressBar } from '@/components/ds'
import { Input } from '@/components/ui/input'
import { PRIORITIES, PRIORITY_META } from '@/lib/constants'
import { cn } from '@/lib/utils'

import { SettingsSection } from './rows'
import type { WorkspaceFormApi } from './use-workspace-form'

const BAR_TONE = { CRITICAL: 'red', HIGH: 'amber', MEDIUM: 'violet', LOW: 'ink' } as const

export function SlaSettings({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { form, set } = f
  const max = Math.max(...PRIORITIES.map((p) => form.sla_hours[p]), 1)
  const orderWarning = PRIORITIES.some((p, i) => i > 0 && form.sla_hours[p] < form.sla_hours[PRIORITIES[i - 1]])
  return (
    <SettingsSection id="sla" icon={Clock} title="Response targets (SLA)" description="How quickly your team aims to send a first reply, by priority. These drive the countdowns and overdue flags in the inbox.">
      {PRIORITIES.map((p) => {
        const hours = form.sla_hours[p]
        const atRisk = Math.round(hours * 0.75 * 10) / 10
        return (
          <div key={p} className="grid items-center gap-x-6 gap-y-2 md:grid-cols-[9rem_1fr_9rem]">
            <p className="flex items-center gap-2 text-sm font-semibold text-ink">
              <span className={cn('size-2.5 rounded-full', PRIORITY_META[p].dot)} aria-hidden /> {PRIORITY_META[p].label}
            </p>
            <div>
              <ProgressBar value={Math.max(6, (hours / max) * 100)} tone={BAR_TONE[p]} label={`${PRIORITY_META[p].label} target, ${hours} hours`} />
              <p className="mt-1.5 text-[13px] text-ink-2">
                Reply within <span className="font-semibold text-ink">{hours}h</span>. Marked <span className="font-medium text-butter-ink">at risk</span> after {atRisk}h, <span className="font-medium text-rose-ink">overdue</span> after {hours}h.
              </p>
            </div>
            <div className="flex items-center gap-2 md:justify-end">
              <Input
                aria-label={`${PRIORITY_META[p].label} target in hours`}
                type="number"
                min={1}
                max={720}
                disabled={readOnly}
                value={hours}
                className="w-24 text-right tabular-nums"
                onChange={(e) => set('sla_hours', { ...form.sla_hours, [p]: Math.min(720, Math.max(1, Math.round(Number(e.target.value)) || 1)) })}
              />
              <span className="text-sm text-ink-3">hours</span>
            </div>
          </div>
        )
      })}
      {orderWarning && (
        <p role="status" className="rounded-control border border-butter-line bg-butter px-3 py-2 text-[13px] text-butter-ink">
          Heads up: a lower priority has a shorter target than a higher one. That is allowed, but usually critical issues should have the tightest target.
        </p>
      )}
      <p className="text-[13px] leading-5 text-ink-2">
        <span className="font-semibold text-ink">First-response target</span> is the time from a ticket arriving to the first reply from your team. A ticket is flagged <span className="font-medium text-ink">at risk</span> once 75% of that time has passed. Changing a target updates deadlines for new tickets and when a ticket’s priority changes.
      </p>
    </SettingsSection>
  )
}
