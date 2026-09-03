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
