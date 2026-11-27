import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

import { useWorkspace } from '@/auth/workspace'

/**
 * The heading of every agent page: an ink icon tile (the same tile the active dock item uses), the workspace name as a small
 * label, the page title, a one-line description, and the page's actions on the right. A hairline under it separates it from the content.
 */
export function PageHeader({ icon: Icon, title, description, actions, crowded = false }: { icon: LucideIcon; title: string; description?: ReactNode; actions?: ReactNode; /** Many actions: they sit on their own row under the title until the screen is very wide. */ crowded?: boolean }) {
  const { brief } = useWorkspace()
  return (
    <header className={`flex flex-col gap-4 border-b border-line pb-6 ${crowded ? "2xl:flex-row 2xl:items-center 2xl:justify-between" : "lg:flex-row lg:items-center lg:justify-between"}`}>
      <div className="flex min-w-0 items-center gap-4">
        <span className="hidden size-14 shrink-0 items-center justify-center rounded-panel bg-ink text-canvas shadow-panel sm:flex" aria-hidden>
          <Icon className="size-6" />
        </span>
        <div className="min-w-0">
          {brief?.name && <p className="truncate text-[11px] font-semibold tracking-[0.1em] text-ink-3 uppercase">{brief.name}</p>}
          <h1 className="text-[28px] leading-9 font-semibold tracking-tight text-ink">{title}</h1>
          {description && (
            <p className="mt-0.5 max-w-2xl text-[15px] leading-6 text-ink-2" aria-live="polite">
              {description}
            </p>
          )}
        </div>
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
