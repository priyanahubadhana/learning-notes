// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { line, stroke, type Pt } from './inkHelpers.ts'
import {
  createNotebook,
  solidPng,
  startInMode,
  startInTheme,
  hideSidebar,
  typeInEditor,
} from './helpers.ts'

/**
 * Gate 3 pictures for toolbar.v8 slice 1d (run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV8ToolsGate3Shots.spec.ts`).
 * Day / Night / Sepia on phone, iPad both ways and PC.
 */
const OUT = 'screenshots/gate3-1/1d'
// test-guard-reason: pictures only on purpose, same as the other Gate3Shots files
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({ hasTouch: true })

const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-landscape': { width: 1180, height: 820 },
  'ipad-portrait': { width: 820, height: 1180 },
  pc: { width: 1440, height: 900 },
} as const

const PRO = [
  'tb.eraserOptions',
  'tb.shapesAids',
  'tb.lassoOptions',
  'tb.selectionMenu',
]

async function setUp(
  page: Page,
  theme: 'day' | 'night' | 'sepia',
  size: { width: number; height: number },
  level: 'beginner' | 'professional',
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, level === 'professional' ? PRO : []] as const,
  )
  await startInTheme(page, theme)
  await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  // The sidebar stays closed on iPad portrait (repeat-fault list).
  if (size.width === 820) await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const settle = (page: Page) => page.waitForTimeout(500)

/** The "Switched to Pencil mode" note goes before a picture is taken (it hid the drawing on phone). */
const calm = (page: Page) =>
  expect(page.getByText('Switched to Pencil mode')).toHaveCount(0, {
    timeout: 20_000,
  })

/** A tool in the bar, or in the more card when a narrow screen folds it. */
async function pickTool(page: Page, tool: string) {
  const direct = page.getByTestId(`v8-tool-${tool}`)
  if (!(await direct.isVisible())) {
    await page.getByTestId('v8-more').click()
    await page.getByTestId(`v8-fold-${tool}`).click()
    return
  }
  await direct.click()
}

async function shoot(page: Page, name: string, tool: string, cardId: string) {
  await pickTool(page, tool)
  await page.getByTestId(`v8-chip-${cardId}`).click()
  await expect(page.getByTestId(`v8-card-${cardId}`)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/${name}.png` })
  // Close by tap, as a finger would: Escape is a key press, so the chip
  // would rightly get the keyboard focus ring in the next shots.
  await page.getByRole('button', { name: 'Close' }).click()
}

for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night', 'sepia'] as const) {
    for (const level of ['beginner', 'professional'] as const) {
      // Professional only on iPad landscape and PC, to keep the set small.
      if (level === 'professional' && dev !== 'ipad-landscape' && dev !== 'pc')
        continue
      test(`${dev} ${theme} ${level}`, async ({ page }) => {
        // test-guard-reason: many pictures in one run need more time
        test.setTimeout(120_000)
        await setUp(page, theme, size, level)
        const tag = `${dev}-${theme}-${level}`
        await shoot(page, `eraser-${tag}`, 'eraser', 'eraser.mode')
        await shoot(page, `shapes-${tag}`, 'shapes', 'shapes.shape')
        await shoot(page, `lasso-${tag}`, 'lasso', 'lasso.actions')
        // A selection: the bar, then its More card.
        await page.getByText('The nucleus holds the DNA').click({ force: true })
        await page.keyboard.press('End')
        await page.keyboard.press('Shift+Home')
        await expect(page.getByTestId('v8-selbar')).toBeVisible()
        await settle(page)
        await page.screenshot({ path: `${OUT}/selbar-${tag}.png` })
        await page.getByTestId('v8-sel-more').click()
        await settle(page)
        await page.screenshot({ path: `${OUT}/selbar-more-${tag}.png` })
      })
    }
  }
}

/** A drawing under the text, looped by the Lasso: the bar shows. */
async function loopDrawing(page: Page) {
  await pickTool(page, 'pen')
  await page.waitForTimeout(600)
  const box = (await page.locator('.bn-block-content').first().boundingBox())!
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 200, y]))
  await calm(page)
  await pickTool(page, 'lasso')
  await page.waitForTimeout(500)
  const now = (await page.locator('.bn-block-content').first().boundingBox())!
  const at = y + (now.y - box.y)
  const c: Pt[] = [
    [box.x + 6, at + 18],
    [box.x + 6, at - 10],
    [box.x + 214, at - 10],
    [box.x + 214, at + 18],
    [box.x + 8, at + 16],
  ]
  await stroke(
    page,
    c.slice(1).flatMap((p, i) => line(c[i]!, p, 10)),
  )
  await expect(page.getByTestId('v8-selbar')).toBeVisible()
  // The lasso loop can raise the note again: wait it out so it never covers the ink.
  await calm(page)
  await settle(page)
}

/**
 * The pictures the eighth visit still needed: Eraser size with the ring,
 * Lasso shape tiles, the bar on a lassoed drawing with its Colour and Resize
 * cards, and Edit picture; Professional, on every size.
 */
for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night', 'sepia'] as const) {
    test(`more ${dev} ${theme} professional`, async ({ page }) => {
      // test-guard-reason: many pictures in one run need more time
      test.setTimeout(150_000)
      await page.addInitScript(() => {
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({
            level: 'professional',
            unlocked: [
              'tb.eraserOptions',
              'tb.lassoOptions',
              'tb.selectionMenu',
              'tb.pictureEdit',
            ],
          }),
        )
      })
      await startInTheme(page, theme)
      await page.setViewportSize(size)
      await startInMode(page, 'touch')
      await page.goto('/?flags=toolbar.v8')
      await createNotebook(page, 'Biology', 'First')
      // The sidebar stays closed on iPad portrait (repeat-fault list).
      if (dev === 'ipad-portrait') await hideSidebar(page)
      await typeInEditor(page, 'The nucleus holds the DNA')
      const tag = `${dev}-${theme}-professional`
      await shoot(page, `eraser-size-${tag}`, 'eraser', 'eraser.size')
      await shoot(page, `lasso-shape-${tag}`, 'lasso', 'lasso.shape')
      // A drawing, looped by the Lasso: the bar, then Colour and Resize.
      await loopDrawing(page)
      await page.screenshot({ path: `${OUT}/selbar-ink-${tag}.png` })
      await page.getByTestId('v8-sel-colour').click()
      await settle(page)
      await page.screenshot({ path: `${OUT}/selbar-colour-${tag}.png` })
      await page.getByRole('button', { name: 'Close' }).click()
      await page.getByTestId('v8-sel-resize').click()
      await settle(page)
      await page.screenshot({ path: `${OUT}/selbar-resize-${tag}.png` })
      await page.getByRole('button', { name: 'Close' }).click()
      // More on a drawing, then its Move card.
      await page.getByTestId('v8-sel-more').click()
      await settle(page)
      await page.screenshot({ path: `${OUT}/selbar-more-ink-${tag}.png` })
      await card(page, 'sel.more')
        .getByRole('button', { name: 'Move', exact: true })
        .click()
      await settle(page)
      await page.screenshot({ path: `${OUT}/selbar-move-${tag}.png` })
      await page.getByRole('button', { name: 'Close' }).click()
    })
    test(`picture ${dev} ${theme} professional`, async ({ page }) => {
      // test-guard-reason: many pictures in one run need more time
      test.setTimeout(150_000)
      await page.addInitScript(() => {
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({
            level: 'professional',
            unlocked: [
              'tb.eraserOptions',
              'tb.lassoOptions',
              'tb.selectionMenu',
              'tb.pictureEdit',
            ],
          }),
        )
      })
      await startInTheme(page, theme)
      await page.setViewportSize(size)
      await startInMode(page, 'touch')
      await page.goto('/?flags=toolbar.v8')
      await createNotebook(page, 'Biology', 'First')
      // The sidebar stays closed on iPad portrait (repeat-fault list).
      if (dev === 'ipad-portrait') await hideSidebar(page)
      await typeInEditor(page, 'The nucleus holds the DNA')
      const tag = `${dev}-${theme}-professional`
      // A picture: Edit picture.
      await page.locator('.bn-editor').click({ force: true })
      await page.keyboard.press('Enter')
      await page.keyboard.type('/image')
      await page.keyboard.press('Enter')
      await page.getByTestId('picture-input-photos').setInputFiles({
        name: 'p.png',
        mimeType: 'image/png',
        buffer: await solidPng(400, 200),
      })
      await page.getByRole('button', { name: 'Place picture' }).click()
      const img = page.locator('.bn-editor img')
      await expect(img).toBeVisible()
      await img.scrollIntoViewIfNeeded()
      await img.click({ force: true })
      await expect(page.getByTestId('v8-selbar')).toBeVisible()
      await expect(page.locator('[data-picture-actions]')).toHaveCount(0)
      await settle(page)
      await page.screenshot({ path: `${OUT}/picture-bar-${tag}.png` })
      await page.getByTestId('v8-sel-picture').click()
      await settle(page)
      await page.screenshot({ path: `${OUT}/picture-edit-${tag}.png` })
    })
  }
}

const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)

/** Beginner on the new screens: words, a drawing and a picture. */
for (const [dev, size] of Object.entries(SIZES)) {
  for (const theme of ['day', 'night', 'sepia'] as const) {
    test(`new screens ${dev} ${theme} beginner`, async ({ page }) => {
      // test-guard-reason: many pictures in one run need more time
      test.setTimeout(150_000)
      await setUp(page, theme, size, 'beginner')
      const tag = `${dev}-${theme}-beginner`
      // A drawing: the bar, then its Colour card.
      await loopDrawing(page)
      await page.screenshot({ path: `${OUT}/selbar-ink-${tag}.png` })
      await page.getByTestId('v8-sel-colour').click()
      await settle(page)
      await page.screenshot({ path: `${OUT}/selbar-colour-${tag}.png` })
      await page.getByRole('button', { name: 'Close' }).click()
      await page.getByTestId('v8-sel-resize').click()
      await settle(page)
      await page.screenshot({ path: `${OUT}/selbar-resize-${tag}.png` })
      await page.getByRole('button', { name: 'Close' }).click()
    })
    test(`text size ${dev} ${theme} beginner`, async ({ page }) => {
      // test-guard-reason: many pictures in one run need more time
      test.setTimeout(150_000)
      await setUp(page, theme, size, 'beginner')
      const tag = `${dev}-${theme}-beginner`
      // Words: Resize opens the Text size card.
      await pickTool(page, 'lasso')
      await page.getByText('The nucleus holds the DNA').click({ force: true })
      await page.keyboard.press('End')
      await page.keyboard.press('Shift+Home')
      await expect(page.getByTestId('v8-selbar')).toBeVisible()
      await page.getByTestId('v8-sel-resize').click()
      await expect(card(page, 'sel.size')).toBeVisible()
      await settle(page)
      await page.screenshot({ path: `${OUT}/selbar-textsize-${tag}.png` })
    })
    test(`picture ${dev} ${theme} beginner`, async ({ page }) => {
      // test-guard-reason: many pictures in one run need more time
      test.setTimeout(150_000)
      await setUp(page, theme, size, 'beginner')
      await page.locator('.bn-editor').click({ force: true })
      await page.keyboard.press('Enter')
      await page.keyboard.type('/image')
      await page.keyboard.press('Enter')
      await page.getByTestId('picture-input-photos').setInputFiles({
        name: 'p.png',
        mimeType: 'image/png',
        buffer: await solidPng(400, 200),
      })
      await page.getByRole('button', { name: 'Place picture' }).click()
      const img = page.locator('.bn-editor img')
      await expect(img).toBeVisible()
      await img.scrollIntoViewIfNeeded()
      await img.click({ force: true })
      await expect(page.getByTestId('v8-selbar')).toBeVisible()
      await expect(page.locator('[data-picture-actions]')).toHaveCount(0)
      await settle(page)
      await page.screenshot({
        path: `${OUT}/picture-bar-${dev}-${theme}-beginner.png`,
      })
    })
  }
}
