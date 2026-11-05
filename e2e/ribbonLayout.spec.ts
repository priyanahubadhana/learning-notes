// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  dockedBar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * The ribbon at iPad widths (768 to 1366 px, sidebar open or closed): all six
 * tabs, the search and the Short bar button fit, groups scroll sideways with a
 * fade and no half-cut labels, it stays docked (sticky) while the page scrolls,
 * and it is compact. Also: "Ribbon + short bar", the position of each bar
 * (Top, Bottom, Floating, never overlapping) and the Slim size.
 */

test.use({ hasTouch: true })

type Place = 'top' | 'bottom' | 'free'

async function openPage(
  page: Page,
  keys: Record<string, unknown> = {},
  lines = 1,
) {
  await startInMode(page, 'touch')
  await page.addInitScript((entries) => {
    for (const [key, value] of Object.entries(entries)) {
      localStorage.setItem('learning-notes:' + key, JSON.stringify(value))
    }
  }, keys)
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  for (let i = 1; i < lines; i++) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Line number ${i}`)
  }
  await page.waitForTimeout(400)
}

const ribbonOn = { 'toolbar.ribbon': true }
const sidebarOpen = async (page: Page, open: boolean) => {
  const aside = page.locator('aside')
  const visible = await aside.isVisible()
  if (visible !== open) {
    await page
      .getByRole('button', { name: open ? 'Show menu' : 'Hide menu' })
      .first()
      .click()
  }
}

const box = async (locator: Locator) => (await locator.boundingBox())!

/** No tab is cut off: the strip does not scroll and each tab is whole. */
async function expectTabsFit(page: Page) {
  const list = dockedBar(page).getByRole('tablist')
  const strip = await list.evaluate((el) => ({
    scroll: el.scrollWidth,
    client: el.clientWidth,
    right: el.getBoundingClientRect().right,
  }))
  expect(strip.scroll, 'the tab strip does not scroll').toBeLessThanOrEqual(
    strip.client + 1,
  )
  for (const name of ['File', 'Home', 'Insert', 'Draw', 'View', 'Review']) {
    const tab = dockedBar(page).getByRole('tab', { name, exact: true })
    await expect(tab).toBeVisible()
    const b = await box(tab)
    expect(b.x + b.width, `${name} is whole`).toBeLessThanOrEqual(
      strip.right + 1,
    )
    // The label itself is not cut (its scroll width fits its box).
    expect(
      await tab.evaluate((el) => el.scrollWidth <= el.clientWidth + 1),
    ).toBe(true)
  }
  const bar = await box(dockedBar(page))
  for (const name of ['Search all features', 'Short bar']) {
    const b = await box(
      dockedBar(page).getByRole('button', { name, exact: true }),
    )
    expect(b.x).toBeGreaterThanOrEqual(bar.x - 1)
    expect(b.x + b.width).toBeLessThanOrEqual(bar.x + bar.width + 1)
  }
}

for (const width of [768, 820, 1024, 1366]) {
  for (const open of [true, false]) {
    test(`Full ribbon at ${width} px, sidebar ${open ? 'open' : 'closed'}: six tabs, search and Short bar fit`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 })
      await openPage(page, ribbonOn)
      await sidebarOpen(page, open)
      await dockedBar(page).getByRole('tab', { name: 'Insert' }).click()
      await expectTabsFit(page)
      // The pin is an icon only, with a name for screen readers and a tooltip.
      const pin = dockedBar(page).locator('[data-action="ribbonBehaviour"]')
      await expect(pin).toHaveAccessibleName(/Tools close after use/)
      await expect(pin).toHaveAttribute('title', /Ctrl\+F1|⌘F1/)
      expect((await box(pin)).width).toBeLessThan(60)
      // Groups scroll sideways; when there is more, the edge fades (no half labels).
      const panel = dockedBar(page).getByRole('tabpanel')
      const more = await panel.evaluate(
        (el) => el.scrollWidth > el.clientWidth + 2,
      )
      if (more) await expect(panel).toHaveAttribute('data-fade-end', 'true')
      else await expect(panel).not.toHaveAttribute('data-fade-end', /./)
    })
  }
}

test('a group scrolled sideways comes to rest on a whole group, with a start fade', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1000 })
  await openPage(page, ribbonOn)
  await sidebarOpen(page, true)
  await dockedBar(page).getByRole('tab', { name: 'Home' }).click()
  const panel = dockedBar(page).getByRole('tabpanel')
  await expect(panel).toHaveAttribute('data-fade-end', 'true')
  await panel.evaluate((el) => {
    el.scrollLeft = el.scrollWidth
  })
  await expect(panel).toHaveAttribute('data-fade-start', 'true')
  await expect(panel).not.toHaveAttribute('data-fade-end', /./)
  // The snap points are the groups' start edges.
  expect(
    await panel.evaluate((el) => getComputedStyle(el).scrollSnapType),
  ).toMatch(/x/)
})

test('the ribbon stays docked at the top while a long page scrolls', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 800 })
  await openPage(page, ribbonOn, 70)
  const bar = dockedBar(page)
  await page.evaluate(() => {
    const scroller = [...document.querySelectorAll('main, div')].find(
      (el) => el.scrollHeight > el.clientHeight + 400 && el.clientHeight > 300,
    )
    ;(scroller ?? document.scrollingElement)!.scrollTop = 900
  })
  await page.waitForTimeout(300)
  const b = await box(bar)
  expect(b.y).toBeGreaterThanOrEqual(-1)
  expect(b.y).toBeLessThan(80)
})

test('the ribbon is compact', async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 900 })
  await openPage(page, ribbonOn)
  await sidebarOpen(page, true)
  await dockedBar(page).getByRole('tab', { name: 'Home' }).click()
  const open = (await box(dockedBar(page))).height
  await page.keyboard.press('Escape')
  const closed = (await box(dockedBar(page))).height
  expect(open).toBeLessThan(190)
  expect(closed).toBeLessThan(85)
})

test('Slim: one row of icons, names in tooltips, all tabs fit at 820 px (sidebar open and closed)', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1000 })
  await openPage(page, { ...ribbonOn, 'toolbar.ribbonSize': 'slim' })
  for (const open of [true, false]) {
    await sidebarOpen(page, open)
    await expectTabsFit(page)
    const bar = dockedBar(page)
    // The tools show at once (no panel to open) as icons only.
    const panel = bar.getByRole('tabpanel')
    await expect(panel).toBeVisible()
    const tool = panel.getByRole('button').first()
    await expect(tool).toHaveAttribute('title', /./)
    expect((await tool.innerText()).trim()).toBe('')
    await expect(panel.locator('span:text-is("Media")')).toHaveCount(0)
  }
  // With the sidebar closed there is room for tabs, icons and buttons in one row.
  await sidebarOpen(page, false)
  const tabs = await box(dockedBar(page).getByRole('tab', { name: 'File' }))
  const tools = await box(
    dockedBar(page).getByRole('tabpanel').getByRole('button').first(),
  )
  expect(Math.abs(tabs.y - tools.y)).toBeLessThan(12)
})

test('Slim is also chosen from the ribbon ⋯ options menu, and Reset brings Full back', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 1000 })
  await openPage(page, ribbonOn)
  const bar = dockedBar(page)
  await bar.getByRole('button', { name: 'Ribbon options' }).click()
  const menu = page.getByRole('menu', { name: 'Ribbon options' })
  await menu.getByRole('menuitemradio', { name: /Slim/ }).click()
  await expect(bar).toHaveAttribute('data-placement', /./)
  await expect(page.locator('[data-ribbon]')).toHaveAttribute(
    'data-size',
    'slim',
  )
  await bar.getByRole('button', { name: 'Ribbon options' }).click()
  await menu.getByRole('menuitem', { name: 'Reset ribbon' }).click()
  await expect(page.locator('[data-ribbon]')).toHaveAttribute(
    'data-size',
    'full',
  )
})

test('"Ribbon replaces short bar" (the default) shows one bar; "Ribbon + short bar" shows both, the short bar with its full tool set', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1000, height: 1000 })
  await openPage(page, ribbonOn)
  await expect(dockedBar(page)).toHaveCount(1)
  await expect(page.locator('[data-pill="short"]')).toHaveCount(0)
  await dockedBar(page).getByRole('button', { name: 'Ribbon options' }).click()
  await page
    .getByRole('menu', { name: 'Ribbon options' })
    .getByRole('menuitemradio', { name: 'Ribbon + short bar' })
    .click()
  await expect(page.locator('[data-pill="ribbon"]')).toBeVisible()
  await expect(page.locator('[data-pill="short"]')).toBeVisible()
  // Same edge: stacked in one group, the ribbon above the short bar.
  await expect(dockedBar(page)).toHaveCount(1)
  const r = await box(page.locator('[data-pill="ribbon"]'))
  const s = await box(page.locator('[data-pill="short"]'))
  expect(r.y + r.height).toBeLessThanOrEqual(s.y + 1)
  // The short bar keeps its tools, even those the ribbon also has.
  const short = page.locator('[data-pill="short"]')
  for (const name of ['Text', 'Pen', 'Insert', 'Read']) {
    await expect(short.getByRole('button', { name, exact: true })).toBeVisible()
  }
  // "Ribbon + short bar" is a choice in Settings › Tool bar, too.
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: /^Tool bar, / }).click()
  await expect(
    page.locator('[data-setting-id="toolbar.ribbonMode"]'),
  ).toContainText('Ribbon + short bar')
})

const places: Place[] = ['top', 'bottom', 'free']
for (const short of places) {
  for (const ribbon of places) {
    test(`both bars: short bar ${short}, ribbon ${ribbon}: both visible, inside the screen, never overlapping`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 820, height: 1180 })
      await openPage(page, {
        ...ribbonOn,
        'toolbar.ribbonMode': 'both',
        'advanced.barPlacement': short,
        'toolbar.ribbonPlacement': ribbon,
      })
      const r = page.locator('[data-pill="ribbon"]')
      const s = page.locator('[data-pill="short"]')
      await expect(r).toBeVisible()
      await expect(s).toBeVisible()
      const rb = await box(r)
      const sb = await box(s)
      const view = page.viewportSize()!
      for (const b of [rb, sb]) {
        expect(b.x).toBeGreaterThanOrEqual(-1)
        expect(b.y).toBeGreaterThanOrEqual(-1)
        expect(b.x + b.width).toBeLessThanOrEqual(view.width + 1)
        expect(b.y + b.height).toBeLessThanOrEqual(view.height + 1)
      }
      const overlap =
        rb.x < sb.x + sb.width - 1 &&
        sb.x < rb.x + rb.width - 1 &&
        rb.y < sb.y + sb.height - 1 &&
        sb.y < rb.y + rb.height - 1
      expect(overlap, 'the bars do not overlap').toBe(false)
    })
  }
}

test('each bar has its own saved position that survives a reload, with Reset', async ({
  page,
}) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await openPage(page, ribbonOn)
  await dockedBar(page).getByRole('button', { name: 'Ribbon options' }).click()
  await page
    .getByRole('menu', { name: 'Ribbon options' })
    .getByRole('menuitemradio', { name: 'Bottom' })
    .click()
  await expect(dockedBar(page)).toHaveAttribute('data-placement', 'bottom')
  await page.reload()
  await expect(dockedBar(page)).toHaveAttribute('data-placement', 'bottom')
  expect(
    await page.evaluate(() =>
      localStorage.getItem('learning-notes:toolbar.ribbonPlacement'),
    ),
  ).toBe('"bottom"')
  await dockedBar(page).getByRole('button', { name: 'Ribbon options' }).click()
  await page
    .getByRole('menu', { name: 'Ribbon options' })
    .getByRole('menuitem', { name: 'Reset ribbon' })
    .click()
  await expect(dockedBar(page)).toHaveAttribute('data-placement', 'top')
})
