// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { closeCorner } from './helpers.ts'

/** Gate 3 (fourth visit) fixes for Home v2, flag `home.v2`: items 1 to 4. */

const PHONE = { width: 390, height: 844 }
const PC = { width: 1336, height: 900 }

async function openHome(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('lvl-set')) {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'professional', unlocked: [] }),
      )
      sessionStorage.setItem('lvl-set', '1')
    }
  })
  await page.setViewportSize(size)
  await page.goto('/?flags=home.v2')
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await expect(
    page.getByTestId('home-widgets').locator('> li[data-reorder-id]'),
  ).not.toHaveCount(0)
  await settle(page)
}

/** Let move/size animations finish before measuring. */
const settle = (page: Page) =>
  page.evaluate(() =>
    Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    ),
  )

test('1: phone tab row that is cut shows the thin scroll track', async ({
  page,
}) => {
  await openHome(page, PHONE)
  const tabs = page.getByTestId('home-tabs')
  const cut = await tabs.evaluate((e) => e.scrollWidth > e.clientWidth + 1)
  expect(cut).toBe(true)
  await expect(
    page.getByTestId('home-screen').getByTestId('scroll-track'),
  ).toBeVisible()
})

test('2: phone Edit bar is a title line, then one row of three equal buttons', async ({
  page,
}) => {
  await openHome(page, PHONE)
  await page.getByTestId('home-edit').click()
  await settle(page)
  const bar = page.getByTestId('home-edit-bar')
  const boxes = await bar
    .getByRole('button')
    .evaluateAll((els) => els.map((e) => e.getBoundingClientRect().toJSON()))
  expect(boxes).toHaveLength(3)
  for (const b of boxes) {
    expect(Math.abs(b.top - boxes[0].top)).toBeLessThan(1)
    expect(Math.abs(b.width - boxes[0].width)).toBeLessThan(1.5)
  }
})

for (const [name, vp] of [
  ['phone', PHONE],
  ['pc', PC],
] as const) {
  test(`3: ${name} Edit mode keeps the layers icon in the header row (no row of its own)`, async ({
    page,
  }) => {
    await openHome(page, vp)
    await page.getByTestId('home-edit').click()
    await settle(page)
    for (const id of ['briefing', 'top3']) {
      const w = page.getByTestId(`widget-${id}`)
      const layers = await w.getByTestId(`source-${id}`).boundingBox()
      const title = await w.locator('header h3').boundingBox()
      const sizes = await w.getByRole('radiogroup').boundingBox()
      expect(
        Math.abs(
          layers!.y + layers!.height / 2 - (title!.y + title!.height / 2),
        ),
      ).toBeLessThan(4)
      expect(layers!.y + layers!.height).toBeLessThanOrEqual(sizes!.y + 1)
    }
  })
}

test('4: phone Edit mode keeps grip, icon, title and arrows on one header row', async ({
  page,
}) => {
  await openHome(page, PHONE)
  await page.getByTestId('home-edit').click()
  await settle(page)
  const ids = await page
    .getByTestId('home-widgets')
    .locator('> li[data-reorder-id]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-reorder-id')))
  for (const id of ids) {
    const w = page.getByTestId(`widget-${id}`)
    const res = await w.evaluate((sec) => {
      const h = sec.querySelector('header')!
      const hr = h.getBoundingClientRect()
      const mids = [...h.children].map((c) => {
        const r = c.getBoundingClientRect()
        return r.top + r.height / 2
      })
      return {
        oneRow: Math.max(...mids) - Math.min(...mids) < 4 && hr.height < 52,
        inside: [...h.children].every(
          (c) =>
            c.getBoundingClientRect().right <=
            sec.getBoundingClientRect().right - 4,
        ),
      }
    })
    expect(res, id!).toEqual({ oneRow: true, inside: true })
  }
})
