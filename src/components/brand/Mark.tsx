import { cn } from '@/lib/cn'

/** Intrinsic aspect of public/brand/mark.png, from scripts/build-mark.mjs. */
export const MARK_ASPECT = 292 / 428

interface MarkProps {
  className?: string
  /** The lockup labels itself, so the mark inside it must stay silent. */
  label?: string
}

/**
 * The sumpt.us mark.
 *
 * Shipped as a CSS mask rather than a picture, so it is painted with
 * `currentColor` and works on white, on navy and on any accent without a
 * second export. Sized in `em` like the wordmark: set a font size and the
 * artwork follows.
 */
export function Mark({ className, label }: MarkProps) {
  const url = `${import.meta.env.BASE_URL}brand/mark.png`

  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : 'true'}
      className={cn('inline-block shrink-0 bg-current align-middle', className)}
      style={{
        height: '1em',
        width: `${MARK_ASPECT}em`,
        maskImage: `url("${url}")`,
        WebkitMaskImage: `url("${url}")`,
        maskSize: 'contain',
        WebkitMaskSize: 'contain',
        maskRepeat: 'no-repeat',
        WebkitMaskRepeat: 'no-repeat',
        maskPosition: 'center',
        WebkitMaskPosition: 'center',
      }}
    />
  )
}
