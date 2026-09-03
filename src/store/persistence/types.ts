import type {
  Expense,
  Friend,
  Group,
  PersistedState,
  Preferences,
  Settlement,
  User,
} from '@/types'

export const SCHEMA_VERSION = 1

/**
 * The only contract the app has with storage.
 *
 * Components never import this — they call actions on the Zustand store, which
 * updates memory first and forwards the intent here. That split is what makes
 * a Supabase swap mechanical rather than a rewrite: the mutation methods below
 * map one-to-one onto row operations (`insertExpense` → `from('expenses')
 * .insert(...)`), and `load` becomes the initial fetch. Nothing in the UI
 * changes, because nothing in the UI knows where the data lives.
 *
 * The local implementation collapses every mutation into a debounced snapshot
 * write, which is why the methods return void rather than the written row —
 * ids and timestamps are minted in the store, before persistence, so both
 * implementations stay optimistic and offline-tolerant.
 */
export interface PersistenceAdapter {
  load(): Promise<PersistedState | null>
  /** Write the whole snapshot. Remote adapters can leave this a no-op. */
  saveSnapshot(state: PersistedState): Promise<void>
  clear(): Promise<void>

  setUser(user: User): Promise<void>
  setPreferences(preferences: Preferences): Promise<void>

  insertFriend(friend: Friend): Promise<void>
  removeFriend(id: string): Promise<void>

  insertGroup(group: Group): Promise<void>
  updateGroup(group: Group): Promise<void>
  removeGroup(id: string): Promise<void>

  insertExpense(expense: Expense): Promise<void>
  updateExpense(expense: Expense): Promise<void>
  removeExpense(id: string): Promise<void>

  insertSettlement(settlement: Settlement): Promise<void>
  removeSettlement(id: string): Promise<void>
}
