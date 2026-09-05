import { createClient, type SupabaseClient } from '@supabase/supabase-js'

/**
 * The Supabase client, or null.
 *
 * Null is a supported state, not an error: without keys the app runs entirely
 * on localStorage, exactly as it did before there was a backend. `main`
 * deploys straight to Pages, so a missing environment variable has to mean
 * "local only", never a white screen.
 *
 * Every caller therefore has to handle null. `requireSupabase()` is for the
 * places that genuinely cannot proceed — a sign-in screen the user only
 * reaches when it is configured.
 */
function readConfig(): { url: string; anonKey: string } | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim()
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()
  if (!url || !anonKey) return null
  return { url, anonKey }
}

const config = readConfig()

export const supabase: SupabaseClient | null = config
  ? createClient(config.url, config.anonKey, {
      auth: {
        // The app is installable, so a session has to survive a cold start.
        persistSession: true,
        autoRefreshToken: true,
        // The OTP flow never puts a token in the URL, and reading one out of
        // the address bar would only matter for the magic-link flow this app
        // deliberately does not use.
        detectSessionInUrl: false,
      },
    })
  : null

/** True when this build can talk to a backend at all. */
export const isSupabaseConfigured = supabase !== null

export function requireSupabase(): SupabaseClient {
  if (!supabase) {
    throw new Error(
      'Supabase is not configured in this build. Guard on isSupabaseConfigured before calling this.',
    )
  }
  return supabase
}
