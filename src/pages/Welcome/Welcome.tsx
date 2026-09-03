import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Apple } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/components/ui/toastContext'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * One screen, one decision. Everything else the product does is behind
 * "Get started" — nothing is explained here that the first real screen
 * couldn't explain better.
 */
export default function Welcome() {
  const navigate = useNavigate()
  const seedDemo = useAppStore((s) => s.seedDemo)
  const toast = useToast()
  const reduced = useReducedMotion()

  const stagger = (index: number) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 10 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.4, delay: 0.05 * index, ease: [0.22, 1, 0.36, 1] as const },
        }

  const exploreDemo = async () => {
    await seedDemo()
    toast.notice('Demo data loaded')
    navigate('/overview')
  }

  return (
    <div className="flex min-h-[100dvh] flex-col px-6 pb-safe sm:px-8">
      <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col">
        <div className="flex flex-1 flex-col justify-center py-16">
          <motion.h1 {...stagger(0)} className="display text-[clamp(2.75rem,14vw,3.5rem)] leading-[0.95]">
            sumpt.us
          </motion.h1>

          <motion.p {...stagger(1)} className="mt-5 text-xl tracking-tight">
            Shared expenses. Simply.
          </motion.p>

          <motion.p {...stagger(2)} className="mt-3 max-w-[34ch] text-[15px] leading-relaxed text-muted">
            Manage expenses with friends, groups and people without doing the math yourself.
          </motion.p>
        </div>

        <motion.div {...stagger(3)} className="space-y-2.5 pb-8">
          <Button size="lg" full onClick={() => navigate('/onboarding')}>
            Get started
          </Button>

          <Button size="lg" variant="outline" full onClick={exploreDemo}>
            <Apple size={17} strokeWidth={1.75} />
            Continue with Apple
          </Button>

          <Button size="lg" variant="outline" full onClick={exploreDemo}>
            <GoogleMark />
            Continue with Google
          </Button>

          <p className="pt-3 text-center text-[13px] leading-relaxed text-muted">
            No account yet.{' '}
            <button onClick={exploreDemo} className="font-medium text-navy underline-offset-4 hover:underline">
              Explore with demo data
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}

/** Lucide has no brand marks, and an emoji would break the icon system. */
function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  )
}
