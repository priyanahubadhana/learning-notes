import { describe, expect, it } from 'vitest'
import { failKind, parseMethods, serverFailure } from './emailAuth'
import { passwordProblem } from '../passwordRules'

describe('email sign-in answers', () => {
  it('tells a wrong or expired code from other problems', () => {
    expect(failKind(403, { error_code: 'otp_expired' })).toBe('invalid')
    expect(failKind(400, { error_code: 'invalid_credentials' })).toBe('invalid')
    expect(failKind(422, { error_code: 'weak_password' })).toBe('weak')
    expect(failKind(422, { error_code: 'email_exists' })).toBe('exists')
    expect(failKind(400, { error_code: 'email_address_invalid' })).toBe(
      'badEmail',
    )
    expect(failKind(429, { error_code: 'over_email_send_rate_limit' })).toBe(
      'limit',
    )
  })
  it('recognises the testing allow-list refusing a new account', () => {
    expect(failKind(500, { msg: 'Email not allowed' })).toBe('refused')
    expect(failKind(500, null)).toBe('failed')
  })
})

describe('connected methods', () => {
  it('reads Google, the email identity and the password flag', () => {
    const m = parseMethods({
      email: 'a@b.c',
      user_metadata: { has_password: true },
      identities: [
        {
          identity_id: 'g1',
          provider: 'google',
          identity_data: { email: 'g@b.c' },
        },
        { id: 'e1', provider: 'email' },
      ],
    })
    expect(m.google).toEqual({ id: 'g1', email: 'g@b.c' })
    expect(m.email).toEqual({ id: 'e1', email: 'a@b.c' })
    expect(m.password).toBe(true)
  })
  it('has no password unless the flag is set', () => {
    expect(parseMethods({ identities: [] }).password).toBe(false)
  })
})

describe('password rules (NIST 800-63B-4)', () => {
  it('needs 15 characters and nothing else', () => {
    expect(passwordProblem('a'.repeat(14))).toBe('short')
    expect(passwordProblem('a'.repeat(15))).toBeNull()
    expect(passwordProblem('correct horse battery staple')).toBeNull()
    expect(passwordProblem('a'.repeat(129))).toBe('long')
  })
})

describe('plain reasons for server failures', () => {
  it('names mail trouble and rate limits', () => {
    expect(
      serverFailure(500, { msg: 'Error sending magic link email: SMTP' }),
    ).toBe('mail')
    expect(serverFailure(500, { error_code: 'unexpected_failure' })).toBe(
      'mail',
    )
    expect(serverFailure(429, null)).toBe('limit')
    expect(serverFailure(500, { msg: 'Email not allowed' })).toBe('refused')
    expect(serverFailure(503, null)).toBeNull()
    expect(serverFailure(400, null)).toBeNull()
  })
  it('a confirmed email works as a code sign-in without its own identity', () => {
    const m = parseMethods({
      email: 'a@b.c',
      email_confirmed_at: '2026-11-10T00:00:00Z',
      identities: [{ identity_id: 'g1', provider: 'google' }],
    })
    expect(m.email).toEqual({ id: '', email: 'a@b.c' })
    expect(m.emailImplicit).toBe(true)
    expect(
      parseMethods({ email: 'a@b.c', identities: [] }).email,
    ).toBeUndefined()
  })
})
