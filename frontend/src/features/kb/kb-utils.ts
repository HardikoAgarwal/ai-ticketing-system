import { Globe, Lock, PencilLine, type LucideIcon } from 'lucide-react'

import type { Hue } from '@/components/ds'
import type { Article } from '@/lib/types'

const TARGET = 700

/** Mirrors the server's paragraph-aware chunking so the preview shows what the AI really gets. */
export function splitPassages(body: string): string[] {
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

export const TIPS = [
  'One topic per article. Short, focused articles are found more accurately.',
  'State exact numbers and timelines ("refunds take 5-10 business days"). The AI repeats what you write.',
  'Say what happens next, so replies can end with a clear next step.',
  'Separate ideas with a blank line. Each block becomes a passage the AI can cite.',
]

/**
 * One visibility choice in place of two switches. It maps onto the two stored flags:
 * public = published and not internal, staff = published and internal, draft = not published.
 */
export type Visibility = 'public' | 'staff' | 'draft'

export const VISIBILITY: Record<Visibility, { label: string; hint: string; icon: LucideIcon; hue: Hue }> = {
  public: { label: 'Public', hint: 'Customers can be shown it and the AI can quote it.', icon: Globe, hue: 'mint' },
  staff: { label: 'Staff only', hint: 'Guidance for your team. The AI follows it but never quotes it, and customers never see it.', icon: Lock, hue: 'butter' },
  draft: { label: 'Draft', hint: 'Not used anywhere yet. Switch it to Public when it is ready.', icon: PencilLine, hue: 'slate' },
}

export const visibilityOf = (a: Pick<Article, 'is_published' | 'is_internal'>): Visibility => (!a.is_published ? 'draft' : a.is_internal ? 'staff' : 'public')

export function flagsFor(v: Visibility): Pick<Article, 'is_published' | 'is_internal'> {
  return v === 'draft' ? { is_published: false, is_internal: false } : { is_published: true, is_internal: v === 'staff' }
}
