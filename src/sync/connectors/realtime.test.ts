import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuthProvider } from './types'
import {
  joinMessage,
  pingSeq,
  realtimeUrl,
  supabaseChanges,
  type SocketLike,
} from './realtime'

/** A fake socket the test drives by hand. */
class FakeSocket implements SocketLike {
  sent: string[] = []
  closed = false
  onopen: SocketLike['onopen'] = null
  onmessage: SocketLike['onmessage'] = null
  onclose: SocketLike['onclose'] = null
  onerror: SocketLike['onerror'] = null
  url: string
  constructor(url: string) {
    this.url = url
  }
  send(data: string) {
    this.sent.push(data)
  }
  close() {
    this.closed = true
  }
  open() {
    this.onopen?.({})
  }
  receive(msg: unknown) {
    this.onmessage?.({ data: JSON.stringify(msg) })
  }
}

const auth: AuthProvider = {
  current: () => ({ accountId: 'acc-1', email: 'o@example.com', sub: 's' }),
  signIn: async () => {},
  finishSignIn: async () => false,
  signOut: async () => {},
  accessToken: async () => 'jwt-1',
  driveToken: async () => null,
}

/** Lets the connector's awaited token call finish (fake timers are on). */
const flush = async () => {
  for (let i = 0; i < 6; i++) await Promise.resolve()
}

describe('Supabase Realtime over a plain socket (R6-13)', () => {
  const sockets: FakeSocket[] = []
  const make = (url: string) => {
    const s = new FakeSocket(url)
    sockets.push(s)
    return s
  }
  beforeEach(() => {
    sockets.length = 0
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  it('builds the socket address and the join message from the config', () => {
    expect(realtimeUrl()).toMatch(
      /^wss:\/\/.*\/realtime\/v1\/websocket\?apikey=/,
    )
    const join = joinMessage('acc-1', 'jwt-1')
    expect(join.event).toBe('phx_join')
    const cfg = join.payload!.config as {
      postgres_changes: { table: string; filter: string }[]
    }
    expect(cfg.postgres_changes[0].table).toBe('sync_pings')
    expect(cfg.postgres_changes[0].filter).toBe('account_id=eq.acc-1')
    expect(join.payload!.access_token).toBe('jwt-1')
  })

  it('reads the server order out of a change message, ignores the rest', () => {
    expect(
      pingSeq({
        topic: 'realtime:sync',
        event: 'postgres_changes',
        payload: { data: { record: { seq: '42' } } },
      }),
    ).toBe(42)
    expect(pingSeq({ topic: 'phoenix', event: 'phx_reply' })).toBeNull()
  })

  it('joins, says it is live, pings on changes and heartbeats', async () => {
    const ping = vi.fn()
    const open = vi.fn()
    const stop = supabaseChanges(auth, make).subscribe(ping, open)
    await flush()
    const s = sockets[0]
    s.open()
    expect(JSON.parse(s.sent[0]).event).toBe('phx_join')
    expect(open).not.toHaveBeenCalled()
    s.receive({
      topic: 'realtime:sync',
      event: 'phx_reply',
      ref: '1',
      payload: { status: 'ok', response: {} },
    })
    expect(open).toHaveBeenCalledWith(true)
    s.receive({
      topic: 'realtime:sync',
      event: 'postgres_changes',
      payload: { data: { type: 'UPDATE', record: { seq: 7 } } },
    })
    expect(ping).toHaveBeenCalledWith(7)
    vi.advanceTimersByTime(26_000)
    expect(s.sent.some((m) => JSON.parse(m).event === 'heartbeat')).toBe(true)
    stop()
    expect(s.closed).toBe(true)
    expect(open).toHaveBeenLastCalledWith(false)
  })

  it('falls back when the socket closes, then reconnects with a wait', async () => {
    const open = vi.fn()
    const stop = supabaseChanges(auth, make).subscribe(() => {}, open)
    await flush()
    const first = sockets[0]
    first.open()
    first.receive({
      topic: 'realtime:sync',
      event: 'phx_reply',
      ref: '1',
      payload: { status: 'ok' },
    })
    expect(open).toHaveBeenLastCalledWith(true)
    first.onclose?.({})
    expect(open).toHaveBeenLastCalledWith(false)
    expect(sockets).toHaveLength(1)
    vi.advanceTimersByTime(2_000)
    await flush()
    expect(sockets).toHaveLength(2)
    stop()
  })

  it('does nothing while signed out', async () => {
    const out: AuthProvider = { ...auth, current: () => null }
    const stop = supabaseChanges(out, make).subscribe(
      () => {},
      () => {},
    )
    await flush()
    expect(sockets).toHaveLength(0)
    stop()
  })
})
