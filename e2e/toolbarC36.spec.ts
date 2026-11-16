// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Combined test C3 and C6 (16 Nov): the eraser bar never cuts "Back after
 * one" (icon only when tight, name on hold and as the spoken label), and
 * ⋯ More › Tool bar has "Edit tool bar", which starts editing on the bar.
 */
test.use({ viewport: { width: 810, height: 1080 }, hasTouch: true })

const FLAGS = 'foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2'

async function open(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript(
    ([l]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({
          level: l,
          unlocked: ['tb.eraserOptions', 'tb.allTools'],
        }),
      )
    },
    [level] as const,
  )
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${FLAGS}`)
  await createNotebook(page, 'Biology', 'First')
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
}

test('C3 eraser bar, iPad upright, Professional: Back after one is never cut', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1140, height: 1000 })
  await open(page, 'professional')
  await page.getByTestId('v8-tool-eraser').click()
  const back = page.getByTestId('v8-eraser-back')
  await expect(back).toBeVisible()
  const cut = await page.evaluate(() => {
    const row = document.querySelector('.v8row-items') as HTMLElement
    const r = row.getBoundingClientRect()
    const out: string[] = []
    for (const el of row.querySelectorAll<HTMLElement>(
      '[data-testid^="v8-chip-"], [data-testid^="v8-eraser-"]',
    )) {
      const b = el.getBoundingClientRect()
      if (b.width === 0) continue
      if (b.right > r.right + 0.5) out.push(`${el.dataset.testid} chip`)
      for (const s of el.querySelectorAll<HTMLElement>('span')) {
        const sb = s.getBoundingClientRect()
        if (
          sb.width &&
          (sb.right > r.right + 0.5 || s.scrollWidth > s.clientWidth + 1)
        )
          out.push(`${el.dataset.testid} text`)
      }
    }
    return out
  })
  expect(cut).toEqual([])
  // Still named for a screen reader, and still 44 pt wide.
  await expect(back).toHaveAttribute('aria-label', /previous tool/)
  expect((await back.boundingBox())!.height).toBeGreaterThanOrEqual(44)
})

test('C3 tight bar: icon only, name on long-press, still works', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1140, height: 1000 })
  await open(page, 'professional')
  await page.getByTestId('v8-tool-eraser').click()
  const back = page.getByTestId('v8-eraser-back')
  await expect(back).toBeVisible()
  await expect(back.locator('.v8chip-label')).toHaveCount(0)
  // Long-press says the full name.
  const b = (await back.boundingBox())!
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await back.dispatchEvent('pointerdown', {
    pointerType: 'touch',
    isPrimary: true,
    clientX: b.x + 5,
    clientY: b.y + 5,
  })
  await expect(page.getByText('Back after one').first()).toBeVisible({
    timeout: 3000,
  })
  await back.dispatchEvent('pointerup', { pointerType: 'touch' })
})

test('C6 ⋯ More › Tool bar has Edit tool bar, which starts editing', async ({
  page,
}) => {
  await open(page, 'beginner')
  await page.getByTestId('v8-more').click()
  const group = page
    .getByRole('dialog', { name: 'More' })
    .getByRole('button', { name: 'Tool bar', exact: true })
  await group.click()
  const row = page.getByTestId('v8-more-editbar')
  await expect(row).toBeVisible()
  await expect(row).toContainText('Edit tool bar')
  await row.click()
  // The bar is now in edit mode (banner with Done).
  await expect(page.getByTestId('v8-edit-bar')).toBeVisible()
  await expect(page.getByTestId('v8-edit-done')).toBeVisible()
})

test('C7 Page options › Arrange pinned actions: one header, one ✕, ✓, no footer Done', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1280, height: 900 })
  await open(page, 'professional')
  await page.getByRole('button', { name: 'More options' }).click()
  const sheet = page.getByTestId('page-sheet')
  await expect(sheet).toBeVisible()
  for (const id of ['history', 'review']) {
    await sheet.getByTestId('ps-pin-add').click()
    await sheet.getByTestId(`ps-pin-${id}`).click()
    // The pin list has its own ✕ and ✓ (no Back row).
    await page.getByTestId('fb-sheet-ok').click()
  }
  await sheet.getByTestId('ps-arrange').click()
  await expect(page.getByText('Arrange pinned actions')).toBeVisible()
  // One header: one ✕ (left), one ✓ (right), no footer Done, no second sheet.
  await expect(page.getByTestId('fb-sheet-close')).toHaveCount(1)
  await expect(page.getByTestId('fb-sheet-ok')).toHaveCount(1)
  await expect(page.getByTestId('arrange-done')).toHaveCount(0)
  await expect(page.locator('[data-testid^="fb-sheet-foot"]')).toHaveCount(0)
  await expect(page.locator('.fb-sheet__head')).toHaveCount(1)
  const x = (await page.getByTestId('fb-sheet-close').boundingBox())!
  const ok = (await page.getByTestId('fb-sheet-ok').boundingBox())!
  expect(x.x).toBeLessThan(ok.x)
  // Moving a row works; ✓ goes back to Page options with the new order.
  const order = () =>
    sheet
      .locator('[data-testid^="ps-tile-"]')
      .evaluateAll((els) =>
        els.map((el) => el.getAttribute('data-testid')!.slice(8)),
      )
  await page.getByTestId('fb-sheet-ok').click()
  const before = (await order()).filter((i) => i !== 'add')
  await sheet.getByTestId('ps-arrange').click()
  await sheet.getByTestId('move-down').first().click()
  await page.getByTestId('fb-sheet-ok').click()
  await expect(sheet.getByTestId('ps-arrange')).toBeVisible()
  const after = (await order()).filter((i) => i !== 'add')
  expect(after).toEqual([before[1], before[0], ...before.slice(2)])
  // ✕ cancels: the order from when Arrange opened comes back.
  await sheet.getByTestId('ps-arrange').click()
  await sheet.getByTestId('move-down').first().click()
  await page.getByTestId('fb-sheet-close').click()
  await expect(sheet.getByTestId('ps-arrange')).toBeVisible()
  expect((await order()).filter((i) => i !== 'add')).toEqual(after)
})

test('C9 edit-the-bar tray offers Mic and Record audio; Mic opens the dictation strip', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1500, height: 900 })
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({
        level: 'professional',
        unlocked: ['tb.allTools', 'tb.insertMore'],
      }),
    )
  })
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${FLAGS}`)
  await createNotebook(page, 'Biology', 'First')
  await hideSidebar(page)
  await typeInEditor(page, 'Hello')
  // Not on the bar by default.
  await expect(page.getByTestId('v8-tool-mic')).toHaveCount(0)
  await expect(page.getByTestId('v8-tool-audio')).toHaveCount(0)
  await page.getByTestId('v8-more').click()
  await page
    .getByRole('dialog', { name: 'More' })
    .getByRole('button', { name: 'Tool bar', exact: true })
    .click()
  await page.getByTestId('v8-more-editbar').click()
  await expect(page.getByTestId('v8-edit-tile-mic')).toContainText('Mic')
  await expect(page.getByTestId('v8-edit-tile-audio')).toContainText(
    'Record audio',
  )
  await page.getByTestId('v8-edit-tile-mic').click()
  await page.getByTestId('v8-edit-tile-audio').click()
  await page.getByTestId('v8-edit-done').click()
  await expect(page.getByTestId('v8-tool-audio')).toBeVisible()
  await expect(page.locator('[data-mini-keys]')).toHaveCount(0)
  await page.getByTestId('v8-tool-mic').click()
  await expect(page.locator('[data-mini-keys]')).toBeVisible()
})
