// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { closeCorner, sidebar } from './helpers.ts'

/** Gate 3 (third visit) fixes for Home v2, flag `home.v2`: items 1 to 6. */

async function openHome(page: Page, size?: { width: number; height: number }) {
  if (size) await page.setViewportSize(size)
  await page.goto('/?flags=home.v2')
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await expect(page.getByTestId('home-screen')).toBeVisible()
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await expect(
    page.getByTestId('home-widgets').locator('> li[data-reorder-id]'),
  ).not.toHaveCount(0)
}

const rect = (page: Page, id: string) =>
  page
    .locator(`li[data-reorder-id="${id}"]`)
    .evaluate((e) => e.getBoundingClientRect().toJSON() as DOMRect)

test('1: one frame and one title per widget (no card inside a card)', async ({
  page,
}) => {
  await openHome(page, { width: 1336, height: 900 })
  for (const [id, title] of [
    ['briefing', 'Briefing'],
    ['top3', 'Top 3'],
    ['timer', 'Timer'],
    ['pending', 'Pending items'],
  ] as const) {
    const w = page.getByTestId(`widget-${id}`)
    await expect(w.getByRole('heading', { name: title })).toHaveCount(1)
    await expect(w.getByText(title, { exact: true })).toHaveCount(1)
    // nothing inside the body draws a second frame with its own border
    const framed = await page
      .getByTestId(`body-${id}`)
      .evaluate((body) =>
        [...body.querySelectorAll('section')].some(
          (s) => parseFloat(getComputedStyle(s).borderTopWidth) > 0,
        ),
      )
    expect(framed).toBe(false)
  }
})

test('2: header is icon 17 + title 13/600; Where this comes from is a layers icon, Professional only', async ({
  page,
}) => {
  await openHome(page, { width: 1336, height: 900 })
  const w = page.getByTestId('widget-top3')
  const title = w.getByRole('heading', { name: 'Top 3' })
  expect(await title.evaluate((e) => getComputedStyle(e).fontSize)).toBe('13px')
  expect(await title.evaluate((e) => getComputedStyle(e).fontWeight)).toBe(
    '600',
  )
  const icon = w.locator('header > svg').first()
  expect(
    await icon.evaluate((e) => e.getBoundingClientRect().width),
  ).toBeCloseTo(17, 0)
  const src = page.getByTestId('source-top3')
  await expect(src).toHaveAccessibleName('Where this comes from')
  await expect(src).not.toHaveText(/Where this comes from/)
  await expect(src.locator('svg')).toHaveCount(1)
})

test('2: Beginner shows no "Where this comes from" anywhere (HM-B64); its switch brings it back', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (!sessionStorage.getItem('lvl-set')) {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [] }),
      )
      sessionStorage.setItem('lvl-set', '1')
    }
  })
  await openHome(page, { width: 1336, height: 900 })
  await expect(page.locator('[data-testid^="source-"]')).toHaveCount(0)
  await expect(page.getByTestId('home-board')).not.toContainText(
    'Where this comes from',
  )
  await page.evaluate(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: ['home.builtFrom'] }),
    ),
  )
  await page.reload()
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await page.getByRole('tab', { name: 'Today', exact: true }).click()
  await expect(page.getByTestId('source-top3')).toBeVisible()
})

test('3: grid has 2 columns on phone and iPad portrait (S tiles side by side), 4 columns on a wide screen', async ({
  page,
}) => {
  for (const [w, h] of [
    [390, 844],
    [820, 1180],
  ]) {
    await openHome(page, { width: w, height: h })
    const a = await rect(page, 'cards')
    const b = await rect(page, 'record')
    const brief = await rect(page, 'briefing')
    expect(Math.abs(a.top - b.top)).toBeLessThan(2)
    expect(b.left).toBeGreaterThan(a.right - 1)
    // an M widget is a full row on two columns
    expect(brief.width).toBeGreaterThan(a.width + b.width)
    expect(brief.top).toBeGreaterThan(a.bottom - 1)
  }
  await openHome(page, { width: 1336, height: 900 })
  const a = await rect(page, 'cards')
  const b = await rect(page, 'record')
  const brief = await rect(page, 'briefing')
  expect(Math.abs(a.top - brief.top)).toBeLessThan(2)
  expect(Math.abs(b.top - brief.top)).toBeLessThan(2)
})

test('4: phone tab row stays on one row and scrolls sideways', async ({
  page,
}) => {
  await openHome(page, { width: 390, height: 844 })
  const tops = await page
    .getByTestId('home-tabs')
    .getByRole('tab')
    .evaluateAll((els) =>
      els.map((e) => Math.round(e.getBoundingClientRect().top)),
    )
  expect(new Set(tops).size).toBe(1)
  const scroll = await page
    .getByTestId('home-tabs')
    .evaluate((e) => getComputedStyle(e).overflowX)
  expect(scroll).toBe('auto')
})

test('5: iPad portrait starts with the sidebar closed and the board wide', async ({
  page,
}) => {
  await openHome(page, { width: 820, height: 1180 })
  await expect(sidebar(page)).toBeHidden()
  const box = await page.getByTestId('home-board').boundingBox()
  expect(box?.width ?? 0).toBeGreaterThan(600)
  // a wide screen keeps its sidebar open
  await openHome(page, { width: 1336, height: 900 })
  await expect(sidebar(page)).toBeVisible()
})

test('6: sidebar Home panel has one short line and a one-line journal button', async ({
  page,
}) => {
  await openHome(page, { width: 1336, height: 900 })
  const side = sidebar(page)
  await expect(side).not.toContainText('Your day will live here')
  await expect(side).toContainText('Your day is on the Home board.')
  const btn = side.getByRole('button', { name: /Open today’s journal/ })
  expect((await btn.boundingBox())?.height ?? 99).toBeLessThanOrEqual(48)
})
