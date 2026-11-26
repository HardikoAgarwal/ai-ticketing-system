import { fill, on, type Hue } from './chart-tokens'

export interface BarItem {
  key: string
  label: string
  value: number
  hue: Hue
}

/** One wide bar split into solid segments, each labelled inside with its name, share and count. Segments too narrow for text keep a title. */
export function StackBar({ items, height = 120 }: { items: BarItem[]; height?: number }) {
  const total = items.reduce((n, i) => n + i.value, 0) || 1
  return (
    <div className="flex w-full gap-1.5" style={{ height }}>
      {items
        .filter((i) => i.value > 0)
        .map((it) => {
          const share = it.value / total
          return (
            <div
              key={it.key}
              title={`${it.label}: ${it.value} (${Math.round(share * 100)}%)`}
              className="flex min-w-0 flex-col justify-between overflow-hidden rounded-control p-3 transition sm:p-4-[flex-grow] duration-500"
              style={{ flexGrow: it.value, flexBasis: 0, background: fill(it.hue), color: on(it.hue) }}
            >
              {share >= 0.1 && <span className="truncate text-sm font-semibold">{it.label}</span>}
              <span className="text-2xl leading-8 font-semibold tracking-tight tabular-nums sm:text-[32px]">
                {share >= 0.06 ? `${Math.round(share * 100)}%` : ''}
                {share >= 0.12 && <span className="ml-2 text-sm font-medium opacity-80 max-sm:hidden">{it.value} tickets</span>}
              </span>
            </div>
          )
        })}
    </div>
  )
}
