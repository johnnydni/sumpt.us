/**
 * Short, sortable-ish ids. crypto.randomUUID isn't available on every mobile
 * browser we target, so fall back to a timestamp + entropy pair. Ids only need
 * to be unique within one device's local store.
 */
export function createId(prefix = ''): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6)
  const stamp = Date.now().toString(36)
  return `${prefix}${prefix ? '_' : ''}${stamp}${random.slice(0, 6)}`
}
