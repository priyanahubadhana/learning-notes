// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * AI framework slice 6 (flag `ai.framework`): Studio tiles toggle and "Make
 * selected" builds ONE plan with a combined cost (A3); the bottom row is
 * stacked on a phone (A1); Workflows filter with chips, Clear all and a live
 * "N of M" count (A4); the Tag picker is the shared one. No AI or network call.
 */

const FLAGGED = '/?flags=ai.framework#/settings/ai'

async function openStudio(page: Page) {
  await page.goto(FLAGGED)
  await expect(page.getByTestId('aifw-entry')).toBeVisible()
  await page.getByTestId('aifw-open').click()
  await page.getByTestId('aifw-tab-studio').click()
  await expect(page.getByTestId('aifw-studio')).toBeVisible()
}

for (const [name, size, touch] of [
  ['PC', { width: 1200, height: 900 }, false],
  ['iPad portrait, touch', { width: 820, height: 1180 }, true],
  ['phone', { width: 390, height: 780 }, true],
] as const) {
  test.describe(`AI framework: Studio (${name})`, () => {
    test.use({ viewport: size, hasTouch: touch, isMobile: false })

    test('tiles toggle; Make selected builds one plan with a combined cost', async ({
      page,
    }) => {
      await openStudio(page)
      const make = page.getByTestId('aifw-studio-make')
      await expect(make).toBeDisabled()
      await expect(page.getByTestId('aifw-studio-none')).toBeVisible()
      const notes = page.getByTestId('aifw-tile-notes')
      const cards = page.getByTestId('aifw-tile-cards')
      await expect(notes).toHaveAttribute('aria-pressed', 'false')
      await notes.click()
      await expect(notes).toHaveAttribute('aria-pressed', 'true')
      await notes.click()
      await expect(notes).toHaveAttribute('aria-pressed', 'false')
      await notes.click()
      await cards.click()
      // A new notebook needs a name before it can run.
      await expect(make).toBeDisabled()
      await page.getByTestId('aifw-dest-name').fill('Studio nb')
      await expect(make).toBeEnabled()
      await expect(make).toContainText('Make selected (2)')
      // Notebook + Notes + Cards = 3 steps in ONE plan.
      await expect(page.getByTestId('aifw-studio-steps')).toContainText(
        '3 steps',
      )
      const estimate = page.getByTestId('aifw-runbar-estimate')
      await expect(estimate).toContainText('estimated')
      await expect(estimate).toContainText('Free by paste')
      expect((await make.boundingBox())!.height).toBeGreaterThanOrEqual(44)
      await make.click()
      await expect(page.getByTestId('aifw-run')).toBeVisible()
      await expect(page.getByTestId('aifw-run-step')).toHaveCount(3)
    })
  })
}

test.describe('AI framework: bottom row on a phone (A1)', () => {
  test.use({ viewport: { width: 390, height: 780 }, hasTouch: true })

  test('path, then chip and estimate, then a full-width Run; nothing overlaps', async ({
    page,
  }) => {
    await openStudio(page)
    await page.getByTestId('aifw-tile-notes').click()
    await page
      .getByTestId('aifw-dest-name')
      .fill('A very long notebook name that has to wrap onto several lines')
    const path = await page.getByTestId('aifw-runbar-path').boundingBox()
    const chip = await page.getByTestId('aifw-runbar-chip').boundingBox()
    const est = await page.getByTestId('aifw-runbar-estimate').boundingBox()
    const run = await page.getByTestId('aifw-studio-make').boundingBox()
    expect(path && chip && est && run).toBeTruthy()
    expect(path!.y + path!.height).toBeLessThanOrEqual(chip!.y + 1)
    expect(chip!.y + chip!.height).toBeLessThanOrEqual(run!.y + 1)
    expect(est!.y + est!.height).toBeLessThanOrEqual(run!.y + 1)
    // Full width of the row, and nothing runs past the screen.
    expect(run!.width).toBeGreaterThan(390 - 2 * 16 - 40)
    for (const b of [path!, chip!, est!, run!])
      expect(b.x + b.width).toBeLessThanOrEqual(390)
    const wide = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    )
    expect(wide).toBe(false)
  })
})

test.describe('AI framework: Workflows (A4)', () => {
  test.use({ viewport: { width: 1200, height: 900 } })

  async function save(page: Page, name: string, tile: string) {
    await page.getByTestId('aifw-tab-studio').click()
    await page.getByTestId(`aifw-tile-${tile}`).click()
    await page.getByTestId('aifw-dest-name').fill(name)
    await page.getByTestId('aifw-studio-save').click()
    await expect(page.getByTestId('aifw-toast')).toContainText(name)
    await page.getByTestId(`aifw-tile-${tile}`).click()
  }

  test('filters with chips, Clear all and a live N of M count; saved workflows stay', async ({
    page,
  }) => {
    await openStudio(page)
    await save(page, 'Podcast to notes', 'notes')
    await save(page, 'Book to cards', 'cards')
    await page.getByTestId('aifw-tab-workflows').click()
    const count = page.getByTestId('aifw-wf-count')
    await expect(count).toHaveText('2 of 2')
    await expect(page.getByTestId('aifw-wf-row')).toHaveCount(2)

    // Rate one, then filter on the rating under More filters.
    await page
      .getByRole('combobox', { name: 'Rating for Studio: Book to cards' })
      .selectOption('5')
    await page.getByTestId('aifw-wf-more').click()
    await page.getByTestId('aifw-wf-minrating').selectOption('4')
    await expect(count).toHaveText('1 of 2')
    await expect(page.getByTestId('aifw-wf-row')).toHaveCount(1)
    await expect(page.getByTestId('aifw-wf-chip')).toContainText('Rating 4+')

    // The search box narrows too; Clear all empties every chip.
    await page.getByTestId('aifw-wf-search').fill('podcast')
    await expect(count).toHaveText('0 of 2')
    await expect(page.getByTestId('aifw-wf-nomatch')).toBeVisible()
    await page.getByTestId('aifw-wf-clear').click()
    await expect(page.getByTestId('aifw-wf-chip')).toHaveCount(0)
    await expect(count).toHaveText('2 of 2')

    // The Tag button opens the shared Tag picker.
    await page.getByTestId('aifw-wf-tags').click()
    await expect(page.getByTestId('tag-picker-body')).toBeVisible()
    await expect(page.getByTestId('tp-match-all')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByTestId('tag-picker-body')).toHaveCount(0)
    await expect(page.getByTestId('aifw-screen')).toBeVisible()

    // Saved workflows are still there after the screen is closed and reopened.
    await page.getByTestId('aifw-close').click()
    await page.getByTestId('aifw-open').click()
    await page.getByTestId('aifw-tab-workflows').click()
    await expect(page.getByTestId('aifw-wf-row')).toHaveCount(2)
  })

  test('Run starts the saved plan and counts one use; Remove has Undo', async ({
    page,
  }) => {
    await openStudio(page)
    await save(page, 'Podcast to notes', 'notes')
    await page.getByTestId('aifw-tab-workflows').click()
    await page.getByTestId('aifw-wf-remove').click()
    await expect(page.getByTestId('aifw-wf-count')).toHaveText('0 of 0')
    await page.getByTestId('aifw-toast-action').click()
    await expect(page.getByTestId('aifw-wf-count')).toHaveText('1 of 1')
    await page.getByTestId('aifw-wf-run').click()
    await expect(page.getByTestId('aifw-run')).toBeVisible()
    await page.getByTestId('aifw-tab-workflows').click()
    await expect(page.getByTestId('aifw-wf-row')).toContainText('Used 1 times')
  })
})
