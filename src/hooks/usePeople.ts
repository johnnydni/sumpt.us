import { useMemo } from 'react'
import { useAppStore } from '@/store/appStore'

export interface Person {
  id: string
  name: string
  handle: string
  avatarUrl?: string
  isMe: boolean
}

const UNKNOWN = (id: string): Person => ({
  id,
  name: 'Someone',
  handle: 'unknown',
  isMe: false,
})

/**
 * The current user and their friends share one address space — expenses only
 * ever reference a personId. This resolves that id for display.
 *
 * Note the raw-slice selects: returning a derived object straight from the
 * store selector would allocate on every notification and re-render forever.
 */
export function usePeople() {
  const user = useAppStore((s) => s.user)
  const friends = useAppStore((s) => s.friends)

  return useMemo(() => {
    const map = new Map<string, Person>()
    if (user) {
      map.set(user.id, {
        id: user.id,
        name: user.name,
        handle: user.handle,
        avatarUrl: user.avatarUrl,
        isMe: true,
      })
    }
    for (const friend of friends) {
      map.set(friend.id, {
        id: friend.id,
        name: friend.name,
        handle: friend.handle,
        avatarUrl: friend.avatarUrl,
        isMe: false,
      })
    }

    const get = (id: string): Person => map.get(id) ?? UNKNOWN(id)
    /** "You" reads better than the user's own name inside balance rows. */
    const label = (id: string): string => (id === user?.id ? 'You' : get(id).name)
    /** First name only — lists get long and surnames rarely disambiguate. */
    const short = (id: string): string =>
      id === user?.id ? 'You' : get(id).name.split(' ')[0]

    return { map, get, label, short, all: [...map.values()], me: user?.id ?? null }
  }, [user, friends])
}
