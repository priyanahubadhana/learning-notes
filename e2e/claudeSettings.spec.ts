// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { seeded } from './claudeMock.ts'

/**
 * Settings › Claude ("Let Claude work with my notes"): the privacy text, the
 * notebook choice, a wrong passphrase, the on state with Connected apps and
 * Revoke, and Turn off (asks first). The function `mcp` is mocked; a real
 * session is seeded. The key hand-over itself is covered by the Node tests.
 */

test.use({ viewport: { width: 1200, height: 800 } })

test('off: honest privacy text, notebook choice, wrong passphrase is refused', async ({
  page,
}) => {
  const seen = await seeded(page, { lockedShown: true, on: false })
  await page.goto('/#/settings/claude')
  const s = page.getByTestId('claude-section')
  await expect(
    s.getByRole('heading', { name: 'Let Claude work with my notes' }),
  ).toBeVisible()
  await expect(s).toContainText('gives the server your encryption key once')
  await expect(s).toContainText('30 days without use')
  await expect(s).toContainText('It can never delete anything')
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
  const seen = await seeded(page, { lockedShown: true, on: true })
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
  await seeded(page, { lockedShown: true, on: false, available: false })
  await page.goto('/#/settings/claude')
  await expect(page.getByTestId('claude-section')).toContainText(
    'not set up on the server yet',
  )
})

test('works at phone width with no sideways scroll', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 700 })
  await seeded(page, { lockedShown: true, on: true })
  await page.goto('/#/settings/claude')
  await expect(page.getByTestId('claude-state')).toBeVisible()
  const wider = await page.evaluate(
    () => document.documentElement.scrollWidth > window.innerWidth,
  )
  expect(wider).toBe(false)
})
