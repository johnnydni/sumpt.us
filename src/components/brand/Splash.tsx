import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Check } from 'lucide-react'
import { Wordmark } from '@/components/brand/Wordmark'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Preferences } from '@/types'

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
/**
 * How long a mounted clip gets to produce its first frame before it counts as
 * broken. A stall is the one failure that fires no event at all — Safari
 * answers a byte-range request served whole by stalling silently — and the
 * result is a white screen for the full ceiling. Nothing on screen is a worse
 * outcome than the static lockup, so it is never allowed to be the outcome.
 */
const STALL_MS = 900

/** What this particular launch shows. Decided once — see below. */
interface Plan {
  video: boolean
  /** The skip control, withheld until the clip has had one clean run. */
  offerSkip: boolean
}

export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const playIntro = useAppStore((s) => s.preferences.playIntro)
  const introSeen = useAppStore((s) => s.preferences.introSeen)
  const setPreferences = useAppStore((s) => s.setPreferences)

  const [plan, setPlan] = useState<Plan | null>(null)
  const [failed, setFailed] = useState(false)
  const [optedOut, setOptedOut] = useState(false)
  const optedOutRef = useRef(false)
  const videoRef = useRef<HTMLVideoElement>(null)

  /*
   * The splash renders before the store has read anything back, and both
   * switches it needs live in the stored preferences. Deciding early means
   * deciding on the defaults — which starts the clip for someone who asked for
   * no animation, and only stops it once hydration lands, by which point they
   * have already seen it move. Hydration is a localStorage read and finishes
   * inside a frame, so waiting for it costs nothing visible.
   */
  const hydrated = useAppStore((s) => s.hydrated)

  /*
   * Frozen on the first hydrated frame, not read live. The splash writes both
   * preferences back as it leaves, and a live read would let those writes
   * change what is on screen mid-exit: the video swapping to the lockup, or
   * the skip pill appearing during the fade of the very launch that earned it.
   */
  useEffect(() => {
    if (!hydrated || plan) return
    setPlan({ video: playIntro && !reduced, offerSkip: introSeen })
  }, [hydrated, introSeen, plan, playIntro, reduced])

  const playing = plan?.video === true && !failed

  const finish = useCallback(() => {
    const patch: Partial<Preferences> = {}
    // One clean run is what unlocks the skip pill on the next launch.
    if (plan?.video && !introSeen) patch.introSeen = true
    if (optedOutRef.current) patch.playIntro = false
    if (Object.keys(patch).length > 0) setPreferences(patch)
    onDone()
  }, [introSeen, onDone, plan, setPreferences])

  useEffect(() => {
    if (!plan) return
    const limit = playing ? CEILING_MS : reduced ? REDUCED_HOLD_MS : STATIC_HOLD_MS
    const timer = setTimeout(finish, limit)
    return () => clearTimeout(timer)
  }, [finish, plan, playing, reduced])

  useEffect(() => {
    if (!playing) return
    const video = videoRef.current
    if (!video) return
    // Autoplay is allowed for muted inline video, but a rejected promise is
    // still possible — a data-saver mode, a policy, a codec. Treat it as a
    // failure and show the lockup rather than a frozen first frame.
    void video.play().catch(() => setFailed(true))
    const watchdog = setTimeout(() => {
      if (video.currentTime === 0) setFailed(true)
    }, STALL_MS)
    return () => clearTimeout(watchdog)
  }, [playing])

  /*
   * Tapping the backdrop skips this one playing; ticking the pill skips every
   * one after it. The tick is drawn immediately and the overlay leaves on its
   * usual fade, so the confirmation is visible without adding a wait to the
   * thing being skipped.
   */
  const optOut = (event: React.MouseEvent) => {
    event.stopPropagation()
    optedOutRef.current = true
    setOptedOut(true)
    finish()
  }

  return (
    <motion.div
      aria-hidden="true"
      // Tapping through a brand animation should always work.
      onClick={finish}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-canvas text-ink"
      initial={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0, scale: 1.015 }}
      transition={{ duration: reduced ? 0.15 : 0.32, ease: [0.4, 0, 0.2, 1] }}
    >
      {/* Nothing until the preferences are known — a blank canvas for the frame
          hydration takes, rather than a frame of the wrong thing. */}
      {!plan ? null : playing ? (
        <video
          ref={videoRef}
          muted
          playsInline
          preload="auto"
          onEnded={finish}
          onError={() => setFailed(true)}
          className="w-full max-w-[560px]"
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

      {/*
        Hidden from assistive tech along with the rest of the overlay: it is a
        shortcut, not the only way to the setting. The same switch sits in
        Profile › Preferences, which is where it can be turned back on.
      */}
      {playing && plan.offerSkip && (
        <motion.button
          type="button"
          onClick={optOut}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.28, ease: [0.4, 0, 0.2, 1] }}
          className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] flex items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-2 text-[13px] text-muted transition-colors active:bg-surface"
        >
          <span
            className={
              optedOut
                ? 'flex size-4 items-center justify-center rounded-[5px] bg-ink text-canvas'
                : 'flex size-4 items-center justify-center rounded-[5px] border border-line'
            }
          >
            {optedOut && <Check size={11} strokeWidth={3} />}
          </span>
          Skip intro
        </motion.button>
      )}
    </motion.div>
  )
}
