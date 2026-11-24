// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  row,
  showSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * C23 / C25 / C26 (owner iPad re-test, 17 Nov), switch textbox.v2:
 * C23 the box ⋯ list shows "Delete box" without scrolling and its card never
 * straddles the page's edge; C25 every menu card sits above every scroll bar;
 * C26 no hint once the box has text.
 */
test.use({ hasTouch: true })

const SIZES = [
  { name: 'ipad-sideways', width: 1180, height: 820 },
  { name: 'ipad-upright', width: 820, height: 1180 },
  { name: 'phone', width: 390, height: 844 },
]
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = 'screenshots/c23'

async function start(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'First')
  if (size.width < 480) {
    // A phone is made wide first: the box button needs the page text.
    await typeInEditor(page, 'Main text')
  }
  await page.setViewportSize(size)
}

/** The page frame: the sheet, or on a phone the page's own column. */
async function frameBox(page: Page) {
  const sheet = page.locator('[data-paper-sheet="1"]')
  const el = (await sheet.count())
    ? sheet
    : page.locator('[data-page-scroller]')
  return (await el.boundingBox())!
}

async function boxWithText(page: Page) {
  if ((page.viewportSize()?.width ?? 0) < 480) {
    await page.getByRole('button', { name: 'Add a box here' }).click()
    const box = page.locator(EXTRA).first()
    await expect(box.locator('.bn-editor')).toBeFocused()
    await page.keyboard.type('Alpha')
    await page.waitForTimeout(700)
    return box
  }
  await typeInEditor(page, 'Main text')
  const sheet = await frameBox(page)
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 60)
  const box = page.locator(EXTRA).first()
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Alpha')
  await page.waitForTimeout(700)
  return box
}

async function openBoxMenu(page: Page) {
  const box = await boxWithText(page)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  const r = (await box.boundingBox())!
  if ((page.viewportSize()?.width ?? 0) < 480)
    await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
  else await page.mouse.click(r.x - 5, r.y + r.height / 2)
  await page
    .locator('[data-box-menu], [data-testid="ob-boxmore"]')
    .first()
    .click()
  const card = page.getByRole('menu', { name: 'Box actions' })
  await expect(card).toBeVisible()
  return card
}

for (const size of SIZES) {
  test(`C23 ${size.name}: Delete box is visible without scrolling, card stays off the page edge`, async ({
    page,
  }, info) => {
    await start(page, size)
    const card = await openBoxMenu(page)
    const del = page.locator('[data-box-more="delete"]')
    await expect(del).toBeVisible()
    const c = (await card.boundingBox())!
    const d = (await del.boundingBox())!
    expect(d.y).toBeGreaterThanOrEqual(c.y - 1)
    expect(d.y + d.height).toBeLessThanOrEqual(c.y + c.height + 1)
    expect(d.height).toBeGreaterThanOrEqual(44)
    expect(d.y + d.height).toBeLessThanOrEqual(size.height)
    // Tappable: the point at its centre is the button itself.
    const hit = await page.evaluate(
      ([x, y]) =>
        document
          .elementFromPoint(x, y)
          ?.closest('[data-box-more]')
          ?.getAttribute('data-box-more'),
      [d.x + d.width / 2, d.y + d.height / 2],
    )
    expect(hit).toBe('delete')
    // Every other row is still there.
    for (const id of ['lock', 'duplicate', 'up', 'down', 'group'])
      await expect(page.locator(`[data-box-more="${id}"]`)).toHaveCount(1)
    // Inside the viewport, and never across the page's edge.
    expect(c.x).toBeGreaterThanOrEqual(0)
    expect(c.x + c.width).toBeLessThanOrEqual(size.width)
    const sheet = await frameBox(page)
    const straddles =
      c.x < sheet.x + sheet.width - 1 &&
      c.x + c.width > sheet.x + sheet.width + 1 &&
      c.x < sheet.x + sheet.width
    const straddlesLeft = c.x < sheet.x - 1 && c.x + c.width > sheet.x + 1
    expect(straddles).toBe(false)
    expect(straddlesLeft).toBe(false)
    await page.screenshot({
      path: `${OUT}/boxmenu-${size.name}-${info.project.name}.png`,
    })
  })

  test(`C25 ${size.name}: the box ⋯ card is above every scroll bar`, async ({
    page,
  }) => {
    await start(page, size)
    const card = await openBoxMenu(page)
    await expectAboveBars(card)
  })
}

async function expectAboveBars(card: ReturnType<Page['locator']>) {
  const res = await card.evaluate((el) => {
    const z = (n: Element) => {
      const v = parseInt(getComputedStyle(n).zIndex, 10)
      return Number.isNaN(v) ? 0 : v
    }
    const r = el.getBoundingClientRect()
    const bars = [...document.querySelectorAll('.sbar')].map((b) => {
      const q = b.getBoundingClientRect()
      const x = Math.max(q.left, r.left)
      const x2 = Math.min(q.right, r.right)
      const y = Math.max(q.top, r.top)
      const y2 = Math.min(q.bottom, r.bottom)
      const hit =
        x2 > x && y2 > y
          ? !!document
              .elementFromPoint((x + x2) / 2, (y + y2) / 2)
              ?.closest('[role="menu"]')
          : true
      return { z: z(b), hit }
    })
    return {
      menu: z(el),
      barMax: Math.max(0, ...bars.map((b) => b.z)),
      allHit: bars.every((b) => b.hit),
    }
  })
  expect(res.menu).toBeGreaterThan(res.barMax)
  expect(res.allHit).toBe(true)
}

test('C25: the sidebar page ⋯ menu is above every scroll bar', async ({
  page,
}, info) => {
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.goto('/')
  await createNotebook(page, 'Paper', 'First')
  for (let i = 0; i < 14; i++) await addPage(page, 'Paper', 'Page ' + i)
  await showSidebar(page)
  const more = row(page, 'First').getByRole('button', { name: /^More for/ })
  await more.click()
  const card = page.getByRole('menu').last()
  await expect(
    card.getByRole('menuitem', { name: /^Delete page/ }),
  ).toBeVisible()
  await expectAboveBars(card)
  await page.screenshot({ path: `${OUT}/pagemenu-${info.project.name}.png` })
})

test('C26: no slash hint on an empty line once the box has text and no "Tap here to keep writing" inside a box', async ({
  page,
}) => {
  await start(page, SIZES[0]!)
  await page.locator('.bn-editor').first().click()
  await page.keyboard.type('Some words')
  await page.keyboard.press('Enter')
  // Empty second line of a box that has text: no "type '/'" hint.
  const hint = await page.evaluate(() => {
    const el = document.querySelector(
      '.bn-block-content[data-is-empty-and-focused]',
    )
    return el ? getComputedStyle(el, '::after').content : 'none'
  })
  expect(['none', 'normal', '""']).toContain(hint)
  // Owner 17 Nov: "Tap here to keep writing" is gone everywhere.
  await expect(page.getByText('Tap here to keep writing')).toHaveCount(0)
})

test('C23: with little room (a short window) Delete box still shows, the other rows scroll', async ({
  page,
}, info) => {
  await start(page, { width: 1180, height: 820 })
  const box = await boxWithText(page)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.setViewportSize({ width: 1180, height: 430 })
  await box.scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
  const r = (await box.boundingBox())!
  await page.mouse.click(r.x - 5, r.y + r.height / 2)
  await page
    .locator('[data-box-menu], [data-testid="ob-boxmore"]')
    .first()
    .click()
  const menu = page.getByRole('menu', { name: 'Box actions' })
  await expect(menu).toBeVisible()
  const d = (await page.locator('[data-box-more="delete"]').boundingBox())!
  const c = (await menu.boundingBox())!
  expect(d.y).toBeGreaterThanOrEqual(c.y - 1)
  expect(d.y + d.height).toBeLessThanOrEqual(c.y + c.height + 1)
  expect(d.y + d.height).toBeLessThanOrEqual(430)
  await page.screenshot({
    path: `${OUT}/boxmenu-short-${info.project.name}.png`,
  })
})
