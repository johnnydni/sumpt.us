import { describe, expect, it } from 'vitest'
import { TRIP_TIERS, tripTierFor } from './plans'

describe('tripTierFor', () => {
  it('rounds up, so a pass never runs out before the trip does', () => {
    // A four-day trip pays the three-week rung rather than the one-day one.
    expect(tripTierFor(4).priceMinor).toBe(300)
    expect(tripTierFor(22).priceMinor).toBe(600)
    expect(tripTierFor(43).priceMinor).toBe(1200)
  })

  it('prices a single day at a euro', () => {
    expect(tripTierFor(1)).toEqual({ upToDays: 1, label: 'A day', priceMinor: 100 })
  })

  it('lands exactly on the rule at every boundary', () => {
    // The rule is three euros to three weeks, then a euro per further week.
    const expected: [number, number][] = [
      [21, 300],
      [42, 300 + 3 * 100],
      [84, 300 + 9 * 100],
      [182, 300 + 23 * 100],
    ]
    for (const [days, priceMinor] of expected) {
      expect(tripTierFor(days).priceMinor).toBe(priceMinor)
    }
  })

  it('holds the last rung rather than falling off the end', () => {
    // Trips are capped at six months, but a cap that moves must not crash.
    expect(tripTierFor(500)).toBe(TRIP_TIERS[TRIP_TIERS.length - 1])
  })

  it('keeps the ladder ordered and priced in whole minor units', () => {
    // A rung out of order would silently sell the wrong pass.
    for (let i = 1; i < TRIP_TIERS.length; i += 1) {
      expect(TRIP_TIERS[i].upToDays).toBeGreaterThan(TRIP_TIERS[i - 1].upToDays)
      expect(TRIP_TIERS[i].priceMinor).toBeGreaterThan(TRIP_TIERS[i - 1].priceMinor)
    }
    for (const tier of TRIP_TIERS) {
      expect(Number.isInteger(tier.priceMinor)).toBe(true)
    }
  })

  it('stays short enough to exist as store products', () => {
    // Every price has to be registered in both stores before anyone can buy it.
    expect(TRIP_TIERS.length).toBeLessThanOrEqual(6)
  })
})
