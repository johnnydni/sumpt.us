import { useNavigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Mail } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Wordmark } from '@/components/brand/Wordmark'
import { useAppStore } from '@/store/appStore'
import { useToast } from '@/components/ui/toastContext'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import { isSupabaseConfigured } from '@/lib/supabase/client'

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
          <motion.h1 {...stagger(0)}>
            <Wordmark className="text-[clamp(2.5rem,13vw,3.25rem)] text-ink" />
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

          {/* Only offered when there is a backend to sign in to. A build
              without one used to show provider buttons that quietly loaded
              demo data instead — a control that does something other than what
              it says. */}
          {isSupabaseConfigured && (
            <Button size="lg" variant="outline" full onClick={() => navigate('/sign-in')}>
              <Mail size={17} strokeWidth={1.75} />
              Sign in
            </Button>
          )}

          <p className="pt-3 text-center text-[13px] leading-relaxed text-muted">
            Just looking?{' '}
            <button onClick={exploreDemo} className="font-medium text-navy underline-offset-4 hover:underline">
              Explore with demo data
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  )
}
