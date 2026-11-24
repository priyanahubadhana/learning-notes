import { expect, test, type Page } from '@playwright/test'
import { createNotebook, showSidebar, sidebar } from './helpers.ts'

/**
 * Slice 4 gate 3 (13 Nov 2026), the 7 fixes left: thin tracks on cut rows,
 * "Close" on touch, strip labels never cut, solid strip and search surface,
 * the full "Notebooks" heading beside an icon-only Collapse all.
 */
const FLAGS = '/?flags=notebooks.v2,search.v2'
const PHONE = { width: 390, height: 844 }
const IPAD_PORTRAIT = { width: 834, height: 1194 }

async function setUp(page: Page, viewport: { width: number; height: number }) {
  await page.setViewportSize({ width: 1336, height: 720 })
  await page.goto(FLAGS)
  await sidebar(page).waitFor({ state: 'attached' })
  await createNotebook(page, 'Biology', 'Cells')
  await createNotebook(page, 'French', 'Verbs')
  await createNotebook(page, 'Maths', 'Algebra')
  await page.setViewportSize(viewport)
  await page.reload()
  await sidebar(page).waitFor({ state: 'attached' })
}

async function openHome(page: Page) {
  const rail = page.locator('[data-space="notebooks"]')
  const home = page.getByTestId('notebooks-home')
  await rail.click()
  if (!(await home.isVisible())) {
    await page.keyboard.press('Escape')
    await rail.click()
  }
  await expect(home).toBeVisible()
}

/** Alpha of a computed CSS colour (1 = solid). */
const alpha = (c: string) => {
  const m = c.match(/rgba?\(([^)]+)\)/)
  if (!m) return 1
  const p = m[1].split(/[\s,/]+/).filter(Boolean)
  return p.length > 3 ? Number(p[3]) : 1
}

test.describe('phone, touch', () => {
  test.use({ hasTouch: true, isMobile: true })

  test('1 continue cards that do not fit show a thin track', async ({
    page,
  }) => {
    await setUp(page, PHONE)
    await openHome(page)
    const strip = page.getByTestId('nbv2-continue')
    await expect(strip.getByTestId('nbv2-continue-card')).toHaveCount(3)
    await expect(strip.getByTestId('scroll-track')).toBeVisible()
  })

  test('2 cut search chips show a thin track', async ({ page }) => {
    await setUp(page, PHONE)
    await page.keyboard.press('Control+K')
    const popup = page.getByRole('dialog', { name: 'Search' })
    await expect(popup.getByTestId('scroll-track')).toBeVisible()
  })

  test('3 touch shows an X Close button, never "Esc"', async ({ page }) => {
    await setUp(page, PHONE)
    await page.keyboard.press('Control+K')
    const popup = page.getByRole('dialog', { name: 'Search' })
    await expect(popup.getByText('Esc', { exact: true })).toBeHidden()
    // F5 (owner, 14 Nov): the word Close became a visible X button (44 pt), same label.
    await expect(
      popup.getByRole('button', { name: 'Close search' }),
    ).toBeVisible()
  })

  test('4 + 5 phone strip: labels whole, solid surface', async ({ page }) => {
    await setUp(page, PHONE)
    await openHome(page)
    await page
      .locator('[data-notebook-card]')
      .filter({ hasText: 'Maths' })
      .click({ button: 'right' })
    const strip = page.getByTestId('nbv2-strip')
    await strip.waitFor()
    const cut = await strip
      .locator('.cs__name')
      .evaluateAll((els) =>
        els
          .filter(
            (e) =>
              e.scrollWidth > e.clientWidth + 1 ||
              e.scrollHeight > e.clientHeight + 1,
          )
          .map((e) => e.textContent),
      )
    expect(cut).toEqual([])
    const look = await strip.evaluate((el) => {
      const bar = (el.querySelector('.cs__bar') ?? el) as HTMLElement
      const s = getComputedStyle(bar)
      return { bg: s.backgroundColor, blur: s.backdropFilter }
    })
    expect(alpha(look.bg)).toBe(1)
    expect(look.blur === 'none' || look.blur === '').toBe(true)
  })
})

test('6 sidebar heading keeps the full word; Collapse all is an icon with a name', async ({
  page,
}) => {
  await setUp(page, { width: 1194, height: 834 })
  await showSidebar(page)
  const btn = sidebar(page).getByTestId('nbv2-collapse-all')
  await expect(btn).toHaveAccessibleName(/Collapse all|Expand all/)
  expect((await btn.innerText()).trim()).toBe('')
  const heading = sidebar(page).getByText('Notebooks', { exact: true }).first()
  const cut = await heading.evaluate((e) => e.scrollWidth > e.clientWidth + 1)
  expect(cut).toBe(false)
})

test('7 iPad search: results sit on a solid surface', async ({ page }) => {
  await setUp(page, IPAD_PORTRAIT)
  await page.keyboard.press('Control+K')
  const popup = page.getByRole('dialog', { name: 'Search' })
  await popup.waitFor()
  const look = await popup.evaluate((el) => {
    const s = getComputedStyle(el)
    return { bg: s.backgroundColor, blur: s.backdropFilter }
  })
  expect(alpha(look.bg)).toBe(1)
  expect(look.blur === 'none' || look.blur === '').toBe(true)
})

test('3b a phone-size screen shows an X Close button, never "Esc"', async ({
  page,
}) => {
  await setUp(page, PHONE)
  await page.keyboard.press('Control+K')
  const popup = page.getByRole('dialog', { name: 'Search' })
  await expect(popup.getByText('Esc', { exact: true })).toBeHidden()
  // F5 (owner, 14 Nov): the word Close became a visible X button (44 pt), same label.
  await expect(
    popup.getByRole('button', { name: 'Close search' }),
  ).toBeVisible()
})
