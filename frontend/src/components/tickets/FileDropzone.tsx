import { FileText, ImageIcon, Paperclip, X } from 'lucide-react'
import { useId, useRef, useState, type DragEvent } from 'react'

import { ProgressBar } from '@/components/ds'
import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_FILES, ATTACHMENT_TYPES } from '@/lib/constants'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

/**
 * Attachment picker: click, keyboard or drag and drop. Validates type, size and count (errors are announced).
 * Pass `uploading` + `progress` (0-100) to show upload progress on the files while the form is being sent.
 */
export function FileDropzone({ files, onChange, disabled, uploading, progress = 0, error: externalError }: {
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
  uploading?: boolean
  progress?: number
  error?: string
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hintId = useId()
  const errId = useId()
  const shownError = error ?? externalError

  const add = (incoming: FileList | File[]) => {
    setError(null)
    const next = [...files]
    for (const f of Array.from(incoming)) {
      if (!ATTACHMENT_TYPES.includes(f.type)) {
        setError(`"${f.name}" isn't supported. Use PDF, PNG, JPG or WEBP.`)
        continue
      }
      if (f.size > ATTACHMENT_MAX_BYTES) {
        setError(`"${f.name}" is larger than 10 MB.`)
        continue
      }
      if (next.length >= ATTACHMENT_MAX_FILES) {
        setError(`You can attach up to ${ATTACHMENT_MAX_FILES} files.`)
        break
      }
      if (!next.some((n) => n.name === f.name && n.size === f.size)) next.push(f)
    }
    onChange(next)
  }

  const onDrop = (e: DragEvent) => {
    e.preventDefault()
    setDragging(false)
    if (!disabled) add(e.dataTransfer.files)
  }

  return (
    <div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        aria-describedby={`${hintId}${shownError ? ` ${errId}` : ''}`}
        className={cn(
          'flex min-h-24 w-full flex-col items-center justify-center rounded-panel border border-dashed px-4 py-5 text-center outline-none transition-colors focus-visible:ring-2 focus-visible:ring-violet focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          dragging ? 'border-violet bg-lav' : 'border-line-strong bg-surface-2 hover:border-violet/60 hover:bg-lav/40',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <Paperclip className="size-4 text-ink-3" aria-hidden />
        <span className="mt-1.5 text-sm text-ink">
          <span className="font-semibold text-violet">Choose files</span> or drop them here
        </span>
        <span id={hintId} className="mt-0.5 text-xs text-ink-3">
          Screenshots, photos or statements · PDF, PNG, JPG · up to 10 MB each, max {ATTACHMENT_MAX_FILES}
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ATTACHMENT_TYPES.join(',')}
        className="sr-only"
        tabIndex={-1}
        aria-hidden
        onChange={(e) => {
          if (e.target.files) add(e.target.files)
          e.target.value = ''
        }}
      />
      {shownError && (
        <p id={errId} role="alert" className="mt-1.5 text-xs font-medium text-rose-ink">
          {shownError}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5" aria-label="Files to attach">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="rounded-control border border-line bg-surface px-3 py-2 text-sm">
              <div className="flex items-center gap-2.5">
                {f.type.startsWith('image/') ? <ImageIcon className="size-4 text-ink-3" aria-hidden /> : <FileText className="size-4 text-ink-3" aria-hidden />}
                <span className="min-w-0 flex-1 truncate font-medium text-ink">{f.name}</span>
                <span className="text-xs text-ink-3">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(files.filter((_, j) => j !== i))}
                  className="-mr-1 flex size-8 items-center justify-center rounded-chip text-ink-3 outline-none hover:bg-sunken hover:text-ink focus-visible:ring-2 focus-visible:ring-violet"
                  aria-label={`Remove ${f.name}`}
                >
                  <X className="size-4" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {uploading && files.length > 0 && (
        <div className="mt-2.5">
          <div className="mb-1 flex justify-between text-xs text-ink-3">
            <span>Uploading…</span>
            <span className="tabular-nums">{Math.round(progress)}%</span>
          </div>
          <ProgressBar value={progress} size="sm" tone="violet" label="Upload progress" />
        </div>
      )}
    </div>
  )
}
