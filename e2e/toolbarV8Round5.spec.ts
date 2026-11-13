// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8 gate 3 (nineteenth visit): the Format icon, the phone row, the More card, the Box card and the card track. */
test.use({ hasTouch: true })

const PRO = ['tb.textBox', 'tb.textFonts', 'tb.textMarks', 'tb.insertMore']

async function open(
  page: Page,
  size: { width: number; height: number },
  level: 'beginner' | 'professional' = 'beginner',
) {
  await page.addInitScript(
    ([l, u]) =>
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      ),
    [level, level === 'professional' ? PRO : []] as const,
  )
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const PC = { width: 1440, height: 900 }
const PHONE = { width: 390, height: 844 }

async function openChip(page: Page, id: string) {
  const chip = page.getByTestId(`v8-chip-${id}`)
  if (!(await chip.isVisible())) {
    await page.getByTestId('v8-row-more').click()
    await page.getByTestId(`v8-fold-${id.split('.')[1]}`).click()
  } else await chip.click()
  await expect(page.getByTestId(`v8-card-${id}`)).toBeVisible()
}

test('the open Format button turns only its arrow, not the Aa icon', async ({
  page,
}) => {
  await open(page, PC)
  await openChip(page, 'text.format')
  const turns = await page
    .getByTestId('v8-chip-text.format')
    .locator('svg')
    .evaluateAll((all) => all.map((e) => getComputedStyle(e).transform))
  expect(turns[0]).toBe('none')
  expect(turns[turns.length - 1]).not.toBe('none')
})

test('phone: opening a card does not re-fold the Text row (Format stays on the row)', async ({
  page,
}) => {
  await open(page, PHONE)
  const more = page.getByTestId('v8-row-more')
  const before = await more.getAttribute('aria-label')
  await openChip(page, 'text.format')
  await expect(page.getByTestId('v8-chip-text.format')).toBeVisible()
  await expect(more).toHaveAttribute('aria-label', before!)
})

test('the more card with nothing folded draws no placeholder line', async ({
  page,
}) => {
  await open(page, PC)
  await page.getByTestId('v8-more').click()
  await expect(page.getByTestId('v8-card-fold.bar')).toBeVisible()
  await expect(page.getByText(/arrive in the next update/)).toHaveCount(0)
})

test('phone Professional: the Box card stays 8 px under the bar', async ({
  page,
}) => {
  await open(page, PHONE, 'professional')
  await page.locator('.bn-editor').first().click()
  await openChip(page, 'text.box')
  const bar = (await page.getByTestId('toolbar-v8').boundingBox())!
  const card = (await page.getByTestId('v8-card-text.box').boundingBox())!
  expect(card.y).toBeGreaterThanOrEqual(bar.y + bar.height + 8 - 1)
})

test('a cut card draws the thin track; a card that fits draws none', async ({
  page,
}) => {
  await open(page, { width: 820, height: 700 }, 'professional')
  await openChip(page, 'text.format')
  await expect(page.getByTestId('pcard-track')).toBeVisible()
  // The tile grid fills the card: the right edge is 12 px inside it.
  const card = (await page.getByTestId('v8-card-text.format').boundingBox())!
  const grid = (await page
    .getByTestId('v8-card-text.format')
    .locator('.pcard-tiles')
    .first()
    .boundingBox())!
  expect(
    Math.abs(card.x + card.width - 12 - (grid.x + grid.width)),
  ).toBeLessThan(2)
  await page.getByTestId('pcard-close').click()
  await expect(page.locator('.pcard')).toHaveCount(0)
  await page.getByTestId('v8-chip-text.boxset').click()
  await expect(page.getByTestId('v8-card-text.boxset')).toBeVisible()
  await expect(page.getByTestId('pcard-track')).toHaveCount(0)
})

test('Box settings: "Use this look for new boxes" has an icon, the look name and a hint', async ({
  page,
}) => {
  await open(page, PC)
  await openChip(page, 'text.boxset')
  const row = page.getByTestId('v8-boxset-new')
  await expect(row).toContainText('Use this look for new boxes')
  await expect(row.locator('svg').first()).toBeVisible()
  await expect(page.getByTestId('v8-boxset-value')).not.toBeEmpty()
  // With no box selected the row is off and says why; with one it is on and says nothing.
  const hint = page.getByText(/Select a box first/)
  if (await row.isDisabled()) await expect(hint).toBeVisible()
  else await expect(hint).toHaveCount(0)
})
