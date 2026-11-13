import { expect, test } from '@playwright/test'

/**
 * Slices 0c/0d (docs/features/foundation-input.md): the event and gesture
 * routers are built but unused. The app loads as before, and no script the
 * page loads contains the event router, so it attaches no listeners while
 * unused.
 *
 * Why the gesture router is no longer checked here (13 Nov 2026): slice 4
 * (search v2 8, Context menu strip) made it used on purpose: `useRowHold`
 * registers the hold claimant when a row-hold list (home, pages, search)
 * mounts, so its code loads then. Its own unit tests and the hold e2e cover it now.
 */
test('the app loads unchanged and the routers load through the row hold', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const urls = new Set<string>()
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script') urls.add(r.url())
  })
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await page.waitForLoadState('networkidle')
  // The routers load with the first row-hold list. A start screen may show
  // none (iPad portrait with no notebooks shows only "Create notebook"), so
  // open search, whose result list always uses the row hold.
  await page
    .getByRole('button', { name: /^Search/ })
    .first()
    .click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await page.waitForLoadState('networkidle')
  // Each router's own log text marks its code.
  // Read each script again by URL: WebKit can return an empty body from the
  // live response object, so the response text is not a reliable source.
  const bodies = await Promise.all(
    [...urls].map((u) => page.request.get(u).then((r) => r.text())),
  )
  expect(bodies.length).toBeGreaterThan(0)
  // test-guard-reason: slice 4 row hold loads routers by design once a row-hold list mounts
  expect(bodies.some((b) => b.includes('eventRouter: handler'))).toBe(true)
  expect(bodies.some((b) => b.includes('gestureRouter: "'))).toBe(true)
  expect(errors).toEqual([])
})
