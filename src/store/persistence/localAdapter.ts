import type { PersistedState } from '@/types'
import type { PersistenceAdapter } from './types'
import { SCHEMA_VERSION } from './types'

const STORAGE_KEY = 'sumptus.state.v1'

/**
 * localStorage-backed adapter.
 *
 * Every entity mutation is a no-op here: the store already holds the new value
 * in memory and calls `saveSnapshot` right after, so writing rows individually
 * would just serialise the same blob twice. The methods still exist because
 * they are the seam a Supabase adapter fills in.
 */
export class LocalStorageAdapter implements PersistenceAdapter {
  private pending: PersistedState | null = null
  private timer: ReturnType<typeof setTimeout> | null = null

  async load(): Promise<PersistedState | null> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const parsed = JSON.parse(raw) as PersistedState
      if (parsed.version !== SCHEMA_VERSION) return migrate(parsed)
      return parsed
    } catch {
      // Corrupt or unavailable storage (private mode, quota) must not brick the
      // app — fall through to the seeded demo state instead.
      return null
    }
  }

  /**
   * Coalesce writes on a short trailing debounce. Typing an amount fires a
   * mutation per keystroke in some flows; serialising the full store each time
   * would be the one place this app could feel slow.
   */
  async saveSnapshot(state: PersistedState): Promise<void> {
    this.pending = state
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      const snapshot = this.pending
      this.pending = null
      if (!snapshot) return
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot))
      } catch {
        // Quota exceeded: keep running from memory rather than throwing into
        // a render. The next successful write recovers.
      }
    }, 120)
  }

  async clear(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    this.pending = null
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      /* nothing useful to do */
    }
  }

  async setUser() {}
  async setPreferences() {}
  async insertFriend() {}
  async removeFriend() {}
  async insertGroup() {}
  async updateGroup() {}
  async removeGroup() {}
  async insertExpense() {}
  async updateExpense() {}
  async removeExpense() {}
  async insertSettlement() {}
  async removeSettlement() {}
}

/**
 * There is only one schema version so far. When v2 arrives, transform here
 * rather than discarding — a user's expense history is not recoverable.
 */
function migrate(state: PersistedState): PersistedState | null {
  if (typeof state.version !== 'number') return null
  return null
}

export const localAdapter = new LocalStorageAdapter()
