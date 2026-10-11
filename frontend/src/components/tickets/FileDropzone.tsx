import { FileText, ImageIcon, Paperclip, X } from 'lucide-react'
import { useRef, useState, type DragEvent } from 'react'

import { ATTACHMENT_MAX_BYTES, ATTACHMENT_MAX_FILES, ATTACHMENT_TYPES } from '@/lib/constants'
import { formatBytes } from '@/lib/format'
import { cn } from '@/lib/utils'

export function FileDropzone({ files, onChange, disabled }: { files: File[]; onChange: (files: File[]) => void; disabled?: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

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
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-4 py-5 text-center transition-colors',
          dragging ? 'border-primary bg-accent/50' : 'hover:border-primary/50 hover:bg-muted/50',
          disabled && 'pointer-events-none opacity-60',
        )}
      >
        <Paperclip className="size-4 text-muted-foreground" />
        <p className="mt-1.5 text-sm">
          <span className="font-medium text-primary">Choose files</span> or drag them here
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">Photos of defects, screenshots or statements · PDF, PNG, JPG · up to 10 MB each, max 3</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ATTACHMENT_TYPES.join(',')}
          className="hidden"
          onChange={(e) => {
            if (e.target.files) add(e.target.files)
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-2 space-y-1.5">
          {files.map((f, i) => (
            <li key={`${f.name}-${i}`} className="flex items-center gap-2 rounded-md border bg-card px-3 py-1.5 text-sm">
              {f.type.startsWith('image/') ? <ImageIcon className="size-4 text-muted-foreground" /> : <FileText className="size-4 text-muted-foreground" />}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="text-xs text-muted-foreground">{formatBytes(f.size)}</span>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                className="text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${f.name}`}
              >
                <X className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
