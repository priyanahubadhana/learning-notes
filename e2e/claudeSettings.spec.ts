// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * Settings › Claude ("Let Claude work with my notes"): the privacy text, the
 * notebook choice, a wrong passphrase, the on state with Connected apps and
 * Revoke, and Turn off (asks first). The function `mcp` is mocked; a real
 * session is seeded. The key hand-over itself is covered by the Node tests.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const EMAIL = 'priyanahubadhanalegends@gmail.com'
const SESSION = 'learning-notes:sync.session'

interface Seen {
  calls: string[]
  on: boolean
}

async function seeded(
  page: Page,
  opts: { on: boolean; available?: boolean },
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
    return route.fulfill({ status: 404, body: '{}' })
  })
  return seen
}

test('off: honest privacy text, notebook choice, wrong passphrase is refused', async ({
  page,
}) => {
  const seen = await seeded(page, { on: false })
  await page.goto('/#/settings/claude')
  const s = page.getByTestId('claude-section')
  await expect(
    s.getByRole('heading', { name: 'Let Claude work with my notes' }),
  ).toBeVisible()
  await expect(s).toContainText('gives the server your encryption key once')
  await expect(s).toContainText('30 days without use')
  await expect(s).toContainText('can never delete or change')
  await expect(s.getByTestId('claude-state')).toHaveText('Off')
  // The choice defaults to all notebooks; "only these" shows the list.
  await expect(s.getByTestId('claude-mode-all')).toBeChecked()
  await s.getByTestId('claude-mode-some').check()
  await expect(s).toContainText('Pick at least one notebook.')
  await s.getByTestId('claude-mode-all').check()
  // A wrong passphrase never reaches the server's escrow door.
  await s
    .getByLabel(/passphrase/i)
    .first()
    .fill('not the right words here')
  await s.getByRole('button', { name: 'Turn on' }).click()
  await expect(s.getByRole('alert').first()).toBeVisible({ timeout: 30_000 })
  expect(seen.calls.filter((c) => c.startsWith('POST'))).toEqual([])
  await expect(s.getByTestId('claude-state')).toHaveText('Off')
})

test('on: shows the state and the apps; Revoke and Turn off work', async ({
  page,
}) => {
  const seen = await seeded(page, { on: true })
  await page.goto('/#/settings/claude')
  const s = page.getByTestId('claude-section')
  await expect(s.getByTestId('claude-state')).toHaveText('On')
  await expect(s).toContainText('switches itself off on')
  const app = s.getByTestId('claude-app')
  await expect(app).toContainText('Claude')
  await app.getByRole('button', { name: 'Revoke Claude' }).click()
  await expect
    .poll(() => seen.calls.includes('POST /connections/revoke'))
    .toBe(true)
  // Turn off asks first; Cancel changes nothing.
  await s.getByTestId('claude-off').click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('every Claude connection stops now')
  await dialog.getByRole('button', { name: 'Cancel' }).click()
  expect(seen.calls).not.toContain('DELETE /escrow')
  await s.getByTestId('claude-off').click()
  await page
    .getByRole('dialog')
    .getByRole('button', { name: 'Turn off' })
    .click()
  await expect(s.getByTestId('claude-state')).toHaveText('Off')
  expect(seen.calls).toContain('DELETE /escrow')
})

test('not set up on the server: says so plainly', async ({ page }) => {
  await seeded(page, { on: false, available: false })
  await page.goto('/#/settings/claude')
  await expect(page.getByTestId('claude-section')).toContainText(
    'not set up on the server yet',
  )
})

test('works at phone width with no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await seeded(page, { on: true })
  await page.goto('/#/settings/claude')
  await expect(page.getByTestId('claude-state')).toBeVisible()
  const wider = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(wider).toBe(false)
})
