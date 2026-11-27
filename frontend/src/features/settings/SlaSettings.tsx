import { Clock } from 'lucide-react'

import { fill } from '@/components/ds'
import { Input } from '@/components/ui/input'
import { PRIORITIES, PRIORITY_META } from '@/lib/constants'
import { cn } from '@/lib/utils'

import { SettingsCard } from './rows'
import type { WorkspaceFormApi } from './use-workspace-form'

const OK = fill('mint')
const RISK = fill('butter')
const LATE = fill('rose')

/**
 * Response targets. Each priority is a bar that shows what the target means for a ticket: green while there is time, amber for the last quarter,
 * and a pale red tail for "overdue". Every bar is on the same scale, so a longer bar is simply more time.
 */
export function SlaSettings({ f, readOnly }: { f: WorkspaceFormApi; readOnly: boolean }) {
  const { form, set } = f
  const max = Math.max(...PRIORITIES.map((p) => form.sla_hours[p]), 1)
  const orderWarning = PRIORITIES.some((p, i) => i > 0 && form.sla_hours[p] < form.sla_hours[PRIORITIES[i - 1]])
  return (
    <div className="space-y-6">
      <SettingsCard icon={Clock} title="First-response targets" description="How many hours your team has to send the first reply to a new ticket, for each priority.">
        {PRIORITIES.map((p) => {
          const hours = form.sla_hours[p]
          const atRisk = Math.round(hours * 0.75 * 10) / 10
          const share = (hours / max) * 100
          return (
            <div key={p} className="grid items-center gap-x-8 gap-y-3 md:grid-cols-[8rem_minmax(0,1fr)_9.5rem]">
              <p className="flex items-center gap-2.5 text-[15px] font-semibold text-ink">
                <span className={cn('size-2.5 rounded-full', PRIORITY_META[p].dot)} aria-hidden /> {PRIORITY_META[p].label}
              </p>
              <div>
                <div
                  role="img"
                  aria-label={`${PRIORITY_META[p].label}: on track for ${atRisk} hours, at risk until ${hours} hours, overdue after that`}
                  className="flex h-4 overflow-hidden rounded-full"
                  style={{ background: `color-mix(in srgb, ${LATE} 22%, transparent)` }}
                >
                  <div className="h-full transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${share * 0.75}%`, background: OK }} />
                  <div className="h-full transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${share * 0.25}%`, background: RISK }} />
                </div>
                <div className="mt-2.5 flex justify-between gap-3 text-[13px] text-ink-2">
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span className="size-2.5 rounded-full" style={{ background: OK }} aria-hidden />
                    On track to <span className="font-semibold text-ink">{atRisk}h</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span className="size-2.5 rounded-full" style={{ background: RISK }} aria-hidden />
                    At risk to <span className="font-semibold text-ink">{hours}h</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                    <span className="size-2.5 rounded-full" style={{ background: LATE }} aria-hidden />
                    Overdue after <span className="font-semibold text-ink">{hours}h</span>
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 md:justify-end">
                <Input
                  aria-label={`${PRIORITY_META[p].label} target in hours`}
                  type="number"
                  min={1}
                  max={720}
                  disabled={readOnly}
                  value={hours}
                  className="h-11 w-24 text-right text-base tabular-nums"
                  onChange={(e) => set('sla_hours', { ...form.sla_hours, [p]: Math.min(720, Math.max(1, Math.round(Number(e.target.value)) || 1)) })}
                />
                <span className="text-sm text-ink-3">hours</span>
              </div>
            </div>
          )
        })}

        {orderWarning && (
          <p role="status" className="rounded-control border border-butter-line bg-butter px-4 py-3 text-[13px] text-butter-ink">
            Heads up: a lower priority has a shorter target than a higher one. That is allowed, but usually critical issues should have the tightest target.
          </p>
        )}
      </SettingsCard>

    </div>
  )
}
