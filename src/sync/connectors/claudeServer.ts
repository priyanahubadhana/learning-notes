import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config'
import * as b64 from '../../core/base64'

/**
 * Client side of "Let Claude work with my notes" (Supabase function `mcp`,
 * addresses `/escrow` and `/connections`; see
 * supabase/functions/_shared/escrow.ts). The person is signed in. Nothing here
 * throws: every call answers `{ ok: false, reason }` instead.
 */

const BASE = `${SUPABASE_URL}/functions/v1/mcp`

export type Reply<T> =
  | { ok: true; value: T }
  | {
      ok: false
      reason: 'login' | 'wrongKey' | 'unavailable' | 'bad' | 'error'
    }

export interface ClaudeStatus {
  /** False until the owner has set the server secret. */
  available: boolean
  on: boolean
  /** null = every notebook. */
  notebookIds: string[] | null
  lastUsedAt: number | null
  expiresAt: number | null
}
export interface ConnectedApp {
  family: string
  name: string
  scopes: string[]
  lastUsedAt: number
}

async function call<T>(
  token: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<Reply<T>> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      method,
      headers: {
        apikey: SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${token}`,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    })
    if (res.status === 401 || res.status === 403)
      return { ok: false, reason: 'login' }
    if (res.status === 503) return { ok: false, reason: 'unavailable' }
    if (res.status === 400) {
      const j = (await res.json().catch(() => ({}))) as { error?: string }
      return { ok: false, reason: j.error === 'wrong_key' ? 'wrongKey' : 'bad' }
    }
    if (!res.ok) return { ok: false, reason: 'error' }
    return { ok: true, value: (await res.json()) as T }
  } catch {
    return { ok: false, reason: 'error' }
  }
}

export const claudeStatus = (token: string) =>
  call<ClaudeStatus>(token, 'GET', '/escrow')

/**
 * Turns Claude on. The key is sent once over HTTPS, then the bytes are wiped
 * here; the server keeps only a copy wrapped with its own secret.
 */
export async function claudeEnable(
  token: string,
  key: { keyId: string; raw: Uint8Array },
  notebookIds: string[] | null,
): Promise<Reply<{ ok: true }>> {
  const text = b64.toBase64(
    key.raw.buffer.slice(
      key.raw.byteOffset,
      key.raw.byteOffset + key.raw.byteLength,
    ) as ArrayBuffer,
  )
  try {
    return await call(token, 'POST', '/escrow', {
      keyId: key.keyId,
      key: text,
      notebookIds,
    })
  } finally {
    key.raw.fill(0)
  }
}

export const claudeSetNotebooks = (
  token: string,
  notebookIds: string[] | null,
) => call<{ ok: true }>(token, 'PUT', '/escrow', { notebookIds })

/** Turns Claude off: the server deletes the key copy and cancels every Claude pass. */
export const claudeDisable = (token: string) =>
  call<{ ok: true }>(token, 'DELETE', '/escrow')

export const connectedApps = (token: string) =>
  call<{ apps: ConnectedApp[] }>(token, 'GET', '/connections')

export const revokeApp = (token: string, family: string) =>
  call<{ ok: true }>(token, 'POST', '/connections/revoke', { family })

/** One line of what Claude did (no note content: only ids and counts). */
export interface ActivityEntry {
  at: number
  tool: string
  app: string
  ids: string[]
  counts: Record<string, number>
}

export const claudeActivity = (token: string) =>
  call<{ entries: ActivityEntry[] }>(token, 'GET', '/activity')
