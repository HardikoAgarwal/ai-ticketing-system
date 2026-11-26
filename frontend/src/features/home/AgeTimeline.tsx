import { differenceInHours, parseISO } from 'date-fns'
import { Hourglass } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import type { Paginated, StaffTicket } from '@/lib/types'

import { ChartPanel, Figure, PendingChart } from './chart-kit'
import { fill, on, type Hue } from './chart-tokens'

/** Each zone covers a stretch of waiting time; a ticket sits at its exact position inside the zone it belongs to. */
const ZONES: { key: string; label: string; from: number; to: number; ends: [string, string]; hue: Hue }[] = [
  { key: 'fresh', label: 'Fresh', from: 0, to: 24, ends: ['0h', '1 day'], hue: 'mint' },
  { key: 'aging', label: 'Getting older', from: 24, to: 72, ends: ['1 day', '3 days'], hue: 'butter' },
  { key: 'nudge', label: 'Needs a nudge', from: 72, to: 168, ends: ['3 days', '7 days'], hue: 'peach' },
  { key: 'stale', label: 'Stale', from: 168, to: 336, ends: ['7 days', '14+ days'], hue: 'rose' },
]

const DOT = 20
const STEP = DOT + 3
const MAX_LEVELS = 8

function useWidth() {
  const ref = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(220)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([e]) => e && setWidth(e.contentRect.width))
    ro.observe(el)
    setWidth(el.getBoundingClientRect().width)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

interface Placed {
  ticket: StaffTicket
  x: number
  level: number
  hours: number
}

/** Beeswarm: tickets sorted left to right each take the lowest row where they do not touch the previous dot in that row. */
function swarm(items: { ticket: StaffTicket; hours: number }[], zone: (typeof ZONES)[number], width: number): Placed[] {
  const usable = Math.max(40, width - DOT)
  const lastX: number[] = []
  return [...items]
    .sort((a, b) => a.hours - b.hours)
    .map(({ ticket, hours }) => {
      const t = (Math.min(Math.max(hours, zone.from), zone.to) - zone.from) / (zone.to - zone.from)
      const x = DOT / 2 + t * usable
      let level = 0
      while (level < MAX_LEVELS - 1 && lastX[level] !== undefined && x - lastX[level] < STEP) level++
      lastX[level] = x
      return { ticket, x, level, hours }
    })
}

/**
 * Every open ticket as a dot on a waiting-time timeline, split into four zones from fresh (green) to stale (red).
 * You see how many are in each zone and exactly where each one sits; a dot opens its ticket.
 */
export function TicketAging({ data, loading, error, onRetry, className }: { data?: Paginated<StaffTicket>; loading: boolean; error?: unknown; onRetry: () => void; className?: string }) {
  const { slug } = useWorkspace()
  const [measure, width] = useWidth()
  const tickets = data?.results
  const now = useMemo(() => new Date(), [data])
  const items = useMemo(() => (tickets ?? []).map((ticket) => ({ ticket, hours: Math.max(0, differenceInHours(now, parseISO(ticket.created_at))) })), [tickets, now])
  if (loading || error) return <PendingChart error={error} onRetry={onRetry} className={className} />

  const sorted = items.map((i) => i.hours).sort((a, b) => a - b)
  const median = sorted.length ? sorted[Math.floor(sorted.length / 2)] : null
  const oldest = items.reduce<(typeof items)[number] | null>((m, i) => (!m || i.hours > m.hours ? i : m), null)
  const days = (h: number) => Math.floor(h / 24)
  const dur = (h: number) => (h < 24 ? `${h}h` : `${days(h)} ${days(h) === 1 ? 'day' : 'days'}`)
  const zoneOf = (h: number) => ZONES.findIndex((_z, i) => h < ZONES[i].to || i === ZONES.length - 1)
  const byZone = ZONES.map((_z, i) => items.filter((it) => zoneOf(it.hours) === i))
  const sampled = data && data.count > data.results.length

  return (
    <ChartPanel
      icon={Hourglass}
      className={className}
      title="How long tickets have waited"
      description={sampled ? `Each dot is an open ticket. The ${data.results.length} most urgent of ${data.count}.` : 'Each dot is an open ticket. Select one to open it.'}
      figure={
        median === null ? undefined : (
          <div className="flex gap-6">
            <Figure value={dur(median)} label="Median wait" />
            <Figure value={oldest ? dur(oldest.hours) : '—'} label={`Oldest ${oldest?.ticket.reference ?? ''}`} tone={oldest && oldest.hours >= 168 ? 'bad' : undefined} />
          </div>
        )
      }
      summary={`Open tickets by waiting time: ${ZONES.map((z, i) => `${byZone[i].length} ${z.label.toLowerCase()} (${z.ends[0]} to ${z.ends[1]})`).join(', ')}.`}
      empty={!items.length}
    >
      <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
        {ZONES.map((z, zi) => {
          const placed = swarm(byZone[zi], z, width)
          return (
            <div key={z.key} className="flex h-[280px] min-w-0 flex-col rounded-panel p-3 sm:p-4" style={{ background: `color-mix(in srgb, ${fill(z.hue)} 10%, var(--surface))`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${fill(z.hue)} 28%, transparent)` }}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-ink">{z.label}</p>
                  <p className="text-xs text-ink-2">
                    {z.ends[0]} – {z.ends[1]}
                  </p>
                </div>
                <span className="rounded-chip px-2 py-0.5 text-lg leading-6 font-semibold tabular-nums" style={{ background: fill(z.hue), color: on(z.hue) }}>
                  {byZone[zi].length}
                </span>
              </div>
              <div ref={zi === 0 ? measure : undefined} className="relative mt-3 flex-1">
                {byZone[zi].length === 0 && <p className="absolute inset-0 flex items-center justify-center text-xs text-ink-3">No tickets</p>}
                {placed.map(({ ticket, x, level, hours }) => (
                  <Link
                    key={ticket.id}
                    to={`/w/${slug}/agent/tickets/${ticket.id}`}
                    title={`${ticket.reference} · waiting ${dur(hours)} · ${ticket.subject}`}
                    aria-label={`${ticket.reference}, waiting ${dur(hours)}: ${ticket.subject}`}
                    className="absolute rounded-full ring-2 ring-surface transition-transform hover:z-10 hover:scale-125 focus-visible:z-10 focus-visible:scale-125 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
                    style={{ left: x - DOT / 2, bottom: level * STEP, width: DOT, height: DOT, background: fill(z.hue) }}
                  />
                ))}
              </div>
              <div className="mt-2 flex justify-between border-t border-line pt-2 text-[11px] font-medium text-ink-3">
                <span>{z.ends[0]}</span>
                <span>{z.ends[1]}</span>
              </div>
            </div>
          )
        })}
      </div>
    </ChartPanel>
  )
}
