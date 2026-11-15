// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Tool bar v9, 2A.16 part 1: the carried polish (fix list 1 to 5).
 * Why each one: see docs/CHANGELOG.md, entry "2A.16 part 1".
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const FAVS = [
  { tool: 'pen', type: 'ball', colour: '#0b6e99', size: 1, exact: null },
  { tool: 'highlighter', type: null, colour: '#ffe58a', size: 2, exact: null },
  { tool: 'pen', type: 'brush', colour: '#c62828', size: 2, exact: null },
]

async function open(
  page: Page,
  o: {
    size?: { width: number; height: number }
    level?: 'beginner' | 'professional'
    favs?: unknown[]
    tool?: string
  } = {},
) {
  await page.addInitScript(
    ([l, f]) => {
      if (localStorage.getItem('polishSeeded')) return
      localStorage.setItem('polishSeeded', '1')
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({
          level: l,
          unlocked: l === 'professional' ? ['tb.textFonts'] : [],
        }),
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
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId(`v8-tool-${o.tool ?? 'pen'}`).click()
}

for (const width of [360, 390, 430]) {
  test(`fix 1: on a phone (${width} px) the star chip stands before the ⋯ chip`, async ({
    page,
  }) => {
    await open(page, { favs: FAVS, size: { width, height: 844 } })
    const star = page.getByTestId('v8-favs-more')
    const more = page.getByTestId('v8-row-more')
    await expect(star).toBeVisible()
    await expect(more).toBeVisible()
    const a = (await star.boundingBox())!
    const b = (await more.boundingBox())!
    expect(a.x + a.width).toBeLessThanOrEqual(b.x)
  })
}

test('fix 2: the change glow lasts 700 ms as the spec says (TB-70), and a tap shows it at once', async ({
  page,
}) => {
  await open(page, { favs: FAVS })
  await page.getByTestId('v8-fav-1').click()
  const glow = page.getByTestId('v8-fav-1').locator('.pcard-glow')
  await expect(glow).toHaveCount(1)
  const ms = await glow.evaluate(
    (el) => parseFloat(getComputedStyle(el).animationDuration) * 1000,
  )
  expect(ms).toBe(700)
})

test('fix 3: compact font tiles show every name whole, and the check never covers a name', async ({
  page,
}) => {
  await open(page, {
    level: 'professional',
    size: { width: 390, height: 844 },
    tool: 'text',
  })
  // The Text tool opens its Box card first; close it, then open Format.
  await expect(page.getByTestId('v8-card-text.box')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('v8-card-text.box')).toHaveCount(0)
  const chip = page.getByTestId('v8-chip-text.format')
  if (await chip.isVisible()) await chip.click()
  else {
    await page.getByTestId('v8-row-more').click()
    await page.getByTestId('v8-fold-format').click()
  }
  await expect(page.getByTestId('v8-card-text.format')).toBeVisible()
  const tiles = page.locator('[data-card-chips="font"] [role="radio"]')
  await expect(tiles.first()).toBeVisible()
  const bad = await tiles.evaluateAll((els) =>
    els.flatMap((el) => {
      const name = el.querySelector('span')!
      const r = name.getBoundingClientRect()
      const out: string[] = []
      if (name.scrollWidth > name.clientWidth + 1)
        out.push('cut: ' + name.textContent)
      if (getComputedStyle(name).textOverflow === 'ellipsis')
        out.push('ellipsis: ' + name.textContent)
      if (el.getAttribute('aria-checked') === 'true') {
        const t = el.getBoundingClientRect()
        // the check sits in the lower right corner, 15 px wide
        const c = { l: t.right - 20, t: t.bottom - 20 }
        if (r.right > c.l && r.bottom > c.t)
          out.push('check over name: ' + name.textContent)
      }
      return out
    }),
  )
  expect(bad).toEqual([])
})

const TURNS = [
  ['pen', 'pen.type', 1180, 820, 820, 1180],
  ['pen', 'pen.colour', 1180, 820, 820, 1180],
  ['text', 'text.format', 1180, 820, 820, 1180],
  ['pen', 'pen.type', 844, 390, 390, 844],
  ['pen', 'pen.type', 390, 844, 844, 390],
] as const
for (const [tool, id, w0, h0, w1, h1] of TURNS) {
  test(`fix 4 (${id} ${w0}x${h0} to ${w1}x${h1}): a card keeps its place beside its chip when the screen turns, equal to a fresh load`, async ({
    page,
    browser,
  }) => {
    const PORTRAIT = { width: w1, height: h1 }
    await open(page, { size: { width: w0, height: h0 }, tool })
    await page.getByTestId(`v8-chip-${id}`).click()
    const card = page.getByTestId(`v8-card-${id}`)
    await expect(card).toBeVisible()
    await page.setViewportSize(PORTRAIT)
    await page.waitForTimeout(150)
    const early = (await card.boundingBox())!
    await page.waitForTimeout(1050)
    await expect(card).toBeVisible()
    const turned = (await card.boundingBox())!

    // The same chip, opened again after the turn: the open card is where it would go now.
    await page.keyboard.press('Escape')
    await expect(card).toHaveCount(0)
    await page.getByTestId(`v8-chip-${id}`).click()
    await expect(card).toBeVisible()
    await page.waitForTimeout(500)
    const again = (await card.boundingBox())!
    // it was already there 150 ms after the turn, not only after a long wait
    expect(Math.abs(early.x - again.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(early.y - again.y)).toBeLessThanOrEqual(2)
    expect(Math.abs(turned.x - again.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(turned.y - again.y)).toBeLessThanOrEqual(2)

    const ctx = await browser.newContext({
      viewport: PORTRAIT,
      hasTouch: true,
      storageState: await page.context().storageState(),
    })
    const fresh = await ctx.newPage()
    await open(fresh, { size: PORTRAIT, tool })
    await fresh.getByTestId(`v8-chip-${id}`).click()
    const fc = fresh.getByTestId(`v8-card-${id}`)
    await expect(fc).toBeVisible()
    await fresh.waitForTimeout(800)
    const f = (await fc.boundingBox())!
    await ctx.close()
    // It stays under (or beside) its own chip, and equals a fresh load.
    expect(Math.abs(turned.x - f.x)).toBeLessThanOrEqual(2)
    expect(Math.abs(turned.y - f.y)).toBeLessThanOrEqual(2)
    expect(Math.abs(turned.width - f.width)).toBeLessThanOrEqual(2)
    expect(Math.abs(turned.height - f.height)).toBeLessThanOrEqual(2)
  })
}

test('fix 5: Escape on the keyboard leaves edit mode and keeps the bar as it was', async ({
  page,
}) => {
  await open(page)
  const ids = () =>
    page
      .getByTestId('v8-bar')
      .locator('[data-bar-tool]')
      .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.barTool))
  const before = await ids()
  const tool = page.getByTestId('v8-tool-pen')
  const box = (await tool.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1300)
  await page.mouse.up()
  await expect(page.getByTestId('v8-edit-bar')).toBeVisible()
  await page
    .getByTestId('v8-edit-remove-shapes')
    .click()
    .catch(() => {})
  await page.keyboard.press('Escape')
  await expect(page.getByTestId('v8-edit-bar')).toHaveCount(0)
  expect(await ids()).toEqual(before)
})
