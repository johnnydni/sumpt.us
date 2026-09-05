import type { AuthError, Session } from '@supabase/supabase-js'
import { requireSupabase } from './client'

export type OAuthProvider = 'apple' | 'google'

/**
 * Email sign-in sends a six digit code, not a magic link.
 *
 * A link is handed to whichever browser the system picks, which for an
 * installed app is usually not the app — the user ends up signed in somewhere
 * they were not, in a tab outside standalone mode, while the icon they tapped
 * still shows them signed out. A code keeps the whole flow on one screen.
 */
export async function sendEmailCode(email: string): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  })
  if (error) throw new SignInError(describeAuthError(error), error)
}

export async function verifyEmailCode(email: string, code: string): Promise<Session> {
  const { data, error } = await requireSupabase().auth.verifyOtp({
    email: email.trim(),
    token: code.trim(),
    type: 'email',
  })
  if (error) throw new SignInError(describeAuthError(error), error)
  if (!data.session) throw new SignInError('That code was accepted but no session came back. Try again.')
  return data.session
}

/**
 * Both providers need to be switched on in the Supabase dashboard first, and
 * Apple additionally needs a paid developer account, a Services ID and a key.
 * Until then these fail, which is why email is the path that works on a fresh
 * project.
 */
export async function signInWithProvider(provider: OAuthProvider, redirectTo: string): Promise<void> {
  const { error } = await requireSupabase().auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })
  if (error) throw new SignInError(describeAuthError(error), error)
}

export async function signOut(): Promise<void> {
  const { error } = await requireSupabase().auth.signOut()
  if (error) throw new SignInError(describeAuthError(error), error)
}

/**
 * Removing an account is a server-side act: the client has no rights over
 * auth.users, and handing it any would be handing it everybody's. The function
 * this calls deletes only the caller's own row and lets the cascades do the
 * rest.
 */
export async function deleteAccount(): Promise<void> {
  const { error } = await requireSupabase().rpc('delete_my_account')
  if (error) throw new SignInError('Your account could not be deleted. Try again in a moment.')
  await requireSupabase().auth.signOut()
}

export class SignInError extends Error {
  readonly cause?: AuthError
  constructor(message: string, cause?: AuthError) {
    super(message)
    this.name = 'SignInError'
    this.cause = cause
  }
}

/**
 * Turns an auth error into something worth reading.
 *
 * Supabase's messages are written for developers — "Token has expired or is
 * invalid" tells someone waiting on a code nothing about what to do next.
 *
 * Matched on whole phrases rather than loose substrings. Testing for "invalid"
 * alone also catches `JWSInvalidSignature`, which would have told someone
 * their code was wrong when the real fault was a broken session — sending them
 * to retype six correct digits indefinitely.
 */
const AUTH_MESSAGES: Array<[RegExp, string]> = [
  [
    /token has expired|otp[_ ]expired|expired or is invalid|invalid login credentials|invalid token/,
    'That code is wrong or has expired. Ask for a new one.',
  ],
  [/rate limit|too many requests/, 'Too many attempts. Wait a minute, then try again.'],
  [
    /provider is not enabled|unsupported provider/,
    'That sign-in method is not switched on for this app yet.',
  ],
  [/invalid email|unable to validate email/, "That email address doesn't look right."],
  [
    /failed to fetch|network ?error|networkerror/,
    'No connection. Your data is safe on this device — try again when you are back online.',
  ],
]

export function describeAuthError(error: Pick<AuthError, 'message'> & { status?: number }): string {
  if (error.status === 429) return 'Too many attempts. Wait a minute, then try again.'

  const message = error.message.toLowerCase()
  for (const [pattern, text] of AUTH_MESSAGES) {
    if (pattern.test(message)) return text
  }
  // Anything unrecognised gets a plain sentence rather than raw API text,
  // which is where product copy usually leaks.
  return 'That did not work. Try again in a moment.'
}

/**
 * Deliberately loose: the only authority on whether an address exists is
 * whether the code arrives. This catches a missing @ before a round trip, and
 * nothing more.
 */
export function looksLikeEmail(value: string): boolean {
  const trimmed = value.trim()
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(trimmed)
}

/** Six digits, spaces and dashes forgiven — codes get pasted from mail apps. */
export function normaliseCode(value: string): string {
  return value.replace(/[\s-]/g, '').slice(0, 6)
}

export function isCompleteCode(value: string): boolean {
  return /^\d{6}$/.test(normaliseCode(value))
}
