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
 * Toolbar v8, slice 1d, gate 3 ninth visit and gate 2 fix round 2: the
 * selection bar's cards (Resize, Colour, Edit picture), the picture strip
 * that must not lie under the bar, one row, the night colour of ink.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'
const PRO = ['tb.pictureEdit', 'tb.selectionMenu', 'tb.lassoOptions']

async function open(
  page: Page,
  level: Level = 'beginner',
  theme: 'day' | 'night' = 'day',
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
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)

/** A tool in the bar, or in the more card when a narrow screen folds it. */
async function pickTool(page: Page, tool: string) {
  const direct = page.getByTestId(`v8-tool-${tool}`)
  if (await direct.isVisible()) return direct.click()
  await page.getByTestId('v8-more').click()
  await page.getByTestId(`v8-fold-${tool}`).click()
}

async function lassoWords(page: Page) {
  await pickTool(page, 'lasso')
  await page.getByText('The nucleus holds the DNA').click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
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
  // The Text tool is the one the page opens with: a tap picks the picture.
  await img.click({ force: true })
  await expect(page.getByTestId('v8-selbar')).toBeVisible()
  return img
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

test('TB-33 Beginner Resize on words opens a Text size card and a pick changes the size', async ({
  page,
}) => {
  await open(page, 'beginner')
  await lassoWords(page)
  await page.getByTestId('v8-sel-resize').click()
  const c = card(page, 'sel.size')
  await expect(c).toBeVisible()
  await expect(c).toContainText('Text size')
  await expect(page.getByText('This works on drawings')).toHaveCount(0)
  await c.getByRole('radio', { name: '130%' }).click()
  await expect
    .poll(() =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--note-size'),
      ),
    )
    .toBe('1.3em')
})

test('TB-33 the Resize card on a drawing: a keyboard ring sits inside the row, so no card edge cuts it', async ({
  page,
}) => {
  await open(page, 'professional')
  await drawAndLoop(page)
  // Open and close another card first: the pointer, not the keyboard, led here.
  await page.getByTestId('v8-sel-colour').click()
  await page.getByRole('button', { name: 'Close' }).click()
  await page.getByTestId('v8-sel-resize').click()
  const first = card(page, 'sel.resize').locator('.v8sel-more button').first()
  await expect(first).toBeFocused()
  // Keyboard: the whole ring sits inside the row, so no card edge cuts it.
  await page.keyboard.press('Tab')
  await page.keyboard.press('Shift+Tab')
  const ring = await first.evaluate((el) => {
    const s = getComputedStyle(el)
    return { style: s.outlineStyle, offset: parseFloat(s.outlineOffset) }
  })
  expect(ring.style).not.toBe('none')
  expect(ring.offset).toBeLessThanOrEqual(0)
})

test('TB-33 the Resize rows have an icon and a word', async ({ page }) => {
  await open(page, 'professional')
  await drawAndLoop(page)
  await page.getByTestId('v8-sel-resize').click()
  const rows = card(page, 'sel.resize').locator('.v8sel-more button')
  await expect(rows).toHaveCount(4)
  for (const r of await rows.all())
    await expect(r.locator('svg')).toHaveCount(1)
})

test('TB-33 Colour card: names start with a capital and the selection colour has the ring', async ({
  page,
}) => {
  await open(page, 'professional')
  await drawAndLoop(page)
  await page.getByTestId('v8-sel-colour').click()
  const c = card(page, 'sel.colour')
  for (const name of ['Black', 'Blue', 'Red', 'Green', 'Orange', 'Purple'])
    await expect(c.getByRole('radio', { name })).toBeVisible()
  await expect(c.getByRole('radio', { name: 'Black' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(c.getByRole('radio', { name: 'Red' })).toHaveAttribute(
    'aria-checked',
    'false',
  )
})

test('TB-34 a selected picture hides the old picture strip; Border and Deselect are in the bar', async ({
  page,
}) => {
  await open(page, 'professional')
  const img = await pickPicture(page)
  await expect(page.locator('[data-picture-actions]')).toHaveCount(0)
  // Border cycles none, thin, thick from the bar's More.
  await page.getByTestId('v8-sel-more').click()
  const more = card(page, 'sel.more').locator('.v8sel-more')
  await expect(more.getByRole('button', { name: 'Deselect' })).toBeVisible()
  await more.getByRole('button', { name: 'Border' }).click()
  await expect
    .poll(() => img.evaluate((el) => getComputedStyle(el).borderTopWidth))
    .not.toBe('0px')
})

test('TB-34 Edit picture has the small group labels and icons', async ({
  page,
}) => {
  await open(page, 'professional')
  await pickPicture(page)
  await page.getByTestId('v8-sel-picture').click()
  const list = card(page, 'sel.picture')
  for (const g of ['Edit', 'Size'])
    await expect(list.getByText(g, { exact: true })).toBeVisible()
  for (const r of await list.locator('button').all())
    await expect(r.locator('svg')).toHaveCount(1)
})

for (const [name, size] of [
  ['phone', { width: 390, height: 844 }],
  ['ipad landscape', { width: 1180, height: 820 }],
] as const) {
  test(`TB-34 picture selected on ${name}: the bar is one row`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await open(page, 'professional')
    await pickPicture(page)
    const tops = await page
      .getByTestId('v8-selbar')
      .getByRole('button')
      .evaluateAll((els) =>
        els.map((e) => Math.round(e.getBoundingClientRect().top)),
      )
    expect(new Set(tops).size).toBe(1)
  })
}

test('TB-33 at night a drawn black line is drawn light, so it can be seen', async ({
  page,
}) => {
  await open(page, 'professional', 'night')
  await page.getByTestId('v8-tool-pen').click()
  await page.waitForTimeout(600)
  const box = (await page.locator('.bn-block-content').first().boundingBox())!
  await stroke(
    page,
    line([box.x + 20, box.y + 150], [box.x + 200, box.y + 150]),
  )
  await expect
    .poll(() =>
      page.evaluate(() => {
        let best = 0
        for (const c of document.querySelectorAll<HTMLCanvasElement>(
          '[data-ink-canvases] canvas',
        )) {
          const ctx = c.getContext('2d')
          if (!ctx) continue
          const d = ctx.getImageData(0, 0, c.width, c.height).data
          for (let i = 0; i < d.length; i += 4)
            if (d[i + 3]! > 200) best = Math.max(best, d[i]!)
        }
        return best
      }),
    )
    .toBeGreaterThan(200)
})

test('TB-33 a loop around a drawing leaves no faint line to the text (new bar)', async ({
  page,
}) => {
  await open(page, 'professional')
  await drawAndLoop(page)
  await expect(page.locator('[data-ink-link]')).toHaveCount(0)
})
