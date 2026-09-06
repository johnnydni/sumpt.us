import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import { Mark, MARK_ASPECT } from '@/components/brand/Mark'
import { GAP, MARK_HEIGHT, TEXT_ASPECT, WordmarkText } from '@/components/brand/Wordmark'
import { allocate } from '@/lib/calculations'
import { formatMoney } from '@/lib/formatting'
import { useAppStore } from '@/store/appStore'
import { useReducedMotion } from '@/hooks/useReducedMotion'
import type { Preferences } from '@/types'

/**
 * The cold-start moment: four expenses reduced to one balance, and the
 * arithmetic resolving into the mark.
 *
 * Nothing here is drawn twice. The symbol and the lettering are the two
 * original assets the rest of the app uses, revealed rather than recreated, so
 * the last frame is the same DOM the static lockup renders — same letterforms,
 * same kerning, same geometry. The only thing this file invents is the motion.
 */

/* -------------------------------------------------------------------------
 * The sum
 *
 * Minor units, added and split by the app's own allocator rather than typed
 * out as strings. If the split ever stopped reconciling, the splash would say
 * so on every launch.
 * ------------------------------------------------------------------------- */

const EXPENSES = [8400, 4620, 3200, 4440]
const TOTAL = EXPENSES.reduce((sum, value) => sum + value, 0)
const HEADS = 4
const SHARE = allocate(TOTAL, Array<number>(HEADS).fill(1))[0]

/* -------------------------------------------------------------------------
 * The mark, measured
 *
 * Circle centres and radii read off public/brand/mark.png — x and r as
 * fractions of its width, y as a fraction of its height. The four points of
 * the division land on these, so they meet the artwork instead of merely
 * approaching it.
 * ------------------------------------------------------------------------- */

const CIRCLES = {
  dot: { x: 0.1341, y: 0.4821, r: 0.1251 },
  holeTop: { x: 0.504, y: 0.1414, r: 0.0505 },
  holeBot: { x: 0.539, y: 0.795, r: 0.0775 },
} as const

/** Where the ink starts spreading: the waist, so it flows both ways at once. */
const SEED = { x: 0.45, y: 0.5 } as const

/* -------------------------------------------------------------------------
 * Timing. Every number is milliseconds from the first frame.
 *
 * PACE scales the whole thing at once — the one knob worth having, because
 * legibility at this speed is a judgement call and not a code change.
 * ------------------------------------------------------------------------- */

const PACE = 1
const T = {
  sum: 500,
  divide: 750,
  share: 950,
  form: 1100,
  settled: 1350,
  clear: 1500,
  wordmark: 1650,
  hold: 1850,
  done: 2100,
} as const

const ms = (value: number) => value * PACE
const s = (value: number) => (value * PACE) / 1000

/** Smooth acceleration and deceleration; nothing overshoots. */
const EASE = [0.4, 0, 0.2, 1] as const
/** For things that arrive: decelerate into place, never bounce out of it. */
const SETTLE = [0.16, 0.84, 0.24, 1] as const

const PHASES = [
  ['sum', T.sum],
  ['divide', T.divide],
  ['share', T.share],
  ['form', T.form],
  ['settled', T.settled],
  ['clear', T.clear],
  ['wordmark', T.wordmark],
  ['hold', T.hold],
] as const

type Phase = 'expenses' | (typeof PHASES)[number][0]
const ORDER: Phase[] = ['expenses', ...PHASES.map(([name]) => name)]
const at = (phase: Phase, current: Phase) => ORDER.indexOf(current) >= ORDER.indexOf(phase)

/** Hold for the static lockup when the clip is not playing. */
const STATIC_HOLD_MS = 700
const REDUCED_HOLD_MS = 320

/** What this particular launch shows. Decided once — see below. */
interface Plan {
  animate: boolean
  /** The skip control, withheld until the animation has had one clean run. */
  offerSkip: boolean
}

/* -------------------------------------------------------------------------
 * Geometry, in em off the lockup's font size.
 *
 * One number sets the scale of everything: the lettering is 1em tall by the
 * Wordmark's own contract, so expressing the stage in em means the animation
 * and the finished lockup cannot drift apart.
 * ------------------------------------------------------------------------- */

/** Mark height while it is the subject rather than half of a lockup. */
const HERO = 1.9
const HERO_W = HERO * MARK_ASPECT
/**
 * Lockup width at 1em, and how far right of its centre the mark sits.
 *
 * The shift is in stage em, not hero em: a transform translates before it
 * scales, so the distance travelled is untouched by the mark shrinking into
 * place at the same time.
 */
const LOCKUP_W = TEXT_ASPECT + GAP + MARK_ASPECT * MARK_HEIGHT
const MARK_OFFSET = LOCKUP_W / 2 - (MARK_ASPECT * MARK_HEIGHT) / 2

/** A measured circle placed on the hero mark, in em from the stage centre. */
function place(circle: { x: number; y: number; r: number }) {
  return {
    x: (circle.x - 0.5) * HERO_W,
    y: (circle.y - 0.5) * HERO,
    d: 2 * circle.r * HERO_W,
  }
}

const TARGETS = [place(CIRCLES.dot), place(CIRCLES.holeTop), place(CIRCLES.holeBot)]
/** The fourth point seeds the curve and is swallowed by it. */
const SEED_TARGET = { x: (SEED.x - 0.5) * HERO_W, y: 0, d: 0.1 }

/**
 * When the spreading ink reaches a given circle, as a fraction of the sweep.
 *
 * The two points standing in for the cutouts have to leave exactly as the
 * curve arrives — a beat early is a gap, a beat late is a black dot showing
 * through a hole. Derived rather than guessed: `circle()` resolves a
 * percentage radius against sqrt((w² + h²) / 2) of its box.
 */
const CLIP_TO = 80
const REF = Math.sqrt((HERO_W * HERO_W + HERO * HERO) / 2)
function reached(target: { x: number; y: number }) {
  const dx = target.x - SEED_TARGET.x
  const dy = target.y
  return Math.hypot(dx, dy) / REF / (CLIP_TO / 100)
}

export function Splash({ onDone }: { onDone: () => void }) {
  const reduced = useReducedMotion()
  const playIntro = useAppStore((state) => state.preferences.playIntro)
  const introSeen = useAppStore((state) => state.preferences.introSeen)
  const setPreferences = useAppStore((state) => state.setPreferences)
  const hydrated = useAppStore((state) => state.hydrated)

  const [plan, setPlan] = useState<Plan | null>(null)
  const [phase, setPhase] = useState<Phase>('expenses')
  const [optedOut, setOptedOut] = useState(false)
  const optedOutRef = useRef(false)

  /*
   * Frozen on the first hydrated frame, not read live. The splash writes both
   * preferences back as it leaves, and a live read would let those writes
   * change what is on screen mid-exit: the animation cutting to the lockup, or
   * the skip pill appearing during the fade of the very launch that earned it.
   */
  useEffect(() => {
    if (!hydrated || plan) return
    setPlan({ animate: playIntro && !reduced, offerSkip: introSeen })
  }, [hydrated, introSeen, plan, playIntro, reduced])

  const playing = plan?.animate === true

  const finish = useCallback(() => {
    const patch: Partial<Preferences> = {}
    // One clean run is what unlocks the skip pill on the next launch.
    if (plan?.animate && !introSeen) patch.introSeen = true
    if (optedOutRef.current) patch.playIntro = false
    if (Object.keys(patch).length > 0) setPreferences(patch)
    onDone()
  }, [introSeen, onDone, plan, setPreferences])

  // The timeline, and the one timer that ends the splash whatever it did.
  useEffect(() => {
    if (!plan) return
    if (!playing) {
      const hold = setTimeout(finish, reduced ? REDUCED_HOLD_MS : STATIC_HOLD_MS)
      return () => clearTimeout(hold)
    }
    const timers = PHASES.map(([name, time]) => setTimeout(() => setPhase(name), ms(time)))
    timers.push(setTimeout(finish, ms(T.done)))
    return () => timers.forEach(clearTimeout)
  }, [finish, plan, playing, reduced])

  /*
   * Tapping the backdrop skips this one run; ticking the pill skips every one
   * after it. The tick is drawn immediately and the overlay leaves on its usual
   * fade, so the confirmation is visible without adding a wait to the thing
   * being skipped.
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
      onClick={finish}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-canvas text-ink"
      initial={{ opacity: 1 }}
      exit={reduced ? { opacity: 0 } : { opacity: 0 }}
      transition={{ duration: reduced ? 0.15 : 0.28, ease: EASE }}
    >
      {/* Nothing until the preferences are known — a blank canvas for the frame
          hydration takes, rather than a frame of the wrong thing. */}
      {!plan ? null : playing ? (
        <Equation phase={phase} />
      ) : (
        <span className="inline-flex" style={{ fontSize: FONT }}>
          <StaticLockup />
        </span>
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
          transition={{ delay: s(700), duration: 0.28, ease: EASE }}
          className="absolute bottom-[max(2rem,env(safe-area-inset-bottom))] flex items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-2 text-[13px] text-muted transition-colors active:bg-surface"
        >
          <span
            className={
              optedOut
                ? 'flex size-4 items-center justify-center rounded-[5px] bg-ink text-canvas'
                : 'flex size-4 items-center justify-center rounded-[5px] border border-line'
            }
          >
            {optedOut && <Check />}
          </span>
          Skip intro
        </motion.button>
      )}
    </motion.div>
  )
}

/** One size drives the stage; the lockup is 1em tall by the Wordmark contract. */
const FONT = 'clamp(30px, 11.5vw, 50px)'

function StaticLockup() {
  return (
    <span
      role="img"
      aria-label="sumpt.us"
      className="inline-flex items-center"
      style={{ gap: `${GAP}em` }}
    >
      <WordmarkText />
      <span className="inline-flex" style={{ fontSize: `${MARK_HEIGHT}em` }}>
        <Mark />
      </span>
    </span>
  )
}

/* -------------------------------------------------------------------------
 * The stage
 * ------------------------------------------------------------------------- */

function Equation({ phase }: { phase: Phase }) {
  const summing = !at('divide', phase)
  const dividing = at('divide', phase) && !at('form', phase)
  const forming = at('form', phase)
  const lockup = at('wordmark', phase)

  return (
    /* A zero-sized stage: every layer is positioned against its centre, and a
       box with any width at all would put the lockup half a pixel off it. */
    <div className="relative" style={{ fontSize: FONT, width: 0, height: 0 }}>
      {/* Scene 1–2: the expenses, and their sum. */}
      <Layer show={summing} y={at('sum', phase) ? -0.28 : 0}>
        <div className="tnum display" style={{ fontSize: '0.6em', lineHeight: 1.34 }}>
          {EXPENSES.map((amount, index) => (
            <motion.div
              key={amount}
              className="flex items-baseline justify-end gap-[0.5em]"
              initial={{ opacity: 0, y: '0.24em' }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: s(40 + index * 95), duration: s(190), ease: SETTLE }}
            >
              <motion.span
                className="w-[0.55em] text-left"
                initial={{ opacity: 0 }}
                animate={{ opacity: at('sum', phase) && index > 0 ? 0.55 : 0 }}
                transition={{ duration: s(120), ease: EASE }}
              >
                +
              </motion.span>
              <span>{formatMoney(amount, 'EUR')}</span>
            </motion.div>
          ))}
          <Rule show={at('sum', phase)} />
          <motion.div
            className="text-right"
            initial={{ opacity: 0 }}
            animate={{ opacity: at('sum', phase) ? 1 : 0 }}
            transition={{ delay: s(90), duration: s(150), ease: EASE }}
          >
            {formatMoney(TOTAL, 'EUR')}
          </motion.div>
        </div>
      </Layer>

      {/* Scene 3: the total, divided. */}
      <Layer show={dividing}>
        <div
          className="tnum display flex flex-col items-center"
          style={{ fontSize: '0.6em', lineHeight: 1.34 }}
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: at('share', phase) ? 0 : 1, scale: 1 }}
            transition={{ duration: s(160), ease: SETTLE }}
          >
            {formatMoney(TOTAL, 'EUR')}
          </motion.span>
          <motion.span
            className="opacity-55"
            initial={{ opacity: 0 }}
            animate={{ opacity: at('share', phase) ? 0 : 0.55 }}
            transition={{ delay: s(60), duration: s(140), ease: EASE }}
          >
            ÷
          </motion.span>
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: s(90), duration: s(140), ease: EASE }}
          >
            {HEADS}
          </motion.span>
          <Rule show={at('share', phase)} />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: at('share', phase) ? 1 : 0 }}
            transition={{ delay: s(60), duration: s(150), ease: EASE }}
          >
            {formatMoney(SHARE, 'EUR')}
          </motion.span>
        </div>
      </Layer>

      {/* Scene 4: the four points find the artwork, and the ink spreads. */}
      <Points forming={forming} />
      <MarkForm forming={forming} lockup={lockup} />

      {/* Scene 5: settled. */}
      <div
        className="tnum display absolute left-1/2 -translate-x-1/2 whitespace-nowrap text-center"
        style={{ fontSize: '0.5em', top: `${(HERO / 2 + 0.42) / 0.5}em` }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: at('settled', phase) && !at('clear', phase) ? 0.75 : 0 }}
          transition={{ duration: s(140), ease: EASE }}
        >
          = {formatMoney(0, 'EUR')}
        </motion.div>
      </div>

      {/* Scene 6: the lettering, revealed rather than rebuilt. */}
      <div
        className="absolute top-1/2 -translate-y-1/2"
        style={{ right: `${LOCKUP_W / 2 - TEXT_ASPECT}em` }}
      >
        <motion.div
          className="flex"
          initial={{ opacity: 0, filter: 'blur(6px)' }}
          animate={
            lockup ? { opacity: 1, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(6px)' }
          }
          transition={{ duration: s(190), ease: EASE }}
        >
          <WordmarkText />
        </motion.div>
      </div>
    </div>
  )
}

/**
 * A centred layer that fades out and lifts slightly when its scene ends.
 *
 * Centring and animation are separate elements on purpose: Motion writes the
 * whole `transform`, so a Tailwind `-translate-x-1/2` on the same node is
 * silently discarded the moment anything animates.
 */
function Layer({ show, children, y = 0 }: { show: boolean; children: React.ReactNode; y?: number }) {
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap">
      {/* The initial state has to know whether this scene is the one starting,
          or the whole stack flashes for a frame and then fades apart. The
          outgoing layer also clears before the next arrives: two money figures
          crossing at the same spot read as a smear, not a transition. */}
      <motion.div
        initial={{ opacity: show ? 1 : 0 }}
        animate={{ opacity: show ? 1 : 0, y: show ? 0 : `${y - 0.2}em` }}
        transition={{ duration: s(show ? 150 : 120), delay: show ? s(70) : 0, ease: EASE }}
      >
        {children}
      </motion.div>
    </div>
  )
}

/** The horizontal line of an arithmetic block, drawn from the right. */
function Rule({ show }: { show: boolean }) {
  return (
    <motion.div
      className="my-[0.16em] h-px w-full origin-right bg-current opacity-30"
      initial={{ scaleX: 0 }}
      animate={{ scaleX: show ? 1 : 0 }}
      transition={{ duration: s(150), ease: EASE }}
    />
  )
}

/**
 * The divisor, become four people, become three circles of the artwork.
 *
 * Three of the points are the mark's own geometry; the fourth seeds the curve
 * and is absorbed by it. Each leaves at the moment the spreading ink reaches
 * its position, so the two standing in for the cutouts neither leave a gap nor
 * show through the negative space.
 */
function Points({ forming }: { forming: boolean }) {
  const points = [...TARGETS, SEED_TARGET]
  return (
    <>
      {points.map((target, index) => {
        // A shade before the ink lands: a beat late would show a black dot
        // through a white cutout, and that is the one frame nobody forgives.
        const hidesAt = Math.min(reached(target) * 0.95, 0.9)
        return (
          <motion.span
            key={index}
            className="absolute left-1/2 top-1/2 rounded-full bg-current"
            style={{ marginLeft: '-0.5em', marginTop: '-0.5em', width: '1em', height: '1em' }}
            initial={{ opacity: 0, scale: 0.12, x: 0, y: '0.34em' }}
            animate={
              forming
                ? {
                    opacity: [1, 1, 0],
                    scale: target.d,
                    x: `${target.x}em`,
                    y: `${target.y}em`,
                  }
                : { opacity: 0, scale: 0.12, x: 0, y: '0.34em' }
            }
            transition={{
              duration: s(240),
              ease: SETTLE,
              opacity: { duration: s(240), times: [0, hidesAt, 1], ease: EASE },
            }}
          />
        )
      })}
    </>
  )
}

/**
 * The mark itself: the artwork, uncovered by a circle growing from the waist,
 * so the curve appears to flow outwards along its own arc rather than fade in.
 * Then it steps back to lockup size and slides to where the lockup puts it.
 */
function MarkForm({ forming, lockup }: { forming: boolean; lockup: boolean }) {
  const clip = (radius: number) =>
    `circle(${radius}% at ${SEED.x * 100}% ${SEED.y * 100}%)`

  return (
    <motion.div
      className="absolute left-1/2 top-1/2 flex"
      style={{ marginLeft: `${-HERO_W / 2}em`, marginTop: `${-HERO / 2}em` }}
      initial={{ opacity: 0 }}
      animate={
        lockup
          ? { opacity: 1, scale: MARK_HEIGHT / HERO, x: `${MARK_OFFSET}em` }
          : { opacity: forming ? 1 : 0, scale: 1, x: 0 }
      }
      transition={{ duration: s(lockup ? 190 : 40), ease: SETTLE }}
    >
      {/*
        Unprefixed clip-path only. If a browser ever ignored it the mark would
        appear whole instead of flowing in — a plainer entrance, never a blank
        screen, which is the only property that matters here.
      */}
      <motion.div
        /* flex, not block: an inline-block on a text baseline sits a third of
           its own height too low, and every point aimed at it inherits the
           error. */
        className="flex leading-none"
        style={{ fontSize: `${HERO}em`, transformOrigin: 'center' }}
        initial={{ clipPath: clip(0) }}
        animate={{ clipPath: forming ? clip(CLIP_TO) : clip(0) }}
        transition={{ duration: s(240), ease: EASE }}
      >
        <Mark />
      </motion.div>
    </motion.div>
  )
}

function Check() {
  return (
    <svg viewBox="0 0 24 24" className="size-[11px]" fill="none" aria-hidden="true">
      <path
        d="M20 6 9 17l-5-5"
        stroke="currentColor"
        strokeWidth="3.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}
