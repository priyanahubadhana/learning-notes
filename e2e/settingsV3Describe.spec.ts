// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/** Gate-2 fix: every switch, choice group and pick button points at its row description. */
test('row controls carry aria-describedby pointing at the row description', async ({
  page,
}) => {
  await page.goto('/?flags=settings.v3#/settings/review')
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  const bad = await page.evaluate(() => {
    const out: string[] = []
    let seen = 0
    for (const r of document.querySelectorAll('[data-setting-id]')) {
      const c = r.querySelector(
        '[role="switch"], [role="radiogroup"], .sv3-select',
      )
      if (!c) continue
      seen++
      const id = c.getAttribute('aria-describedby')
      const d = id ? document.getElementById(id) : null
      if (!d || !r.contains(d) || !d.classList.contains('sv3-line-help'))
        out.push(r.getAttribute('data-setting-id') ?? '?')
    }
    return { out, seen }
  })
  expect(bad.seen).toBeGreaterThan(0)
  expect(bad.out).toEqual([])
})
