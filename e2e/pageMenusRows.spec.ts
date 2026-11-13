// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { closeCorner, createNotebook, openSidebar } from './helpers.ts'

/**
 * Slice 12 rest (flag page.menus): the strip on rows (PM-23), the hold time
 * from Settings (PM-24) and a drag cancelling the hold (PM-25).
 * docs/features/page-menus.md.
 */
test.use({
  hasTouch: true,
  isMobile: true,
  viewport: { width: 1024, height: 768 },
})

const strip = (page: Page) => page.getByTestId('row-strip')

/** A finger held on an element for `ms`, drifting `drift` px, then lifted. */
async function hold(target: Locator, ms: number, drift = 0) {
  // Let the sidebar finish sliding in: the press point is read at fire time.
  await target.page().waitForTimeout(600)
  await target.evaluate(
    async (el, a) => {
      const r = el.getBoundingClientRect()
      const at = (dx: number) => ({
        bubbles: true,
        pointerType: 'touch',
        isPrimary: true,
        pointerId: 9,
        clientX: r.left + r.width / 2 + dx,
        clientY: r.top + r.height / 2,
      })
      el.dispatchEvent(new PointerEvent('pointerdown', at(0)))
      if (a.drift)
        el.dispatchEvent(new PointerEvent('pointermove', at(a.drift)))
      await new Promise((res) => setTimeout(res, a.ms))
      el.dispatchEvent(new PointerEvent('pointerup', at(a.drift)))
    },
    { ms, drift },
  )
}

async function start(page: Page, keys: Record<string, unknown> = {}) {
  await page.addInitScript((entries) => {
    for (const [k, v] of Object.entries(entries))
      localStorage.setItem('learning-notes:' + k, JSON.stringify(v))
  }, keys)
  await page.goto('/?flags=page.menus')
  await createNotebook(page, 'Touch NB', 'First')
}

const pageButton = async (page: Page) => {
  const side = await openSidebar(page)
  return side
    .getByTestId('page-row')
    .filter({ hasText: 'First' })
    .first()
    .getByRole('button', { name: 'First', exact: true })
}

test('PM-23 a page row long-press opens the strip with Rename and Delete last', async ({
  page,
}) => {
  await start(page, { 'advanced.holdMenu': 600 })
  await hold(await pageButton(page), 800)
  await expect(strip(page)).toBeVisible()
  await expect(
    strip(page).getByRole('menuitem', { name: 'Rename' }),
  ).toBeVisible()
  const names = await strip(page).getByRole('menuitem').allInnerTexts()
  expect(names.join(' ')).toMatch(/Delete/)
  await expect(page.getByRole('menu')).toHaveCount(0)
})

test('PM-23 a notebook row long-press opens the strip', async ({ page }) => {
  await start(page, { 'advanced.holdMenu': 600 })
  const side = await openSidebar(page)
  const row = side
    .locator('[data-notebook-row]')
    .filter({ hasText: 'Touch NB' })
  await hold(row.getByRole('button', { name: 'Touch NB', exact: true }), 800)
  await expect(strip(page)).toBeVisible()
  await expect(
    strip(page).getByRole('menuitem', { name: 'Rename' }),
  ).toBeVisible()
})

test('PM-23 a task row long-press opens the strip with Tomorrow and Delete', async ({
  page,
}) => {
  await start(page, { 'advanced.holdMenu': 600 })
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await page.getByTestId('quick-add').fill('Write essay')
  await page.getByTestId('quick-add').press('Enter')
  await hold(
    page.getByTestId('task-row').first().locator('div.cursor-grab'),
    800,
  )
  await expect(strip(page)).toBeVisible()
  await expect(
    strip(page).getByRole('menuitem', { name: 'Tomorrow' }),
  ).toBeVisible()
})

test('PM-23 the old long-press menu stays when the flag is off', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Touch NB', 'First')
  await hold(await pageButton(page), 650)
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(strip(page)).toHaveCount(0)
})

test('PM-24 the hold time follows Settings: 1.5 s by default', async ({
  page,
}) => {
  await start(page)
  await hold(await pageButton(page), 1000)
  await expect(strip(page)).toHaveCount(0)
  await hold(await pageButton(page), 1700)
  await expect(strip(page)).toBeVisible()
})

test('PM-24 a shorter Settings time opens sooner, and not before it', async ({
  page,
}) => {
  await start(page, { 'advanced.holdMenu': 600 })
  await hold(await pageButton(page), 400)
  await expect(strip(page)).toHaveCount(0)
  await hold(await pageButton(page), 800)
  await expect(strip(page)).toBeVisible()
})

test('PM-25 a drag after the press starts opens no strip', async ({ page }) => {
  await start(page, { 'advanced.holdMenu': 600 })
  await hold(await pageButton(page), 900, 30)
  await expect(strip(page)).toHaveCount(0)
  await expect(page.getByRole('menu')).toHaveCount(0)
})
