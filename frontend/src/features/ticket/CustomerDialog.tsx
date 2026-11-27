import { Building2, CalendarDays, Check, Copy, FolderOpen, Mail, Package, Sparkles, Ticket } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { toast } from 'sonner'

import { Avatar, Chip, KeyValue, KeyValueList } from '@/components/ds'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { formatDate, formatValue, labelize } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { StaffTicketDetail } from '@/lib/types'

import { FACT_LABEL } from './TicketFields'

function Figure({ icon: Icon, label, className, children }: { icon: typeof Ticket; label: string; className?: string; children: ReactNode }) {
  return (
    <div className={cn('min-w-0 rounded-control border border-line bg-surface px-3.5 py-3', className)}>
      <p className="flex items-center gap-1.5 text-xs font-medium text-ink-3"><Icon className="size-3.5" aria-hidden /> {label}</p>
      <p className="mt-1 text-lg leading-6 font-semibold tracking-tight text-ink tabular-nums">{children}</p>
    </div>
  )
}

/**
 * Everything known about the person who raised the ticket, opened from the ticket header: who they are, how long they have been a customer and
 * how often they write in, the account facts on their profile, and the record (order, subscription, device) this ticket is about.
 */
export function CustomerDialog({ ticket, open, onOpenChange }: { ticket: StaffTicketDetail; open: boolean; onOpenChange: (open: boolean) => void }) {
  const [copied, setCopied] = useState(false)
  const rp = ticket.requester_profile
  const record = ticket.record_detail
  const profile = Object.entries(rp.profile)

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(rp.email)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      toast.error('Could not copy. Select the address and copy it manually.')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(88svh,46rem)] grid-cols-[minmax(0,1fr)] gap-0 overflow-y-auto p-0 sm:max-w-2xl">
        <div className="flex items-center gap-3 border-b border-line bg-surface-2 px-5 py-5 pr-12 sm:gap-4 sm:px-8 sm:py-6">
          <Avatar name={rp.name} size="xl" />
          <div className="min-w-0 flex-1">
            <p className={FACT_LABEL}>Customer</p>
            <DialogTitle className="truncate text-2xl leading-8 font-semibold tracking-tight text-ink">{rp.name}</DialogTitle>
            <DialogDescription className="sr-only">Profile, account facts and the record linked to this ticket.</DialogDescription>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              {rp.company && <Chip tone="slate" icon={Building2} size="sm">{rp.company}</Chip>}
              <span className="inline-flex max-w-full min-w-0 items-center gap-1 text-[13px] text-ink-2">
                <a href={`mailto:${rp.email}`} className="inline-flex min-w-0 items-center gap-1.5 hover:text-ink hover:underline">
                  <Mail className="size-3.5 shrink-0" aria-hidden /> <span className="truncate">{rp.email}</span>
                </a>
                <button type="button" onClick={copyEmail} aria-label={copied ? 'Email copied' : 'Copy email address'} className="flex size-7 shrink-0 items-center justify-center rounded-chip text-ink-3 hover:bg-sunken hover:text-ink">
                  {copied ? <Check className="size-3.5 text-mint-ink" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                </button>
              </span>
            </div>
          </div>
        </div>

        <div className="space-y-7 px-5 py-6 sm:px-8">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Figure icon={Ticket} label="Tickets">{rp.tickets_count}</Figure>
            <Figure icon={FolderOpen} label="Records">{rp.records_count}</Figure>
            <Figure icon={CalendarDays} label="Customer since" className="max-sm:col-span-2">{rp.joined ? formatDate(rp.joined) : '—'}</Figure>
          </div>

          <section aria-label="Account">
            {profile.length ? (
              <KeyValueList columns={3}>
                {profile.map(([k, v]) => <KeyValue key={k} label={labelize(k)}>{formatValue(v)}</KeyValue>)}
              </KeyValueList>
            ) : (
              <p className="text-sm text-ink-3">No account facts are stored for this customer.</p>
            )}
          </section>

          {record && (
            <section aria-labelledby="customer-record">
              <h3 id="customer-record" className={FACT_LABEL}>Linked to this ticket</h3>
              <div className="mt-3 rounded-panel border border-line bg-surface-2 p-4">
                <div className="flex flex-wrap items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-control bg-ink text-canvas" aria-hidden><Package className="size-[18px]" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-ink-3">{record.kind}</p>
                    <p className="text-[15px] leading-5 font-semibold [overflow-wrap:anywhere] text-ink">{record.title}</p>
                    <p className="mt-0.5 font-mono text-xs text-ink-2">{record.reference}{record.status && <span className="font-sans"> · {record.status}</span>}</p>
                  </div>
                  <Chip tone="ai" icon={Sparkles} size="sm">Used by AI</Chip>
                </div>
                {Object.keys(record.data).length > 0 && (
                  <KeyValueList columns={3} className="mt-4 border-t border-line pt-4">
                    {Object.entries(record.data).map(([k, v]) => <KeyValue key={k} label={labelize(k)}>{formatValue(v)}</KeyValue>)}
                  </KeyValueList>
                )}
              </div>
            </section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
