// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8, slice 2A.6: the Pen row as in mock v9 (TB-21, TB-21a to TB-21c). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const WIDE = { width: 1700, height: 900 }
const FAVS = [
  { tool: 'pen', type: 'ball', colour: '#0b6e99', size: 1, exact: null },
  { tool: 'highlighter', type: null, colour: '#ffe58a', size: 2, exact: null },
  { tool: 'pen', type: 'brush', colour: '#c62828', size: 2, exact: null },
]

async function open(
  page: Page,
  o: {
    level?: 'beginner' | 'professional'
    favs?: unknown[]
    size?: { width: number; height: number }
  } = {},
) {
  await page.addInitScript(
    ([l, f]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: [] }),
      )
      if (f)
        localStorage.setItem(
          'learning-notes:toolbar.favourites',
          JSON.stringify(f),
        )
    },
    [o.level ?? 'beginner', o.favs ?? null] as const,
  )
  if (o.size) await page.setViewportSize(o.size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
}

const chip = (page: Page, id: string) => page.getByTestId(`v8-chip-pen.${id}`)
const fav = (page: Page, i: number) => page.getByTestId(`v8-fav-${i}`)
const stored = (page: Page, key: 'pen' | 'highlighter') =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(`learning-notes:ink.${k}`) ?? '{}'),
    key,
  )

test('TB-21 the Type chip shows a pen drawing and the name', async ({
  page,
}) => {
  await open(page)
  await expect(chip(page, 'type').locator('svg.v8penpic')).toHaveCount(1)
  await expect(chip(page, 'type')).toContainText('Fountain pen')
})

test('TB-21a the Size chip is one dot of 6, 9 or 13 px in the pen colour, no word', async ({
  page,
}) => {
  await open(page)
  const dot = chip(page, 'size').locator('.v8dot')
  await expect(chip(page, 'size')).not.toContainText('Medium')
  await expect(chip(page, 'size')).toHaveAttribute('aria-label', /Medium/)
  await expect(dot).toHaveCSS('width', '9px')
  await expect(dot).toHaveCSS('background-color', 'rgb(29, 29, 31)')
  for (const [i, px] of [
    ['thin', '6px'],
    ['thick', '13px'],
  ] as const) {
    await chip(page, 'size').click()
    await page.getByTestId(`v8-pen-size-${i === 'thin' ? 0 : 2}`).click()
    await expect(page.getByTestId('v8-card-pen.size')).toHaveCount(0)
    await expect(dot).toHaveCSS('width', px)
  }
  await chip(page, 'colour').click()
  await page.getByTestId('v8-pen-colour-red').click()
  await expect(dot).toHaveCSS('background-color', 'rgb(198, 40, 40)')
})

test('TB-21b the Colour chip is one 22 px dot with a ring, no word', async ({
  page,
}) => {
  await open(page)
  const dot = chip(page, 'colour').locator('.v8dot-colour')
  await expect(dot).toHaveCSS('width', '22px')
  await expect(dot).toHaveCSS('height', '22px')
  await expect(dot).not.toHaveCSS('box-shadow', 'none')
  await expect(chip(page, 'colour')).toHaveText('')
})

for (const level of ['beginner', 'professional'] as const)
  test(`TB-21c ${level}: favourites sit after Feel with a sample stroke and the type name`, async ({
    page,
  }) => {
    await open(page, { level, favs: FAVS, size: WIDE })
    await expect(page.locator('[data-testid^="v8-fav-"]')).toHaveCount(3)
    const feel = (await chip(page, 'feel').boundingBox())!
    const f0 = (await fav(page, 0).boundingBox())!
    const add = (await page.getByTestId('v8-add').boundingBox())!
    expect(f0.x).toBeGreaterThan(feel.x + feel.width)
    expect(add.x).toBeGreaterThan(f0.x + f0.width)
    await expect(fav(page, 0).locator('svg.v8favpic path')).toHaveCount(1)
    await expect(fav(page, 0)).toContainText('Ballpoint')
    await expect(fav(page, 1)).toContainText('Highlighter')
    await expect(fav(page, 2)).toContainText('Brush pen')
    expect((await fav(page, 0).boundingBox())!.height).toBeGreaterThanOrEqual(
      43.5,
    )
  })

test('TB-21c tapping a favourite sets type, size and colour, rings and glows the chip, and Undo puts it back', async ({
  page,
}) => {
  await open(page, { favs: FAVS, size: WIDE })
  await expect(fav(page, 2)).not.toHaveAttribute('aria-pressed', 'true')
  await fav(page, 2).click()
  const p = await stored(page, 'pen')
  expect(p.type).toBe('brush')
  expect(p.colour).toBe('#c62828')
  expect(p.size).toBe(2)
  await expect(fav(page, 2)).toHaveAttribute('aria-pressed', 'true')
  await expect(fav(page, 2).locator('.pcard-glow')).toHaveCount(1)
  await expect(fav(page, 0)).toHaveAttribute('aria-pressed', 'false')
  await expect(chip(page, 'type')).toContainText('Brush pen')
  // The toast says so and its Undo restores the earlier pen (TB-51).
  await expect(page.getByRole('status')).toContainText('Brush pen')
  await page.getByRole('status').getByRole('button', { name: 'Undo' }).click()
  await expect(chip(page, 'type')).toContainText('Fountain pen')
  expect((await stored(page, 'pen')).colour).not.toBe('#c62828')
  // A highlighter favourite switches the highlighter on.
  await fav(page, 1).click()
  await expect(chip(page, 'type')).toContainText('Highlighter')
  expect((await stored(page, 'highlighter')).colour).toBe('#ffe58a')
})

test('TB-21c at the first squeeze the options lose their names but the favourites keep theirs', async ({
  page,
}) => {
  await open(page, { favs: FAVS, size: { width: 1180, height: 820 } })
  await expect(chip(page, 'type')).not.toContainText('Fountain')
  await expect(fav(page, 0)).toContainText('Ballpoint')
  await expect(page.getByTestId('v8-favs-more')).toHaveCount(0)
})

test('TB-21c no favourites: the row is the four chips and plus, list', async ({
  page,
}) => {
  await open(page)
  await expect(page.locator('[data-testid^="v8-fav-"]')).toHaveCount(0)
})

test('TB-21c a narrow row folds the favourites into a star chip with a card of tiles; never scrolls sideways', async ({
  page,
}) => {
  await open(page, { favs: FAVS, size: { width: 390, height: 844 } })
  const star = page.getByTestId('v8-favs-more')
  await expect(star).toBeVisible()
  await expect(star).toContainText('3')
  await expect(page.locator('[data-testid^="v8-fav-"]')).toHaveCount(0)
  const hidden = await page
    .getByTestId('v8-row')
    .locator('.v8row-items')
    .evaluate((el) => el.scrollWidth - el.clientWidth)
  expect(hidden).toBeLessThanOrEqual(0)
  await star.click()
  await expect(page.getByTestId('v8-card-fold.favs')).toBeVisible()
  await expect(page.locator('[data-testid^="v8-favtile-"]')).toHaveCount(3)
  await page.getByTestId('v8-favtile-2').click()
  expect((await stored(page, 'pen')).type).toBe('brush')
  await expect(page.getByTestId('v8-card-fold.favs')).toHaveCount(0)
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )
  expect(overflow).toBeLessThanOrEqual(0)
})
