import { cn } from '@/lib/cn'

/** Intrinsic aspect of public/brand/wordmark.png, from scripts/build-wordmark.mjs. */
const ASPECT = 828 / 151

interface WordmarkProps {
  className?: string
}

/**
 * The sumpt.us wordmark.
 *
 * Two deliberate choices. It is drawn as a CSS mask rather than an <img>, so
 * the ink is painted with `currentColor` and inherits whatever text colour it
 * sits in — no re-export for a new background. And it is sized in `em`, so it
 * scales like type: callers set a font size (a `clamp()` included) and the
 * artwork follows, instead of passing pixel heights that break at other
 * breakpoints.
 */
export function Wordmark({ className }: WordmarkProps) {
  const url = `${import.meta.env.BASE_URL}brand/wordmark.png`

  return (
    <span
      role="img"
      aria-label="sumpt.us"
      className={cn('inline-block shrink-0 bg-current align-middle', className)}
      style={{
        height: '1em',
        width: `${ASPECT}em`,
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
