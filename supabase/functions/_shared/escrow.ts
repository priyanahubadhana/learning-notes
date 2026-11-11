/**
 * The opt-in key escrow and the "Connected apps" list (plan B, slice 3).
 *
 * Why it exists: notes are end-to-end encrypted, so for Claude (claude.ai, on
 * the web or a phone) to read or write them, the server must be able to open
 * the key for a moment. The person turns this on knowingly, in the app, by
 * typing their sync passphrase there. The app sends the key over HTTPS; the
 * function wraps it with a key made (HKDF) from a secret in the function's
 * environment plus the user id, and stores only the wrapped copy. The secret
 * is not in the database, so a database leak alone opens nothing. Each Claude
 * call unwraps the key in memory, uses it and drops it.
 *
 * Off by default. Turning it off deletes the row and cancels every Claude
 * pass. It deletes itself after 30 days without use.
 */
import {
  CryptoError,
  fromBase64,
  masterFromRaw,
  openRecord,
  unwrapMasterKey,
  wrapMasterKey,
  type MasterKey,
} from './e2e.ts'
import {
  ESCROW_TTL_MS,
  type ClaudeBackend,
  type EscrowRow,
} from './claudeStore.ts'
import { APP_CORS, type OAuthStore } from './oauth.ts'

/** A message safe to show Claude and the person (never holds note text). */
export class ToolFail extends Error {}

export const ESCROW_OFF_TEXT =
  'Claude is not allowed to open your notes. Turn on "Let Claude work with my notes" in Learning Notes > Settings > Claude.'

export interface ClaudeDeps {
  backend: ClaudeBackend
  /** The server secret (env CLAUDE_ESCROW_SECRET). Unset = escrow is not available. */
  secret: string | undefined
}
export interface ClaudeCtx extends ClaudeDeps {
  store: OAuthStore
  now: () => number
}

/** At most once an hour per instance: drops expired escrow rows and their passes. */
let lastCleanup = 0
export async function maybeCleanup(ctx: ClaudeCtx): Promise<void> {
  const t = ctx.now()
  if (t - lastCleanup < 3600_000) return
  lastCleanup = t
  await ctx.backend.cleanupEscrow().catch(() => undefined)
}
/** Tests only. */
export const resetCleanupClock = () => {
  lastCleanup = 0
}

export interface Opened {
  master: MasterKey
  /** null = every notebook. */
  scope: string[] | null
  row: EscrowRow
}

/**
 * Opens the escrow for one call. Throws ToolFail with a plain message when it
 * is off, expired or cannot be opened. An expired row is deleted here and the
 * person's Claude passes are cancelled.
 */
export async function openEscrow(
  ctx: ClaudeCtx,
  userId: string,
): Promise<Opened> {
  if (!ctx.secret)
    throw new ToolFail('Claude access is not set up on the server yet.')
  const row = await ctx.backend.getEscrow(userId)
  if (!row) throw new ToolFail(ESCROW_OFF_TEXT)
  const now = ctx.now()
  if (now - row.lastUsedAt > ESCROW_TTL_MS) {
    await ctx.backend.deleteEscrow(userId)
    await ctx.store.revokeUser(userId)
    throw new ToolFail(
      'Claude’s access ran out after 30 days without use. Turn it on again in Learning Notes > Settings > Claude.',
    )
  }
  let master: MasterKey
  try {
    master = await unwrapMasterKey(ctx.secret, userId, row.keyId, row.wrapped)
  } catch {
    throw new ToolFail(
      'Claude’s access could not be opened. Turn it off and on again in Learning Notes > Settings > Claude.',
    )
  }
  if (now - row.lastUsedAt > 60_000)
    await ctx.backend.touchEscrow(userId, now).catch(() => undefined)
  return { master, scope: row.notebookIds, row }
}

// ---------- the app-facing addresses: /escrow and /connections ----------

export interface AppRouteDeps extends ClaudeCtx {
  appUrl: string
  /** Checks a Supabase sign-in token; null = not valid. */
  verifyUser(token: string): Promise<{ id: string; email: string } | null>
  allowedEmail?: string
}

const MAX_BODY = 64 * 1024
const ID = /^[A-Za-z0-9_-]{1,64}$/

function json(
  body: unknown,
  status: number,
  cors: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...cors,
    },
  })
}

/** `null` = every notebook; otherwise a clean list of ids. `undefined` = invalid. */
function cleanScope(v: unknown): string[] | null | undefined {
  if (v === null) return null
  if (!Array.isArray(v) || v.length > 500) return undefined
  const out: string[] = []
  for (const x of v) {
    if (typeof x !== 'string' || !ID.test(x)) return undefined
    if (!out.includes(x)) out.push(x)
  }
  return out
}

async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const text = await req.text()
  if (text.length > MAX_BODY) return null
  try {
    const v: unknown = JSON.parse(text)
    return v && typeof v === 'object' && !Array.isArray(v)
      ? (v as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/**
 * Handles `/escrow` and `/connections...` under the function's address.
 * Returns null for any other path. The caller is the app, signed in.
 */
export async function handleAppRoutes(
  req: Request,
  deps: AppRouteDeps,
  rel: string,
): Promise<Response | null> {
  const isEscrow = rel === '/escrow'
  const isList = rel === '/connections'
  const isRevoke = rel === '/connections/revoke'
  if (!isEscrow && !isList && !isRevoke) return null
  const cors = APP_CORS(deps.appUrl, req.headers.get('origin'))
  if (req.method === 'OPTIONS')
    return new Response(null, { status: 204, headers: cors })
  try {
    const token = /^Bearer (.+)$/.exec(
      req.headers.get('authorization') ?? '',
    )?.[1]
    const user = token ? await deps.verifyUser(token) : null
    if (!user) return json({ error: 'login_required' }, 401, cors)
    if (
      deps.allowedEmail &&
      user.email.toLowerCase() !== deps.allowedEmail.toLowerCase()
    )
      return json({ error: 'access_denied' }, 403, cors)
    const now = deps.now()

    if (isList) {
      if (req.method !== 'GET') return json({ error: 'method' }, 405, cors)
      const grants = await deps.store.listGrants(user.id, now)
      const apps = await Promise.all(
        grants.map(async (g) => ({
          family: g.family,
          name: (await deps.store.getClient(g.clientId))?.name ?? 'Claude',
          scopes: g.scopes,
          // Refresh passes live 30 days from their last renewal.
          lastUsedAt: g.expiresAt - 30 * 24 * 3600 * 1000,
        })),
      )
      return json({ apps }, 200, cors)
    }
    if (isRevoke) {
      if (req.method !== 'POST') return json({ error: 'method' }, 405, cors)
      const body = await readJson(req)
      const family = typeof body?.family === 'string' ? body.family : ''
      if (!family || family.length > 200)
        return json({ error: 'bad_request' }, 400, cors)
      // Only one of this person's own connections.
      const own = (await deps.store.listGrants(user.id, now)).some(
        (g) => g.family === family,
      )
      if (own) await deps.store.revokeFamily(family)
      return json({ ok: true }, 200, cors)
    }

    // /escrow
    await maybeCleanup(deps)
    if (req.method === 'GET') {
      const row = await deps.backend.getEscrow(user.id)
      const live = row && now - row.lastUsedAt <= ESCROW_TTL_MS
      return json(
        {
          available: !!deps.secret,
          on: !!live,
          notebookIds: live ? row.notebookIds : null,
          lastUsedAt: live ? row.lastUsedAt : null,
          expiresAt: live ? row.lastUsedAt + ESCROW_TTL_MS : null,
        },
        200,
        cors,
      )
    }
    if (req.method === 'DELETE') {
      await deps.backend.deleteEscrow(user.id)
      await deps.store.revokeUser(user.id)
      return json({ ok: true }, 200, cors)
    }
    if (req.method === 'PUT') {
      const body = await readJson(req)
      const scope = cleanScope(body?.notebookIds)
      if (scope === undefined) return json({ error: 'bad_request' }, 400, cors)
      if (!(await deps.backend.getEscrow(user.id)))
        return json({ error: 'off' }, 409, cors)
      await deps.backend.setEscrowScope(user.id, scope)
      return json({ ok: true }, 200, cors)
    }
    if (req.method === 'POST') {
      if (!deps.secret) return json({ error: 'not_configured' }, 503, cors)
      const body = await readJson(req)
      const scope = cleanScope(body?.notebookIds)
      const keyId = body?.keyId
      const keyText = body?.key
      if (
        !body ||
        scope === undefined ||
        typeof keyId !== 'string' ||
        typeof keyText !== 'string' ||
        keyText.length > 100
      )
        return json({ error: 'bad_request' }, 400, cors)
      let raw: Uint8Array
      try {
        raw = fromBase64(keyText)
      } catch {
        return json({ error: 'bad_request' }, 400, cors)
      }
      if (raw.length !== 32 || !/^[0-9a-f]{16}$/.test(keyId))
        return json({ error: 'bad_request' }, 400, cors)
      try {
        // Prove it is this person's real key: it must open one of their
        // records. (A new account with no records yet is accepted.)
        const [first] = await deps.backend.pull(user.id, 0, 1)
        if (first) {
          const master = await masterFromRaw(keyId, raw)
          await openRecord(master, first.id, first.rev, {
            keyId: first.keyId,
            data: first.data,
          })
        }
        const wrapped = await wrapMasterKey(deps.secret, user.id, keyId, raw)
        raw.fill(0)
        await deps.backend.putEscrow({
          userId: user.id,
          keyId,
          wrapped,
          notebookIds: scope,
          createdAt: now,
          lastUsedAt: now,
        })
      } catch (e) {
        if (e instanceof CryptoError)
          return json({ error: 'wrong_key' }, 400, cors)
        throw e
      }
      return json({ ok: true }, 200, cors)
    }
    return json({ error: 'method' }, 405, cors)
  } catch {
    // Never leak internals (or the key).
    return json({ error: 'server_error' }, 500, cors)
  }
}
