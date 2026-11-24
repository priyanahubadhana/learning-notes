// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * perf-start (verdict section 4, condition 2): starters are written in the
 * background. The template list of a new page, opened while that still runs,
 * must never show without the Study row (it waits, then fills in by itself).
 */
test('the new-page template list never shows without Study while starters seed', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { __bad: number; __seen: number }
    w.__bad = 0
    w.__seen = 0
    const check = () => {
      const start = document.querySelector('[data-new-page-start]')
      if (!start) return
      w.__seen++
      if (!start.querySelector('[data-template="study"]')) w.__bad++
    }
    new MutationObserver(check).observe(document, {
      subtree: true,
      childList: true,
      attributes: true,
    })
  })
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First') // opens a blank page at once
  // Cold-start picture pair for gate 3 (only when asked for).
  const shots = process.env.PERF_SHOTS
  if (shots) await page.screenshot({ path: `${shots}/before-seeding.png` })
  const start = page.locator('[data-new-page-start]')
  await expect(start).toBeVisible()
  await expect(start.locator('[data-template="study"]')).toBeVisible()
  // Every starter arrives, and the list fills by itself.
  await expect
    .poll(async () => start.locator('li button').count())
    .toBeGreaterThan(8)
  if (shots) await page.screenshot({ path: `${shots}/after-settled.png` })
  const seen = await page.evaluate(
    () => (window as unknown as { __seen: number }).__seen,
  )
  const bad = await page.evaluate(
    () => (window as unknown as { __bad: number }).__bad,
  )
  expect(seen).toBeGreaterThan(0)
  expect(bad).toBe(0)
})
