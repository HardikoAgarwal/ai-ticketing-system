import { AlertTriangle, Bell, CheckCheck, Clock, Flame, Inbox, MessageSquare, Sparkles, Star, Ticket, Users } from 'lucide-react'
import { useState } from 'react'

import {
  AiBadgeInline, AiChip, AiSpark, AiSurface, Avatar, Chip, EmptyState, ErrorState, IconButton, Kbd, KeyValue, KeyValueList, Panel, PanelHeader,
  ProgressBar, ProgressRing, SegmentedControl, Section, Skeleton, SkeletonRows, SkeletonText, Stat, TabPanel, Tabs, type ChipTone,
} from '@/components/ds'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme, type ThemeChoice } from '@/theme/ThemeProvider'

const TONES: ChipTone[] = ['green', 'amber', 'red', 'blue', 'violet', 'peach', 'slate', 'ai']
const SWATCHES = ['canvas', 'surface', 'surface-2', 'sunken', 'line', 'line-strong', 'ink', 'ink-2', 'ink-3', 'violet', 'violet-soft']
const PASTELS = ['lav', 'mint', 'peach', 'butter', 'rose', 'sky']

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-[11px] font-semibold tracking-[0.08em] text-ink-3 uppercase">{title}</h2>
      {children}
    </section>
  )
}

/** Hidden dev page (/_design): every primitive of the design system in every state. Not linked from the product. */
export function DesignSystemPage() {
  const { choice, setChoice } = useTheme()
  const [seg, setSeg] = useState('mine')
  const [tab, setTab] = useState<'conv' | 'details' | 'ai'>('conv')
  return (
    <div className="min-h-dvh bg-canvas text-ink">
      <div className="mx-auto max-w-5xl space-y-10 px-5 py-10">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Paper &amp; Aurora</h1>
            <p className="mt-1 text-sm text-ink-3">Design system preview. Glow means AI.</p>
          </div>
          <SegmentedControl<ThemeChoice> ariaLabel="Theme" value={choice} onChange={setChoice} options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'system', label: 'System' }]} />
        </header>

        <Block title="Surfaces and ink">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {SWATCHES.map((s) => (
              <div key={s} className="overflow-hidden rounded-control border border-line">
                <div className="h-12" style={{ background: `var(--${s})` }} />
                <p className="bg-surface px-2 py-1 text-[11px] text-ink-2">{s}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {PASTELS.map((p) => (
              <div key={p} className="rounded-control border px-2 py-3 text-xs font-semibold" style={{ background: `var(--${p})`, borderColor: `var(--${p}-line)`, color: `var(--${p}-ink)` }}>
                {p}
              </div>
            ))}
          </div>
          <div className="h-3 rounded-full" style={{ background: 'linear-gradient(90deg,var(--aurora-1),var(--aurora-2),var(--aurora-3))' }} aria-label="aurora gradient" role="img" />
        </Block>

        <Block title="Chips (always icon + text)">
          <div className="flex flex-wrap gap-2">
            {TONES.map((t) => <Chip key={t} tone={t} icon={Sparkles}>{t}</Chip>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Chip tone="red" icon={Flame} size="sm">Critical</Chip>
            <Chip tone="amber" icon={Clock} size="sm">Due in 2h</Chip>
            <Chip tone="red" icon={AlertTriangle} size="sm">Overdue 5h</Chip>
            <Chip tone="green" icon={CheckCheck} size="sm">Resolved</Chip>
            <Chip tone="blue" icon={Inbox} size="lg" onClick={() => {}}>Clickable chip</Chip>
          </div>
        </Block>

        <Block title="AI treatment">
          <div className="grid gap-4 md:grid-cols-3">
            <AiSurface tone="bold" className="p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><AiSpark /> Suggested reply <AiChip size="sm">92%</AiChip></p>
              <p className="mt-2 text-sm text-ink-2">Bold: border plus glow, for primary AI output such as the draft.</p>
            </AiSurface>
            <AiSurface tone="bold" working className="p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><AiSpark working /> Drafting…</p>
              <SkeletonText lines={3} className="mt-3" />
            </AiSurface>
            <AiSurface tone="quiet" className="p-4">
              <p className="flex items-center gap-2 text-sm font-semibold"><AiBadgeInline>AI summary</AiBadgeInline></p>
              <p className="mt-2 text-sm text-ink-2">Quiet: border only, for lists and smaller cards.</p>
              <p className="ai-text mt-3 text-2xl font-semibold">95% confident</p>
            </AiSurface>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <AiChip>AI · 95%</AiChip><AiChip working>Triaging</AiChip><AiChip size="sm" icon={Star}>Draft ready</AiChip>
          </div>
        </Block>

        <Block title="Buttons, inputs, icon buttons, keys">
          <div className="flex flex-wrap items-center gap-3">
            <Button>Primary</Button><Button variant="outline">Outline</Button><Button variant="ghost">Ghost</Button><Button variant="destructive">Destructive</Button><Button disabled>Disabled</Button>
            <Input className="w-64" placeholder="Input" aria-label="Sample input" />
            <IconButton label="Notifications" icon={Bell} shortcut="mod+k" badge={3} variant="outline" />
            <IconButton label="Messages" icon={MessageSquare} />
            <Kbd keys="mod+k" /> <Kbd keys="shift+/" /> <Kbd>Esc</Kbd>
          </div>
        </Block>

        <Block title="Avatars">
          <div className="flex flex-wrap items-center gap-3">
            {['Sofia Alvarez', 'Priya Raman', 'Marcus Webb', 'Daniel Okafor', 'Elena Rossi', 'Aisha Khan'].map((n) => <Avatar key={n} name={n} size="lg" />)}
            <Avatar name="Tiny One" size="xs" /><Avatar name="Small One" size="sm" /><Avatar name="Large One" size="xl" /><Avatar name="Round" shape="circle" />
          </div>
        </Block>

        <Block title="Segmented control and tabs">
          <SegmentedControl ariaLabel="View" value={seg} onChange={setSeg} options={[{ value: 'attention', label: 'Needs attention', count: 9 }, { value: 'mine', label: 'Mine', count: 1 }, { value: 'unassigned', label: 'Unassigned', count: 7 }, { value: 'all', label: 'All' }]} />
          <Panel>
            <Tabs idPrefix="ds" ariaLabel="Ticket sections" value={tab} onChange={setTab} items={[{ value: 'conv', label: 'Conversation', icon: MessageSquare, count: 2 }, { value: 'details', label: 'Details', icon: Ticket }, { value: 'ai', label: 'AI triage', icon: Sparkles }]} />
            <TabPanel idPrefix="ds" value="conv" current={tab} className="p-5 text-sm text-ink-2">Conversation panel. Arrow keys switch tabs; Home/End jump.</TabPanel>
            <TabPanel idPrefix="ds" value="details" current={tab} className="p-5 text-sm text-ink-2">Details panel.</TabPanel>
            <TabPanel idPrefix="ds" value="ai" current={tab} className="p-5 text-sm text-ink-2">AI panel.</TabPanel>
          </Panel>
        </Block>

        <Block title="Panel, sections, stats, key-values">
          <div className="grid gap-3 sm:grid-cols-4">
            <Stat label="Open tickets" value={18} hint="2 in progress" icon={Inbox} tone="blue" />
            <Stat label="Unassigned" value={7} hint="78% of open" icon={Users} tone="violet" />
            <Stat label="Overdue" value={3} hint="Past the target" icon={Clock} tone="red" onClick={() => {}} />
            <Stat label="Critical" value={2} icon={Flame} tone="peach" active onClick={() => {}} />
          </div>
          <Panel>
            <PanelHeader icon={Ticket} title="Ticket details" description="Everything about this request" actions={<Button size="sm" variant="outline">Edit</Button>} />
            <Section first title="Customer"><KeyValueList columns={3}><KeyValue label="Name">Sofia Alvarez</KeyValue><KeyValue label="Plan">Enterprise</KeyValue><KeyValue label="Seats">120</KeyValue></KeyValueList></Section>
            <Section title="Timing"><KeyValueList columns={3}><KeyValue label="Created">9 hours ago</KeyValue><KeyValue label="Reply due">Overdue 5h</KeyValue><KeyValue label="Owner">Unassigned</KeyValue></KeyValueList></Section>
          </Panel>
        </Block>

        <Block title="Progress">
          <div className="flex flex-wrap items-center gap-6">
            <ProgressBar className="w-64" value={62} label="SLA used" /><ProgressBar className="w-64" value={92} tone="red" label="Overdue" /><ProgressBar className="w-64" value={40} tone="ai" label="AI budget" />
            <ProgressRing value={95} label="Confidence">95</ProgressRing><ProgressRing value={30} tone="amber" label="Used" size={56}>30</ProgressRing>
          </div>
        </Block>

        <Block title="States">
          <div className="grid gap-4 md:grid-cols-2">
            <EmptyState icon={Inbox} title="Inbox zero" description="New tickets appear here instantly." action={<Button size="sm">Start a demo</Button>} />
            <EmptyState tone="ai" icon={Sparkles} title="No similar tickets" description="When the AI finds related requests they show up here." />
            <ErrorState error={new Error('Network unreachable')} onRetry={() => {}} />
            <div className="space-y-3"><SkeletonRows rows={2} /><Skeleton className="h-8 w-40" /></div>
          </div>
        </Block>
      </div>
    </div>
  )
}
