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

/** Where encrypted rows come from (the server; fixture data in tests). */
export interface RecordSource {
  pull(sinceSeq: number, limit: number): Promise<RemoteRow[]>
  keyBundles(): Promise<string[]>
}

export class SourceError extends Error {}

/** Read-only access to the server's REST API with the signed-in token. */
export function supabaseSource(
  token: () => Promise<string>,
  f: Fetch = fetch,
): RecordSource {
  const get = async (path: string) => {
    let res: Response
    try {
      res = await f(`${SUPABASE_URL}/rest/v1/${path}`, {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${await token()}`,
        },
      })
    } catch {
      throw new SourceError('Could not reach the server (offline?).')
    }
    if (res.status === 401 || res.status === 403)
      throw new SourceError(
        'The server refused the sign-in. Run setup again: node mcp/dist/index.js setup',
      )
    if (!res.ok) throw new SourceError(`Server error ${res.status}.`)
    return res.json() as Promise<unknown>
  }
  return {
    async pull(sinceSeq, limit) {
      const list = (await get(
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
      const list = (await get('sync_key_bundles?select=data')) as {
        data: string
      }[]
      return list.map((r) => r.data)
    },
  }
}
