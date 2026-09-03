import { useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { ArrowRight, Camera } from 'lucide-react'
import type { CurrencyCode } from '@/types'
import { CURRENCY_LIST } from '@/lib/currency'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Avatar } from '@/components/ui/Avatar'
import { useAppStore } from '@/store/appStore'
import { cn } from '@/lib/cn'

/**
 * One screen, three fields, two of them optional. Splitting this into a wizard
 * would add taps without adding clarity.
 */
export default function Onboarding() {
  const navigate = useNavigate()
  const completeOnboarding = useAppStore((s) => s.completeOnboarding)

  const [name, setName] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>()
  const [currency, setCurrency] = useState<CurrencyCode>('EUR')
  const [error, setError] = useState<string>()
  const fileRef = useRef<HTMLInputElement>(null)

  const pickAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    // Stored as a data URL: no backend to upload to, and it round-trips
    // through localStorage with the rest of the state.
    const reader = new FileReader()
    reader.onload = () => setAvatarUrl(String(reader.result))
    reader.readAsDataURL(file)
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) {
      setError('We need something to call you.')
      return
    }
    await completeOnboarding({ name, avatarUrl, currency })
    navigate('/overview', { replace: true })
  }

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 pb-safe sm:px-8">
      <form onSubmit={submit} className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center py-16">
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="display text-[32px] leading-tight"
          >
            What&rsquo;s your name?
          </motion.h1>

          <div className="mt-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative rounded-full transition-opacity hover:opacity-80"
              aria-label="Add a profile picture"
            >
              <Avatar name={name || '?'} src={avatarUrl} size="xl" accent={Boolean(name)} />
              <span className="absolute -bottom-0.5 -right-0.5 flex h-7 w-7 items-center justify-center rounded-full border border-line bg-canvas text-muted">
                <Camera size={13} strokeWidth={1.75} />
              </span>
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={pickAvatar}
            />
            <p className="text-[13px] leading-relaxed text-muted">
              A photo is optional.
              <br />
              You can add one later.
            </p>
          </div>

          <div className="mt-8 space-y-6">
            <Field label="First name" error={error}>
              {({ id, describedBy, invalid }) => (
                <Input
                  id={id}
                  aria-describedby={describedBy}
                  aria-invalid={invalid}
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    if (error) setError(undefined)
                  }}
                  placeholder="Illy"
                  autoComplete="given-name"
                  autoFocus
                  enterKeyHint="done"
                />
              )}
            </Field>

            <fieldset>
              <legend className="eyebrow mb-2">Preferred currency</legend>
              <div className="flex flex-wrap gap-2">
                {CURRENCY_LIST.map((option) => (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setCurrency(option.code)}
                    aria-pressed={currency === option.code}
                    className={cn(
                      'h-11 rounded-md border px-4 text-sm font-medium transition-colors duration-micro',
                      currency === option.code
                        ? 'border-navy bg-navy text-white'
                        : 'border-line text-ink hover:bg-surface',
                    )}
                  >
                    {option.symbol} {option.code}
                  </button>
                ))}
              </div>
            </fieldset>
          </div>
        </div>

        <div className="pb-8">
          <Button type="submit" size="lg" full>
            Continue
            <ArrowRight size={17} strokeWidth={2} />
          </Button>
        </div>
      </form>
    </div>
  )
}
