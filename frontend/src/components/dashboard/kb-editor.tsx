import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bot, CheckCircle2, Eye, Lightbulb, Loader2, Lock, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { ListSkeleton } from '@/components/states'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { errorMessage } from '@/lib/api'
import type { Article } from '@/lib/types'

const NONE = '__none__'
const TARGET = 700

/** Mirrors the server's paragraph-aware chunking so the preview shows what the AI really gets. */
function splitPassages(body: string): string[] {
  const paragraphs = body.split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean)
  const out: string[] = []
  let cur = ''
  for (const p of paragraphs) {
    if (cur && cur.length + p.length > TARGET) {
      out.push(cur)
      cur = p
    } else cur = cur ? `${cur}\n\n${p}` : p
  }
  if (cur) out.push(cur)
  return out
}

const TIPS = [
  'One topic per article. Short, focused articles are found more accurately.',
  'State exact numbers and timelines ("refunds take 5-10 business days"). The AI repeats what you write.',
  'Say what happens next, so replies can end with a clear next step.',
  'Separate ideas with a blank line. Each block becomes a passage the AI can cite.',
]

function Toggle({ id, checked, onChange, title, hint, icon: Icon, disabled }: { id: string; checked: boolean; onChange: (v: boolean) => void; title: string; hint: string; icon: typeof Eye; disabled?: boolean }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start gap-3 rounded-xl border bg-card p-3.5 transition-colors has-[:checked]:border-primary/40 has-[:checked]:bg-accent/40">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-xs leading-snug text-muted-foreground">{hint}</span>
      </span>
      <Switch id={id} checked={checked} onCheckedChange={onChange} disabled={disabled} className="mt-1" />
    </label>
  )
}

export function KbEditor({ articleId, onClose, readOnly }: { articleId: number | 'new' | null; onClose: () => void; readOnly: boolean }) {
  const open = articleId !== null
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const categories = useQuery({ queryKey: ['categories', slug], queryFn: api.categories, enabled: open })
  const existing = useQuery({ queryKey: ['article', slug, articleId], queryFn: () => api.article(articleId as number), enabled: typeof articleId === 'number' })
  const [draft, setDraft] = useState<Partial<Article>>({})
  const base: Partial<Article> = articleId === 'new' ? { title: '', body: '', category: null, is_published: true, is_internal: false } : (existing.data ?? {})
  const value = { ...base, ...draft }
  const title = value.title ?? ''
  const body = value.body ?? ''
  const words = body.trim() ? body.trim().split(/\s+/).length : 0
  const passages = splitPassages(body)
  const dirty = Object.keys(draft).length > 0

  const close = () => {
    setDraft({})
    onClose()
  }
  const save = useMutation({
    mutationFn: () => (articleId === 'new' ? api.createArticle(value) : api.updateArticle(articleId as number, value)),
    onSuccess: () => {
      toast.success('Article saved. It will be ready for AI search in a moment.')
      queryClient.invalidateQueries({ queryKey: ['articles', slug] })
      queryClient.invalidateQueries({ queryKey: ['article', slug, articleId] })
      close()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const valid = title.trim().length > 0 && body.trim().length > 0

  return (
    <Sheet open={open} onOpenChange={(o) => !o && close()}>
      <SheetContent className="w-full gap-0 p-0 data-[side=right]:sm:max-w-5xl" aria-describedby="kb-editor-desc">
        <SheetHeader className="border-b px-6 py-5 pr-14">
          <SheetTitle className="text-lg">{readOnly ? 'Article' : articleId === 'new' ? 'New article' : 'Edit article'}</SheetTitle>
          <SheetDescription id="kb-editor-desc">
            {readOnly ? 'Only owners and admins can edit articles. You can read what the AI reads.' : 'Write it the way you would explain it to a customer. The AI quotes from this and cites it.'}
          </SheetDescription>
        </SheetHeader>

        {existing.isLoading && articleId !== 'new' ? (
          <div className="p-6">
            <ListSkeleton rows={4} />
          </div>
        ) : (
          <div className="grid min-h-0 flex-1 overflow-y-auto lg:grid-cols-[1.35fr_1fr] lg:overflow-hidden">
            <div className="space-y-5 p-6 lg:overflow-y-auto">
              <div className="space-y-1.5">
                <Label htmlFor="a-title">Title</Label>
                <Input id="a-title" value={title} disabled={readOnly} maxLength={200} placeholder="e.g. Refunds and credits" onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
                <p className="text-xs text-muted-foreground">Customers see this when we suggest the article. Name the topic plainly.</p>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={value.category ? String(value.category) : NONE} disabled={readOnly} onValueChange={(v) => setDraft({ ...draft, category: v === NONE ? null : Number(v) })}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>No category</SelectItem>
                    {categories.data?.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Articles in a ticket's category get a small boost when the AI picks what to read.</p>
              </div>
              <div className="space-y-1.5">
                <div className="flex items-end justify-between">
                  <Label htmlFor="a-body">Content</Label>
                  <span className="text-[11px] text-muted-foreground tabular-nums">
                    {words} {words === 1 ? 'word' : 'words'} · {body.length} characters
                  </span>
                </div>
                <Textarea id="a-body" rows={13} value={body} disabled={readOnly} className="leading-relaxed" placeholder={'Annual plans can be refunded within 14 days of purchase.\n\nAfter that we convert the unused term into account credit.'} onChange={(e) => setDraft({ ...draft, body: e.target.value })} />
              </div>
              <div className="grid gap-3">
                <Toggle id="a-pub" icon={Eye} checked={!!value.is_published} disabled={readOnly} onChange={(v) => setDraft({ ...draft, is_published: v })} title="Published" hint="Live: the AI can use it and customers can be shown it. Turn off to keep it as a draft." />
                <Toggle id="a-int" icon={Lock} checked={!!value.is_internal} disabled={readOnly} onChange={(v) => setDraft({ ...draft, is_internal: v })} title="Internal only" hint="Staff guidance such as escalation rules. The AI follows it but never quotes it, and customers never see it." />
              </div>
            </div>

            <aside className="space-y-5 border-t bg-muted/30 p-6 lg:overflow-y-auto lg:border-t-0 lg:border-l">
              <section>
                <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  <Lightbulb className="size-4 text-amber-500" /> Writing tips
                </h3>
                <ul className="space-y-2">
                  {TIPS.map((t) => (
                    <li key={t} className="flex gap-2 text-xs leading-relaxed text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-primary" /> {t}
                    </li>
                  ))}
                </ul>
              </section>
              <section>
                <h3 className="mb-1 flex items-center gap-2 text-sm font-semibold">
                  <Bot className="size-4 text-violet-600" /> How the AI will see this
                </h3>
                <p className="mb-3 text-xs text-muted-foreground">Your article is cut into passages. The AI is given the most relevant ones for each ticket and cites the article.</p>
                {value.is_internal && (
                  <p className="mb-3 flex items-start gap-2 rounded-lg bg-amber-50 p-2.5 text-xs text-amber-900 ring-1 ring-amber-600/15">
                    <ShieldAlert className="mt-0.5 size-3.5 shrink-0" /> Internal: the AI treats this as private guidance and won't quote it.
                  </p>
                )}
                {!value.is_published && <p className="mb-3 rounded-lg bg-muted p-2.5 text-xs text-muted-foreground">Draft: not used until published.</p>}
                {passages.length === 0 ? (
                  <p className="rounded-xl border border-dashed p-4 text-center text-xs text-muted-foreground">Start writing to see the passages appear here.</p>
                ) : (
                  <ol className="space-y-2">
                    {passages.map((p, i) => (
                      <li key={i} className="rounded-xl border bg-card p-3 shadow-xs">
                        <p className="mb-1 text-[11px] font-semibold text-muted-foreground">
                          {title.trim() || 'Untitled'} · passage {i + 1} of {passages.length}
                        </p>
                        <p className="line-clamp-5 text-xs leading-relaxed whitespace-pre-line">{p}</p>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            </aside>
          </div>
        )}

        <SheetFooter className="flex-row items-center justify-between gap-2 border-t bg-background px-6 py-4">
          <p className="hidden text-xs text-muted-foreground sm:block">{readOnly ? 'Read-only' : dirty ? 'You have unsaved changes' : 'Changes are saved when you click Save'}</p>
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" onClick={close}>
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button onClick={() => save.mutate()} disabled={!valid || save.isPending || (articleId !== 'new' && !dirty)}>
                {save.isPending && <Loader2 className="animate-spin" />} Save article
              </Button>
            )}
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
