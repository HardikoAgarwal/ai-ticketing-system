import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Check, Copy, Loader2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'

import { useWorkspace } from '@/auth/workspace'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { errorMessage } from '@/lib/api'
import { cn } from '@/lib/utils'
import type { Invite } from '@/lib/types'

import { ROLE_META } from './roles'

export function inviteLink(token: string) {
  return `${window.location.origin}/invite/${token}`
}

export async function copyInviteLink(token: string) {
  try {
    await navigator.clipboard.writeText(inviteLink(token))
    return true
  } catch {
    toast.error('Could not copy. Select the link and copy it manually.')
    return false
  }
}

const CHOICES = ['AGENT', 'ADMIN'] as const

/** Create an invite: email and role. Then the private link is shown to copy and share; the person picks their own password. */
export function InviteDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { slug, api } = useWorkspace()
  const queryClient = useQueryClient()
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<(typeof CHOICES)[number]>('AGENT')
  const [created, setCreated] = useState<Invite | null>(null)
  const [copied, setCopied] = useState(false)

  const invite = useMutation({
    mutationFn: () => api.createInvite({ email: email.trim(), role }),
    onSuccess: (inv) => {
      setCreated(inv)
      queryClient.invalidateQueries({ queryKey: ['invites', slug] })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  const close = (next: boolean) => {
    onOpenChange(next)
    if (!next) setTimeout(() => { setCreated(null); setEmail(''); setRole('AGENT'); setCopied(false) }, 200)
  }
  const copy = async () => {
    if (!created) return
    if (await copyInviteLink(created.token)) {
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="gap-0 p-0 sm:max-w-lg">
        <div className="border-b border-line px-6 py-6 pr-14">
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">{created ? 'Invite ready' : 'Invite a teammate'}</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">
            {created ? `Send this private link to ${created.email}. They choose their own password.` : 'We create a private link. Share it with them and they choose their own password.'}
          </DialogDescription>
        </div>

        {created ? (
          <div className="space-y-4 px-6 py-6">
            <div className="flex items-center gap-2">
              <Input readOnly value={inviteLink(created.token)} aria-label="Invite link" className="h-12 flex-1 font-mono text-[13px]" onFocus={(e) => e.currentTarget.select()} />
              <Button size="lg" className="h-12 px-5" onClick={copy}>
                {copied ? <Check /> : <Copy />} {copied ? 'Copied' : 'Copy link'}
              </Button>
            </div>
            <p className="text-[13px] leading-5 text-ink-2">You can copy it again later from Pending invites.</p>
          </div>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              if (email.trim() && !invite.isPending) invite.mutate()
            }}
          >
            <div className="space-y-6 px-6 py-6">
              <div>
                <label htmlFor="inv-email" className="block text-sm font-semibold text-ink">
                  Email
                </label>
                <Input id="inv-email" type="email" autoFocus value={email} placeholder="teammate@company.com" className="mt-2 h-12 text-base" onChange={(e) => setEmail(e.target.value)} />
              </div>
              <fieldset>
                <legend className="text-sm font-semibold text-ink">Role</legend>
                <div role="radiogroup" aria-label="Role" className="mt-2 grid gap-3 sm:grid-cols-2">
                  {CHOICES.map((c) => {
                    const m = ROLE_META[c]
                    const on = role === c
                    return (
                      <button key={c} type="button" role="radio" aria-checked={on} onClick={() => setRole(c)} className={cn('flex flex-col items-start gap-1.5 rounded-control border-2 p-3.5 text-left transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:outline-none', on ? 'border-ink bg-surface-2' : 'border-line hover:border-line-strong hover:bg-surface-2')}>
                        <span className="flex items-center gap-2 text-sm font-semibold text-ink">
                          <m.icon className="size-4" aria-hidden /> {m.label}
                        </span>
                        <span className="text-[13px] leading-5 text-ink-2">{c === 'AGENT' ? 'Works tickets and replies to customers.' : 'Also manages settings, the knowledge base and the team.'}</span>
                      </button>
                    )
                  })}
                </div>
              </fieldset>
            </div>
            <div className="flex justify-end gap-3 border-t border-line bg-surface-2 px-6 py-4">
              <Button type="button" variant="outline" size="lg" className="h-11" onClick={() => close(false)}>
                Cancel
              </Button>
              <Button type="submit" size="lg" className="h-11" disabled={!email.trim() || invite.isPending}>
                {invite.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Create invite
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
