import { BarChart3, Check, Copy, Sparkles, Star, Users, Zap } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState, type ReactNode } from 'react'

import { cn } from '@/lib/utils'

import { EASE, Reveal, useTypewriter, WordReveal } from './motion'

/** Bento tile: tinted surface, hover lift. Same radius, ring and shadow as every other card on the page. */
function Tile({ className, tone, title, children }: { className?: string; tone: string; title: string; children: ReactNode }) {
  return (
    <Reveal className={cn('group', className)}>
      <div className={cn('relative h-full overflow-hidden rounded-[var(--lp-radius)] p-6 shadow-(--lp-shadow) ring-1 ring-black/[0.06] transition-transform duration-500 hover:-translate-y-1 sm:p-7', tone)}>
        <div className="relative flex h-full flex-col">
          <h3 className="text-2xl leading-tight font-semibold tracking-[-0.03em] sm:text-[1.7rem]">{title}</h3>
          <div className="mt-5 flex flex-1 flex-col">{children}</div>
        </div>
      </div>
    </Reveal>
  )
}

function Seg<T extends string>({ value, onChange, options, dark }: { value: T; onChange: (v: T) => void; options: { v: T; label: string }[]; dark?: boolean }) {
  return (
    <div role="radiogroup" className={cn('relative inline-flex self-start rounded-full p-1 text-xs font-semibold', dark ? 'bg-white/10' : 'bg-black/[0.07]')}>
      {options.map((o) => (
        <button key={o.v} type="button" role="radio" aria-checked={value === o.v} onClick={() => onChange(o.v)} className={cn('lp-focus relative z-10 rounded-full px-3.5 py-1.5 transition-colors', value === o.v ? (dark ? 'text-(--lp-ink)' : 'text-white') : 'opacity-60 hover:opacity-100')}>
          {value === o.v && <motion.span layoutId={`seg-${options.map((x) => x.v).join('')}`} className={cn('absolute inset-0 -z-10 rounded-full', dark ? 'bg-(--lp-lime)' : 'bg-(--lp-ink)')} transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
          {o.label}
        </button>
      ))}
    </div>
  )
}

/* ------------------------------- Triage ------------------------------- */
function TriageTile() {
  const [mode, setMode] = useState<'rules' | 'ai'>('ai')
  const touched = useRef(false)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!touched.current) setMode((m) => (m === 'ai' ? 'rules' : 'ai'))
    }, 3600)
    return () => window.clearInterval(id)
  }, [])
  const ai = mode === 'ai'
  const rows: [string, string, string][] = [
    ['Category', ai ? 'Shipping & Delivery' : 'General question', ai ? 'bg-violet-200 text-violet-900' : 'bg-neutral-200 text-neutral-700'],
    ['Priority', ai ? 'High' : 'Medium', ai ? 'bg-orange-200 text-orange-900' : 'bg-neutral-200 text-neutral-700'],
    ['Sentiment', ai ? 'Frustrated' : 'Not detected', ai ? 'bg-rose-200 text-rose-900' : 'bg-neutral-200 text-neutral-700'],
    ['Reply target', ai ? 'Within 24h' : 'Default 48h', ai ? 'bg-emerald-200 text-emerald-900' : 'bg-neutral-200 text-neutral-700'],
  ]
  return (
    <Tile className="md:col-span-7 md:row-span-2" tone="bg-(--lp-paper) text-(--lp-ink)" title="Rules guess. AI understands.">
      <p className="max-w-md text-[15px] text-neutral-700">Flip the switch to see what the same ticket looks like with keyword rules versus AI triage. Rules stay on as the safety net.</p>
      <div className="mt-5">
        <Seg value={mode} options={[{ v: 'rules', label: 'Keyword rules' }, { v: 'ai', label: 'AI triage' }]} onChange={(v) => { touched.current = true; setMode(v) }} />
      </div>
      <div className="mt-5 flex flex-1 flex-col rounded-3xl bg-white p-5 shadow-sm ring-1 ring-black/5">
        <p className="text-[15px] font-semibold">Parcel hasn’t moved for two weeks</p>
        <p className="mt-0.5 text-[13px] text-neutral-500">“It was meant to be a gift and the tracking hasn’t changed for days. Has it been lost?”</p>
        <div className="mt-4 flex flex-1 flex-col justify-evenly gap-2.5">
          {rows.map(([k, v, c]) => (
            <div key={k} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3.5 py-2.5">
              <span className="text-[12px] font-medium text-neutral-500">{k}</span>
              <AnimatePresence mode="wait">
                <motion.span key={v} initial={{ opacity: 0, y: 8, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.9 }} transition={{ duration: 0.25 }} className={cn('rounded-full px-3 py-1 text-xs font-semibold', c)}>
                  {v}
                </motion.span>
              </AnimatePresence>
            </div>
          ))}
        </div>
        <div className="mt-4 min-h-[3.6rem] rounded-xl bg-violet-50 px-3.5 py-2.5 text-[12.5px] leading-snug text-violet-950">
          <AnimatePresence mode="wait">
            <motion.div key={mode} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
              {ai ? (
                <>
                  <Sparkles className="mr-1 inline size-3.5 text-violet-600" /> Customer’s parcel has shown no tracking movement for over a week and they fear it is lost. <b>91% confident.</b>
                </>
              ) : (
                <span className="text-neutral-500">No summary. Matched the word “parcel” and defaulted to Medium.</span>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </Tile>
  )
}

/* ------------------------------- Drafts ------------------------------- */
const SOURCES = [
  { t: 'Refunds and credits', p: 'Annual plans can be refunded in full within 14 days of purchase or renewal.' },
  { t: 'Plans, seats and overage', p: 'Adding a seat mid-cycle is prorated for the remaining days of the period.' },
]
function Cite({ i, active, onActive }: { i: number; active: number; onActive: (i: number) => void }) {
  return (
    <button type="button" onMouseEnter={() => onActive(i)} onFocus={() => onActive(i)} className={cn('lp-focus mx-0.5 inline-flex size-5 -translate-y-0.5 items-center justify-center rounded-full text-[10px] font-bold transition-colors', active === i ? 'bg-(--lp-ink) text-(--lp-lime)' : 'bg-black/15 text-(--lp-ink)')} aria-label={`Source ${i + 1}: ${SOURCES[i].t}`}>
      {i + 1}
    </button>
  )
}

function DraftsTile() {
  const [active, setActive] = useState(0)
  const touched = useRef(false)
  useEffect(() => {
    const id = window.setInterval(() => {
      if (!touched.current) setActive((a) => (a + 1) % 2)
    }, 3000)
    return () => window.clearInterval(id)
  }, [])
  return (
    <Tile className="md:col-span-5" tone="bg-(--lp-lime) text-(--lp-ink)" title="Every line points to a source.">
      <p className="rounded-2xl bg-white/70 p-4 text-[14px] leading-relaxed">
        Annual plans can be refunded in full within 14 days <Cite i={0} active={active} onActive={(i) => { touched.current = true; setActive(i) }} />, and extra seats are prorated for the days you use <Cite i={1} active={active} onActive={(i) => { touched.current = true; setActive(i) }} />. I’ve raised your refund now.
      </p>
      <div className="mt-3 space-y-1.5">
        {SOURCES.map((s, i) => (
          <motion.div key={s.t} animate={{ opacity: active === i ? 1 : 0.45, x: active === i ? 0 : -4 }} className={cn('rounded-xl px-3 py-2 text-[12px] transition-colors', active === i ? 'bg-(--lp-ink) text-white' : 'bg-white/50')}>
            <b>{s.t}</b>
            <span className="block opacity-80">{s.p}</span>
          </motion.div>
        ))}
      </div>
    </Tile>
  )
}

/* ------------------------------- SLA queue ------------------------------- */
const QUEUE = [
  { id: 'a', t: 'How do I build a funnel?', p: 'Low', c: 'bg-sky-200 text-sky-900', sla: '2h' },
  { id: 'b', t: 'Entire company locked out via SSO', p: 'Critical', c: 'bg-red-200 text-red-900', sla: '1h' },
  { id: 'c', t: 'Dashboard numbers look stale', p: 'Medium', c: 'bg-amber-200 text-amber-900', sla: '8h' },
  { id: 'd', t: 'Charged twice this month', p: 'High', c: 'bg-orange-200 text-orange-900', sla: '3h' },
]
const RANK: Record<string, number> = { Critical: 0, High: 1, Medium: 2, Low: 3 }
function SlaTile() {
  const [sorted, setSorted] = useState(false)
  const rows = sorted ? [...QUEUE].sort((a, b) => RANK[a.p] - RANK[b.p]) : QUEUE
  return (
    <Tile className="md:col-span-5" tone="bg-white text-(--lp-ink)" title="Urgent first. Always.">
      <button type="button" onClick={() => setSorted((s) => !s)} className="lp-focus mb-3 inline-flex self-start items-center gap-2 rounded-full bg-(--lp-ink) px-4 py-2 text-xs font-semibold text-white transition-transform hover:scale-[1.03]">
        <Zap className="size-3.5 text-(--lp-lime)" /> {sorted ? 'Show arrival order' : 'Sort by urgency'}
      </button>
      <LayoutGroup>
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <motion.li layout key={r.id} transition={{ type: 'spring', stiffness: 420, damping: 36 }} className="flex items-center gap-2 rounded-xl bg-neutral-50 px-3 py-2 text-[12.5px] ring-1 ring-black/5">
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', r.c)}>{r.p}</span>
              <span className="min-w-0 flex-1 truncate">{r.t}</span>
              <span className={cn('shrink-0 text-[11px] font-semibold', r.p === 'Critical' ? 'text-red-600' : 'text-neutral-400')}>{r.sla}</span>
            </motion.li>
          ))}
        </ul>
      </LayoutGroup>
    </Tile>
  )
}

/* ------------------------------- Duplicates ------------------------------- */
function DuplicateTile() {
  const [open, setOpen] = useState(false)
  const cards = [
    { t: 'Refund for the annual plan', m: '92%' },
    { t: 'Please refund my subscription', m: '88%' },
    { t: 'Charged twice for invoice', m: '81%' },
  ]
  return (
    <Tile className="md:col-span-6 lg:col-span-4" tone="bg-[#ffd8cc] text-[#3a1208]" title="Spot repeats before you reply.">
      <div className="relative mt-2 h-52" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} tabIndex={0} role="group" aria-label="Similar tickets, hover to fan out">
        {cards.map((c, i) => (
          <motion.div key={c.t} animate={{ y: open ? i * 58 : i * 20, scale: open ? 1 : 1 - i * 0.04, rotate: open ? 0 : (i - 1) * 2 }} transition={{ type: 'spring', stiffness: 300, damping: 26 }} style={{ zIndex: 3 - i }} className="absolute inset-x-0 top-0 flex items-center gap-2 rounded-2xl bg-white px-3.5 py-3 text-[13px] shadow-md ring-1 ring-black/5">
            <Copy className="size-4 shrink-0 text-[#c2410c]" />
            <span className="min-w-0 flex-1 truncate font-medium">{c.t}</span>
            <span className="rounded-full bg-[#ffd8cc] px-2 py-0.5 text-[11px] font-bold">{c.m}</span>
          </motion.div>
        ))}
      </div>
    </Tile>
  )
}

/* ------------------------------- Deflection ------------------------------- */
function DeflectTile() {
  const [solved, setSolved] = useState(0)
  const [yes, setYes] = useState(false)
  const typed = useTypewriter('my SSO keeps redirecting to login', true, 55)
  return (
    <Tile className="md:col-span-6 lg:col-span-4" tone="bg-(--lp-ink) text-white" title="Answers before tickets.">
      <div className="rounded-2xl bg-white/10 px-3.5 py-2.5 text-[13px] text-white/80 ring-1 ring-white/10">
        {typed.shown}
        <span className="lp-caret ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-(--lp-lime)" />
      </div>
      <div className="mt-2.5 rounded-2xl bg-(--lp-lime) p-3.5 text-(--lp-ink)">
        <p className="text-[11px] font-bold tracking-wide uppercase opacity-70">Does this answer it?</p>
        <p className="text-[13.5px] font-semibold">Single sign-on and login issues</p>
        <div className="mt-2 flex items-center gap-2">
          <button type="button" onClick={() => { setYes(true); setSolved((n) => n + 1) }} className="lp-focus flex items-center gap-1 rounded-full bg-(--lp-ink) px-3.5 py-1.5 text-xs font-semibold text-white">
            <Check className="size-3.5" /> Yes, solved
          </button>
          <AnimatePresence>
            {yes && (
              <motion.span key={solved} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="text-[12px] font-semibold">
                +{solved} ticket{solved > 1 ? 's' : ''} avoided
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Tile>
  )
}

/* ------------------------------- Realtime ------------------------------- */
const TOASTS = ['Priya replied on TKT-0001', 'New ticket from Marcus', 'Elena resolved TKT-0009', 'Aisha rated 5 stars']
function RealtimeTile() {
  // Always exactly three toasts: the newest pushes in at the top and the oldest pops out of the layout, so the stack
  // (and with it the tile) keeps one height instead of growing to four rows on every tick.
  const [n, setN] = useState(2)
  const reduce = useReducedMotion()
  useEffect(() => {
    if (reduce) return
    const id = window.setInterval(() => setN((v) => v + 1), 2300)
    return () => window.clearInterval(id)
  }, [reduce])
  const visible = [n, n - 1, n - 2]
  return (
    <Tile className="md:col-span-5 lg:col-span-4" tone="bg-[#cfe7ff] text-[#071c33]" title="No refresh button.">
      <div className="flex items-center gap-2 text-[12px] font-semibold">
        <span className="relative flex size-2.5">
          <span className="lp-pulse-ring absolute inline-flex size-2.5 rounded-full bg-emerald-500" />
          <span className="relative inline-flex size-2.5 rounded-full bg-emerald-600" />
        </span>
        Live
      </div>
      <div className="relative mt-3 h-[8.5rem] space-y-2 overflow-hidden">
        <AnimatePresence initial={false} mode="popLayout">
          {visible.map((i, idx) => (
            <motion.div key={i} layout initial={{ opacity: 0, y: -18, scale: 0.96 }} animate={{ opacity: 1 - idx * 0.28, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.4, ease: EASE }} className="flex h-10 items-center rounded-xl bg-white px-3.5 text-[12.5px] font-medium shadow-sm">
              <span className="truncate">{TOASTS[i % TOASTS.length]}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </Tile>
  )
}

/* ------------------------------- Teams ------------------------------- */
const WORKSPACES = [
  { v: 'lumen', label: 'Lumen', people: [['RP', 'Admin'], ['JB', 'Agent'], ['EL', 'Agent']] as [string, string][], color: 'bg-violet-300' },
  { v: 'north', label: 'Northstar', people: [['MC', 'Owner'], ['LO', 'Agent'], ['NH', 'Requester']] as [string, string][], color: 'bg-cyan-300' },
  { v: 'tide', label: 'Tidewater', people: [['AM', 'Owner'], ['OS', 'Requester'], ['EB', 'Requester']] as [string, string][], color: 'bg-orange-300' },
]
function TeamsTile() {
  const [ws, setWs] = useState('lumen')
  const cur = WORKSPACES.find((w) => w.v === ws) ?? WORKSPACES[0]
  return (
    <Tile className="md:col-span-7 lg:col-span-5" tone="bg-[#e3d9ff] text-[#1c0f4d]" title="Every workspace is its own world.">
      <Seg value={ws} onChange={setWs} options={WORKSPACES.map((w) => ({ v: w.v, label: w.label }))} />
      <div className="mt-4 flex items-center gap-2.5" aria-live="polite">
        <AnimatePresence mode="popLayout">
          {cur.people.map(([ini, role], i) => (
            <motion.div key={ws + ini} initial={{ opacity: 0, y: 14, scale: 0.8 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} transition={{ delay: i * 0.07, type: 'spring', stiffness: 360, damping: 24 }} className="flex flex-col items-center gap-1.5">
              <span className={cn('flex size-12 items-center justify-center rounded-full text-sm font-bold text-black/80 ring-2 ring-white', cur.color)}>{ini}</span>
              <span className="rounded-full bg-white/80 px-2 py-0.5 text-[10px] font-bold">{role}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        <Users className="ml-auto size-6 opacity-30" />
      </div>
      <p className="mt-3 text-[12px] opacity-70">Tickets, articles and data never cross workspaces.</p>
    </Tile>
  )
}

/* ------------------------------- Analytics + CSAT ------------------------------- */
const BARS = [30, 52, 41, 66, 48, 72, 58, 84, 62, 76, 90, 70, 94, 80]
function AnalyticsTile() {
  const [stars, setStars] = useState(4)
  return (
    <Tile className="md:col-span-12 lg:col-span-7" tone="bg-(--lp-amber) text-[#2a1a00]" title="Know how support is really going.">
      <div className="flex items-end gap-1.5 rounded-2xl bg-white/60 p-4" style={{ height: '8.5rem' }} aria-hidden>
        {BARS.map((h, i) => (
          <motion.span key={i} initial={{ height: 0 }} whileInView={{ height: `${h}%` }} viewport={{ once: true }} transition={{ delay: i * 0.04, duration: 0.7, ease: EASE }} className="flex-1 rounded-t-md bg-(--lp-ink)/85" />
        ))}
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        {[
          ['38m', 'avg first reply'],
          ['94%', 'within SLA'],
          [`${stars}.0`, 'your rating'],
        ].map(([v, l]) => (
          <div key={l} className="rounded-xl bg-white/60 px-2 py-2">
            <p className="text-xl font-semibold tracking-tight">{v}</p>
            <p className="text-[10.5px] font-medium opacity-70">{l}</p>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-1" role="radiogroup" aria-label="Try rating">
        <BarChart3 className="mr-2 size-4 opacity-60" />
        {[1, 2, 3, 4, 5].map((i) => (
          <button key={i} type="button" role="radio" aria-checked={stars === i} aria-label={`${i} stars`} onClick={() => setStars(i)} className="lp-focus rounded transition-transform hover:scale-125">
            <Star className={cn('size-6 transition-colors', i <= stars ? 'fill-[#2a1a00] text-[#2a1a00]' : 'text-[#2a1a00]/30')} />
          </button>
        ))}
        <span className="ml-2 text-[11px] font-semibold opacity-70">Try it</span>
      </div>
    </Tile>
  )
}


export function Bento() {
  return (
    <section id="features" data-nav="dark" className="relative -mt-10 rounded-t-[2.5rem] bg-(--lp-features) pb-28 text-white">
      <div className="relative mx-auto max-w-6xl px-5 pt-24 sm:px-8 sm:pt-32">
        <div>
        <h2 className="max-w-4xl text-[clamp(2.3rem,6.4vw,5rem)] leading-[0.98] font-semibold tracking-[-0.045em] text-balance">
          <WordReveal text="Everything a support desk needs. Nothing it doesn’t." />
        </h2>
        <p className="mt-5 max-w-xl text-lg text-white/75">Poke the cards. They’re live.</p>
        </div>
        {/* bento from tablet width up: the same 12 columns, with the three small tiles paired two-up until there is room for three */}
        <div className="mt-12 grid gap-4 md:grid-cols-12">
          <TriageTile />
          <DraftsTile />
          <SlaTile />
          <DuplicateTile />
          <DeflectTile />
          <RealtimeTile />
          <TeamsTile />
          <AnalyticsTile />
        </div>
      </div>
    </section>
  )
}
