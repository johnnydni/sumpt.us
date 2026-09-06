import type { CurrencyCode } from '@/types'
import { getCurrency, minorFactor } from '@/lib/currency'

interface MoneyOptions {
  /** Force a leading + on positive values. Balances want this; totals don't. */
  signed?: boolean
  /** Drop the currency symbol — for split editors where the unit is implied. */
  bare?: boolean
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function formatter(code: CurrencyCode, minIntegerDigits = 1): Intl.NumberFormat {
  const key = `${code}:${minIntegerDigits}`
  let f = formatterCache.get(key)
  if (!f) {
    const decimals = getCurrency(code).decimals
    f = new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      minimumIntegerDigits: minIntegerDigits,
    })
    formatterCache.set(key, f)
  }
  return f
}

/**
 * Render minor units for display. Never feed the result back into a
 * calculation — parse from the numeric source instead.
 */
export function formatMoney(
  minor: number,
  code: CurrencyCode,
  options: MoneyOptions = {},
): string {
  const { signed = false, bare = false } = options
  const currency = getCurrency(code)
  const magnitude = Math.abs(minor) / minorFactor(code)
  const body = formatter(code).format(magnitude)
  const amount = bare ? body : `${currency.symbol}${body}`

  if (minor < 0) return `−${amount}`
  if (signed && minor > 0) return `+${amount}`
  return amount
}

/** One rendered character of an amount, and whether it is a digit. */
export interface MoneyGlyph {
  char: string
  digit: boolean
}

/**
 * The same figure, split into the characters it is drawn with.
 *
 * For type that has to be addressed piece by piece — a counter whose digits
 * are animated individually, say. `minIntegerDigits` pads the major part, which
 * is what stops a running total from changing width as it passes ten.
 *
 * The currency symbol stays one glyph even where it is several letters, since
 * nothing useful can be done with half of "CHF".
 */
export function moneyGlyphs(
  minor: number,
  code: CurrencyCode,
  minIntegerDigits = 1,
): MoneyGlyph[] {
  const currency = getCurrency(code)
  const magnitude = Math.abs(minor) / minorFactor(code)
  const body = formatter(code, minIntegerDigits).format(magnitude)
  return [
    { char: currency.symbol, digit: false },
    ...[...body].map((char) => ({ char, digit: char >= '0' && char <= '9' })),
  ]
}

/** "+ €42.50" style, with a hair space after the sign for editorial spacing. */
export function formatSignedMoney(minor: number, code: CurrencyCode): string {
  if (minor === 0) return formatMoney(0, code)
  const sign = minor > 0 ? '+' : '−'
  return `${sign} ${formatMoney(Math.abs(minor), code)}`
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}
