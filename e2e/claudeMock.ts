// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'

/**
 * A signed-in session and a mocked `mcp` function for the Settings > Claude
 * end-to-end tests (claudeSettings.spec.ts, claudeInbox.spec.ts).
 */

const EMAIL = 'priyanahubadhanalegends@gmail.com'
const SESSION = 'learning-notes:sync.session'

export interface Seen {
  calls: string[]
  on: boolean
}

export async function seeded(
  page: Page,
  opts: {
    on: boolean
    available?: boolean
    activity?: {
      at: number
      tool: string
      ids: string[]
      counts: Record<string, number>
    }[]
  },
): Promise<Seen> {
  const seen: Seen = { calls: [], on: opts.on }
  await page.context().addInitScript(
    ([key, email]) => {
      if (localStorage.getItem('seeded-once')) return
      localStorage.setItem('seeded-once', '1')
      localStorage.setItem(
        key,
        JSON.stringify({
          access: 'access-token-1',
          refresh: 'refresh-1',
          expiresAt: Date.now() + 3_600_000,
          account: { accountId: 'u1', email, sub: 's1' },
          drive: { token: 'drive-1', expiresAt: Date.now() + 3_000_000 },
        }),
      )
    },
    [SESSION, EMAIL] as const,
  )
  // A key copy exists on the server, so the app is in "type the passphrase" state.
  const bundle = JSON.stringify({
    v: 1,
    keyId: '0123456789abcdef',
    method: 'passphrase',
    salt: 'AAAAAAAAAAAAAAAAAAAAAA==',
    argon: { memoryKiB: 19456, iterations: 2, parallelism: 1 },
    iv: 'AAAAAAAAAAAAAAAA',
    ct: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    createdAt: 1,
  })
  // Later routes win in Playwright, so the general one comes first.
  await page.route(/supabase\.co\/rest\/v1\//, (r) =>
    r.fulfill({ status: 200, contentType: 'application/json', body: '[]' }),
  )
  await page.route(/supabase\.co\/rest\/v1\/sync_key_bundles/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ data: bundle }]),
    }),
  )
  await page.route(/googleapis\.com|accounts\.google\.com/, (r) =>
    r.fulfill({
      status: 200,
      contentType: 'application/json',
      body: '{"files":[]}',
    }),
  )
  await page.route(/supabase\.co\/functions\/v1\/mcp\//, async (route) => {
    const req = route.request()
    const path = new URL(req.url()).pathname.split('/mcp')[1]
    seen.calls.push(`${req.method()} ${path}`)
    const json = (body: unknown) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(body),
      })
    if (req.method() === 'OPTIONS') return route.fulfill({ status: 204 })
    if (path === '/escrow' && req.method() === 'GET')
      return json({
        available: opts.available ?? true,
        on: seen.on,
        notebookIds: null,
        lastUsedAt: seen.on ? Date.now() : null,
        expiresAt: seen.on ? Date.now() + 30 * 86_400_000 : null,
      })
    if (path === '/escrow' && req.method() === 'DELETE') {
      seen.on = false
      return json({ ok: true })
    }
    if (path === '/connections')
      return json({
        apps: [
          {
            family: 'fam1',
            name: 'Claude',
            scopes: ['notes:read'],
            lastUsedAt: Date.now(),
          },
        ],
      })
    if (path === '/connections/revoke') return json({ ok: true })
    if (path === '/activity')
      return json({
        entries: (opts.activity ?? []).map((a) => ({ app: 'Claude', ...a })),
      })
    return route.fulfill({ status: 404, body: '{}' })
  })
  return seen
}
