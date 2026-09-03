import type { Debt, PersonBalance } from '@/types'

/**
 * Rewrite a set of debts into the smallest practical number of transfers.
 *
 * The trick: who paid whom historically doesn't matter, only each person's net
 * position does. Collapse the debt graph to net balances (creditors positive,
 * debtors negative), then repeatedly match the largest debtor against the
 * largest creditor. Each pass zeroes out at least one person, so at most n−1
 * transfers remain for n people — a strict improvement whenever the original
 * graph had cycles or chains.
 *
 * This is the greedy solution. Finding the provably minimal set is NP-hard
 * (it's subset-sum in disguise), but greedy is optimal for the common case
 * where no subgroup happens to net to zero on its own, and is never worse than
 * n−1 transfers. Every person's final position is identical either way, which
 * is the property that actually has to hold.
 */
export function simplifyDebts(debts: Debt[]): Debt[] {
  const net = new Map<string, number>()
  for (const debt of debts) {
    net.set(debt.fromPersonId, (net.get(debt.fromPersonId) ?? 0) - debt.amountMinor)
    net.set(debt.toPersonId, (net.get(debt.toPersonId) ?? 0) + debt.amountMinor)
  }
  return settleBalances([...net.entries()].map(([personId, netMinor]) => ({ personId, netMinor })))
}

/**
 * Turn net positions into concrete transfers. Sorting before the greedy match
 * keeps the output stable for identical input, so the UI doesn't reshuffle
 * rows between renders.
 */
export function settleBalances(balances: PersonBalance[]): Debt[] {
  const debtors = balances
    .filter((b) => b.netMinor < 0)
    .map((b) => ({ personId: b.personId, amount: -b.netMinor }))
    .sort((a, b) => b.amount - a.amount || a.personId.localeCompare(b.personId))

  const creditors = balances
    .filter((b) => b.netMinor > 0)
    .map((b) => ({ personId: b.personId, amount: b.netMinor }))
    .sort((a, b) => b.amount - a.amount || a.personId.localeCompare(b.personId))

  const transfers: Debt[] = []
  let i = 0
  let j = 0

  while (i < debtors.length && j < creditors.length) {
    const debtor = debtors[i]
    const creditor = creditors[j]
    const amount = Math.min(debtor.amount, creditor.amount)

    if (amount > 0) {
      transfers.push({
        fromPersonId: debtor.personId,
        toPersonId: creditor.personId,
        amountMinor: amount,
      })
    }

    debtor.amount -= amount
    creditor.amount -= amount
    if (debtor.amount === 0) i += 1
    if (creditor.amount === 0) j += 1
  }

  return transfers
}

export interface SimplificationResult {
  original: Debt[]
  simplified: Debt[]
  /** How many transfers the simplification removes. Zero means no gain. */
  saved: number
}

export function calculateSettlement(debts: Debt[]): SimplificationResult {
  const simplified = simplifyDebts(debts)
  return {
    original: debts,
    simplified,
    saved: Math.max(0, debts.length - simplified.length),
  }
}
