import { Trash2 } from 'lucide-react'
import type { ReactNode } from 'react'

import { fill, on } from '@/components/ds'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from '@/components/ui/alert-dialog'

export interface ConfirmOptions {
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
}

/**
 * A roomy confirmation. A destructive one (delete, discard) gets a solid red icon tile and a solid red confirm button; the buttons sit in a
 * tinted footer bar and are large enough to hit comfortably.
 */
export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: () => void }) {
  const destructive = !!options?.destructive
  return (
    <AlertDialog open={!!options} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent className="gap-0 overflow-hidden p-0 data-[size=default]:sm:max-w-xl">
        <div className="px-6 pt-8 pb-8 sm:px-10 sm:pt-10 sm:pb-9">
          {destructive && (
            <span className="mb-6 flex size-16 items-center justify-center rounded-panel" style={{ background: fill('rose'), color: on('rose') }} aria-hidden>
              <Trash2 className="size-7" />
            </span>
          )}
          <AlertDialogTitle className="text-2xl leading-8 font-semibold tracking-tight text-ink">{options?.title}</AlertDialogTitle>
          <AlertDialogDescription className="mt-2.5 text-base leading-7 text-ink-2">{options?.description}</AlertDialogDescription>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-line bg-surface-2 px-6 py-5 sm:flex-row sm:justify-end sm:px-10 sm:py-6">
          <AlertDialogCancel className="h-12 px-6 text-[15px] font-semibold">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="h-12 px-6 text-[15px] font-semibold hover:brightness-95"
            style={destructive ? { background: fill('rose'), color: on('rose') } : undefined}
            onClick={() => {
              options?.onConfirm()
              onClose()
            }}
          >
            {destructive && <Trash2 aria-hidden />}
            {options?.confirmLabel}
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  )
}
