// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * F9 (docs/plans/ipad-test-findings-2026-11-14.md): the existing "Search
 * settings" box stays in reach on every Settings section (also after
 * scrolling a long one) and finds the Try new features switches.
 */
const box = (page: Page) =>
  page.getByRole('searchbox', { name: 'Search settings' })

async function open(page: Page, section: string, tryNew = false) {
  await page.addInitScript((on) => {
    if (on) sessionStorage.setItem('learning-notes:v3.tryNew', '1')
  }, tryNew)
  await page.goto(`/?flags=settings.v3#/settings/${section}`)
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test.describe('iPad landscape', () => {
  test.use({ viewport: { width: 1194, height: 834 }, hasTouch: true })

  for (const section of [
    'experience',
    'general',
    'account',
    'sync',
    'lock',
    'ai',
    'connections',
    'permissions',
    'claude',
    'toolbar',
    'pencil',
    'reading',
    'review',
    'journal',
    'advanced',
    'help',
    'pro',
  ]) {
    test(`F9 the search box stays at the top after scrolling ${section}`, async ({
      page,
    }) => {
      await open(page, section)
      const el = box(page)
      await expect(el).toBeVisible()
      await page.evaluate(() => {
        for (const e of document.querySelectorAll('*'))
          if (e.scrollHeight > e.clientHeight + 50) e.scrollTop = 99999
        window.scrollTo(0, 99999)
      })
      await page.waitForTimeout(300)
      const b = await el.boundingBox()
      expect(b).not.toBeNull()
      expect(b!.y).toBeGreaterThanOrEqual(0)
      expect(b!.y + b!.height).toBeLessThan(200)
    })
  }

  for (const section of ['experience', 'general', 'advanced']) {
    test(`F9 nothing paints over the sticky search bar after scrolling ${section}`, async ({
      page,
    }) => {
      await open(page, section, true)
      // Walk down to the bottom; at every step nothing in the list (a
      // switch, a why mark, a card) may paint over the bar.
      const hits = await page.evaluate(() => {
        const bar = document.querySelector('.sv3-search')!
        const input = bar.querySelector('input')!
        let sc: Element | null = bar.parentElement
        while (sc && !(sc.scrollHeight > sc.clientHeight + 50))
          sc = sc.parentElement
        const mid: string[] = []
        const edge: string[] = []
        const name = (el: Element | null) => el?.outerHTML.slice(0, 80) ?? ''
        const max = sc ? sc.scrollHeight - sc.clientHeight : 0
        // Steps smaller than the bar, so anything sliding under it is caught;
        // elementFromPoint lays the page out, so no frame wait is needed.
        for (let t = 0; t <= max + 20; t += 20) {
          if (sc) sc.scrollTop = t
          const r = input.getBoundingClientRect()
          const b = bar.getBoundingClientRect()
          const c = document.elementFromPoint(
            r.left + r.width / 2,
            r.top + r.height / 2,
          )
          if (c !== input) mid.push(name(c))
          for (let x = b.left + 4; x < b.right - 2; x += 16)
            for (const y of [b.top + 2, r.top + r.height / 2]) {
              const el = document.elementFromPoint(x, y)
              if (el && !bar.contains(el)) edge.push(`${t}: ${name(el)}`)
            }
          if (mid.length || edge.length) break
        }
        return { mid, edge }
      })
      expect(hits.mid).toEqual([])
      expect(hits.edge).toEqual([])
    })
  }

  test('F9 search finds the advanced options by name', async ({ page }) => {
    await open(page, 'general')
    await box(page).fill('Tool state')
    const hit = page.locator('[data-hit]').first()
    await expect(hit).toContainText('Tool state')
    await expect(hit.locator('.sv3-hit-section')).toHaveText('Advanced')
  })

  test('F9 the sticky search bar is as wide as the content and the field stops at 560', async ({
    page,
  }) => {
    await open(page, 'general')
    const bar = await page.locator('.sv3-search').boundingBox()
    const field = await page.locator('.sv3-search .clr-wrap').boundingBox()
    expect(field!.width).toBeLessThanOrEqual(561)
    expect(bar!.width).toBeGreaterThan(field!.width)
  })

  test('F9 search finds a Try new features switch by name and plain words', async ({
    page,
  }) => {
    await open(page, 'general', true)
    await box(page).fill('New Search')
    await expect(page.locator('[data-hit="tryNew.search.v2"]')).toBeVisible()
    await box(page).fill('tool bar')
    await expect(page.locator('[data-hit^="tryNew."]').first()).toBeVisible()
  })
})
