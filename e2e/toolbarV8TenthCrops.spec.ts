// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { line, stroke, type Pt } from './inkHelpers.ts'
import {
  createNotebook,
  solidPng,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * Gate 3 tenth visit (toolbar.v8 1d): sharp crops (2x) of each fixed spot,
 * Day and Night (run on purpose:
 * `SHOTS=1 npx playwright test e2e/toolbarV8TenthCrops.spec.ts`).
 */
const OUT = 'screenshots/gate3-1/1d/crops'
// test-guard-reason: pictures only on purpose, same as the other Gate3Shots files
test.skip(!process.env.SHOTS, 'pictures only on purpose (SHOTS=1)')
test.use({
  hasTouch: true,
  deviceScaleFactor: 2,
  viewport: { width: 1440, height: 900 },
})

const PRO = [
  'tb.pictureEdit',
  'tb.selectionMenu',
  'tb.lassoOptions',
  'tb.shapesAids',
]

async function setUp(page: Page, theme: 'day' | 'night', pro: boolean) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [pro ? 'professional' : 'beginner', pro ? PRO : []] as const,
  )
  await startInTheme(page, theme)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)
const settle = (page: Page) => page.waitForTimeout(500)

async function pickTool(page: Page, tool: string) {
  const direct = page.getByTestId(`v8-tool-${tool}`)
  if (await direct.isVisible()) return direct.click()
  await page.getByTestId('v8-more').click()
  await page.getByTestId(`v8-fold-${tool}`).click()
}

async function drawAndLoop(page: Page) {
  await pickTool(page, 'pen')
  await page.waitForTimeout(600)
  const box = (await page.locator('.bn-block-content').first().boundingBox())!
  const y = box.y + 150
  await stroke(page, line([box.x + 20, y], [box.x + 200, y]))
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
}

async function pickPicture(page: Page) {
  const png = await solidPng(400, 200)
  await page.locator('.bn-editor').click({ force: true })
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .getByTestId('picture-input-photos')
    .setInputFiles({ name: 'p.png', mimeType: 'image/png', buffer: png })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img')
  await expect(img).toBeVisible()
  await img.click({ force: true })
  await expect(page.getByTestId('v8-selbar')).toBeVisible()
  return img
}

for (const theme of ['day', 'night'] as const) {
  test(`crops ${theme}: Colour picker, Lasso Actions`, async ({ page }) => {
    await setUp(page, theme, true)
    await pickTool(page, 'shapes')
    await page.getByTestId('v8-chip-shapes.shape').click()
    const row = card(page, 'shapes.shape').locator('.pcard-row', {
      hasText: 'Colour picker',
    })
    await row.scrollIntoViewIfNeeded()
    await settle(page)
    await row
      .locator('xpath=..')
      .screenshot({ path: `${OUT}/1-colour-picker-${theme}.png` })
    await page.keyboard.press('Escape')
    await pickTool(page, 'lasso')
    await page.getByTestId('v8-chip-lasso.actions').click()
    await settle(page)
    await card(page, 'lasso.actions').screenshot({
      path: `${OUT}/4-lasso-actions-groups-${theme}.png`,
    })
  })

  test(`crops ${theme}: picture frame, Edit picture`, async ({ page }) => {
    await setUp(page, theme, true)
    const img = await pickPicture(page)
    await settle(page)
    const b = (await img.boundingBox())!
    await page.screenshot({
      path: `${OUT}/2-picture-handles-${theme}.png`,
      clip: {
        x: b.x - 40,
        y: b.y - 40,
        width: b.width + 80,
        height: b.height + 80,
      },
    })
    await page.getByTestId('v8-sel-picture').click()
    await settle(page)
    await card(page, 'sel.picture').screenshot({
      path: `${OUT}/4-edit-picture-groups-${theme}.png`,
    })
  })

  test(`crops ${theme}: Resize card opened by a tap`, async ({ page }) => {
    await setUp(page, theme, true)
    await drawAndLoop(page)
    await page.getByTestId('v8-sel-colour').click()
    await page.getByRole('button', { name: 'Close' }).click()
    await page.getByTestId('v8-sel-resize').click()
    await settle(page)
    await card(page, 'sel.resize').screenshot({
      path: `${OUT}/3-resize-no-ring-${theme}.png`,
    })
  })

  test(`crops ${theme}: Text size labels`, async ({ page }) => {
    await setUp(page, theme, false)
    await pickTool(page, 'lasso')
    await page.getByText('The nucleus holds the DNA').click({ force: true })
    await page.keyboard.press('End')
    await page.keyboard.press('Shift+Home')
    await page.getByTestId('v8-sel-resize').click()
    await settle(page)
    await card(page, 'sel.size').screenshot({
      path: `${OUT}/5-text-size-labels-${theme}.png`,
    })
  })
}
