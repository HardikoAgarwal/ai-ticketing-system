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

export type StatusFilter = 'all' | 'internal' | 'unindexed' | 'draft'

export const ALL_CATEGORIES = '__all__'
