// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { line, stroke, type Pt } from './inkHelpers.ts'
import {
  createNotebook,
  solidPng,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Toolbar v8, slice 1d, gate 3 tenth visit: the Colour picker is the shared
 * swatch, a picture has one set of handles and the accent frame, a card opened
 * by a tap shows no focus ring, group labels keep the card gap, and the Text
 * size labels sit on one line.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const PRO = [
  'tb.pictureEdit',
  'tb.selectionMenu',
  'tb.lassoOptions',
  'tb.shapesAids',
]

async function open(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, level === 'professional' ? PRO : []] as const,
  )
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)

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

const ringOf = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    return el ? getComputedStyle(el).outlineStyle : 'none'
  })

test('TB-31 Shapes › Colour picker is the shared round swatch with ▾, not a browser control', async ({
  page,
}) => {
  await open(page, 'professional')
  await pickTool(page, 'shapes')
  await page.getByTestId('v8-chip-shapes.shape').click()
  const row = card(page, 'shapes.shape').locator('.pcard-row', {
    hasText: 'Colour picker',
  })
  await expect(row).toBeVisible()
  await expect(row.locator('.pcard-swatch')).toBeVisible()
  await expect(row.locator('svg')).toHaveCount(1)
  // The native picker stays only as an invisible helper behind the row.
  await expect(row.locator('input[type="color"]')).toHaveCSS('opacity', '0')
})

test('TB-33 Resize card opened by the pointer shows no focus ring; the keyboard still gets one', async ({
  page,
}) => {
  await open(page, 'professional')
  await drawAndLoop(page)
  // As in the pictures: Colour first, closed with its ✕, then Resize.
  await page.getByTestId('v8-sel-colour').click()
  await page.getByRole('button', { name: 'Close' }).click()
  await expect(card(page, 'sel.colour')).toHaveCount(0)
  await page.getByTestId('v8-sel-resize').click()
  await expect(card(page, 'sel.resize')).toBeVisible()
  await expect.poll(() => ringOf(page)).toBe('none')
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  await expect.poll(() => ringOf(page)).not.toBe('none')
})

test('TB-34 a selected picture has one set of handles and the accent frame', async ({
  page,
}) => {
  await open(page, 'professional')
  const img = await pickPicture(page)
  await expect(page.locator('[data-picture-handle]')).toHaveCount(4)
  // BlockNote's own side pills are hidden: one set only.
  for (const h of await page.locator('.bn-resize-handle').all())
    await expect(h).toBeHidden()
  // The text box stays quiet: no box frame, no box handles.
  for (const h of await page
    .locator('[data-resize-handle], [data-main-frame]')
    .all())
    await expect(h).toBeHidden()
  // The accent frame of a drawing (1 px dashed), not the orange outline.
  await expect(img).toHaveCSS('outline-style', 'dashed')
  await expect(img).toHaveCSS('outline-width', '1px')
  const accent = await page.evaluate(() => {
    const probe = document.createElement('i')
    probe.style.color = 'var(--color-accent)'
    document.body.append(probe)
    const c = getComputedStyle(probe).color
    probe.remove()
    return c
  })
  await expect(img).toHaveCSS('outline-color', accent)
})

test('TB-34 group labels in Edit picture keep the card group gap', async ({
  page,
}) => {
  await open(page, 'professional')
  await pickPicture(page)
  await page.getByTestId('v8-sel-picture').click()
  await expect(card(page, 'sel.picture')).toBeVisible()
  const groups = card(page, 'sel.picture').locator('.pcard-group')
  await expect(groups.nth(1)).toBeVisible()
  const gaps = await groups.evaluateAll((els) =>
    els
      .slice(1)
      .map(
        (e, i) =>
          e.getBoundingClientRect().top -
          els[i]!.getBoundingClientRect().bottom,
      ),
  )
  expect(gaps.length).toBeGreaterThan(0)
  for (const g of gaps) expect(g).toBeGreaterThanOrEqual(12)
})

test('TB-33 Text size labels sit on one line', async ({ page }) => {
  await open(page, 'beginner')
  await pickTool(page, 'lasso')
  await page.getByText('The nucleus holds the DNA').click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
  await page.getByTestId('v8-sel-resize').click()
  await expect(card(page, 'sel.size')).toBeVisible()
  const labels = card(page, 'sel.size').locator('.pcard-tile-label')
  await expect(labels).toHaveCount(5)
  // Measure the card at rest: the selected tile pops in from scale 0.93
  // (pcard-pop, 280 ms), and a label read mid-pop sits a pixel off.
  await card(page, 'sel.size').evaluate((el) =>
    Promise.all(
      el
        .getAnimations({ subtree: true })
        .map((a) => a.finished.catch(() => {})),
    ),
  )
  const tops = await labels.evaluateAll((els) =>
    els.map((e) => Math.round(e.getBoundingClientRect().top)),
  )
  expect(tops).toHaveLength(5)
  expect(new Set(tops).size).toBe(1)
})

test('TB-32 group labels in Lasso › Actions keep the card group gap', async ({
  page,
}) => {
  await open(page, 'professional')
  await pickTool(page, 'lasso')
  await page.getByTestId('v8-chip-lasso.actions').click()
  await expect(card(page, 'lasso.actions')).toBeVisible()
  const groups = card(page, 'lasso.actions').locator('.pcard-group')
  await expect(groups.nth(1)).toBeVisible()
  const gaps = await groups.evaluateAll((els) =>
    els
      .slice(1)
      .map(
        (e, i) =>
          e.getBoundingClientRect().top -
          els[i]!.getBoundingClientRect().bottom,
      ),
  )
  expect(gaps.length).toBeGreaterThan(0)
  for (const g of gaps) expect(g).toBeGreaterThanOrEqual(12)
})
