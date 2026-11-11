import {
  SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_URL,
} from '../../src/sync/connectors/config'
import type { Fetch } from './auth'

/** One encrypted row as the server stores it. */
export interface RemoteRow {
  id: string
  rev: number
  keyId: string
  data: string
  seq: number
}

/** One encrypted row to save. `baseRev` 0 = must be new; otherwise the revision we read. */
export interface PushItem {
  id: string
  baseRev: number
  keyId: string
  data: string
}
export interface PushResult {
  accepted: { id: string; rev: number; seq: number }[]
  /** Ids the server refused because the stored revision was not `baseRev`. */
  conflicts: string[]
}

/** 'unregistered' = a sign-in from before the device list existed. */
export type DeviceStatus = 'ok' | 'revoked' | 'unregistered'

/** Where encrypted rows come from and go to (the server; fixture data in tests). */
export interface RecordSource {
  pull(sinceSeq: number, limit: number): Promise<RemoteRow[]>
  keyBundles(): Promise<string[]>
  /** Is this connection still allowed? (Revoke in the app flips it.) */
  status(): Promise<DeviceStatus>
  /** Lists this sign-in as a device in the app (id like "mcp-pc", name "Claude (PC)"). */
  register(deviceId: string, name: string): Promise<void>
  push(items: PushItem[]): Promise<PushResult>
  /** One audit line per write: the tool, ids and counts. Never any content. */
  audit(
    tool: string,
    ids: string[],
    counts: Record<string, number>,
  ): Promise<void>
}

export class SourceError extends Error {}

export const REVOKED_MESSAGE =
  'This connection was revoked in the Learning Notes app (Settings › Account › Connected computers). Nothing can be read or written. To reconnect, run: node mcp/dist/index.js setup'

/** The app revoked this connection. */
export class RevokedError extends SourceError {
  constructor() {
    super(REVOKED_MESSAGE)
  }
}

/** Access to the server's REST API with the signed-in token. */
export function supabaseSource(
  token: () => Promise<string>,
  f: Fetch = fetch,
): RecordSource {
  const request = async (path: string, init: RequestInit = {}) => {
    let res: Response
    try {
      res = await f(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${await token()}`,
          ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        },
      })
    } catch {
      throw new SourceError('Could not reach the server (offline?).')
    }
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      if (/revoked/i.test(body)) throw new RevokedError()
      if (res.status === 401 || res.status === 403)
        throw new SourceError(
          'The server refused the sign-in. Run setup again: node mcp/dist/index.js setup',
        )
      throw new SourceError(`Server error ${res.status}.`)
    }
    return res.status === 204 ? null : ((await res.json()) as unknown)
  }
  const rpc = (name: string, args: unknown) =>
    request(`rpc/${name}`, { method: 'POST', body: JSON.stringify(args) })
  return {
    async pull(sinceSeq, limit) {
      const list = (await request(
        `sync_records?select=id,rev,key_id,data,seq&seq=gt.${Math.floor(sinceSeq)}&order=seq.asc&limit=${Math.floor(limit)}`,
      )) as {
        id: string
        rev: number
        key_id: string
        data: string
        seq: number | string
      }[]
      return list.map((r) => ({
        id: r.id,
        rev: r.rev,
        keyId: r.key_id,
        data: r.data,
        seq: Number(r.seq),
      }))
    },
    async keyBundles() {
      const list = (await request('sync_key_bundles?select=data')) as {
        data: string
      }[]
      return list.map((r) => r.data)
    },
    async status() {
      const s = await rpc('connector_status', {})
      return s === 'revoked' || s === 'unregistered' ? s : 'ok'
    },
    async register(deviceId, name) {
      await rpc('connector_register', { p_device_id: deviceId, p_name: name })
    },
    async push(items) {
      const out = (await rpc('sync_push', {
        items: items.map((i) => ({
          id: i.id,
          base_rev: i.baseRev,
          key_id: i.keyId,
          data: i.data,
        })),
      })) as {
        accepted: { id: string; rev: number; seq: number | string }[]
        conflicts: string[]
      }
      return {
        accepted: out.accepted.map((a) => ({ ...a, seq: Number(a.seq) })),
        conflicts: out.conflicts,
      }
    },
    async audit(tool, ids, counts) {
      await rpc('connector_audit_add', {
        p_tool: tool,
        p_ids: ids.slice(0, 60),
        p_counts: counts,
      })
    },
  }
}
