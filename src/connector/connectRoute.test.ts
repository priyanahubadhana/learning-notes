import { describe, expect, it } from 'vitest'
import {
  isClaudeAddress,
  isConnectRoute,
  parseConnectHash,
} from './connectRoute'

describe('connect route', () => {
  it('recognises only the connect address', () => {
    expect(isConnectRoute('#/connect?client_id=a')).toBe(true)
    expect(isConnectRoute('#/connect')).toBe(true)
    expect(isConnectRoute('#/connection')).toBe(false)
    expect(isConnectRoute('')).toBe(false)
  })
  it('reads the request, and refuses an incomplete one', () => {
    const q = new URLSearchParams({
      client_id: 'lnc_1',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'x'.repeat(43),
      scope: 'notes:read',
      state: 's1',
    })
    expect(parseConnectHash(`#/connect?${q}`)).toEqual({
      client_id: 'lnc_1',
      redirect_uri: 'https://claude.ai/api/mcp/auth_callback',
      code_challenge: 'x'.repeat(43),
      scope: 'notes:read',
      state: 's1',
    })
    expect(parseConnectHash('#/connect?client_id=a')).toBeNull()
    expect(parseConnectHash('#/connect')).toBeNull()
  })
  it('only ever navigates to Claude addresses', () => {
    expect(
      isClaudeAddress('https://claude.ai/api/mcp/auth_callback?code=1'),
    ).toBe(true)
    expect(isClaudeAddress('https://claude.com/x')).toBe(true)
    for (const bad of [
      'http://claude.ai/x',
      'https://evil.example/x',
      'https://claude.ai.evil.example/x',
      'javascript:alert(1)',
      'not a url',
    ])
      expect(isClaudeAddress(bad), bad).toBe(false)
  })
})
