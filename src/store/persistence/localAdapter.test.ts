import { beforeEach, describe, expect, it } from 'vitest'
import { LocalStorageAdapter } from './localAdapter'
import { DEFAULT_PREFERENCES, SCHEMA_VERSION } from './types'

const KEY = 'sumptus.state.v1'

/** Just enough of the Storage interface for the adapter. */
function installStorage(): Map<string, string> {
  const store = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    },
  })
  return store
}

/** A snapshot written before `playIntro` and `introSeen` existed. */
function legacySnapshot() {
  return {
    version: SCHEMA_VERSION,
    user: null,
    onboarded: true,
    friends: [],
    groups: [],
    expenses: [],
    settlements: [],
    preferences: {
      currency: 'EUR',
      language: 'en',
      notifications: true,
      reduceMotion: true,
    },
  }
}

describe('LocalStorageAdapter.load', () => {
  let store: Map<string, string>

  beforeEach(() => {
    store = installStorage()
  })

  it('fills in preferences an older install never wrote', async () => {
    store.set(KEY, JSON.stringify(legacySnapshot()))

    const loaded = await new LocalStorageAdapter().load()

    // The point of the merge: a key defaulting to on must not arrive as
    // `undefined` — which every consumer would read as off.
    expect(loaded?.preferences.playIntro).toBe(DEFAULT_PREFERENCES.playIntro)
    expect(loaded?.preferences.introSeen).toBe(DEFAULT_PREFERENCES.introSeen)
  })

  it('never lets a default overwrite a stored choice', async () => {
    const snapshot = legacySnapshot()
    store.set(KEY, JSON.stringify(snapshot))

    const loaded = await new LocalStorageAdapter().load()

    // reduceMotion defaults to false; this install has it on.
    expect(loaded?.preferences.reduceMotion).toBe(true)
    expect(loaded?.preferences.currency).toBe('EUR')
    expect(loaded?.onboarded).toBe(true)
  })

  it('keeps an explicit false rather than treating it as missing', async () => {
    const snapshot = legacySnapshot()
    const preferences = { ...snapshot.preferences, playIntro: false, introSeen: true }
    store.set(KEY, JSON.stringify({ ...snapshot, preferences }))

    const loaded = await new LocalStorageAdapter().load()

    expect(loaded?.preferences.playIntro).toBe(false)
    expect(loaded?.preferences.introSeen).toBe(true)
  })

  it('returns null for an empty store rather than a half-built state', async () => {
    expect(await new LocalStorageAdapter().load()).toBeNull()
  })

  it('survives a corrupt blob', async () => {
    store.set(KEY, '{not json')
    expect(await new LocalStorageAdapter().load()).toBeNull()
  })
})
