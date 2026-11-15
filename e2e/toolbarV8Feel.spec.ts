// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8 / v9, task 2A.7: the Feel card (TB-24, TB-25). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function open(page: Page, level: Level = 'professional') {
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: l, unlocked: [] }),
    )
  }, level)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
  await page.getByTestId('v8-chip-pen.feel').click()
  await expect(page.getByTestId('v8-card-pen.feel')).toBeVisible()
}
const card = (page: Page) => page.getByTestId('v8-card-pen.feel')
const tab = (page: Page, name: string) =>
  card(page).getByRole('tab', { name }).click()
const stored = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('learning-notes:ink.pen') ?? '{}'),
  )

test('TB-24 Professional Feel: Tip well and Response well, no Fine-tune fold', async ({
  page,
}) => {
  await open(page)
  await expect(page.getByTestId('v8-pen-finetune')).toHaveCount(0)
  const tip = page.getByTestId('v8-feel-tip')
  await expect(tip.getByTestId('v8-pen-sharpness')).toBeVisible()
  await expect(tip.getByTestId('v8-pen-flatness')).toBeVisible()
  await expect(tip.getByTestId('v8-pen-stabilisation')).toBeVisible()
  const resp = page.getByTestId('v8-feel-response')
  await expect(resp.getByTestId('v8-pen-pressure')).toBeVisible()
  for (const n of ['Tilt', 'Thickness by speed', 'Reduce latency'])
    await expect(resp.getByRole('switch', { name: n })).toBeVisible()
  await resp.getByRole('switch', { name: 'Tilt' }).click()
  await expect.poll(async () => (await stored(page)).tilt).toBe(false)
  // Nothing dropped: Draw as is still reachable.
  await page.getByTestId('v8-pen-drawas-line').click()
  expect((await stored(page)).drawAs).toBe('line')
})

test('TB-24 Beginner Feel is unchanged: Pressure, Stabilisation, folded Fine-tune', async ({
  page,
}) => {
  await open(page, 'beginner')
  await expect(page.getByTestId('v8-pen-pressure')).toBeVisible()
  await expect(page.getByTestId('v8-pen-stabilisation')).toBeVisible()
  await expect(page.getByTestId('v8-pen-finetune')).toHaveAttribute(
    'aria-expanded',
    'false',
  )
  await expect(page.getByTestId('v8-feel-tip')).toHaveCount(0)
})

test('TB-24 Aids: Finger is a segmented control; each gesture switch has an icon', async ({
  page,
}) => {
  await open(page)
  await tab(page, 'Aids')
  const seg = page.getByRole('radiogroup', { name: 'Finger can draw' })
  await expect(seg.getByRole('radio')).toHaveText([
    'Automatic',
    'Always',
    'Never',
  ])
  await page.getByTestId('v8-pen-finger-off').click()
  expect((await stored(page)).finger).toBe('off')
  await expect(page.getByTestId('v8-pen-finger-off')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  const rows = card(page).getByRole('switch')
  await expect(rows).toHaveCount(2)
  await expect(card(page).locator('.pcard-row-pic svg')).toHaveCount(2)
})

test('TB-24 Math: a small picture on each row', async ({ page }) => {
  await open(page)
  await tab(page, 'Math')
  const n = await card(page).getByRole('switch').count()
  expect(n).toBe(5)
  await expect(card(page).locator('.pcard-row-pic svg')).toHaveCount(n)
})

test('TB-24 Page: four paper pictures, one paper choice, Paper size and Layers', async ({
  page,
}) => {
  await open(page)
  await tab(page, 'Page')
  for (const p of ['blank', 'lined', 'grid', 'dots'])
    await expect(
      page.getByTestId(`v8-pen-paper-${p}`).locator('[data-paper-pic]'),
    ).toBeVisible()
  // No second paper choice inside the Layers part.
  await expect(card(page).locator('[data-card-chips="paper"]')).toHaveCount(0)
  await expect(card(page).locator('[data-layer-add]')).toBeVisible()
  const size = card(page).getByRole('radiogroup', { name: 'Paper size' })
  await expect(size.getByRole('radio')).toHaveText(['Fit page', 'A4', 'Letter'])
  await expect(page.getByTestId('v8-pen-sheet-A4')).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('TB-25 choosing A4 or Letter keeps the grid and paper style ticked', async ({
  page,
}) => {
  await open(page)
  await tab(page, 'Page')
  await page.getByTestId('v8-pen-paper-grid').click()
  await page.getByTestId('v8-pen-sheet-Letter').click()
  await expect(page.getByTestId('v8-pen-sheet-Letter')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByTestId('v8-pen-paper-grid')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByTestId('v8-pen-sheet-A4').click()
  await expect(page.getByTestId('v8-pen-sheet-A4')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByTestId('v8-pen-paper-grid')).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('TB-24 Page for a Beginner shows the paper pictures only', async ({
  page,
}) => {
  await open(page, 'beginner')
  await tab(page, 'Page')
  await expect(
    page.getByTestId('v8-pen-paper-dots').locator('[data-paper-pic]'),
  ).toBeVisible()
  await expect(page.getByTestId('v8-pen-sheet-A4')).toHaveCount(0)
})
