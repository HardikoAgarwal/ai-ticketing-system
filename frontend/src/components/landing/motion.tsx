import { animate, motion, useInView, useMotionValue, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react'
import { useEffect, useRef, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react'

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


/** Headline reveal: each word slides up out of a mask, staggered. */
export function WordReveal({
  text,
  className,
  delay = 0,
  as: Tag = 'span',
  onMount = false,
}: {
  text: string
  className?: string
  delay?: number
  as?: 'span' | 'h1' | 'h2' | 'h3'
  onMount?: boolean
}) {
  const reduce = useReducedMotion()
  const words = text.split(' ')
  const Wrapper = motion[Tag]
  return (
    <Wrapper
      className={className}
      initial={reduce ? false : 'hidden'}
      {...(onMount ? { animate: 'show' } : { whileInView: 'show', viewport: { once: true, margin: '-60px' } })}
      transition={{ staggerChildren: 0.06, delayChildren: delay }}
      aria-label={text}
    >
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-bottom" aria-hidden>
          <motion.span className="inline-block" variants={{ hidden: { y: '110%' }, show: { y: 0 } }} transition={{ duration: 0.7, ease: EASE }}>
            {w}
            {i < words.length - 1 ? '\u00A0' : ''}
          </motion.span>
        </span>
      ))}
    </Wrapper>
  )
}

/** Parallax offset: maps a scroll progress (0..1) to 0..range px. Static under reduced-motion. */
export function useParallax(progress: MotionValue<number>, range: number): MotionValue<number> {
  const reduce = useReducedMotion()
  return useTransform(progress, [0, 1], reduce ? [0, 0] : [0, range])
}

/** Cursor-follow spotlight: sets --mx/--my on the element so a radial gradient can track the pointer. */
export function useSpotlight() {
  const onMouseMove = (e: MouseEvent<HTMLElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    e.currentTarget.style.setProperty('--mx', `${e.clientX - r.left}px`)
    e.currentTarget.style.setProperty('--my', `${e.clientY - r.top}px`)
  }
  return { onMouseMove, style: { '--mx': '50%', '--my': '30%' } as CSSProperties }
}

/** Types `text` out once `active` is true; returns the visible slice. Instant under reduced-motion. */
export function useTypewriter(text: string, active = true, speed = 22) {
  const reduce = useReducedMotion()
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!active) {
      setN(0)
      return
    }
    if (reduce) {
      setN(text.length)
      return
    }
    setN(0)
    const id = window.setInterval(() => setN((v) => (v >= text.length ? v : v + 1)), speed)
    return () => window.clearInterval(id)
  }, [text, active, reduce, speed])
  return { shown: text.slice(0, n), done: n >= text.length }
}

/** Infinite horizontal marquee of text chips. */
export function Marquee({ items, className, itemClassName }: { items: string[]; className?: string; itemClassName?: string }) {
  const row = [...items, ...items]
  return (
    <div className={cn('relative flex overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]', className)} aria-hidden>
      <div className="lp-marquee flex shrink-0 gap-3 pr-3">
        {row.map((t, i) => (
          <span key={i} className={cn('shrink-0 rounded-full px-5 py-2 text-sm font-medium whitespace-nowrap', itemClassName)}>
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}


/**
 * Decorative parallax layer. `speed` is relative to the page: 0 = moves with the scroll, larger = drifts
 * further against it (about +-260px * speed across the time the layer crosses the viewport). The outer
 * wrapper is static (it is what we measure), only the inner element moves. Static under reduced-motion.
 */
export function Drift({ speed = 0.5, rotate = 0, className, innerClassName, children }: { speed?: number; rotate?: number; className?: string; innerClassName?: string; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const raw = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [speed * 260, -speed * 260])
  const y = useSpring(raw, { stiffness: 110, damping: 26, mass: 0.35 })
  const rot = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [-rotate, rotate])
  return (
    <div ref={ref} aria-hidden className={cn('pointer-events-none absolute max-sm:hidden', className)}>
      <motion.div data-drift={speed} style={{ y, rotate: rot }} className={cn('h-full w-full', innerClassName)}>
        {children}
      </motion.div>
    </div>
  )
}

/** In-flow wrapper that nudges its content (e.g. a section heading) against the scroll for depth. */
export function Float({ speed = 0.25, className, children }: { speed?: number; className?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  const reduce = useReducedMotion()
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] })
  const raw = useTransform(scrollYProgress, [0, 1], reduce ? [0, 0] : [speed * 220, -speed * 220])
  const y = useSpring(raw, { stiffness: 110, damping: 26, mass: 0.35 })
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }}>{children}</motion.div>
    </div>
  )
}
