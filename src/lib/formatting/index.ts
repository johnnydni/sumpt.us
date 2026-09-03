import type { CurrencyCode } from '@/types'
import { getCurrency, minorFactor } from '@/lib/currency'

interface MoneyOptions {
  /** Force a leading + on positive values. Balances want this; totals don't. */
  signed?: boolean
  /** Drop the currency symbol — for split editors where the unit is implied. */
  bare?: boolean
}

const formatterCache = new Map<string, Intl.NumberFormat>()

function formatter(code: CurrencyCode): Intl.NumberFormat {
  const key = code
  let f = formatterCache.get(key)
  if (!f) {
    const decimals = getCurrency(code).decimals
    f = new Intl.NumberFormat('en-GB', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
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
