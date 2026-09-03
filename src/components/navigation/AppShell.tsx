import { Outlet, useLocation } from 'react-router-dom'
import { AnimatePresence, motion } from 'motion/react'
import { BottomNav } from './BottomNav'
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
      <main className="shell pt-8 sm:pt-14">
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
