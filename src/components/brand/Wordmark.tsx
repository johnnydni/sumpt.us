import { Mark, MARK_ASPECT } from '@/components/brand/Mark'
import { cn } from '@/lib/cn'

/** Intrinsic aspect of public/brand/wordmark.png, from scripts/build-wordmark.mjs. */
export const TEXT_ASPECT = 668 / 151

/**
 * Space between the lettering and the mark, in em. The original artwork set it
 * at 48px against a 151px lockup height; a slightly smaller mark wants
 * slightly less air.
 */
export const GAP = 0.28

/**
 * Mark height relative to the lettering.
 *
 * At a full 1em the mark overshoots the ascenders and outweighs a face this
 * delicate — it is a solid shape against fine serifs. At 0.78 it caps out level
 * with the `t`, which is the usual way to set a mark beside lowercase type.
 */
export const MARK_HEIGHT = 0.78

interface WordmarkProps {
  className?: string
}

/**
 * The sumpt.us lockup: the lettering, then the mark.
 *
 * The two are separate assets composed here rather than one baked bitmap, so
 * the mark can also stand alone — as an icon, an avatar, a favicon — and its
 * size and spacing beside the lettering stay adjustable instead of being fixed
 * at whatever the artwork happened to be.
 *
 * Both parts are masks painted with `currentColor` and sized in `em`, so the
 * lockup inherits its colour and scales like type.
 */
export function Wordmark({ className }: WordmarkProps) {
  return (
    <span
      role="img"
      aria-label="sumpt.us"
      className={cn('inline-flex shrink-0 items-center align-middle', className)}
      style={{ gap: `${GAP}em` }}
    >
      <WordmarkText />
      {/* Scaled by font size rather than by overriding its box, so the mark
          keeps its own "one em tall" contract wherever else it is used. */}
      <span className="inline-flex" style={{ fontSize: `${MARK_HEIGHT}em` }}>
        <Mark />
      </span>
    </span>
  )
}

/**
 * The lettering on its own, one em tall.
 *
 * Split out so an animation can bring the two halves of the lockup in
 * separately without anything being redrawn: this is the same mask the lockup
 * uses, so the letterforms, kerning and spacing are the artwork's, not a
 * font-stack approximation of it.
 */
export function WordmarkText({ className }: { className?: string }) {
  const url = `${import.meta.env.BASE_URL}brand/wordmark.png`

  return (
    <span
      aria-hidden="true"
      className={cn('inline-block shrink-0 bg-current', className)}
      style={{
        height: '1em',
        width: `${TEXT_ASPECT}em`,
        maskImage: `url("${url}")`,
        WebkitMaskImage: `url("${url}")`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'left center',
        WebkitMaskPosition: 'left center',
      }}
    />
  )
}

/** Total width of the lockup at 1em, for callers that need to reserve space. */
export const WORDMARK_ASPECT = TEXT_ASPECT + GAP + MARK_ASPECT * MARK_HEIGHT
