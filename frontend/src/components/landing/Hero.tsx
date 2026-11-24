import { ArrowRight, Play, ShieldCheck, Sparkles, Zap } from 'lucide-react'
import { motion, useReducedMotion } from 'motion/react'

import { Button } from '@/components/ui/button'

import { Counter, EASE } from './motion'
import { HeroMock } from './HeroMock'

export function Hero() {
  const reduce = useReducedMotion()
  const item = (delay: number) =>
    reduce
      ? {}
      : { initial: { opacity: 0, y: 22 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.7, delay, ease: EASE } }

  return (
    <section className="relative overflow-hidden px-4 pt-10 pb-20 sm:px-6 sm:pt-16 sm:pb-28">
      {/* backdrop: soft colour fields + faded grid */}
      <div className="pointer-events-none absolute inset-0 -z-10" aria-hidden>
        <div className="lp-grid absolute inset-0" />
        <div className="lp-drift absolute -top-40 left-[8%] size-[34rem] rounded-full bg-violet-300/35 blur-[110px]" />
        <div className="lp-drift absolute -top-24 right-[4%] size-[30rem] rounded-full bg-emerald-300/40 blur-[110px] [animation-delay:-6s]" />
        <div className="absolute inset-x-0 bottom-0 h-40 bg-linear-to-t from-background to-transparent" />
      </div>

      <div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.02fr)] lg:gap-10">
        <div className="min-w-0 text-center lg:text-left">
          <motion.a
            {...item(0)}
            href="#demo"
            className="group inline-flex items-center gap-2 rounded-full border bg-card/80 py-1 pr-3 pl-1.5 text-xs font-medium text-muted-foreground shadow-xs backdrop-blur transition-colors hover:text-foreground"
          >
            <span className="flex items-center gap-1 rounded-full bg-linear-to-r from-violet-600 to-fuchsia-600 px-2 py-0.5 text-white">
              <Sparkles className="size-3" /> New
            </span>
            Live demo with real AI, no signup
            <ArrowRight className="size-3 transition-transform group-hover:translate-x-0.5" />
          </motion.a>

          <motion.h1 {...item(0.08)} className="mt-6 text-[2.6rem] leading-[1.04] font-semibold tracking-tight text-balance sm:text-6xl lg:text-[4.1rem]">
            Answer customers faster, with AI that <span className="lp-gradient-text">shows its sources.</span>
          </motion.h1>

          <motion.p {...item(0.18)} className="mx-auto mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground lg:mx-0">
            Every ticket is triaged the second it lands, and your team opens it to a reply that’s already drafted from your own knowledge base, with the receipts attached. You review, edit and send.
          </motion.p>

          <motion.div {...item(0.28)} className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button asChild size="lg" className="lp-gradient-btn h-12 rounded-xl border-0 px-6 text-base text-white shadow-lg shadow-emerald-700/30 hover:brightness-110">
              <a href="#demo">
                Try the live demo <ArrowRight />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 rounded-xl px-5 text-base">
              <a href="#showcase">
                <Play className="size-4 fill-current" /> See how it works
              </a>
            </Button>
          </motion.div>

          <motion.ul {...item(0.38)} className="mt-7 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm text-muted-foreground lg:justify-start">
            {[
              [Zap, 'No signup'],
              [ShieldCheck, 'Private sandbox'],
              [Sparkles, 'Real AI'],
            ].map(([Icon, label]) => {
              const I = Icon as typeof Zap
              return (
                <li key={label as string} className="flex items-center gap-1.5">
                  <I className="size-4 text-primary" /> {label as string}
                </li>
              )
            })}
          </motion.ul>
        </div>

        <motion.div
          initial={reduce ? false : { opacity: 0, y: 36, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.25, ease: EASE }}
          className="min-w-0"
        >
          <HeroMock />
        </motion.div>
      </div>

      {/* proof strip */}
      <div className="mx-auto mt-20 grid max-w-4xl grid-cols-2 gap-y-8 rounded-2xl border bg-card/70 px-4 py-6 shadow-xs backdrop-blur sm:grid-cols-4 sm:px-8">
        {[
          { n: 15, pre: '<', suf: 's', label: 'ticket to cited draft' },
          { n: 3, pre: '', suf: '', label: 'ready-made demo companies' },
          { n: 24, pre: '', suf: 'h', label: 'private sandbox, auto-cleaned' },
          { n: 100, pre: '', suf: '%', label: 'human-reviewed before sending' },
        ].map((s) => (
          <div key={s.label} className="text-center">
            <p className="text-3xl font-semibold tracking-tight sm:text-4xl">
              <Counter to={s.n} prefix={s.pre} suffix={s.suf} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
