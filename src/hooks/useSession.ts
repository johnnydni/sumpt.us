import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase/client'

export interface SessionState {
  /** Null when signed out, or when this build has no backend at all. */
  session: Session | null
  /**
   * False until the stored session has been read back. Rendering a signed-out
   * screen during that gap would flash the sign-in page at someone who is
   * already signed in, on every cold start.
   */
  ready: boolean
}

/**
 * The current auth session.
 *
 * Resolves immediately as "signed out, ready" when there is no backend
 * configured, so every screen can branch on one shape whether or not this
 * build can talk to a server.
 */
export function useSession(): SessionState {
  const [state, setState] = useState<SessionState>({ session: null, ready: !supabase })

  useEffect(() => {
    if (!supabase) return
    let active = true

    void supabase.auth.getSession().then(({ data }) => {
      if (active) setState({ session: data.session, ready: true })
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setState({ session, ready: true })
    })

    return () => {
      active = false
      subscription.subscription.unsubscribe()
    }
  }, [])

  return state
}
