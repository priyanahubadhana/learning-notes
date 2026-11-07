import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'
import type { AuthProvider, ChangeFeed } from './types'

/**
 * Supabase Realtime over a plain WebSocket (R6-13): the server pings every
 * open device when `sync_pings` changes (one small row per account that
 * `sync_push` touches after each accepted save). No SDK: the Phoenix channel
 * protocol is a handful of JSON messages (join, heartbeat, access_token).
 *
 * The feed carries only "changed" and the server order; records travel by
 * the normal pull. While the socket is closed the service polls instead.
 */

const TOPIC = 'realtime:sync'
const HEARTBEAT_MS = 25_000
const RETRY_MIN_MS = 1_000
const RETRY_MAX_MS = 30_000
/** The sign-in token lasts an hour: send a fresh one well before. */
const TOKEN_MS = 45 * 60_000

/** The part of a WebSocket used here (a fake stands in for tests). */
export interface SocketLike {
  send(data: string): void
  close(): void
  onopen: ((e: unknown) => void) | null
  onmessage: ((e: { data: unknown }) => void) | null
  onclose: ((e: unknown) => void) | null
  onerror: ((e: unknown) => void) | null
}
export type SocketFactory = (url: string) => SocketLike

interface Message {
  topic?: string
  event?: string
  payload?: Record<string, unknown>
  ref?: string | null
}

export function realtimeUrl(): string {
  const base = SUPABASE_URL.replace(/^http/, 'ws')
  return `${base}/realtime/v1/websocket?apikey=${SUPABASE_PUBLISHABLE_KEY}&vsn=1.0.0`
}

/** The join message: what to listen to, as the owner's signed-in account. */
export function joinMessage(
  accountId: string,
  token: string,
): Message & {
  join_ref: string
} {
  return {
    topic: TOPIC,
    event: 'phx_join',
    payload: {
      config: {
        broadcast: { self: false },
        presence: { key: '' },
        postgres_changes: [
          {
            event: '*',
            schema: 'public',
            table: 'sync_pings',
            filter: `account_id=eq.${accountId}`,
          },
        ],
        private: false,
      },
      access_token: token,
    },
    ref: '1',
    join_ref: '1',
  }
}

/** The server order carried by a change message, or null for any other. */
export function pingSeq(msg: Message): number | null {
  if (msg.topic !== TOPIC || msg.event !== 'postgres_changes') return null
  const data = msg.payload?.data as { record?: { seq?: unknown } } | undefined
  const seq = Number(data?.record?.seq)
  return Number.isFinite(seq) ? seq : 0
}

export function supabaseChanges(
  auth: AuthProvider,
  makeSocket: SocketFactory = (url) => new WebSocket(url) as SocketLike,
): ChangeFeed {
  return {
    subscribe(onPing, onOpen) {
      let stopped = false
      let socket: SocketLike | null = null
      let timers: ReturnType<typeof setTimeout>[] = []
      let retryMs = RETRY_MIN_MS
      let ref = 1
      let live = false

      const later = (fn: () => void, ms: number) => {
        const t = setTimeout(fn, ms)
        timers.push(t)
        return t
      }
      const clearTimers = () => {
        for (const t of timers) clearTimeout(t)
        timers = []
      }
      const send = (msg: Message) => {
        try {
          socket?.send(JSON.stringify({ ...msg, ref: String(++ref) }))
        } catch {
          // The socket is closing: the close handler reconnects.
        }
      }
      const setLive = (on: boolean) => {
        if (live === on) return
        live = on
        onOpen(on)
      }
      const dropAndRetry = () => {
        if (stopped) return
        clearTimers()
        setLive(false)
        const s = socket
        socket = null
        try {
          s?.close()
        } catch {
          // already closed
        }
        const wait = retryMs + Math.random() * retryMs * 0.5
        retryMs = Math.min(retryMs * 2, RETRY_MAX_MS)
        later(connect, wait)
      }

      const heartbeat = () =>
        send({ topic: 'phoenix', event: 'heartbeat', payload: {} })
      const freshToken = async () => {
        try {
          const token = await auth.accessToken()
          send({
            topic: TOPIC,
            event: 'access_token',
            payload: { access_token: token },
          })
        } catch {
          dropAndRetry()
        }
      }

      const connect = async () => {
        if (stopped) return
        const account = auth.current()
        if (!account) return
        let token: string
        try {
          token = await auth.accessToken()
        } catch {
          dropAndRetry()
          return
        }
        if (stopped) return
        let s: SocketLike
        try {
          s = makeSocket(realtimeUrl())
        } catch {
          dropAndRetry()
          return
        }
        socket = s
        s.onopen = () => {
          if (socket !== s) return
          s.send(JSON.stringify(joinMessage(account.accountId, token)))
          const beat = () => {
            heartbeat()
            later(beat, HEARTBEAT_MS)
          }
          later(beat, HEARTBEAT_MS)
          const renew = () => {
            void freshToken()
            later(renew, TOKEN_MS)
          }
          later(renew, TOKEN_MS)
        }
        s.onmessage = (e) => {
          if (socket !== s) return
          let msg: Message
          try {
            msg = JSON.parse(String(e.data)) as Message
          } catch {
            return
          }
          const seq = pingSeq(msg)
          if (seq !== null) {
            onPing(seq)
            return
          }
          if (msg.topic !== TOPIC) return
          const status = msg.payload?.status
          if (msg.event === 'phx_reply' && msg.ref === '1') {
            if (status === 'ok') {
              retryMs = RETRY_MIN_MS
              setLive(true)
            } else dropAndRetry()
          } else if (
            (msg.event === 'system' && status === 'error') ||
            msg.event === 'phx_error' ||
            msg.event === 'phx_close'
          ) {
            dropAndRetry()
          }
        }
        s.onerror = () => {
          if (socket === s) dropAndRetry()
        }
        s.onclose = () => {
          if (socket === s) dropAndRetry()
        }
      }

      void connect()
      return () => {
        stopped = true
        clearTimers()
        setLive(false)
        const s = socket
        socket = null
        try {
          s?.close()
        } catch {
          // already closed
        }
      }
    },
  }
}
