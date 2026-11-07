import { expect, test, type Page } from '@playwright/test'
import { contrastOf, startInTheme } from './helpers.ts'
import { mainBar, openNote, openPill, pill, tool } from './mainBarHelpers.ts'

/**
 * The main bar at 820, 1024 and 1366 px and phone widths; contrast in Day,
 * Night and Sepia; and the bar can never be lost (every position, every pill
 * edge, tool bar off).
 */

test.use({ hasTouch: true })

const overflow = (page: Page) =>
  page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

for (const [width, height] of [
  [820, 1180],
  [1024, 768],
  [1366, 1024],
] as const) {
  test(`${width} px: one row, all tools in view, the pill fits`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    await openNote(page)
    const buttons = await mainBar(page)
      .locator('button:not([data-scroll-cue])')
      .all()
    const ys = new Set<number>()
    for (const b of buttons) {
      const box = (await b.boundingBox())!
      ys.add(Math.round(box.y))
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5)
    }
    expect(ys.size).toBe(1) // one row
    await openPill(page, 'Pen', 'pen')
    const p = (await pill(page).boundingBox())!
    expect(p.x).toBeGreaterThanOrEqual(0)
    expect(p.x + p.width).toBeLessThanOrEqual(width + 0.5)
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  })
}

for (const width of [390, 360]) {
  test(`phone ${width} px: every tool can be reached and the page does not scroll sideways`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 800 })
    await openNote(page)
    for (const name of [
      'Text',
      'Pen',
      'Highlighter',
      'Eraser',
      'New line',
      'Lasso',
      'Insert',
      'Read',
    ]) {
      const b = tool(page, name)
      await b.scrollIntoViewIfNeeded()
      await expect(b).toBeVisible()
      const box = (await b.boundingBox())!
      expect(box.width).toBeGreaterThanOrEqual(43.5)
      expect(box.x + box.width).toBeLessThanOrEqual(width + 0.5)
    }
    await expect(tool(page, 'Undo')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Toolbar menu' }),
    ).toBeVisible()
    await openPill(page, 'Pen', 'pen')
    const p = (await pill(page).boundingBox())!
    expect(p.x + p.width).toBeLessThanOrEqual(width + 0.5) // scrolls inside
    expect(await overflow(page)).toBeLessThanOrEqual(1)
  })
}

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`${theme}: the bar and the pill are readable (icons 3:1 or better)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    await startInTheme(page, theme)
    await openNote(page)
    for (const b of await mainBar(page).getByRole('button').all()) {
      const name = await b.getAttribute('aria-label')
      expect(await contrastOf(b), `${theme} ${name}`).toBeGreaterThanOrEqual(3)
    }
    for (const [toolName, pillName] of [
      ['Text', 'text'],
      ['Pen', 'pen'],
      ['Highlighter', 'highlighter'],
      ['Eraser', 'eraser'],
      ['Insert', 'insert'],
    ] as const) {
      await openPill(page, toolName, pillName)
      for (const b of await pill(page).getByRole('button').all()) {
        if (await b.getAttribute('data-colour')) continue // a colour dot
        const name = await b.getAttribute('aria-label')
        expect(
          await contrastOf(b),
          `${theme} ${toolName} ${name}`,
        ).toBeGreaterThanOrEqual(3)
      }
      // The pill's own border against the page.
      expect(await contrastOf(pill(page), 'border')).toBeGreaterThanOrEqual(3)
    }
  })
}

test('the bar is never lost: any position, any pill edge', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  for (const edge of ['left', 'right', 'bottom', 'top']) {
    await page.evaluate(
      (e) =>
        localStorage.setItem(
          'learning-notes:toolbar.pillPlace',
          JSON.stringify({ edge: e, along: 0.5 }),
        ),
      edge,
    )
    await page.reload()
    await openPill(page, 'Pen', 'pen')
    await expect(mainBar(page)).toBeVisible()
    const bar = (await mainBar(page).boundingBox())!
    const p = (await pill(page).boundingBox())!
    // The pill never covers the bar.
    const overlap =
      p.x < bar.x + bar.width &&
      p.x + p.width > bar.x &&
      p.y < bar.y + bar.height &&
      p.y + p.height > bar.y
    expect(overlap, edge).toBe(false)
  }
})

for (const placement of ['top', 'bottom', 'free'] as const) {
  test(`placement ${placement}: the bar shows and the pill opens in view`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1024, height: 900 })
    await openNote(page, 'touch', { 'advanced.barPlacement': placement })
    await expect(mainBar(page)).toBeVisible()
    await openPill(page, 'Text', 'text')
    const p = (await pill(page).boundingBox())!
    expect(p.y).toBeGreaterThanOrEqual(0)
    expect(p.y + p.height).toBeLessThanOrEqual(900.5)
    const bar = (await mainBar(page).boundingBox())!
    expect(bar.y + bar.height).toBeLessThanOrEqual(900.5)
  })
}
