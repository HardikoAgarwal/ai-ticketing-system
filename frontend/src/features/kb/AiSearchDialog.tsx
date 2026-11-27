import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'

import { KbPlayground } from './KbPlayground'

/** "Test AI search" as a modal in the AI style: a slowly turning aurora border and glow around the tester. */
export function AiSearchDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] gap-0 overflow-visible border-0 bg-transparent p-0 shadow-none sm:max-w-2xl">
        <DialogTitle className="sr-only">Test what the AI would read</DialogTitle>
        <DialogDescription className="sr-only">Ask a customer question and see which article passages the AI would be given.</DialogDescription>
        <div className="ai-halo rounded-panel">
          <div className="scroll-quiet max-h-[88vh] overflow-y-auto rounded-panel">
            <KbPlayground animated />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
