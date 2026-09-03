import type { ExpenseParticipant, SplitMethod } from '@/types'

/**
 * Distribute `total` minor units across `weights` so that the parts sum back to
 * exactly `total`.
 *
 * Uses largest-remainder (Hamilton) allocation: floor everything, then hand the
 * leftover units to the entries with the biggest fractional remainder. Ties
 * break on index, which makes the result deterministic — the same inputs always
 * produce the same cents, so a balance never drifts between renders or devices.
 */
export function allocate(total: number, weights: number[]): number[] {
  const n = weights.length
  if (n === 0) return []

  const sum = weights.reduce((a, b) => a + b, 0)
  if (sum <= 0) {
    // No usable weights: fall back to an even split so money is never lost.
    return allocate(total, new Array(n).fill(1))
  }

  const sign = total < 0 ? -1 : 1
  const magnitude = Math.abs(total)

  const exact = weights.map((w) => (magnitude * w) / sum)
  const base = exact.map(Math.floor)
  let remainder = magnitude - base.reduce((a, b) => a + b, 0)

  const order = exact
    .map((value, index) => ({ index, frac: value - Math.floor(value) }))
    .sort((a, b) => b.frac - a.frac || a.index - b.index)

  for (let i = 0; remainder > 0; i = (i + 1) % n) {
    base[order[i].index] += 1
    remainder -= 1
  }

  return base.map((v) => v * sign)
}

export interface ShareInput {
  personId: string
  /** Split-method dependent: minor units, basis points, or whole shares. */
  weight?: number
}

/**
 * Resolve the definitive per-person share for an expense.
 *
 * - equal      → weights ignored, everyone carries the same load
 * - amount     → weights are minor units and are used verbatim
 * - percentage → weights are basis points (3500 = 35%)
 * - shares     → weights are whole shares (1, 1, 2, 0)
 *
 * For `amount` the caller is responsible for validating that the parts add up;
 * `validateSplit` below does that. Everything else is rounded here so the
 * shares always reconcile to the total exactly.
 */
export function calculateExpenseShares(
  totalMinor: number,
  method: SplitMethod,
  inputs: ShareInput[],
): ExpenseParticipant[] {
  if (inputs.length === 0) return []

  if (method === 'amount') {
    return inputs.map((input) => ({
      personId: input.personId,
      shareMinor: Math.round(input.weight ?? 0),
      weight: Math.round(input.weight ?? 0),
    }))
  }

  const weights =
    method === 'equal' ? inputs.map(() => 1) : inputs.map((input) => Math.max(0, input.weight ?? 0))

  const shares = allocate(totalMinor, weights)

  return inputs.map((input, index) => ({
    personId: input.personId,
    shareMinor: shares[index],
    weight: method === 'equal' ? undefined : weights[index],
  }))
}

export interface SplitValidation {
  valid: boolean
  /** Signed difference in minor units: allocated − target. */
  deltaMinor: number
  message?: string
}

/**
 * Guard against a split that silently loses or invents money. The Add Expense
 * and Advanced Split screens both block their submit button on this.
 */
export function validateSplit(
  totalMinor: number,
  method: SplitMethod,
  inputs: ShareInput[],
): SplitValidation {
  if (inputs.length === 0) {
    return { valid: false, deltaMinor: -totalMinor, message: 'Select at least one participant.' }
  }

  if (method === 'amount') {
    const allocated = inputs.reduce((sum, i) => sum + Math.round(i.weight ?? 0), 0)
    const delta = allocated - totalMinor
    return {
      valid: delta === 0,
      deltaMinor: delta,
      message: delta === 0 ? undefined : "The amounts don't add up yet.",
    }
  }

  if (method === 'percentage') {
    const bps = inputs.reduce((sum, i) => sum + Math.max(0, i.weight ?? 0), 0)
    const delta = bps - 10_000
    return {
      valid: delta === 0,
      deltaMinor: 0,
      message: delta === 0 ? undefined : 'The percentages must add up to 100%.',
    }
  }

  if (method === 'shares') {
    const total = inputs.reduce((sum, i) => sum + Math.max(0, i.weight ?? 0), 0)
    return {
      valid: total > 0,
      deltaMinor: 0,
      message: total > 0 ? undefined : 'Give at least one person a share.',
    }
  }

  return { valid: true, deltaMinor: 0 }
}
