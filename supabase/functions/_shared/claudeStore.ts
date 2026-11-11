/**
 * Data access for the online Claude connector (slices 3-5): the encrypted
 * records, the escrow row and the audit log. An interface, a memory version
 * for the Node tests, and the Supabase version (service role, REST). The
 * service key is passed in by the function; it is never written in code.
 */

export interface RemoteRow {
  id: string
  rev: number
  keyId: string
  data: string
  seq: number
}
export interface PushItem {
  id: string
  /** 0 = must be new. */
  baseRev: number
  keyId: string
  data: string
}
export interface EscrowRow {
  userId: string
  keyId: string
  wrapped: string
  /** null = every notebook. */
  notebookIds: string[] | null
  createdAt: number
  lastUsedAt: number
}
export interface AuditRow {
  userId: string
  at: number
  tool: string
  clientId: string
  ids: string[]
  counts: Record<string, number>
}

export class StoreError extends Error {}
/** A save that found a record already there; nothing was saved. */
export class PushConflict extends StoreError {}

export interface ClaudeBackend {
  pull(userId: string, sinceSeq: number, limit: number): Promise<RemoteRow[]>
  /** All or nothing. Throws PushConflict if any record already exists. */
  push(userId: string, items: PushItem[]): Promise<void>
  getEscrow(userId: string): Promise<EscrowRow | null>
  putEscrow(row: EscrowRow): Promise<void>
  /** Replaces just the notebook choice. */
  setEscrowScope(userId: string, notebookIds: string[] | null): Promise<void>
  touchEscrow(userId: string, at: number): Promise<void>
  deleteEscrow(userId: string): Promise<void>
  /** Deletes escrow rows unused for 30 days and those people's Claude passes. */
  cleanupEscrow(): Promise<void>
  addAudit(row: AuditRow): Promise<void>
}

export const ESCROW_TTL_MS = 30 * 24 * 3600 * 1000

// ---------- memory (tests) ----------

export function memoryBackend(now: () => number = Date.now) {
  const records = new Map<string, RemoteRow & { userId: string }>()
  const escrow = new Map<string, EscrowRow>()
  const audit: AuditRow[] = []
  let seq = 0
  const self = {
    records,
    escrow,
    audit,
    /** Tests: called when cleanup drops a person's escrow. */
    onExpired: undefined as ((u: string) => void) | undefined,
    /** Tests: make the next push fail (the server is down). */
    failNextPush: false,
    async pull(userId: string, sinceSeq: number, limit: number) {
      return [...records.values()]
        .filter((r) => r.userId === userId && r.seq > sinceSeq)
        .sort((a, b) => a.seq - b.seq)
        .slice(0, limit)
        .map((r) => ({
          id: r.id,
          rev: r.rev,
          keyId: r.keyId,
          data: r.data,
          seq: r.seq,
        }))
    },
    async push(userId: string, items: PushItem[]) {
      if (self.failNextPush) {
        self.failNextPush = false
        throw new StoreError('down')
      }
      // All or nothing: check first, then write.
      if (new Set(items.map((i) => i.id)).size !== items.length)
        throw new PushConflict('conflict')
      for (const it of items) {
        const have = records.get(`${userId}/${it.id}`)
        if (it.baseRev === 0 ? !!have : !have || have.rev !== it.baseRev)
          throw new PushConflict('conflict')
      }
      for (const it of items) {
        const have = records.get(`${userId}/${it.id}`)
        records.set(`${userId}/${it.id}`, {
          userId,
          id: it.id,
          rev: (have?.rev ?? 0) + 1,
          keyId: it.keyId,
          data: it.data,
          seq: ++seq,
        })
      }
    },
    async getEscrow(userId: string) {
      return escrow.get(userId) ?? null
    },
    async putEscrow(row: EscrowRow) {
      escrow.set(row.userId, { ...row })
    },
    async setEscrowScope(userId: string, ids: string[] | null) {
      const r = escrow.get(userId)
      if (r) r.notebookIds = ids
    },
    async touchEscrow(userId: string, at: number) {
      const r = escrow.get(userId)
      if (r) r.lastUsedAt = at
    },
    async deleteEscrow(userId: string) {
      escrow.delete(userId)
    },
    async cleanupEscrow() {
      for (const [u, r] of [...escrow]) {
        if (now() - r.lastUsedAt > ESCROW_TTL_MS) {
          escrow.delete(u)
          self.onExpired?.(u)
        }
      }
    },
    async addAudit(row: AuditRow) {
      audit.push(row)
    },
  }
  return self satisfies ClaudeBackend
}

// ---------- Supabase ----------

type Fetch = typeof fetch
const iso = (ms: number) => new Date(ms).toISOString()

interface EscrowDb {
  user_id: string
  key_id: string
  wrapped: string
  notebook_ids: string[] | null
  created_at: string
  last_used_at: string
}

export function supabaseClaudeBackend(
  supabaseUrl: string,
  serviceKey: string,
  doFetch: Fetch = fetch,
): ClaudeBackend {
  const base = `${supabaseUrl}/rest/v1`
  const headers = (extra: Record<string, string> = {}) => ({
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
    ...extra,
  })
  const q = encodeURIComponent
  async function call(path: string, init: RequestInit): Promise<Response> {
    let res: Response
    try {
      res = await doFetch(`${base}${path}`, init)
    } catch {
      throw new StoreError('store unreachable')
    }
    if (!res.ok) {
      // 40001 = our all-or-nothing conflict (see claude_push).
      const body = await res.text().catch(() => '')
      if (body.includes('40001')) throw new PushConflict('conflict')
      throw new StoreError(`store ${res.status}`)
    }
    return res
  }
  return {
    async pull(userId, sinceSeq, limit) {
      const res = await call(
        `/sync_records?account_id=eq.${q(userId)}&seq=gt.${Math.floor(sinceSeq)}&select=id,rev,key_id,data,seq&order=seq.asc&limit=${Math.floor(limit)}`,
        { headers: headers() },
      )
      const list = (await res.json()) as {
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
    async push(userId, items) {
      await call('/rpc/claude_push', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          uid: userId,
          items: items.map((i) => ({
            id: i.id,
            base_rev: i.baseRev,
            key_id: i.keyId,
            data: i.data,
          })),
        }),
      })
    },
    async getEscrow(userId) {
      const res = await call(
        `/claude_escrow?user_id=eq.${q(userId)}&select=*`,
        { headers: headers() },
      )
      const [r] = (await res.json()) as EscrowDb[]
      return r
        ? {
            userId: r.user_id,
            keyId: r.key_id,
            wrapped: r.wrapped,
            notebookIds: r.notebook_ids,
            createdAt: Date.parse(r.created_at),
            lastUsedAt: Date.parse(r.last_used_at),
          }
        : null
    },
    async putEscrow(row) {
      await call('/claude_escrow?on_conflict=user_id', {
        method: 'POST',
        headers: headers({ Prefer: 'resolution=merge-duplicates' }),
        body: JSON.stringify({
          user_id: row.userId,
          key_id: row.keyId,
          wrapped: row.wrapped,
          notebook_ids: row.notebookIds,
          created_at: iso(row.createdAt),
          last_used_at: iso(row.lastUsedAt),
        }),
      })
    },
    async setEscrowScope(userId, ids) {
      await call(`/claude_escrow?user_id=eq.${q(userId)}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ notebook_ids: ids }),
      })
    },
    async touchEscrow(userId, at) {
      await call(`/claude_escrow?user_id=eq.${q(userId)}`, {
        method: 'PATCH',
        headers: headers(),
        body: JSON.stringify({ last_used_at: iso(at) }),
      })
    },
    async deleteEscrow(userId) {
      await call(`/claude_escrow?user_id=eq.${q(userId)}`, {
        method: 'DELETE',
        headers: headers(),
      })
    },
    async cleanupEscrow() {
      await call('/rpc/claude_escrow_cleanup', {
        method: 'POST',
        headers: headers(),
        body: '{}',
      })
    },
    async addAudit(row) {
      await call('/claude_audit', {
        method: 'POST',
        headers: headers(),
        body: JSON.stringify({
          user_id: row.userId,
          at: iso(row.at),
          tool: row.tool,
          client_id: row.clientId,
          ids: row.ids,
          counts: row.counts,
        }),
      })
    },
  }
}
