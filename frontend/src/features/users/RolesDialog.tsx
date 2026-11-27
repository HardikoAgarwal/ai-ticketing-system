import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { RoleChip, ROLES } from './roles'

/** What each role can do, in the same plain header and divided list as the other help modals. */
export function RolesDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="scroll-quiet max-h-[90vh] gap-0 overflow-y-auto p-0 sm:max-w-xl">
        <div className="border-b border-line px-6 py-6 pr-14">
          <DialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">Roles</DialogTitle>
          <DialogDescription className="mt-1.5 text-[15px] leading-6 text-ink-2">A role decides what a person can see and change in this workspace.</DialogDescription>
        </div>
        <dl className="divide-y divide-line px-6">
          {ROLES.map((r) => (
            <div key={r.role} className="py-5">
              <dt>
                <RoleChip role={r.role} />
              </dt>
              <dd className="mt-2 text-sm leading-6 text-ink-2">{r.can}</dd>
            </div>
          ))}
        </dl>
        <p className="border-t border-line bg-surface-2 px-6 py-5 text-[13px] leading-5 text-ink-2">The owner and you can never be removed or demoted from this page. Removing someone hands their open tickets back to the queue.</p>
      </DialogContent>
    </Dialog>
  )
}
