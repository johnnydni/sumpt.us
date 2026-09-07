import { describe, expect, it } from 'vitest'
import { dateStack, formatTripRange, groupByMonth, monthKey, tripLengthInDays } from './index'

const at = (iso: string) => ({ id: iso, createdAt: iso })

describe('groupByMonth', () => {
  it('orders months by date, not by name', () => {
    // "August" sorts before "July" alphabetically. A list that got this wrong
    // would look almost right, which is the worst way to be wrong.
    const buckets = groupByMonth(
      [at('2026-07-04T10:00:00Z'), at('2026-08-11T10:00:00Z')],
      (item) => item.createdAt,
    )
    expect(buckets.map((b) => b.key)).toEqual(['2026-08', '2026-07'])
  })

  it('keeps the same month in one bucket across years apart', () => {
    const buckets = groupByMonth(
      [at('2025-08-01T10:00:00Z'), at('2026-08-01T10:00:00Z')],
      (item) => item.createdAt,
    )
    expect(buckets).toHaveLength(2)
    expect(buckets.map((b) => b.key)).toEqual(['2026-08', '2025-08'])
  })

  it('names the year only when it is not the current one', () => {
    const thisYear = new Date().getFullYear()
    const [current] = groupByMonth([at(`${thisYear}-08-01T10:00:00Z`)], (i) => i.createdAt)
    const [older] = groupByMonth([at('2019-08-01T10:00:00Z')], (i) => i.createdAt)
    expect(current.label).toBe('August')
    expect(older.label).toBe('August 2019')
  })

  it('returns nothing for nothing', () => {
    expect(groupByMonth([], (i: { createdAt: string }) => i.createdAt)).toEqual([])
  })
})

describe('dateStack', () => {
  it('pads the day so a column of them stays aligned', () => {
    expect(dateStack('2026-08-06T10:00:00Z')).toEqual({ month: 'Aug', day: '06' })
    expect(dateStack('2026-12-31T10:00:00Z')).toEqual({ month: 'Dec', day: '31' })
  })
})

describe('monthKey', () => {
  it('sorts lexicographically in date order', () => {
    expect(monthKey('2026-01-31T00:00:00Z') < monthKey('2026-10-01T00:00:00Z')).toBe(true)
  })
})

describe('tripLengthInDays', () => {
  it('counts both ends, because a day trip is one day', () => {
    expect(tripLengthInDays('2026-08-01', '2026-08-01')).toBe(1)
    expect(tripLengthInDays('2026-08-01', '2026-08-02')).toBe(2)
    expect(tripLengthInDays('2026-08-01', '2026-08-21')).toBe(21)
  })

  it('counts calendar days, not 24-hour blocks', () => {
    // Across a daylight-saving change a "day" is 23 or 25 hours long, and
    // dividing by 86400000 would quietly lose or gain one.
    expect(tripLengthInDays('2026-03-28', '2026-03-30')).toBe(3)
    expect(tripLengthInDays('2026-10-24', '2026-10-26')).toBe(3)
  })

  it('refuses a backwards range rather than reordering it', () => {
    expect(tripLengthInDays('2026-08-10', '2026-08-01')).toBe(0)
  })

  it('spans a year end', () => {
    expect(tripLengthInDays('2026-12-28', '2027-01-03')).toBe(7)
  })
})

describe('formatTripRange', () => {
  it('says each part once', () => {
    expect(formatTripRange('2026-08-01', '2026-08-14')).toBe('1–14 Aug 2026')
    expect(formatTripRange('2026-08-28', '2026-09-03')).toBe('28 Aug – 3 Sep 2026')
    expect(formatTripRange('2026-12-28', '2027-01-03')).toBe('28 Dec 2026 – 3 Jan 2027')
  })
})
