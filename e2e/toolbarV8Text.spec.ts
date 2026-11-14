// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/** Toolbar v8, slice 1e: the Text row, the Format card and the Box card (TB-40 to TB-43). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function open(
  page: Page,
  level: Level = 'beginner',
  unlocked: string[] = [],
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, unlocked] as const,
  )
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const chip = (page: Page, id: string) => page.getByTestId(`v8-chip-${id}`)
const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)

test('TB-40 the Text row is settings, Box, Format, B, I and the top bar has no Done (TB-43)', async ({
  page,
}) => {
  await open(page)
  const row = page.getByTestId('v8-row')
  const order = await row
    .locator('[data-testid^="v8-chip-text."], [data-testid^="v8-chip-"]')
    .evaluateAll((els) => els.map((e) => e.getAttribute('data-testid')))
  expect(order.slice(0, 5)).toEqual([
    'v8-chip-text.boxset',
    'v8-chip-text.box',
    'v8-chip-text.format',
    'v8-chip-text.bold',
    'v8-chip-text.italic',
  ])
  await expect(
    page.locator('header').getByRole('button', { name: /^Done$/ }),
  ).toHaveCount(0)
})

test('TB-41 Format: Text, Style and Paragraph sections, each style in its own look, a ✕ closes', async ({
  page,
}) => {
  await open(page)
  await chip(page, 'text.format').click()
  const c = card(page, 'text.format')
  await expect(c.getByTestId('v8-format-heading1')).toBeVisible()
  const heads = await c.locator('.pcard-glabel').allTextContents()
  expect(heads).toEqual(['Text', 'Style', 'Paragraph'])
  const size = (id: string) =>
    c
      .getByTestId(`v8-format-${id}`)
      .locator('.v8look')
      .evaluate((e) => parseFloat(getComputedStyle(e).fontSize))
  expect(await size('heading1')).toBeGreaterThan(await size('heading3'))
  const weight = await c
    .getByTestId('v8-format-bold')
    .locator('.v8look')
    .evaluate((e) => getComputedStyle(e).fontWeight)
  expect(Number(weight)).toBeGreaterThanOrEqual(600)
  for (const b of await c.locator('.pcard-tile').all()) {
    const r = (await b.boundingBox())!
    expect(r.height).toBeGreaterThanOrEqual(44)
  }
  await c.getByTestId('v8-format-heading1').click()
  await expect(
    page.locator('.bn-editor h1, .bn-editor [data-level="1"]').first(),
  ).toBeVisible()
  await c.getByTestId('pcard-close').click()
  await expect(c).toHaveCount(0)
})

test('TB-41 Beginner has no Advanced section; the Professional switches add it and inline code', async ({
  page,
}) => {
  await open(page)
  await chip(page, 'text.format').click()
  await expect(
    card(page, 'text.format').getByTestId('v8-format-font'),
  ).toHaveCount(0)
  await expect(
    card(page, 'text.format').getByTestId('v8-format-code'),
  ).toHaveCount(0)
})

test('TB-41 Professional: fonts and inline code show with their own switches', async ({
  page,
}) => {
  await open(page, 'professional', ['tb.textFonts', 'tb.textMarks'])
  await chip(page, 'text.format').click()
  const c = card(page, 'text.format')
  await expect(c.locator('.pcard-glabel')).toHaveText([
    'Text',
    'Style',
    'Paragraph',
    'Advanced',
    'Line height',
  ])
  await expect(c.getByTestId('v8-format-code')).toBeVisible()
})

test('TB-41 each Professional switch works alone: tb.textFonts, tb.textMarks', async ({
  page,
}) => {
  await open(page, 'beginner', ['tb.textFonts'])
  await chip(page, 'text.format').click()
  const c = card(page, 'text.format')
  await expect(c.locator('.pcard-glabel')).toHaveText([
    'Text',
    'Style',
    'Paragraph',
    'Advanced',
    'Line height',
  ])
  await expect(c.getByTestId('v8-format-code')).toHaveCount(0)
  // Each font is drawn in its own face.
  const faces = await c
    .locator('[data-card-chips="font"] [data-chip]')
    .evaluateAll((els) =>
      els.map(
        (e) => getComputedStyle(e.querySelector('[aria-hidden]')!).fontFamily,
      ),
    )
  expect(faces.length).toBeGreaterThan(2)
  expect(new Set(faces).size).toBeGreaterThan(1)
  // Line height changes the page's spacing and shows as chosen.
  await c.getByTestId('v8-format-line-loose').click()
  await expect(c.getByTestId('v8-format-line-loose')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--note-line'),
    ),
  ).toBe('1.95')
  await c.getByTestId('v8-format-line-default').click()
})

test('TB-41 tb.textMarks alone adds inline code and no Advanced', async ({
  page,
}) => {
  await open(page, 'beginner', ['tb.textMarks'])
  await chip(page, 'text.format').click()
  const c = card(page, 'text.format')
  await expect(c.getByTestId('v8-format-code')).toBeVisible()
  await expect(c.locator('.pcard-glabel')).toHaveText([
    'Text',
    'Style',
    'Paragraph',
  ])
})

test('TB-41 headings, indent and divider are buttons, not checkboxes', async ({
  page,
}) => {
  await open(page)
  await chip(page, 'text.format').click()
  const c = card(page, 'text.format')
  for (const id of ['heading1', 'indent', 'divider'])
    expect(
      await c.getByTestId('v8-format-' + id).getAttribute('role'),
    ).toBeNull()
  await expect(c.getByTestId('v8-format-bold')).toHaveAttribute(
    'role',
    'checkbox',
  )
})

test('TB-42 tb.textBox alone adds fill, border, corners, padding and shadow; Beginner has none', async ({
  page,
}) => {
  await open(page)
  await page.locator('.bn-editor').first().click()
  await chip(page, 'text.box').click()
  await expect(
    card(page, 'text.box').getByTestId('v8-box-bg-yellow'),
  ).toHaveCount(0)
})

test('TB-42 with tb.textBox: fill, border, corners, padding and shadow each undo and redo', async ({
  page,
}) => {
  await open(page, 'beginner', ['tb.textBox'])
  await page.locator('.bn-editor').first().click()
  const c = card(page, 'text.box')
  const showCard = async () => {
    await page.waitForTimeout(300)
    if ((await c.count()) === 0) await chip(page, 'text.box').click()
    await expect(c).toBeVisible()
  }
  // A tap on the bar closes the open card first, so the card is shut, the
  // bar button pressed, and the card opened again to read the result.
  const through = async (button: 'v8-undo' | 'v8-redo') => {
    await c.getByTestId('pcard-close').click()
    await page.getByTestId(button).click()
    await page.locator('.bn-editor').first().click()
    await showCard()
  }
  const pick = async (id: string, off: string) => {
    await showCard()
    await c.getByTestId(id).click()
    await expect(c.getByTestId(id)).toHaveAttribute('aria-checked', 'true')
    await through('v8-undo')
    await expect(c.getByTestId(id)).toHaveAttribute('aria-checked', 'false')
    await expect(c.getByTestId(off)).toHaveAttribute('aria-checked', 'true')
    await through('v8-redo')
    await expect(c.getByTestId(id)).toHaveAttribute('aria-checked', 'true')
    await c.getByTestId('pcard-close').click()
  }
  await pick('v8-box-bg-yellow', 'v8-box-bg-none')
  await pick('v8-box-border-2', 'v8-box-border-0')
  await pick('v8-box-radius-12', 'v8-box-radius-0')
  await pick('v8-box-pad-12', 'v8-box-pad-0')
  const shadow = () => c.getByRole('switch', { name: 'Shadow' })
  await showCard()
  await shadow().click()
  await expect(shadow()).toBeChecked()
  await through('v8-undo')
  await expect(shadow()).not.toBeChecked()
  await through('v8-redo')
  await expect(shadow()).toBeChecked()
})

for (const vp of [
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
]) {
  test.describe(`${vp.width}x${vp.height}`, () => {
    test.use({ viewport: vp })
    test(`TB-42 the Box card never covers the selected box (${vp.width}x${vp.height})`, async ({
      page,
    }) => {
      await open(page)
      await page.locator('.bn-editor').first().click()
      const trigger = chip(page, 'text.box')
      if (!(await trigger.isVisible())) {
        await page.getByTestId('v8-row-more').click()
        await page.getByTestId('v8-fold-box').click()
      } else await trigger.click()
      const c = card(page, 'text.box')
      await expect(c).toBeVisible()
      await page.waitForTimeout(300)
      const cr = (await c.boundingBox())!
      const br = await page.evaluate(() => {
        const el = document.querySelector('[data-paper-box]')
        const r = el?.getBoundingClientRect()
        return r ? { x: r.x, y: r.y, width: r.width, height: r.height } : null
      })
      expect(br).not.toBeNull()
      const apart =
        cr.x >= br!.x + br!.width ||
        cr.x + cr.width <= br!.x ||
        cr.y >= br!.y + br!.height ||
        cr.y + cr.height <= br!.y
      expect(apart).toBe(true)
      expect(cr.x).toBeGreaterThanOrEqual(0)
      expect(cr.x + cr.width).toBeLessThanOrEqual(vp.width)
    })
  })
}

test('TB-42 a Box look is picked and shows as chosen', async ({ page }) => {
  await open(page)
  await page.locator('.bn-editor').first().click()
  await chip(page, 'text.box').click()
  const c = card(page, 'text.box')
  await c.getByTestId('v8-box-look-note').click()
  await expect(c.getByTestId('v8-box-look-note')).toHaveAttribute(
    'aria-checked',
    'true',
  )
})
