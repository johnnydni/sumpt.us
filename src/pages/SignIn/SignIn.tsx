import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Apple, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field, Input } from '@/components/ui/Field'
import { Wordmark } from '@/components/brand/Wordmark'
import { GoogleMark } from '@/components/brand/GoogleMark'
import { useToast } from '@/components/ui/toastContext'
import { isSupabaseConfigured } from '@/lib/supabase/client'
import {
  isCompleteCode,
  looksLikeEmail,
  normaliseCode,
  sendEmailCode,
  signInWithProvider,
  verifyEmailCode,
  type OAuthProvider,
} from '@/lib/supabase/auth'

type Stage = 'email' | 'code'

/**
 * Sign in, in two steps on one screen.
 *
 * Nothing here explains what an account is for, because at this point nothing
 * about the app changes without one — groups, splits and settling all work
 * signed out. An account is what makes them shared, and that is the sentence
 * under the heading.
 */
export default function SignIn() {
  const navigate = useNavigate()
  const toast = useToast()

  const [stage, setStage] = useState<Stage>('email')
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState<string>()
  const [busy, setBusy] = useState(false)
  const codeRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (stage === 'code') codeRef.current?.focus()
  }, [stage])

  // Reachable by deep link, so it has to answer for itself rather than assume
  // the caller checked.
  if (!isSupabaseConfigured) {
    return (
      <div className="mx-auto flex min-h-[100dvh] max-w-[420px] flex-col justify-center px-6">
        <Wordmark className="text-[28px]" />
        <p className="display mt-6 text-[22px] leading-tight">Accounts aren&rsquo;t switched on.</p>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          This build keeps everything on your device. Nothing is missing — sharing a group is what
          an account would add.
        </p>
        <Button className="mt-7" variant="outline" size="lg" onClick={() => navigate('/')}>
          Back
        </Button>
      </div>
    )
  }

  const requestCode = async () => {
    if (!looksLikeEmail(email)) {
      setError("That email address doesn't look right.")
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await sendEmailCode(email)
      setStage('code')
      toast.confirm('Code sent')
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const submitCode = async () => {
    if (!isCompleteCode(code)) {
      setError('Enter the six digits from the email.')
      return
    }
    setBusy(true)
    setError(undefined)
    try {
      await verifyEmailCode(email, code)
      navigate('/overview', { replace: true })
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const continueWithProvider = async (provider: OAuthProvider) => {
    setBusy(true)
    setError(undefined)
    try {
      // Comes back to where it started, sub-path and all.
      await signInWithProvider(provider, `${window.location.origin}${import.meta.env.BASE_URL}`)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'That did not work. Try again.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-[100dvh] w-full max-w-[420px] flex-col px-6 pb-safe sm:px-8">
      <button
        onClick={() => (stage === 'code' ? setStage('email') : navigate(-1))}
        aria-label="Go back"
        className="-ml-2 mt-6 flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-ink transition-colors duration-micro hover:bg-surface"
      >
        <ArrowLeft size={20} strokeWidth={1.75} />
      </button>

      <div className="flex flex-1 flex-col justify-center py-10">
        <Wordmark className="text-[26px]" />

        {stage === 'email' ? (
          <>
            <h1 className="display mt-7 text-[26px] leading-tight">Sign in to share.</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              An account is what lets other people into a group. Everything else already works
              without one.
            </p>

            {/* noValidate: type="email" earns the right keyboard on a phone, but
                its native validation fires first and pops a browser bubble,
                which pre-empts the inline message and looks nothing like the
                rest of the app. */}
            <form
              noValidate
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void requestCode()
              }}
            >
              <Field label="Email" error={error}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    autoFocus
                    placeholder="you@example.com"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value)
                      setError(undefined)
                    }}
                  />
                )}
              </Field>

              <Button type="submit" size="lg" full disabled={busy || email.trim().length === 0}>
                {busy ? 'Sending…' : 'Email me a code'}
              </Button>
            </form>

            <div className="mt-7 flex items-center gap-3" aria-hidden="true">
              <span className="h-px flex-1 bg-line" />
              <span className="text-2xs uppercase tracking-[0.14em] text-muted">or</span>
              <span className="h-px flex-1 bg-line" />
            </div>

            <div className="mt-5 space-y-2.5">
              <Button size="lg" variant="outline" full disabled={busy} onClick={() => void continueWithProvider('apple')}>
                <Apple size={17} strokeWidth={1.75} />
                Continue with Apple
              </Button>
              <Button size="lg" variant="outline" full disabled={busy} onClick={() => void continueWithProvider('google')}>
                <GoogleMark />
                Continue with Google
              </Button>
            </div>
          </>
        ) : (
          <>
            <h1 className="display mt-7 text-[26px] leading-tight">Check your email.</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              We sent six digits to <span className="text-ink">{email}</span>.
            </p>

            <form
              noValidate
              className="mt-8 space-y-4"
              onSubmit={(event) => {
                event.preventDefault()
                void submitCode()
              }}
            >
              <Field label="Code" error={error}>
                {({ id, describedBy, invalid }) => (
                  <Input
                    ref={codeRef}
                    id={id}
                    aria-describedby={describedBy}
                    aria-invalid={invalid}
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="000000"
                    className="tnum text-center text-[22px] tracking-[0.4em]"
                    value={code}
                    onChange={(event) => {
                      setCode(normaliseCode(event.target.value))
                      setError(undefined)
                    }}
                  />
                )}
              </Field>

              <Button type="submit" size="lg" full disabled={busy || !isCompleteCode(code)}>
                {busy ? 'Checking…' : 'Sign in'}
              </Button>
            </form>

            <button
              onClick={() => void requestCode()}
              disabled={busy}
              className="mt-5 self-start text-[13px] font-medium text-navy underline-offset-4 hover:underline disabled:opacity-50"
            >
              Send another code
            </button>
          </>
        )}
      </div>
    </div>
  )
}
