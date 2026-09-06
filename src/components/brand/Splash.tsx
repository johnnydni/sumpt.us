import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Wordmark } from '@/components/brand/Wordmark'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'

/**
 * The cold-start moment: the mark drawn in liquid, resolving into the lockup.
 *
 * Everything here is built around one rule — the splash must never be the
 * reason the app does not open. A video can fail to decode, fail to autoplay
 * under a policy this code cannot see, or simply never fire `ended`. So the
 * clip is the nice case, not the load-bearing one: a timer ends the splash
 * regardless, an error falls back to the static lockup, and a tap skips it.
 */

/** The clip runs 2.3s; the ceiling leaves room for a slow first decode. */
const CEILING_MS = 3200
/** Used when the video is not playing: reduced motion, or a failure. */
const STATIC_HOLD_MS = 700
const REDUCED_HOLD_MS = 320

export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  /*
   * The splash renders before the store has read anything back, and the
   * reduced-motion switch lives in the stored preferences. Deciding early
   * means deciding on the default — which starts the clip for someone who
   * asked for no animation, and only stops it once hydration lands, by which
   * point they have already seen it move. Hydration is a localStorage read
   * and finishes inside a frame, so waiting for it costs nothing visible.
   */
  const hydrated = useAppStore((s) => s.hydrated)

  // Reduced motion gets the lockup standing still. The clip is the animation,
  // so there is no gentler version of it to offer — only a shorter beat.
  const playing = hydrated && !reduced && !failed

  const finish = useCallback(() => onDone(), [onDone])

  useEffect(() => {
    if (!hydrated) return
    const limit = playing ? CEILING_MS : reduced ? REDUCED_HOLD_MS : STATIC_HOLD_MS
    const timer = setTimeout(finish, limit)
    return () => clearTimeout(timer)
  }, [finish, hydrated, playing, reduced])

  useEffect(() => {
    if (!playing) return
    const video = videoRef.current
    if (!video) return
    // Autoplay is allowed for muted inline video, but a rejected promise is
    // still possible — a data-saver mode, a policy, a codec. Treat it as a
    // failure and show the lockup rather than a frozen first frame.
    void video.play().catch(() => setFailed(true))
  }, [playing])

  return (
    <motion.div
      aria-hidden="true"
      // Tapping through a brand animation should always work.
      onClick={finish}
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas text-ink"
      initial={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
      transition={{ duration: reduced ? 0.15 : 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Nothing until the preference is known — a blank canvas for the frame
          hydration takes, rather than a frame of the wrong thing. */}
      {!hydrated ? null : playing ? (
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          onEnded={finish}
          onError={() => setFailed(true)}
          className="w-full max-w-[520px] px-6"
          /*
           * The clip's white is a compressed 252–254, not the canvas's 255.
           * A hard edge between the two shows as a faint rectangle on a good
           * screen, so the frame is feathered out instead of matched exactly —
           * which no lossy codec can be relied on to hold anyway.
           */
          style={{
            maskImage:
              'radial-gradient(ellipse 92% 88% at 50% 50%, #000 62%, transparent 100%)',
            WebkitMaskImage:
              'radial-gradient(ellipse 92% 88% at 50% 50%, #000 62%, transparent 100%)',
          }}
        >
          <source src={`${import.meta.env.BASE_URL}brand/intro.webm`} type="video/webm" />
          <source src={`${import.meta.env.BASE_URL}brand/intro.mp4`} type="video/mp4" />
        </video>
      ) : (
        <Wordmark className="text-[clamp(26px,9vw,38px)]" />
      )}
    </motion.div>
  )
}
