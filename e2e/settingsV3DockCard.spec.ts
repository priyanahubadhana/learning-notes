// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'

/**
 * Final-look fix (slice 7): where the rail shows, the Settings Preview dock
 * and its sheet stay inside the content card (never over the rail or the
 * card border); on a phone they stay as before (full width over the tab bar).
 * On a wide window (PC) the preview is a side card, so there is no dock.
 */
const SIZES = {
  'ipad portrait': { width: 820, height: 1180, rail: true },
  'ipad landscape': { width: 1180, height: 820, rail: true },
  phone: { width: 390, height: 844, rail: false },
} as const

for (const [name, { width, height, rail }] of Object.entries(SIZES))
  test(`Preview dock and sheet at ${name}: ${rail ? 'inside the card' : 'unchanged'}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height })
    await page.goto('/?flags=settings.v3,foundation.shell#/settings/general')
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    const pill = page.locator('[data-preview-pill]')
    await expect(pill).toBeVisible()
    await pill.click()
    const sheet = page.locator('[data-preview-sheet]')
    await expect(sheet).toBeVisible()
    const d = (await page.locator('[data-preview-dock]').boundingBox())!
    const s = (await sheet.boundingBox())!
    if (rail) {
      const r = (await page.locator('.sh-rail').boundingBox())!
      const m = (await page.locator('.sh-main').boundingBox())!
      for (const b of [d, s]) {
        expect(b.x).toBeGreaterThanOrEqual(r.x + r.width)
        expect(b.x).toBeGreaterThanOrEqual(m.x + 1)
        expect(b.x + b.width).toBeLessThanOrEqual(m.x + m.width - 1)
        expect(b.y + b.height).toBeLessThanOrEqual(m.y + m.height - 1)
      }
    } else {
      // Phone: edge to edge, sitting on the tab bar.
      expect(d.x).toBeLessThanOrEqual(0.5)
      expect(d.width).toBeGreaterThanOrEqual(width - 1)
      expect(s.x).toBeCloseTo(8, 0)
      expect(s.x + s.width).toBeCloseTo(width - 8, 0)
      expect(d.y + d.height).toBeLessThan(height - 40)
    }
  })

test('Preview at PC width is a side card: no dock, no pill', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.goto('/?flags=settings.v3,foundation.shell#/settings/general')
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await expect(page.locator('[data-preview-pill]')).toHaveCount(0)
})

/**
 * The sidebar changes where the card starts (useCardEdges re-measures with a
 * ResizeObserver): the dock and the sheet never reach left of the card, with
 * the sidebar open, shut, and toggled while the sheet is open.
 */
for (const [name, size] of Object.entries({
  'ipad portrait': { width: 820, height: 1180 },
  'ipad landscape': { width: 1180, height: 820 },
})) {
  test(`Preview dock and sheet follow the card when the sidebar toggles (${name})`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await page.goto('/?flags=settings.v3,foundation.shell#/settings/general')
    await expect(page.locator('[data-settings-v3]')).toBeVisible()
    const sidebar = page.locator('#sidebar')
    const hide = page.getByRole('button', { name: 'Hide menu' })
    const show = page.getByRole('button', { name: /^(Open|Show) menu$/ })
    // The top bar button flips its name with the sidebar. A tap on it is sent
    // as a click event: on iPad portrait the open sidebar is an overlay whose
    // dim layer sits over the bar.
    const setSidebar = async (open: boolean) => {
      const [now, next] = open ? [hide, show] : [show, hide]
      if (await next.isVisible()) await next.dispatchEvent('click')
      await expect(now).toBeVisible()
    }
    const inside = async () => {
      const card = (await page.locator('[data-settings-v3]').boundingBox())!
      const d = (await page.locator('[data-preview-dock]').boundingBox())!
      const s = (await page.locator('[data-preview-sheet]').boundingBox())!
      expect(d.x).toBeGreaterThanOrEqual(card.x - 1)
      expect(s.x).toBeGreaterThanOrEqual(card.x - 1)
      expect(d.x + d.width).toBeLessThanOrEqual(card.x + card.width + 1)
      expect(s.x + s.width).toBeLessThanOrEqual(card.x + card.width + 1)
    }
    // After every toggle: the dock and sheet sit inside the card; if the card
    // got wide enough for the side preview, the pill and sheet are gone.
    // (Retried as one step: the wide switch follows the resize a moment later.)
    const check = () =>
      expect(async () => {
        if ((await page.locator('[data-preview-pill]').count()) === 0) {
          await expect(page.locator('.sv3-preview')).toBeVisible()
          return
        }
        if ((await page.locator('[data-preview-sheet]').count()) === 0)
          await page.locator('[data-preview-pill]').click()
        await expect(page.locator('[data-preview-sheet]')).toBeVisible()
        await expect.poll(inside).toBeUndefined()
      }).toPass()
    await setSidebar(true)
    await expect(sidebar).toBeVisible()
    await check()
    // The card narrows while the sheet is open: only the ResizeObserver can
    // move the dock and the sheet in with it.
    await page.setViewportSize({ width: size.width - 80, height: size.height })
    await check()
    await page.setViewportSize(size)
    await check()
    await setSidebar(false)
    await check()
    await setSidebar(true)
    await check()
  })
}
