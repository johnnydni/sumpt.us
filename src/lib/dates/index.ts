import { format, formatDistanceToNowStrict, isToday, isYesterday, parseISO } from 'date-fns'

export function toDate(value: string | Date): Date {
  return typeof value === 'string' ? parseISO(value) : value
}

/** "Today · 19:42", "Yesterday · 08:10", "12 Mar · 14:05". */
export function formatTimestamp(value: string | Date): string {
  const date = toDate(value)
  const time = format(date, 'HH:mm')
  if (isToday(date)) return `Today · ${time}`
  if (isYesterday(date)) return `Yesterday · ${time}`
  return `${format(date, 'd MMM')} · ${time}`
}

/** Section headings in the activity feed and grouped expense lists. */
export function formatDayHeading(value: string | Date): string {
  const date = toDate(value)
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'EEEE, d MMMM')
}

export function formatShortDate(value: string | Date): string {
  return format(toDate(value), 'd MMM')
}

export function formatRelative(value: string | Date): string {
  return `${formatDistanceToNowStrict(toDate(value))} ago`
}

/** Stable YYYY-MM-DD key for bucketing by day. */
export function dayKey(value: string | Date): string {
  return format(toDate(value), 'yyyy-MM-dd')
}

export function greeting(now = new Date()): string {
  const hour = now.getHours()
  if (hour < 5) return 'Still up'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * Move a timestamp onto a chosen day, keeping the time of day it already had.
 *
 * A date picker only offers a day, but the lists sort on the full timestamp.
 * Dropping everything to midnight would tie every back-dated expense with
 * every other, and ties order by whatever the array happened to hold. Keeping
 * the original clock time — or now's, for something new — leaves the ordering
 * meaningful. An unchanged day is returned untouched rather than rebuilt.
 */
export function atSameTimeOfDay(day: string, existing?: string): string {
  const clock = existing ? toDate(existing) : new Date()
  if (existing && dayKey(clock) === day) return existing
  const [year, month, date] = day.split('-').map(Number)
  const moved = new Date(clock)
  moved.setFullYear(year, month - 1, date)
  return moved.toISOString()
}

/** "Aug" over "06" — the stacked date beside a row. */
export function dateStack(value: string | Date): { month: string; day: string } {
  const date = toDate(value)
  return { month: format(date, 'MMM'), day: format(date, 'dd') }
}

/** Section headings for a list segmented by month. */
export function formatMonthHeading(value: string | Date): string {
  const date = toDate(value)
  // The year only earns its place once it is not the current one.
  return format(date, date.getFullYear() === new Date().getFullYear() ? 'MMMM' : 'MMMM yyyy')
}

/** Stable YYYY-MM key for bucketing by month. */
export function monthKey(value: string | Date): string {
  return format(toDate(value), 'yyyy-MM')
}

/**
 * Group items into month buckets, newest first.
 *
 * Buckets are keyed and sorted on YYYY-MM rather than on the heading, because
 * "August" sorts before "July" and a list that ordered itself alphabetically
 * would look almost right, which is the worst way to be wrong.
 */
export function groupByMonth<T>(
  items: T[],
  getDate: (item: T) => string,
): Array<{ key: string; label: string; items: T[] }> {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const key = monthKey(getDate(item))
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, bucketItems]) => ({
      key,
      label: formatMonthHeading(getDate(bucketItems[0])),
      items: bucketItems,
    }))
}

/**
 * Group items into day buckets, newest first, for timeline-style lists.
 */
export function groupByDay<T>(items: T[], getDate: (item: T) => string): Array<{
  key: string
  label: string
  items: T[]
}> {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const key = dayKey(getDate(item))
    const bucket = buckets.get(key)
    if (bucket) bucket.push(item)
    else buckets.set(key, [item])
  }
  return [...buckets.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([key, bucketItems]) => ({
      key,
      label: formatDayHeading(getDate(bucketItems[0])),
      items: bucketItems,
    }))
}
