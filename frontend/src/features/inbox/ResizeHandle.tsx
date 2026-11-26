import { useRef, type KeyboardEvent, type PointerEvent } from 'react'

import { cn } from '@/lib/utils'

export const LIST_MIN = 340
export const LIST_MAX = 640
export const LIST_DEFAULT = 400

const clamp = (n: number) => Math.max(LIST_MIN, Math.min(LIST_MAX, Math.round(n)))

/** Draggable and keyboard-operable divider between the list and the ticket (ARIA window splitter). */
export function ResizeHandle({ width, onChange }: { width: number; onChange: (w: number) => void }) {
  const start = useRef<{ x: number; w: number } | null>(null)

  const down = (e: PointerEvent<HTMLDivElement>) => {
    start.current = { x: e.clientX, w: width }
    e.currentTarget.setPointerCapture(e.pointerId)
  }
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (start.current) onChange(clamp(start.current.w + e.clientX - start.current.x))
  }
  const up = () => {
    start.current = null
  }
  const key = (e: KeyboardEvent) => {
    const step = e.shiftKey ? 48 : 16
    if (e.key === 'ArrowLeft') onChange(clamp(width - step))
    else if (e.key === 'ArrowRight') onChange(clamp(width + step))
    else if (e.key === 'Home') onChange(LIST_MIN)
    else if (e.key === 'End') onChange(LIST_MAX)
    else if (e.key === 'Enter') onChange(LIST_DEFAULT)
    else return
    e.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize ticket list. Arrow keys adjust, Enter resets."
      aria-valuemin={LIST_MIN}
      aria-valuemax={LIST_MAX}
      aria-valuenow={width}
      tabIndex={0}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      onPointerCancel={up}
      onDoubleClick={() => onChange(LIST_DEFAULT)}
      onKeyDown={key}
      className={cn(
        'group relative z-10 -ml-px hidden w-1.5 shrink-0 cursor-col-resize touch-none outline-none lg:block',
        'after:absolute after:inset-y-0 after:left-1/2 after:w-px after:-translate-x-1/2 after:bg-line after:transition-colors hover:after:w-0.5 hover:after:bg-violet/60 focus-visible:after:w-0.5 focus-visible:after:bg-violet',
      )}
    />
  )
}
