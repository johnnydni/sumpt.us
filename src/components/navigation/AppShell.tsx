import { Link, Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BottomNav } from './BottomNav'
import { Wordmark } from '@/components/brand/Wordmark'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * Centred shell rather than a stretched dashboard. Desktop keeps the same
 * single column and gains breathing room; it does not sprout a sidebar,
 * because there are only three destinations.
 */
export function AppShell() {
  const location = useLocation()
  const reduced = useReducedMotion()

  return (
    <div className="min-h-[100dvh] bg-canvas">
      {/* Brand bar. Sits outside the animated outlet so it stays put between
          screens instead of sliding in with every page. */}
      <div className="shell pt-6 sm:pt-8">
        <Link
          to="/overview"
          aria-label="sumpt.us — go to overview"
          className="inline-flex rounded-sm text-ink transition-opacity duration-micro hover:opacity-60"
        >
          <Wordmark className="text-[17px]" />
        </Link>
      </div>

      <main className="shell pt-7 sm:pt-10">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={reduced ? { opacity: 0 } : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? { opacity: 0 } : { opacity: 0, y: -4 }}
            transition={{ duration: 0.26, ease: [0.22, 1, 0.36, 1] }}
            className="mb-nav"
          >
            <Outlet />
          </motion.div>
        </AnimatePresence>
      </main>
      <BottomNav />
    </div>
  )
}
