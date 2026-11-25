import { BookOpen, CheckCircle2, EyeOff, FileText, Info, Loader2, Lock, Pencil, ScanSearch, Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { RelativeTime } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { categoryTone } from '@/lib/constants'
import type { ArticleListItem } from '@/lib/types'
import { cn } from '@/lib/utils'

export function Hint({ children, label }: { children: ReactNode; label: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent className="max-w-64 text-center leading-snug">{label}</TooltipContent>
    </Tooltip>
  )
}

function Stat({ icon: Icon, label, value, sub, hint, tone }: { icon: typeof FileText; label: string; value: ReactNode; sub: string; hint?: string; tone: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className={cn('flex size-8 items-center justify-center rounded-lg', tone)}>
          <Icon className="size-4" />
        </span>
        {hint && (
          <Hint label={hint}>
            <button type="button" aria-label={`About ${label}`} className="text-muted-foreground transition-colors hover:text-foreground">
              <Info className="size-3.5" />
            </button>
          </Hint>
        )}
      </div>
      <p className="mt-3 text-2xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="text-xs font-medium">{label}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  )
}

export function KbStats({ articles }: { articles: ArticleListItem[] }) {
  const total = articles.length
  const published = articles.filter((a) => a.is_published).length
  const internal = articles.filter((a) => a.is_internal).length
  const indexed = articles.filter((a) => a.indexed).length
  const pct = total ? Math.round((indexed / total) * 100) : 0
  return (
    <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat icon={FileText} label="Articles" value={total} sub="in this workspace" tone="bg-accent text-accent-foreground" />
      <Stat icon={BookOpen} label="Published" value={published} sub={total ? `${total - published} still draft` : 'none yet'} hint="Only published articles are used by the AI and shown as suggestions. Drafts are ignored." tone="bg-sky-50 text-sky-700" />
      <Stat icon={Lock} label="Internal-only" value={internal} sub="staff guidance" hint="Staff only: the AI follows these but never quotes them, and customers never see them." tone="bg-amber-50 text-amber-700" />
      <Stat icon={ScanSearch} label="AI-search ready" value={`${pct}%`} sub={`${indexed} of ${total} indexed`} hint="Indexed articles are found by meaning ('refund' also matches 'money back'). The rest are still found by keywords, just less precisely." tone="bg-violet-50 text-violet-700" />
    </div>
  )
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset', className)}>{children}</span>
}

export function ArticleCard({ a, canEdit, onOpen, onDelete }: { a: ArticleListItem; canEdit: boolean; onOpen: () => void; onDelete: () => void }) {
  const tone = a.category_name && a.category ? categoryTone(String(a.category), a.category_name) : null
  return (
    <article className="group relative flex flex-col rounded-2xl border bg-card p-5 shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md">
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {tone ? <Badge className={tone.pill}>{a.category_name}</Badge> : <Badge className="bg-muted text-muted-foreground ring-transparent">No category</Badge>}
        {a.is_internal && (
          <Hint label="Staff only: the AI follows it but never quotes it and customers never see it.">
            <Badge className="bg-amber-50 text-amber-800 ring-amber-600/20">
              <Lock className="size-3" /> Internal only
            </Badge>
          </Hint>
        )}
        {a.is_published ? (
          <Badge className="bg-emerald-50 text-emerald-700 ring-emerald-600/20">
            <CheckCircle2 className="size-3" /> Published
          </Badge>
        ) : (
          <Hint label="Drafts are ignored by the AI and by customer suggestions until published.">
            <Badge className="bg-muted text-muted-foreground ring-black/10">
              <EyeOff className="size-3" /> Draft
            </Badge>
          </Hint>
        )}
      </div>
      <button type="button" onClick={onOpen} className="text-left text-[15px] leading-snug font-semibold tracking-tight outline-none after:absolute after:inset-0 after:rounded-2xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
        {a.title}
      </button>
      <p className="mt-1.5 line-clamp-3 flex-1 text-[13px] leading-relaxed text-muted-foreground">{a.excerpt}</p>
      <footer className="mt-4 flex items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground">
        <span className="flex min-w-0 items-center gap-3">
          <Hint label={a.indexed ? 'Indexed: the AI can find this by meaning.' : 'Not indexed yet: found by keywords until it is embedded in the background.'}>
            <span className={cn('relative z-10 inline-flex items-center gap-1', a.indexed ? 'text-emerald-700' : 'text-amber-700')}>
              {a.indexed ? <ScanSearch className="size-3" /> : <Loader2 className="size-3" />} {a.indexed ? 'AI-search ready' : 'Keyword search'}
            </span>
          </Hint>
          <span className="truncate">
            Updated <RelativeTime value={a.updated_at} />
          </span>
        </span>
        {canEdit ? (
          <span className="relative z-10 flex shrink-0 gap-0.5">
            <Button variant="ghost" size="icon-sm" aria-label={`Edit ${a.title}`} onClick={onOpen}>
              <Pencil />
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${a.title}`} onClick={onDelete}>
              <Trash2 />
            </Button>
          </span>
        ) : null}
      </footer>
    </article>
  )
}
