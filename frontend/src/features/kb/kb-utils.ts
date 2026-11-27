import { Globe, Lock, PencilLine, type LucideIcon } from 'lucide-react'

import type { Hue } from '@/components/ds'
import type { Article } from '@/lib/types'

export const ALL_CATEGORIES = '__all__'

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

/**
 * One visibility choice in place of two switches. It maps onto the two stored flags:
 * public = published and not internal, staff = published and internal, draft = not published.
 */
export type Visibility = 'public' | 'staff' | 'draft'

export const VISIBILITY: Record<Visibility, { label: string; short: string; hint: string; icon: LucideIcon; hue: Hue }> = {
  public: { label: 'Public', short: 'Customers see it and the AI quotes it', hint: 'Customers can be shown it and the AI can quote it.', icon: Globe, hue: 'mint' },
  staff: { label: 'Staff only', short: 'The AI follows it but never quotes it', hint: 'Guidance for your team. The AI follows it but never quotes it, and customers never see it.', icon: Lock, hue: 'butter' },
  draft: { label: 'Draft', short: 'Not used anywhere yet', hint: 'Not used anywhere yet. Switch it to Public when it is ready.', icon: PencilLine, hue: 'slate' },
}

export const visibilityOf = (a: Pick<Article, 'is_published' | 'is_internal'>): Visibility => (!a.is_published ? 'draft' : a.is_internal ? 'staff' : 'public')

export function flagsFor(v: Visibility): Pick<Article, 'is_published' | 'is_internal'> {
  return v === 'draft' ? { is_published: false, is_internal: false } : { is_published: true, is_internal: v === 'staff' }
}
