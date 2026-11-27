import { Bot, Clock, Palette, Tags, Timer, type LucideIcon } from 'lucide-react'

/** The Settings tabs. They are listed under "Settings" in the sidebar and each is its own page (`/settings/<key>`). */
export const SETTINGS_SECTIONS = [
  { key: 'general', label: 'General', title: 'General', description: 'How your workspace and its replies are presented to customers.', icon: Palette },
  { key: 'ai', label: 'AI assistant', title: 'AI assistant', description: 'What the AI does for your team, and what happens when it can’t.', icon: Bot },
  { key: 'sla', label: 'Response targets', title: 'Response targets', description: 'How quickly your team aims to send a first reply, by priority. These drive the countdowns and overdue flags in the inbox.', icon: Clock },
  { key: 'automation', label: 'Automation', title: 'Automation', description: 'Let the workspace tidy itself, so Resolved stays a short list of tickets waiting for the customer.', icon: Timer },
  { key: 'categories', label: 'Categories', title: 'Categories', description: 'The topics your tickets are sorted into. The AI picks one for every new ticket; keywords are the instant backup when it can’t.', icon: Tags },
] as const satisfies readonly { key: string; label: string; title: string; description: string; icon: LucideIcon }[]

export type SettingsKey = (typeof SETTINGS_SECTIONS)[number]['key']

export const isSettingsKey = (value: string | undefined): value is SettingsKey => SETTINGS_SECTIONS.some((s) => s.key === value)
