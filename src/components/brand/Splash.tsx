import { useEffect } from 'react'
import { motion } from 'motion/react'
import { Wordmark } from '@/components/brand/Wordmark'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * The cold-start moment.
 *
 * The wordmark is drawn left to right, the way ink is laid down, then the
 * whole sheet lifts away. It is a mask painted with `currentColor`, so a
 * clip-path on the wrapper reveals the letterforms themselves rather than
 * sliding a box across them.
 *
 * This costs a beat the app does not technically need — hydration is a
 * localStorage read and finishes inside a frame. `HOLD_MS` is therefore the
 * shortest span that still reads as a deliberate moment instead of a flicker;
 * anything less and it looks like a rendering fault.
 */
const HOLD_MS = 900
const REDUCED_HOLD_MS = 320

export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()

  useEffect(() => {
    const timer = setTimeout(onDone, reduced ? REDUCED_HOLD_MS : HOLD_MS)
    return () => clearTimeout(timer)
  }, [onDone, reduced])

  return (
    <motion.div
      // aria-hidden: the app behind it already announces itself, and a screen
      // reader should not have to sit through a brand animation.
      aria-hidden="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas text-ink"
      initial={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
      transition={{ duration: reduced ? 0.15 : 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      <motion.div
        className="px-8"
        initial={reduced ? false : { clipPath: 'inset(0 100% 0 0)', opacity: 0.85 }}
        animate={{ clipPath: 'inset(0 0% 0 0)', opacity: 1 }}
        // Eased in and out rather than expo: an expo curve spends 90% of the
        // travel in the first third, so the wipe finished before it read as a
        // stroke at all.
        transition={{ duration: 0.66, ease: [0.4, 0, 0.2, 1] }}
      >
        <Wordmark className="text-[clamp(26px,9vw,38px)]" />
      </motion.div>
    </motion.div>
  )
}
