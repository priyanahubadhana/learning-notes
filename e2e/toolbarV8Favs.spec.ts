// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8, slice 2A.13: Add favourite (TB-52) and Organise (TB-53 to TB-57). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const OLD = [
  { tool: 'pen', type: 'ball', colour: '#0b6e99', size: 1, exact: null },
  { tool: 'pen', type: 'brush', colour: '#c62828', size: 2, exact: null },
  { tool: 'highlighter', type: null, colour: '#ffe58a', size: 2, exact: null },
]

async function open(
  page: Page,
  o: {
    favs?: unknown[]
    tool?: string
    size?: { width: number; height: number }
  } = {},
) {
  await page.addInitScript(
    ([f]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: 'beginner', unlocked: [] }),
      )
      if (f && !localStorage.getItem('learning-notes:toolbar.favourites'))
        localStorage.setItem(
          'learning-notes:toolbar.favourites',
          JSON.stringify(f),
        )
    },
    [o.favs ?? null] as const,
  )
  await page.setViewportSize(o.size ?? { width: 1700, height: 900 })
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId(`v8-tool-${o.tool ?? 'pen'}`).click()
}

const pref = (page: Page, key: string) =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(`learning-notes:${k}`) ?? 'null'),
    key,
  )
const toastUndo = (page: Page) =>
  page.getByRole('status').getByRole('button', { name: 'Undo' })
const rows = (page: Page) => page.getByTestId('arrange-row')

test('TB-52 the Add form saves a named favourite; it slides in, glows, and Undo removes it', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('v8-add').click()
  const form = page.getByTestId('v8-addsheet')
  await expect(form).toBeVisible()
  await page.getByTestId('v8-add-preset').click()
  await page.getByTestId('v8-add-preset-2').click() // Brush pen
  await expect(page.getByTestId('v8-add-preview')).toContainText('Brush pen')
  await page.getByTestId('v8-add-name').fill('Quick brush')
  await expect(page.getByTestId('v8-add-preview')).toContainText('Quick brush')
  await page.getByTestId('v8-add-save').click()
  await expect(form).toHaveCount(0)
  const chip = page.getByTestId('v8-fav-0')
  await expect(chip).toContainText('Quick brush')
  await expect(chip.locator('.pcard-glow')).toHaveCount(1)
  const saved = await pref(page, 'toolbar.favourites2')
  expect(saved).toHaveLength(1)
  expect(saved[0]).toMatchObject({
    tool: 'pen',
    type: 'brush',
    name: 'Quick brush',
  })
  // The old pen list is kept in step for older builds.
  expect(await pref(page, 'toolbar.favourites')).toHaveLength(1)
  await toastUndo(page).click()
  await expect(page.getByTestId('v8-fav-0')).toHaveCount(0)
})

test('TB-52 the name field has a clear button; Cancel and the close button leave nothing saved', async ({
  page,
}) => {
  await open(page)
  await page.getByTestId('v8-add').click()
  await page.getByTestId('v8-add-name').fill('Temp')
  await page.getByRole('button', { name: 'Clear name' }).click()
  await expect(page.getByTestId('v8-add-name')).toHaveValue('')
  await page.getByTestId('v8-add-cancel').click()
  await expect(page.getByTestId('v8-addsheet')).toHaveCount(0)
  await page.getByTestId('v8-add').click()
  await page.getByTestId('sheet-close').click()
  await expect(page.getByTestId('v8-addsheet')).toHaveCount(0)
  expect(await pref(page, 'toolbar.favourites2')).toEqual([])
})

test('TB-50 a favourite can be saved for another tool and shows on that tool row only', async ({
  page,
}) => {
  await open(page, { tool: 'eraser' })
  await page.getByTestId('v8-add').click()
  await expect(page.getByTestId('v8-add-tool-eraser')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByTestId('v8-add-preset').click()
  await page.getByTestId('v8-add-preset-2').click() // Whole stroke
  await page.getByTestId('v8-add-save').click()
  await expect(page.getByTestId('v8-fav-0')).toContainText('Whole stroke')
  await page.getByTestId('v8-tool-pen').click()
  await expect(page.getByTestId('v8-fav-0')).toHaveCount(0)
  await page.getByTestId('v8-tool-lasso').click()
  await expect(page.getByTestId('v8-add')).toBeVisible()
  // TB-51: a tap applies the whole setup, rings it, and Undo puts it back.
  await page.getByTestId('v8-tool-eraser').click()
  await page.getByTestId('v8-fav-0').click()
  await expect(page.getByTestId('v8-fav-0')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  expect((await pref(page, 'ink.eraser')).mode).toBe('stroke')
  await toastUndo(page).click()
  expect((await pref(page, 'ink.eraser')).mode).not.toBe('stroke')
})

test('migration: today pen favourites come over once and the old key is untouched', async ({
  page,
}) => {
  await open(page, { favs: OLD })
  await expect(page.locator('[data-testid^="v8-fav-"]')).toHaveCount(3)
  const next = await pref(page, 'toolbar.favourites2')
  expect(next).toHaveLength(3)
  expect(next[2]).toMatchObject({ tool: 'pen', hl: true })
  expect(await pref(page, 'toolbar.favourites')).toEqual(OLD)
})

test('TB-53 to TB-55 Organise: rows with handle, arrows and menu; move and remove each say so with Undo', async ({
  page,
}) => {
  await open(page, { favs: OLD })
  await page.getByTestId('v8-organise').click()
  await expect(page.getByTestId('arrange-sheet')).toBeVisible()
  await expect(rows(page)).toHaveCount(3)
  await expect(page.getByTestId('arrange-preview')).toBeVisible()
  await expect(rows(page).first()).toContainText('Ballpoint')
  // Move the first one down with its arrow.
  await rows(page).first().getByRole('button', { name: /down/i }).click()
  await expect(rows(page).first()).toContainText('Brush pen')
  await expect(page.getByTestId('v8-fav-0')).toContainText('Brush pen')
  await expect(page.getByText('Moved Ballpoint')).toBeVisible()
  await toastUndo(page).click()
  await expect(page.getByTestId('v8-fav-0')).toContainText('Ballpoint')
  // The "..." menu: Move to end.
  await rows(page).first().getByTestId('row-menu').click()
  await page.getByTestId('menu-end').click()
  await expect(rows(page).last()).toContainText('Ballpoint')
  // Remove, then Undo puts it back in the same place.
  await rows(page).nth(1).getByTestId('row-menu').click()
  await page.getByTestId('menu-remove').click()
  await expect(rows(page)).toHaveCount(2)
  await expect(page.getByTestId('arrange-undo')).toContainText('Removed')
  await page.getByTestId('arrange-undo-btn').click()
  await expect(rows(page)).toHaveCount(3)
  await expect(rows(page).nth(1)).toContainText('Highlighter')
  await page.getByTestId('arrange-done').click()
  await expect(page.getByTestId('arrange-sheet')).toHaveCount(0)
})

test('TB-54 dragging a row by its handle reorders the list and the row', async ({
  page,
}) => {
  await open(page, { favs: OLD })
  await page.getByTestId('v8-organise').click()
  const grip = rows(page).first().locator('.rord-grip')
  const from = (await grip.boundingBox())!
  const to = (await rows(page).nth(2).boundingBox())!
  const x = from.x + from.width / 2
  const y = from.y + from.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 6, { steps: 2 })
  // Mid-drag the preview reflows live (TB-54).
  await page.mouse.move(x, to.y + to.height - 4, { steps: 12 })
  await page.mouse.up()
  await expect(rows(page).last()).toContainText('Ballpoint')
  await expect(page.getByTestId('v8-fav-2')).toContainText('Ballpoint')
})

test('TB-56 Reset asks first; yes clears the row with Undo; no keeps it', async ({
  page,
}) => {
  await open(page, { favs: OLD })
  await page.getByTestId('v8-organise').click()
  await page.getByTestId('arrange-reset').click()
  await page.getByTestId('fb-dialog-cancel').click()
  await expect(rows(page)).toHaveCount(3)
  await page.getByTestId('arrange-reset').click()
  await page.getByTestId('fb-dialog-main').click()
  await expect(page.locator('[data-testid^="v8-fav-"]')).toHaveCount(0)
  await toastUndo(page).click()
  await expect(page.locator('[data-testid^="v8-fav-"]')).toHaveCount(3)
})

test('TB-53 Add favourite inside Organise returns to Organise', async ({
  page,
}) => {
  await open(page, { favs: OLD })
  await page.getByTestId('v8-organise').click()
  await page.getByTestId('arrange-add').click()
  await expect(page.getByTestId('v8-addsheet')).toBeVisible()
  await page.getByTestId('v8-add-save').click()
  await expect(page.getByTestId('arrange-sheet')).toBeVisible()
  await expect(rows(page)).toHaveCount(4)
})

test('TB-57 phone: Organise is full height and every item of the more-favourites list is tappable', async ({
  page,
}) => {
  const many = Array.from({ length: 6 }, (_, i) => ({
    tool: 'pen',
    type: 'ball',
    colour: `#0b6e${(90 + i).toString(16)}`,
    size: 1,
    exact: null,
  }))
  await open(page, { favs: many, size: { width: 390, height: 800 } })
  await page.getByTestId('v8-favs-more').click()
  const tile = page.getByTestId('v8-favtile-3')
  await expect(tile).toBeVisible()
  await tile.click()
  expect((await pref(page, 'ink.pen')).colour).toBe('#0b6e5d')
  await page.getByTestId('v8-organise').click()
  const sheet = page.getByTestId('arrange-sheet')
  await expect(sheet).toBeVisible()
  const box = (await sheet.boundingBox())!
  expect(box.height).toBeGreaterThan(800 * 0.85)
  await expect(rows(page)).toHaveCount(6)
})

test('real use: favourites survive a reload; turning the screen keeps the sheet inside the screen', async ({
  page,
}) => {
  await open(page, { favs: OLD, size: { width: 820, height: 1180 } })
  await page.getByTestId('v8-organise').click()
  await expect(page.getByTestId('arrange-sheet')).toBeVisible()
  await page.setViewportSize({ width: 1180, height: 820 })
  const box = (await page.getByTestId('arrange-sheet').boundingBox())!
  expect(box.x).toBeGreaterThanOrEqual(0)
  expect(box.y + box.height).toBeLessThanOrEqual(820 + 1)
  await page.getByTestId('arrange-done').click()
  await expect(page.getByTestId('arrange-sheet')).toHaveCount(0)
  await page.reload()
  await page.getByTestId('v8-tool-pen').click()
  await expect(page.locator('[data-testid^="v8-fav-"]')).toHaveCount(3)
})
