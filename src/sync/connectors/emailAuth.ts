import type { SignInMethods } from './types'
import { AuthInputError, type AuthInputKind } from './types'

/**
 * Helpers for the email code and email + password sign-in (Supabase Auth).
 * Pure functions, so they are unit tested without a server.
 */

/** Words that tell a refused sign-up from a wrong code (Supabase error codes). */
export function failKind(
  status: number,
  body: { error_code?: string; code?: string | number; msg?: string } | null,
): AuthInputKind {
  const code = String(body?.error_code ?? body?.code ?? '')
  const msg = (body?.msg ?? '').toLowerCase()
  if (['otp_expired', 'otp_disabled', 'invalid_credentials'].includes(code))
    return 'invalid'
  if (['email_address_invalid', 'validation_failed'].includes(code))
    return 'badEmail'
  if (code === 'weak_password') return 'weak'
  if (code === 'unexpected_failure' || /smtp|sending/.test(msg)) return 'mail'
  if (['user_already_exists', 'email_exists'].includes(code)) return 'exists'
  if (['over_email_send_rate_limit', 'over_request_rate_limit'].includes(code))
    return 'limit'
  // The testing allow-list (a "Before User Created" hook) says no.
  if (code.startsWith('hook_') || msg.includes('not allowed')) return 'refused'
  if (status === 400 || status === 401 || status === 422) return 'invalid'
  return 'failed'
}

/**
 * A server-side failure (429 or 5xx) in plain words, or null to treat it as
 * a plain "try later". Mail trouble (SMTP) and rate limits are named.
 */
export function serverFailure(
  status: number,
  body: {
    error_code?: string
    code?: string | number
    msg?: string
    message?: string
  } | null,
): AuthInputKind | null {
  if (status === 429) return 'limit'
  if (status < 500) return null
  const code = String(body?.error_code ?? body?.code ?? '')
  const msg = (body?.msg ?? body?.message ?? '').toLowerCase()
  if (msg.includes('not allowed') || code.startsWith('hook_')) return 'refused'
  if (/smtp|mail|unexpected_failure/.test(code + ' ' + msg)) return 'mail'
  return null
}

export async function failure(res: Response): Promise<AuthInputError> {
  let body = null
  try {
    body = await res.json()
  } catch {
    // No readable answer.
  }
  return new AuthInputError(failKind(res.status, body))
}

interface UserReply {
  email?: string
  email_confirmed_at?: string | null
  confirmed_at?: string | null
  user_metadata?: { has_password?: boolean }
  identities?: {
    identity_id?: string
    id?: string
    provider?: string
    identity_data?: { email?: string }
  }[]
}

/** The sign-in methods of an account, from Supabase's user object. */
export function parseMethods(user: UserReply): SignInMethods {
  const out: SignInMethods = { password: !!user.user_metadata?.has_password }
  for (const i of user.identities ?? []) {
    const entry = {
      id: i.identity_id ?? i.id ?? '',
      email: i.identity_data?.email ?? user.email ?? '',
    }
    if (i.provider === 'google') out.google = entry
    else if (i.provider === 'email') out.email = entry
  }
  // A confirmed email signs in with a code even without its own identity.
  if (
    !out.email &&
    user.email &&
    (user.email_confirmed_at || user.confirmed_at)
  ) {
    out.email = { id: '', email: user.email }
    out.emailImplicit = true
  }
  return out
}
