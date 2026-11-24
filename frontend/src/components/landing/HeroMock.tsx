import { BookOpenCheck, Check, Sparkles } from 'lucide-react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'

const MESSAGE = 'None of our Segment events have shown up since 6am. Our launch review is in a few hours. Is this on your side?'
const DRAFT =
  'Hi Priya, I’m sorry about the timing. Your Segment pipeline is Degraded: the last sync was 3 hours ago and about 120,000 events are delayed. They backfill automatically for up to 72 hours, so nothing is lost. Please re-authorise the integration under Settings, and we’ll update you within the hour.'

const CHIPS = [
  { label: 'Critical', cls: 'bg-red-50 text-red-700 ring-red-600/20' },
  { label: 'Integrations & API', cls: 'bg-cyan-50 text-cyan-700 ring-cyan-600/20' },
  { label: 'Frustrated', cls: 'bg-rose-50 text-rose-700 ring-rose-600/20' },
]
const CITES = ['Segment sync troubleshooting', 'Incident response & SLAs']

/** Loops: ticket lands → AI triage chips pop in → grounded draft types out → citations appear → sent. */
export function HeroMock() {
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { margin: '-10% 0px' })
  const [stage, setStage] = useState(reduce ? 5 : 0)
  const [typed, setTyped] = useState(reduce ? DRAFT.length : 0)

  useEffect(() => {
    if (reduce || !inView) return
    let cancelled = false
    const timers: number[] = []
    const at = (ms: number, fn: () => void) => timers.push(window.setTimeout(() => !cancelled && fn(), ms))

    const run = () => {
      setStage(0)
      setTyped(0)
      at(500, () => setStage(1)) // ticket lands
      at(1500, () => setStage(2)) // triage chips
      at(2900, () => setStage(3)) // draft starts
      // type the draft
      let i = 0
      const typer = window.setInterval(() => {
        if (cancelled) return
        i += 3
        setTyped(Math.min(i, DRAFT.length))
        if (i >= DRAFT.length) window.clearInterval(typer)
      }, 24)
      timers.push(typer)
      const typeMs = (DRAFT.length / 3) * 24
      at(2900 + typeMs + 200, () => setStage(4)) // citations
      at(2900 + typeMs + 1500, () => setStage(5)) // sent
      at(2900 + typeMs + 5200, run)
    }
    run()
    return () => {
      cancelled = true
      timers.forEach((t) => {
        window.clearTimeout(t)
        window.clearInterval(t)
      })
    }
  }, [reduce, inView])

  return (
    <div ref={ref} className="relative mx-auto w-full min-w-0 max-w-[34rem]">
      <div className="lp-drift absolute -inset-8 -z-10 rounded-[2.5rem] bg-linear-to-tr from-violet-300/50 via-fuchsia-200/40 to-sky-300/50 blur-3xl" aria-hidden />

      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_30px_80px_-30px_rgba(76,29,149,0.35)]">
        <div className="flex items-center gap-1.5 border-b bg-muted/50 px-4 py-2.5">
          <span className="size-2.5 rounded-full bg-red-300" />
          <span className="size-2.5 rounded-full bg-amber-300" />
          <span className="size-2.5 rounded-full bg-emerald-300" />
          <span className="ml-3 truncate text-[11px] text-muted-foreground">TKT-0001 · Segment events missing since this morning</span>
        </div>

        <div className="min-h-[24.5rem] space-y-3.5 p-4 sm:p-5">
          {/* customer message */}
          <div className="flex items-start gap-2.5">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-orange-100 text-[11px] font-semibold text-orange-700">PR</span>
            <div className="min-h-[3.5rem] flex-1 rounded-2xl rounded-tl-sm border bg-muted/40 px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/85">
              <AnimatePresence>
                {stage >= 1 && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35 }}>
                    {MESSAGE}
                  </motion.span>
                )}
              </AnimatePresence>
              {stage < 1 && <span className="text-muted-foreground">New ticket arriving…</span>}
            </div>
          </div>

          {/* triage chips */}
          <div className="flex min-h-7 flex-wrap items-center gap-1.5 text-[11px] font-medium">
            {CHIPS.map((c, i) => (
              <motion.span
                key={c.label}
                initial={false}
                animate={stage >= 2 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.6, y: 6 }}
                transition={{ type: 'spring', stiffness: 420, damping: 22, delay: stage >= 2 ? i * 0.18 : 0 }}
                className={`rounded-full px-2 py-0.5 ring-1 ring-inset ${c.cls}`}
              >
                {c.label}
              </motion.span>
            ))}
            <motion.span
              initial={false}
              animate={stage >= 2 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: stage >= 2 ? 0.7 : 0 }}
              className="ml-auto flex items-center gap-1 text-muted-foreground"
            >
              <Sparkles className="size-3 text-violet-500" /> Triaged in 2s · 93%
            </motion.span>
          </div>

          {/* AI draft */}
          <motion.div
            initial={false}
            animate={stage >= 3 ? { opacity: 1, y: 0 } : { opacity: 0.25, y: 8 }}
            transition={{ duration: 0.4 }}
            className="ai-ring ai-ring-still rounded-2xl"
          >
            <div className="rounded-[calc(var(--radius-2xl)-2px)] bg-card p-3.5">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <span className="flex size-5 items-center justify-center rounded-md bg-linear-to-br from-violet-500 via-fuchsia-500 to-sky-400 text-white">
                  <Sparkles className="size-3" />
                </span>
                <span className="bg-linear-to-r from-violet-600 to-fuchsia-600 bg-clip-text text-transparent">AI draft</span>
                {stage === 3 && typed < DRAFT.length && <span className="text-[11px] font-normal text-muted-foreground">Writing…</span>}
              </p>
              <p className="mt-2 min-h-[6.75rem] text-[13px] leading-relaxed text-foreground/90">
                {DRAFT.slice(0, typed)}
                {stage === 3 && typed < DRAFT.length && <span className="lp-caret ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-foreground/70" />}
              </p>
              <div className="mt-2 flex min-h-6 flex-wrap gap-1.5 text-[11px]">
                {CITES.map((c, i) => (
                  <motion.span
                    key={c}
                    initial={false}
                    animate={stage >= 4 ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: 6, scale: 0.9 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 24, delay: stage >= 4 ? i * 0.15 : 0 }}
                    className="inline-flex items-center gap-1 rounded-md bg-muted px-1.5 py-0.5 font-medium"
                  >
                    <BookOpenCheck className="size-3 text-violet-600" /> {c}
                  </motion.span>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="flex items-center justify-end gap-2">
            <AnimatePresence mode="wait">
              {stage >= 5 ? (
                <motion.span
                  key="sent"
                  initial={{ opacity: 0, scale: 0.85 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-600/20 ring-inset"
                >
                  <Check className="size-3.5" /> Sent to Priya · reviewed by you
                </motion.span>
              ) : (
                <motion.span key="send" exit={{ opacity: 0 }} className="inline-flex items-center rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground shadow-sm">
                  Review & send
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* floating badges */}
      <div className="lp-float absolute -top-4 -right-2 hidden rounded-xl border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur sm:block lg:-right-6" aria-hidden>
        <p className="flex items-center gap-1.5 font-medium">
          <span className="relative flex size-2">
            <span className="lp-pulse-ring absolute inline-flex size-2 rounded-full bg-emerald-400" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          New reply · just now
        </p>
      </div>
      <div className="lp-float absolute -bottom-5 -left-3 hidden rounded-xl border bg-card/95 px-3 py-2 text-xs shadow-lg backdrop-blur [animation-delay:-3s] sm:block lg:-left-8" aria-hidden>
        <p className="flex items-center gap-1.5 font-medium">
          <BookOpenCheck className="size-3.5 text-violet-600" /> 2 sources cited
        </p>
      </div>
    </div>
  )
}
