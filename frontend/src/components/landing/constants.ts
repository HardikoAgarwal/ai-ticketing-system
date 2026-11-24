import { Cloud, Monitor, ShoppingBag, type LucideIcon } from 'lucide-react'

/** One place to rename the product. */
export const BRAND = 'Helpdesk AI'
export const GITHUB_URL = 'https://github.com/HardikoAgarwal/ai-ticketing-system'

export interface PreviewTicket {
  ref: string
  subject: string
  priority: 'Critical' | 'High' | 'Medium' | 'Low'
  category: string
  who: string
  sla: string
  late?: boolean
  mood?: 'Frustrated' | 'Neutral' | 'Happy'
}

export interface TemplateMeta {
  key: string
  name: string
  tagline: string
  industry: string
  icon: LucideIcon
  /** Tailwind-free accent so each company feels distinct. */
  hue: string
  soft: string
  blurb: string
  highlights: string[]
  tickets: PreviewTicket[]
}

/** Static fallback so the picker is instant even while the free API wakes up; live data overrides names/taglines. */
export const TEMPLATES: TemplateMeta[] = [
  {
    key: 'saas',
    name: 'Lumen Analytics',
    tagline: 'Product analytics for modern teams',
    industry: 'SaaS',
    icon: Cloud,
    hue: '#7c3aed',
    soft: 'rgba(124,58,237,0.10)',
    blurb: 'Billing disputes, SSO lockouts, API rate limits and a Segment pipeline outage.',
    highlights: ['Enterprise SSO emergency', 'Duplicate charge refund', 'API 429 backfill'],
    tickets: [
      { ref: 'TKT-0001', subject: 'Segment events missing since this morning', priority: 'Critical', category: 'Integrations & API', who: 'Priya Raman', sla: 'Overdue 1h', late: true, mood: 'Frustrated' },
      { ref: 'TKT-0004', subject: 'Entire company locked out via Okta SSO', priority: 'Critical', category: 'Account & Access', who: 'Sofia Alvarez', sla: 'Reply in 1h', mood: 'Frustrated' },
      { ref: 'TKT-0005', subject: 'Getting 429 errors on the ingestion API', priority: 'High', category: 'Integrations & API', who: 'Aisha Khan', sla: 'Reply in 9h' },
      { ref: 'TKT-0003', subject: 'Charged twice for this month’s invoice', priority: 'High', category: 'Billing & Plans', who: 'Tom Becker', sla: 'Responded', mood: 'Frustrated' },
      { ref: 'TKT-0008', subject: 'How do I build a funnel by channel?', priority: 'Low', category: 'How-to', who: 'Priya Raman', sla: 'Reply in 2h', mood: 'Happy' },
    ],
  },
  {
    key: 'helpdesk',
    name: 'Northstar IT Helpdesk',
    tagline: 'Internal IT support for Northstar Group employees',
    industry: 'IT helpdesk',
    icon: Monitor,
    hue: '#0ea5e9',
    soft: 'rgba(14,165,233,0.10)',
    blurb: 'Laptop provisioning, VPN trouble, access requests and a phishing report.',
    highlights: ['Phishing click, treated as critical', 'MFA lockout after phone change', 'New starter laptop'],
    tickets: [
      { ref: 'TKT-0008', subject: 'I clicked a link in a suspicious email', priority: 'Critical', category: 'Accounts & Access', who: 'Maya Chen', sla: 'Reply in 30m', mood: 'Frustrated' },
      { ref: 'TKT-0001', subject: 'VPN says authentication failed before a client demo', priority: 'High', category: 'Accounts & Access', who: 'Liam O’Brien', sla: 'Overdue 2h', late: true },
      { ref: 'TKT-0007', subject: 'Locked out after changing my phone, no MFA codes', priority: 'High', category: 'Accounts & Access', who: 'Noor Hassan', sla: 'Reply in 3h' },
      { ref: 'TKT-0002', subject: 'Laptop battery dies within an hour', priority: 'Medium', category: 'Hardware & Devices', who: 'Ben Carter', sla: 'Reply in 20h' },
      { ref: 'TKT-0006', subject: 'Laptop for a new starter joining next week', priority: 'Medium', category: 'General Request', who: 'Aria Patel', sla: 'Reply in 31h', mood: 'Happy' },
    ],
  },
  {
    key: 'ecommerce',
    name: 'Tidewater Goods',
    tagline: 'Sustainable homewares, shipped worldwide',
    industry: 'E-commerce',
    icon: ShoppingBag,
    hue: '#f97316',
    soft: 'rgba(249,115,22,0.10)',
    blurb: 'Late deliveries, damaged items, refunds and a wrong-size exchange.',
    highlights: ['Parcel stuck for two weeks', 'Cracked bowl replacement', 'Charged without confirmation'],
    tickets: [
      { ref: 'TKT-0001', subject: 'Parcel hasn’t moved for two weeks', priority: 'High', category: 'Shipping & Delivery', who: 'Lucas Meyer', sla: 'Reply in 18h', mood: 'Frustrated' },
      { ref: 'TKT-0008', subject: 'I was charged but never got a confirmation', priority: 'High', category: 'Payments & Discounts', who: 'Emily Brooks', sla: 'Reply in 19h', mood: 'Frustrated' },
      { ref: 'TKT-0002', subject: 'Serving bowl arrived cracked', priority: 'Medium', category: 'Product issues', who: 'James Chen', sla: 'Reply in 26h' },
      { ref: 'TKT-0005', subject: 'Return a duvet cover that’s too big', priority: 'Low', category: 'Returns & Refunds', who: 'Oliver Smith', sla: 'Responded' },
      { ref: 'TKT-0007', subject: 'When will the walnut boards be back in stock?', priority: 'Low', category: 'General Question', who: 'Oliver Smith', sla: 'Reply in 2h', mood: 'Happy' },
    ],
  },
]

export const PRIORITY_STYLE: Record<PreviewTicket['priority'], string> = {
  Critical: 'bg-red-50 text-red-700 ring-red-600/20',
  High: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  Medium: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  Low: 'bg-sky-50 text-sky-700 ring-sky-600/20',
}

export const MOOD_STYLE: Record<NonNullable<PreviewTicket['mood']>, string> = {
  Frustrated: 'bg-rose-50 text-rose-700 ring-rose-600/20',
  Neutral: 'bg-slate-50 text-slate-700 ring-slate-600/20',
  Happy: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

export const USE_CASES = ['SaaS support', 'IT helpdesks', 'E-commerce', 'Agencies', 'Clinics & care', 'Schools', 'Marketplaces', 'Property managers', 'Fintech ops', 'Community teams']
