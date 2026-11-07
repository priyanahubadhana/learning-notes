import { describe, expect, it } from 'vitest'
import { authorizeUrl } from './supabase'

describe('Google sign-in address', () => {
  it('always asks Google to show the account chooser', () => {
    const url = authorizeUrl('https://app.test/?sync=callback', 'abc')
    expect(url.searchParams.get('prompt')).toBe('select_account')
    expect(url.searchParams.get('provider')).toBe('google')
    expect(url.searchParams.get('code_challenge')).toBe('abc')
    expect(url.searchParams.get('redirect_to')).toBe(
      'https://app.test/?sync=callback',
    )
  })
})
