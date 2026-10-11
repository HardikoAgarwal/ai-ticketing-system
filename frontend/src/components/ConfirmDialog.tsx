import type { ReactNode } from 'react'

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

export interface ConfirmOptions {
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  onConfirm: () => void
}

export function ConfirmDialog({ options, onClose }: { options: ConfirmOptions | null; onClose: () => void }) {
  return (
    <AlertDialog open={!!options} onOpenChange={(open) => !open && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{options?.title}</AlertDialogTitle>
          <AlertDialogDescription>{options?.description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className={options?.destructive ? 'bg-red-600 text-white hover:bg-red-700' : undefined}
            onClick={() => {
              options?.onConfirm()
              onClose()
            }}
          >
            {options?.confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
