import { useRef, useState } from 'react'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { compressImage, COVER_IMAGE, ImageError } from '@/lib/images'
import { cn } from '@/lib/cn'

interface CoverPickerProps {
  /** Current cover as a data URL, or undefined for none. */
  value?: string
  onChange: (coverUrl: string | undefined) => void
  className?: string
}

/**
 * Pick, replace or remove a group's header photo.
 *
 * The file never reaches the store as-is — `compressImage` redraws and
 * re-encodes it first, and anything it rejects is reported inline rather than
 * dropped. Uploads that quietly do nothing are the worst version of this
 * control.
 */
export function CoverPicker({ value, onChange, className }: CoverPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string>()

  const pick = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // Reset immediately so picking the same file twice still fires a change.
    event.target.value = ''
    if (!file) return

    setBusy(true)
    setError(undefined)
    try {
      onChange(await compressImage(file, COVER_IMAGE))
    } catch (cause) {
      setError(
        cause instanceof ImageError ? cause.message : 'That image could not be processed.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={className}>
      <div className="mb-2 flex items-center justify-between">
        <p className="eyebrow">Header image</p>
        {value && (
          <button
            type="button"
            onClick={() => {
              onChange(undefined)
              setError(undefined)
            }}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-muted transition-colors hover:text-negative"
          >
            <Trash2 size={13} strokeWidth={1.75} />
            Remove
          </button>
        )}
      </div>

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        aria-label={value ? 'Replace header image' : 'Add a header image'}
        className={cn(
          'relative block h-32 w-full overflow-hidden rounded-md border transition-colors duration-micro sm:h-40',
          error ? 'border-negative' : 'border-line hover:border-ink/25 hover:bg-surface/60',
          value ? 'border-line' : 'bg-surface/40',
        )}
      >
        {value && <img src={value} alt="" className="h-full w-full object-cover" />}

        <span
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center gap-2 text-[13px] font-medium',
            value ? 'bg-ink/35 text-white opacity-0 transition-opacity hover:opacity-100' : 'text-muted',
          )}
        >
          {busy ? (
            <Loader2 size={18} strokeWidth={1.75} className="animate-spin" />
          ) : (
            <ImagePlus size={18} strokeWidth={1.5} />
          )}
          {busy ? 'Processing…' : value ? 'Replace' : 'Add a photo'}
        </span>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={pick}
      />

      {error ? (
        <p role="alert" className="mt-2 text-[13px] leading-snug text-negative">
          {error}
        </p>
      ) : (
        <p className="mt-2 text-[13px] leading-snug text-muted">
          Stored on this device and scaled down to keep the app fast.
        </p>
      )}
    </div>
  )
}
