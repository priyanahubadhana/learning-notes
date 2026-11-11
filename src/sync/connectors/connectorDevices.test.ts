import { afterEach, describe, expect, it, vi } from 'vitest'
import { supabaseRecords } from './supabase'
import type { AuthProvider } from './types'

const auth = { accessToken: async () => 'tok' } as unknown as AuthProvider
let calls: { url: string; init: RequestInit }[] = []
function mock(status: number, body: unknown) {
  calls = []
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string, init: RequestInit) => {
      calls.push({ url, init })
      return new Response(JSON.stringify(body), { status })
    }),
  )
}
afterEach(() => vi.unstubAllGlobals())

describe('connected computers (store)', () => {
  it('lists devices with real times', async () => {
    mock(200, [
      {
        session_id: 's1',
        device_id: 'mcp-pc',
        name: 'Claude (PC)',
        created_at: '2026-11-11T10:00:00Z',
        last_seen_at: '2026-11-11T11:00:00Z',
        revoked_at: null,
      },
    ])
    const list = await supabaseRecords(auth).connectorDevices!()
    expect(list).toEqual([
      {
        sessionId: 's1',
        deviceId: 'mcp-pc',
        name: 'Claude (PC)',
        createdAt: Date.parse('2026-11-11T10:00:00Z'),
        lastSeenAt: Date.parse('2026-11-11T11:00:00Z'),
        revokedAt: null,
      },
    ])
    expect(calls[0].url).toContain('/rest/v1/connector_devices?')
  })

  it('revoke calls the database function with the session id only', async () => {
    mock(200, true)
    expect(await supabaseRecords(auth).revokeConnectorDevice!('s1')).toBe(true)
    expect(calls[0].url).toMatch(/rpc\/connector_revoke$/)
    expect(JSON.parse(String(calls[0].init.body))).toEqual({
      p_session_id: 's1',
    })
  })

  it('revoke answers false when it was already revoked, and throws when refused', async () => {
    mock(200, false)
    expect(await supabaseRecords(auth).revokeConnectorDevice!('s1')).toBe(false)
    mock(403, {})
    await expect(
      supabaseRecords(auth).revokeConnectorDevice!('s1'),
    ).rejects.toThrow()
  })
})
