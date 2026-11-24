import { animate, motion, useInView, useMotionValue, useReducedMotion, useTransform } from 'motion/react'
import { useEffect, useRef, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

const EASE = [0.22, 1, 0.36, 1] as const

/** Fade/slide in once as the element scrolls into view. Renders a plain div under reduced-motion. */
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
  id,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
  id?: string
}) {
  const reduce = useReducedMotion()
  if (reduce)
    return (
      <div id={id} className={className}>
        {children}
      </div>
    )
  return (
    <motion.div
      id={id}
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-70px' }}
      transition={{ duration: 0.65, delay, ease: EASE }}
    >
      {children}
    </motion.div>
  )
}

/** Counts up to `to` when scrolled into view. */
export function Counter({ to, prefix = '', suffix = '', className }: { to: number; prefix?: string; suffix?: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: '-40px' })
  const reduce = useReducedMotion()
  const value = useMotionValue(reduce ? to : 0)
  const text = useTransform(value, (v) => `${prefix}${Math.round(v)}${suffix}`)
  useEffect(() => {
    if (!inView || reduce) return
    const controls = animate(value, to, { duration: 1.6, ease: EASE })
    return () => controls.stop()
  }, [inView, reduce, to, value])
  return (
    <motion.span ref={ref} className={cn('tabular-nums', className)}>
      {text}
    </motion.span>
  )
}

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = 'center',
}: {
  eyebrow: string
  title: ReactNode
  intro?: string
  align?: 'center' | 'left'
}) {
  return (
    <Reveal className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      <p className="text-xs font-semibold tracking-[0.16em] text-primary uppercase">{eyebrow}</p>
      <h2 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl md:text-[2.75rem] md:leading-[1.1]">{title}</h2>
      {intro && <p className="mt-4 text-base text-muted-foreground sm:text-lg">{intro}</p>}
    </Reveal>
  )
}

export { EASE }
