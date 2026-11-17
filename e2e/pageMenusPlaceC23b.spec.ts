// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, row, showSidebar, startInMode } from './helpers.ts'

/**
 * C23 rework (manager review, 17 Nov): the owner's box menu (Box style, Copy,
 * Cut, Duplicate box, Colour, Layout, Delete box) keeps Delete in view and
 * stays inside the page frame; no box menu covers its box or its bar; the
 * sidebar's page menu stays on the sidebar's side of its border.
 */
test.use({ hasTouch: true })
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = 'screenshots/c23'

async function open(
  page: Page,
  size: { width: number; height: number },
  v2: boolean,
  xFrac: number,
) {
  await page.addInitScript(
    ([on]) => {
      if (on) localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'professional', unlocked: [] }),
      )
    },
    [v2],
  )
  await startInMode(page, 'computer')
  await page.setViewportSize(size)
  await page.goto('/')
  await createNotebook(page, 'Paper', 'First')
  await page.locator('.bn-editor').first().click()
  await page.keyboard.type('Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(
    sheet.x + sheet.width * xFrac,
    main.y + main.height + 60,
  )
  const box = page.locator(EXTRA).first()
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Alpha')
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  const r = (await box.boundingBox())!
  await page.mouse.click(r.x - 5, r.y + r.height / 2)
  await page.waitForTimeout(300)
  await page
    .locator('[data-box-menu], [data-testid="ob-boxmore"]')
    .first()
    .click()
  return { box, sheet }
}

type R = { x: number; y: number; width: number; height: number }
const hit = (a: R, b: R) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

async function checkCard(page: Page, box: R | null, sheet: R) {
  const card = page.getByRole('menu').last()
  await expect(card).toBeVisible()
  const c = (await card.boundingBox())!
  const del = page.getByRole('menuitem', { name: /^Delete box/ })
  await expect(del).toBeVisible()
  const d = (await del.boundingBox())!
  expect(d.y).toBeGreaterThanOrEqual(c.y - 1)
  expect(d.y + d.height).toBeLessThanOrEqual(c.y + c.height + 1)
  expect(d.height).toBeGreaterThanOrEqual(44)
  // Never across the page frame's edge.
  expect(c.x < sheet.x - 1 && c.x + c.width > sheet.x + 1).toBe(false)
  expect(
    c.x < sheet.x + sheet.width - 1 &&
      c.x + c.width > sheet.x + sheet.width + 1,
  ).toBe(false)
  // Never over the box or its bar.
  if (box) expect(hit(c, box)).toBe(false)
  const bar = page.locator('[data-box-bar-holder], [data-box-bar]')
  for (let i = 0; i < (await bar.count()); i++) {
    const b = await bar.nth(i).boundingBox()
    if (b && b.width && b.height) expect(hit(c, b)).toBe(false)
  }
  return card
}

for (const v2 of [false, true]) {
  test(`C23 ${v2 ? 'Box actions' : 'box menu (Box style, Copy, Cut...)'}: Professional, 820x1180, box at the right edge: Delete in view, inside the frame, off the box and bar`, async ({
    page,
  }, info) => {
    const { box, sheet } = await open(
      page,
      { width: 820, height: 1180 },
      v2,
      0.85,
    )
    const b = (await box.boundingBox())!
    if (!v2)
      await expect(
        page.getByRole('menuitem', { name: /^Box style/ }),
      ).toBeVisible()
    await checkCard(page, b, sheet)
    await page.screenshot({
      path: `${OUT}/rework-${v2 ? 'actions' : 'legacy'}-upright-${info.project.name}.png`,
    })
  })

  test(`C23 ${v2 ? 'Box actions' : 'box menu'}: sideways 1180x820 never covers the box or its bar`, async ({
    page,
  }, info) => {
    const { box, sheet } = await open(
      page,
      { width: 1180, height: 820 },
      v2,
      0.3,
    )
    await checkCard(page, (await box.boundingBox())!, sheet)
    await page.screenshot({
      path: `${OUT}/rework-${v2 ? 'actions' : 'legacy'}-sideways-${info.project.name}.png`,
    })
  })
}

test('C23: the sidebar page menu stays inside the sidebar, not across its border', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.goto('/')
  await createNotebook(page, 'Paper', 'First')
  await showSidebar(page)
  await row(page, 'First')
    .getByRole('button', { name: /^More for/ })
    .click()
  const card = page.getByRole('menu').last()
  await expect(
    card.getByRole('menuitem', { name: /^Delete page/ }),
  ).toBeVisible()
  const c = (await card.boundingBox())!
  const side = (await page.locator('aside').first().boundingBox())!
  expect(c.x).toBeGreaterThanOrEqual(side.x - 1)
  expect(c.x + c.width).toBeLessThanOrEqual(side.x + side.width + 1)
  await page.screenshot({
    path: `${OUT}/rework-pagemenu-${info.project.name}.png`,
  })
})
