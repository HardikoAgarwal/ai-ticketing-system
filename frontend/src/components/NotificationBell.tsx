import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Inbox,
  MessageCircle,
  MessageSquareReply,
  MonitorSmartphone,
  type LucideIcon,
} from 'lucide-react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { useWorkspace } from '@/auth/workspace'
import { toast } from 'sonner'

import { RelativeTime } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { errorMessage } from '@/lib/api'
import type { AppNotification, NotificationKind } from '@/lib/types'
import { cn } from '@/lib/utils'
import { desktopAlertState, disableDesktopAlerts, enableDesktopAlerts, type DesktopAlertState } from '@/realtime/desktopAlerts'
import { useFallbackInterval } from '@/realtime/RealtimeProvider'

const baseTitle = () => document.title.replace(/^\(\d+\+?\)\s*/, '')

const KIND_META: Record<NotificationKind, { icon: LucideIcon; tint: string; title: (n: AppNotification) => string }> = {
  staff_reply: { icon: MessageCircle, tint: 'bg-lav text-lav-ink', title: (n) => `${n.actor_name} replied` },
  resolved: { icon: CheckCircle2, tint: 'bg-mint text-mint-ink', title: () => 'Marked as resolved. Please confirm' },
  new_ticket: { icon: Inbox, tint: 'bg-sky text-sky-ink', title: (n) => `New ticket from ${n.actor_name}` },
  requester_reply: { icon: MessageSquareReply, tint: 'bg-lav text-lav-ink', title: (n) => `${n.actor_name} replied` },
}

const URGENT = new Set(['CRITICAL', 'HIGH'])

function NotificationItem({ item, onOpen }: { item: AppNotification; onOpen: () => void }) {
  const meta = KIND_META[item.kind]
  const urgent = item.kind === 'new_ticket' && item.priority && URGENT.has(item.priority)
  return (
    <button onClick={onOpen} className="flex w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none">
      <span className={cn('flex size-9 shrink-0 items-center justify-center rounded-control', urgent ? 'bg-rose text-rose-ink' : meta.tint)}>
        <meta.icon className="size-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-semibold">{meta.title(item)}</span>
          <RelativeTime value={item.at} className="shrink-0 text-[11px] text-muted-foreground" />
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="shrink-0 font-mono whitespace-nowrap">{item.reference}</span>
          <span aria-hidden>·</span>
          <span className="truncate">{item.subject}</span>
        </span>
        {item.preview && <span className="mt-1.5 line-clamp-2 text-xs text-foreground/70">{item.preview}</span>}
        {(urgent || item.owner === 'unassigned') && (
          <span className="mt-2 flex gap-1.5">
            {urgent && (
              <span className="rounded-chip border border-rose-line bg-rose px-2 py-0.5 text-[11px] font-semibold text-rose-ink">
                {item.priority === 'CRITICAL' ? 'Critical' : 'High'} priority
              </span>
            )}
            {item.owner === 'unassigned' && (
              <span className="rounded-chip border border-line bg-sunken px-2 py-0.5 text-[11px] font-medium text-ink-2">Unassigned</span>
            )}
          </span>
        )}
      </span>
    </button>
  )
}

function DesktopAlertsRow() {
  const [state, setState] = useState<DesktopAlertState>(desktopAlertState)
  if (state === 'unsupported') return null
  return (
    <div className="flex items-center gap-3 border-t bg-muted/30 px-4 py-3">
      <MonitorSmartphone className="size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium">Desktop alerts</p>
        <p className="text-[11px] text-muted-foreground">
          {state === 'on'
            ? 'On. We alert you when this tab is in the background.'
            : state === 'blocked'
              ? 'Blocked. Allow notifications in your browser settings.'
              : 'Get alerted even when this tab is in the background.'}
        </p>
      </div>
      {state === 'on' ? (
        <Button variant="ghost" size="sm" onClick={() => (disableDesktopAlerts(), setState(desktopAlertState()))}>
          Turn off
        </Button>
      ) : state === 'off' ? (
        <Button variant="outline" size="sm" onClick={async () => setState(await enableDesktopAlerts())}>
          Turn on
        </Button>
      ) : null}
    </div>
  )
}

export function NotificationBell({ variant = 'icon', large, rowClassName, labelClassName, badgeClassName }: { variant?: 'icon' | 'dock'; /** Icon only: a bigger button for roomy headers. */ large?: boolean; rowClassName?: string; labelClassName?: string; /** Dock only: where the unread count shows (a badge on the right), so the caller can hide it while the sidebar is narrow. */ badgeClassName?: string }) {
  const { slug, api, staff } = useWorkspace()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const refetchInterval = useFallbackInterval(30_000)
  const { data } = useQuery({ queryKey: ['notifications', slug], queryFn: api.tickets.notifications, refetchInterval })
  const count = data?.count ?? 0
  const items = data?.items ?? []
  const hasReadable = items.some((i) => i.kind !== 'resolved')

  useEffect(() => {
    const base = baseTitle()
    document.title = count > 0 ? `(${count}) ${base}` : base
    return () => {
      document.title = baseTitle()
    }
  }, [count])

  const markAll = useMutation({
    mutationFn: api.tickets.markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['tickets'] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const openTicket = (item: AppNotification) => {
    setOpen(false)
    navigate(`/w/${slug}/${staff ? 'agent' : 'help'}/tickets/${item.ticket_id}`)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {variant === 'dock' ? (
          <button type="button" className={rowClassName} aria-label={count ? `Notifications, ${count} new` : 'Notifications'}>
            <span className="relative flex size-[18px] shrink-0 items-center justify-center">
              <Bell className="size-[18px]" aria-hidden />
              {count > 0 && <span className="absolute -top-1 -right-1.5 size-2 rounded-full bg-rose-ink ring-2 ring-surface" aria-hidden />}
            </span>
            <span className={cn('flex-1 text-left', labelClassName)}>Notifications</span>
            {count > 0 && <span className={cn('h-6 min-w-6 items-center justify-center rounded-md bg-rose-ink px-2 text-[13px] font-bold text-canvas tabular-nums', badgeClassName)}>{count > 99 ? '99+' : count}</span>}
          </button>
        ) : (
          <Button variant="ghost" size="icon-sm" className={cn('relative', large && 'size-11 rounded-full')} aria-label={count ? `Notifications, ${count} new` : 'Notifications'}>
            <Bell className={large ? 'size-[22px]' : 'size-[18px]'} />
            {count > 0 && (
              <span
                className={cn(
                  'absolute flex items-center justify-center rounded-md bg-rose-ink leading-none font-semibold text-canvas ring-2',
                  large ? 'top-1 right-1 h-[18px] min-w-[18px] px-1 text-[11px] ring-surface' : '-top-1 -right-1 h-4 min-w-4 px-1 text-[10px] ring-canvas',
                )}
              >
                {count > 9 ? '9+' : count}
              </span>
            )}
          </Button>
        )}
      </PopoverTrigger>
      <PopoverContent
        align={variant === 'dock' ? 'end' : 'end'}
        side={variant === 'dock' ? 'right' : 'bottom'}
        sideOffset={8}
        onOpenAutoFocus={(e) => e.preventDefault()}
        className="w-[400px] max-w-[calc(100vw-1.5rem)] gap-0 overflow-hidden rounded-panel p-0">
        <div className="flex items-center justify-between gap-3 border-b px-4 py-3">
          <p className="flex items-center gap-2 text-sm font-semibold">
            Notifications
            {count > 0 && <span className="rounded-chip bg-lav px-2 py-0.5 text-[11px] font-semibold text-lav-ink">{count} new</span>}
          </p>
          {hasReadable && (
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <CheckCheck className="size-3.5" /> Mark all as read
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center px-6 py-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-panel bg-sunken text-muted-foreground">
              <BellOff className="size-5" />
            </span>
            <p className="mt-3 text-sm font-semibold">You're all caught up</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {staff ? 'New tickets and customer replies will show up here.' : 'Replies from our team will show up here.'}
            </p>
          </div>
        ) : (
          <div className="max-h-[min(440px,60vh)] divide-y overflow-y-auto">
            {items.map((item) => (
              <NotificationItem key={item.id} item={item} onOpen={() => openTicket(item)} />
            ))}
          </div>
        )}

        <DesktopAlertsRow />
      </PopoverContent>
    </Popover>
  )
}
