import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

/**
 * The heading of every agent page: an ink icon tile (the same tile the active dock item uses), the page title, a one-line description, and the page's actions on the right. A hairline under it separates it from the content. Without actions the text uses the full width.
 */
export function PageHeader({ icon: Icon, title, description, actions, crowded = false }: { icon: LucideIcon; title: string; description?: ReactNode; actions?: ReactNode; /** Many actions: they sit on their own row under the title until the screen is very wide. */ crowded?: boolean }) {
  return (
    <header className={`flex flex-col gap-4 border-b border-line pb-6 ${crowded ? "2xl:flex-row 2xl:items-start 2xl:justify-between" : "lg:flex-row lg:items-start lg:justify-between"}`}>
      <div className={`flex min-w-0 items-start gap-4 ${actions ? "" : "w-full"}`}>
        <span className="hidden size-14 shrink-0 items-center justify-center rounded-panel bg-ink text-canvas shadow-panel sm:flex" aria-hidden>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="text-[28px] leading-9 font-semibold tracking-tight text-ink">{title}</h1>
          {description && (
            <p className={`mt-0.5 text-[15px] leading-6 text-ink-2 ${actions ? "max-w-2xl" : ""}`} aria-live="polite">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
