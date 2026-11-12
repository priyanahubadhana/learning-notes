import { expect, test } from '@playwright/test'

/**
 * Slices 0c/0d (docs/features/foundation-input.md): the event and gesture
 * routers are built but unused. The app loads as before, and no script the
 * page loads contains them, so they attach no listeners while unused.
 */
test('the app loads unchanged and the unused routers are not loaded', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  const scripts: Promise<string>[] = []
  page.on('response', (r) => {
    if (r.request().resourceType() === 'script')
      scripts.push(r.text().catch(() => ''))
  })
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await page.waitForLoadState('networkidle')
  // Each router's own log text marks its code.
  const bodies = await Promise.all(scripts)
  expect(bodies.length).toBeGreaterThan(0)
  for (const b of bodies) {
    expect(b).not.toContain('eventRouter: handler')
    expect(b).not.toContain('gestureRouter: "')
  }
  expect(errors).toEqual([])
})
