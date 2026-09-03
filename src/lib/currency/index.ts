import type { Currency, CurrencyCode } from '@/types'

export const CURRENCIES: Record<CurrencyCode, Currency> = {
  EUR: { code: 'EUR', symbol: '€', decimals: 2, name: 'Euro' },
  USD: { code: 'USD', symbol: '$', decimals: 2, name: 'US Dollar' },
  GBP: { code: 'GBP', symbol: '£', decimals: 2, name: 'British Pound' },
  CHF: { code: 'CHF', symbol: 'CHF', decimals: 2, name: 'Swiss Franc' },
  JPY: { code: 'JPY', symbol: '¥', decimals: 0, name: 'Japanese Yen' },
}

export const CURRENCY_LIST = Object.values(CURRENCIES)

export function getCurrency(code: CurrencyCode): Currency {
  return CURRENCIES[code] ?? CURRENCIES.EUR
}

/** 10 ** decimals — how many minor units make one major unit. */
export function minorFactor(code: CurrencyCode): number {
  return 10 ** getCurrency(code).decimals
}

/**
 * Parse user input ("84", "84,50", "1.234,56", "€84.50") into minor units.
 * Returns null when the input cannot be read as a number, so callers can show
 * inline validation instead of silently treating it as zero.
 */
export function parseAmountToMinor(input: string, code: CurrencyCode): number | null {
  const cleaned = input.replace(/[^\d.,-]/g, '').trim()
  if (!cleaned) return null

  const lastComma = cleaned.lastIndexOf(',')
  const lastDot = cleaned.lastIndexOf('.')

  let normalised: string
  if (lastComma === -1 && lastDot === -1) {
    normalised = cleaned
  } else if (lastComma > lastDot) {
    // German style: dots group thousands, comma is the decimal separator.
    normalised = cleaned.replace(/\./g, '').replace(',', '.')
  } else {
    normalised = cleaned.replace(/,/g, '')
  }

  const value = Number(normalised)
  if (!Number.isFinite(value)) return null

  // Round through a string-free path but guard the classic 0.1+0.2 drift.
  const scaled = value * minorFactor(code)
  const minor = Math.round(Number(scaled.toFixed(4)))
  return Number.isSafeInteger(minor) ? minor : null
}

/** Minor units back to a plain editable string ("8450" → "84.50"). */
export function minorToInput(minor: number, code: CurrencyCode): string {
  const decimals = getCurrency(code).decimals
  if (decimals === 0) return String(minor)
  return (minor / minorFactor(code)).toFixed(decimals)
}
