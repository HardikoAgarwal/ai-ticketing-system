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

function Stat({ icon: Icon, label, value, sub, hint, tone, onClick, active }: { icon: typeof FileText; label: string; value: ReactNode; sub: string; hint?: string; tone: string; onClick?: () => void; active?: boolean }) {
  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className={cn('flex size-10 items-center justify-center rounded-xl', tone)}>
          <Icon className="size-5" />
        </span>
        {hint && (
          <Hint label={hint}>
            <span aria-label={`About ${label}`} className="text-muted-foreground">
              <Info className="size-4" />
            </span>
          </Hint>
        )}
      </div>
      <p className="mt-4 text-3xl font-semibold tracking-tight tabular-nums">{value}</p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      <p className="text-xs text-muted-foreground">{sub}</p>
    </>
  )
  const cls = cn('rounded-xl border bg-card p-5 text-left shadow-xs transition-all', onClick && 'hover:border-primary/40 hover:shadow-sm', active && 'border-primary/50 ring-2 ring-primary/15')
  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={cls}>
      {body}
    </button>
  ) : (
    <div className={cls}>{body}</div>
  )
}

export type StatusFilter = 'all' | 'internal' | 'unindexed' | 'draft'

export function KbStats({ articles, status, onStatus }: { articles: ArticleListItem[]; status: StatusFilter; onStatus: (s: StatusFilter) => void }) {
  const total = articles.length
  const published = articles.filter((a) => a.is_published).length
  const internal = articles.filter((a) => a.is_internal).length
  const indexed = articles.filter((a) => a.indexed).length
  const pct = total ? Math.round((indexed / total) * 100) : 0
  const toggle = (s: StatusFilter) => onStatus(status === s ? 'all' : s)
  return (
    <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Stat icon={FileText} label="Articles" value={total} sub={`${total ? new Set(articles.map((a) => a.category)).size : 0} categories`} tone="bg-primary/10 text-primary" onClick={() => onStatus('all')} active={status === 'all'} />
      <Stat icon={BookOpen} label="Published" value={published} sub={total - published ? `${total - published} draft, ignored by AI` : 'all live'} hint="Only published articles are used by the AI and shown as suggestions. Drafts are ignored." tone="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" onClick={() => toggle('draft')} active={status === 'draft'} />
      <Stat icon={Lock} label="Internal-only" value={internal} sub="staff guidance, never quoted" hint="Staff only: the AI follows these but never quotes them, and customers never see them." tone="bg-amber-500/10 text-amber-600 dark:text-amber-400" onClick={() => toggle('internal')} active={status === 'internal'} />
      <Stat icon={ScanSearch} label="AI-search ready" value={`${pct}%`} sub={total - indexed ? `${total - indexed} not indexed yet` : 'everything indexed'} hint="Indexed articles are found by meaning ('refund' also matches 'money back'). The rest are still found by keywords, just less precisely." tone="bg-violet-500/10 text-violet-600 dark:text-violet-400" onClick={() => toggle('unindexed')} active={status === 'unindexed'} />
    </div>
  )
}

function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ring-1 ring-inset', className)}>{children}</span>
}

export function ArticleCard({ a, canEdit, onOpen, onDelete }: { a: ArticleListItem; canEdit: boolean; onOpen: () => void; onDelete: () => void }) {
  const tone = a.category_name && a.category ? categoryTone(String(a.category), a.category_name) : null
  return (
    <article className="group relative flex gap-4 rounded-xl border bg-card p-5 shadow-xs transition-all duration-200 hover:border-primary/40 hover:shadow-sm">
      <span className={cn('mt-0.5 flex size-11 shrink-0 items-center justify-center rounded-xl', a.is_internal ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-primary/10 text-primary')}>
        {a.is_internal ? <Lock className="size-5" /> : <FileText className="size-5" />}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {tone ? <Badge className={tone.pill}>{a.category_name}</Badge> : <Badge className="bg-muted text-muted-foreground ring-transparent">No category</Badge>}
          {a.is_internal && (
            <Hint label="Staff only: the AI follows it but never quotes it and customers never see it.">
              <Badge className="bg-amber-500/10 text-amber-700 ring-amber-600/25 dark:text-amber-300">
                <Lock className="size-3.5" /> Internal only
              </Badge>
            </Hint>
          )}
          {a.is_published ? (
            <Badge className="bg-emerald-500/10 text-emerald-700 ring-emerald-600/25 dark:text-emerald-300">
              <CheckCircle2 className="size-3.5" /> Published
            </Badge>
          ) : (
            <Hint label="Drafts are ignored by the AI and by customer suggestions until published.">
              <Badge className="bg-muted text-muted-foreground ring-border">
                <EyeOff className="size-3.5" /> Draft
              </Badge>
            </Hint>
          )}
          {!a.indexed && (
            <Hint label="Not indexed yet: found by keywords until it is embedded in the background.">
              <Badge className="bg-amber-500/10 text-amber-700 ring-amber-600/25 dark:text-amber-300">
                <Loader2 className="size-3.5" /> Not indexed
              </Badge>
            </Hint>
          )}
        </div>
        <button type="button" onClick={onOpen} className="mt-2.5 block text-left text-lg leading-snug font-semibold tracking-tight outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
          {a.title}
        </button>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{a.excerpt}</p>
        <p className="mt-3 flex items-center gap-3 text-xs text-muted-foreground">
          {a.indexed && (
            <span className="inline-flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
              <ScanSearch className="size-3.5" /> AI-search ready
            </span>
          )}
          <span>
            Updated <RelativeTime value={a.updated_at} />
          </span>
        </p>
      </div>
      <div className="relative z-10 flex shrink-0 flex-col items-end justify-between gap-2">
        {canEdit ? (
          <div className="flex gap-1">
            <Button variant="outline" size="sm" onClick={onOpen}>
              <Pencil /> Edit
            </Button>
            <Button variant="ghost" size="icon-sm" aria-label={`Delete ${a.title}`} onClick={onDelete}>
              <Trash2 />
            </Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={onOpen}>
            Read
          </Button>
        )}
      </div>
    </article>
  )
}
