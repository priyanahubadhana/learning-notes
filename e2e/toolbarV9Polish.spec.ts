// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
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

/** The five preview switches of the 2A pictures. */
const FLAGS = 'foundation.shell,toolbar.v8,toolbar.menu,page.menus,textbox.v2'
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
    mode?: 'touch' | 'pencil'
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
  await startInMode(page, o.mode ?? 'touch')
  await page.goto(`/?flags=${FLAGS}`)
  await createNotebook(page, 'Biology', 'First')
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId(`v8-tool-${o.tool ?? 'pen'}`).click()
}

for (const width of [360, 390, 430]) {
  test(`fix 1 (v9): on a phone (${width} px) "⋯ 3 ▾" comes before "★ 2 ▾", counts are inline text`, async ({
    page,
  }) => {
    await open(page, { favs: FAVS, size: { width, height: 844 } })
    const star = page.getByTestId('v8-favs-more')
    const more = page.getByTestId('v8-row-more')
    await expect(star).toBeVisible()
    await expect(more).toBeVisible()
    const a = (await star.boundingBox())!
    const b = (await more.boundingBox())!
    expect(b.x + b.width).toBeLessThanOrEqual(a.x)
    for (const c of [star, more]) {
      await expect(c.locator('.v8badge')).toHaveCount(0)
      await expect(c.locator('.v8chip-count')).toHaveText(/^[0-9]+$/)
      await expect(c.locator('svg')).toHaveCount(2)
    }
  })
}

test('fix 2: the change glow lasts 700 ms as the spec says (TB-70), and a tap shows it at once', async ({
  page,
}) => {
  await open(page, { favs: FAVS, size: { width: 1700, height: 900 } })
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

/** The card's box once it has stopped changing (its content settles a moment after it opens). */
async function settledBox(card: Locator) {
  await card.page().evaluate(() => document.fonts.ready)
  let last = (await card.boundingBox())!
  for (let i = 0; i < 20; i++) {
    await card.page().waitForTimeout(400)
    const now = (await card.boundingBox())!
    if (
      now.x === last.x &&
      now.y === last.y &&
      now.width === last.width &&
      now.height === last.height
    )
      return now
    last = now
  }
  return last
}

const near = (a: number, b: number, tol = 2) => Math.abs(a - b) <= tol

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
  }) => {
    const PORTRAIT = { width: w1, height: h1 }
    await open(page, { size: { width: w0, height: h0 }, tool })
    await page.getByTestId(`v8-chip-${id}`).click()
    const card = page.getByTestId(`v8-card-${id}`)
    await expect(card).toBeVisible()
    await page.setViewportSize(PORTRAIT)
    await page.waitForTimeout(350)
    const early = (await card.boundingBox())!
    const turned = await settledBox(card)

    // The same chip, opened again after the turn: the open card is where it would go now.
    await page.keyboard.press('Escape')
    await expect(card).toHaveCount(0)
    await page.getByTestId(`v8-chip-${id}`).click()
    await expect(card).toBeVisible()
    const again = await settledBox(card)
    // 350 ms after the turn: the open motion may still move it a few px.
    expect(near(early.x, turned.x)).toBe(true)
    expect(near(early.y, turned.y, 10)).toBe(true)
    // Opened again after the turn: the same left edge.
    expect(near(turned.x, again.x)).toBe(true)

    // A fresh load at the new size (same notebook, same stored state).
    await page.keyboard.press('Escape')
    await page.reload()
    await page.getByTestId(`v8-tool-${tool}`).click()
    await page.getByTestId(`v8-chip-${id}`).click()
    await expect(card).toBeVisible()
    const f = await settledBox(card)
    // It equals a fresh load.
    expect(near(turned.x, f.x)).toBe(true)
    expect(near(turned.y, f.y)).toBe(true)
    expect(near(turned.width, f.width)).toBe(true)
    expect(near(turned.height, f.height)).toBe(true)
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

test('v9 phone: Insert and Shapes sit in ⋯ › On this bar, no count badge on the top ⋯, no Minimise', async ({
  page,
}) => {
  await open(page, { size: { width: 390, height: 844 } })
  await expect(page.getByTestId('v8-tool-insert')).toHaveCount(0)
  await expect(page.getByTestId('v8-tool-shapes')).toHaveCount(0)
  await expect(page.getByTestId('v8-minimise')).toHaveCount(0)
  await expect(page.getByTestId('v8-more').locator('.v8badge')).toHaveCount(0)
  await page.getByTestId('v8-more').click()
  const group = page
    .getByTestId('v8-card-fold.bar')
    .getByRole('group', { name: 'On this bar' })
  await expect(group.getByTestId('v8-fold-shapes')).toBeVisible()
  await expect(group.getByTestId('v8-fold-insert')).toBeVisible()
  await expect(group.getByTestId('v8-fold-min')).toHaveCount(0)
})

test('v9 More card: Mark for review, Hide tool bar, filled rows with icons', async ({
  page,
}) => {
  await open(page, { level: 'professional' })
  await page.getByTestId('v8-more').click()
  const card = page.getByTestId('v8-card-fold.bar')
  await expect(card.getByTestId('v8-more-hide')).toContainText(
    /^Hide tool bar$/,
  )
  const study = card.getByTestId('more-group-study')
  await expect(study).toContainText('Mark for review')
  await expect(study).toContainText('Marks and study')
  await expect(card).not.toContainText('Hide the tool bar')
  for (const id of ['study', 'copy', 'view', 'page', 'bar']) {
    const head = card.getByTestId(`more-group-${id}`).locator('.fgroup-head')
    await expect(head.locator('.fgroup-icon svg')).toHaveCount(1)
    const bg = await head.evaluate(
      (el) => getComputedStyle(el.parentElement!).backgroundColor,
    )
    expect(bg).not.toBe('rgba(0, 0, 0, 0)')
  }
})

for (const [w, h] of [
  [1180, 820],
  [820, 1180],
] as const) {
  test(`v9 More card (${w}x${h}): it opens below both rows, never over row 2`, async ({
    page,
  }) => {
    await open(page, {
      size: { width: w, height: h },
      level: 'professional',
    })
    await page.getByTestId('v8-more').click()
    const card = page.getByTestId('v8-card-fold.bar')
    await expect(card).toBeVisible()
    await page.waitForTimeout(400)
    const bar = (await page.getByTestId('toolbar-v8').boundingBox())!
    const c = (await card.boundingBox())!
    expect(c.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1)
    // With the longest group open the card is capped, not moved over row 2.
    await card.getByTestId('more-group-study').locator('.fgroup-head').click()
    await page.waitForTimeout(400)
    const c2 = (await card.boundingBox())!
    expect(c2.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1)
    expect(c2.y + c2.height).toBeLessThanOrEqual(h)
  })
}

test('v9 bar: Minimise is the ⇥| icon and a divider stands before Backspace', async ({
  page,
}) => {
  await open(page)
  await expect(
    page.getByTestId('v8-minimise').locator('svg.lucide-arrow-right-to-line'),
  ).toHaveCount(1)
  const before = await page
    .getByTestId('v8-backspace')
    .evaluate((el) => el.previousElementSibling?.className ?? '')
  expect(before).toContain('v8hair')
})

test('v9 row: a favourite chip has a tile fill', async ({ page }) => {
  await open(page, { favs: FAVS, size: { width: 1700, height: 900 } })
  const bg = await page
    .getByTestId('v8-fav-0')
    .evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).not.toBe('rgba(0, 0, 0, 0)')
})

for (const mode of ['touch', 'pencil'] as const)
  for (const level of ['beginner', 'professional'] as const)
    test(`v9 ${mode} mode, ${level}: the mouse over a tool never shows a name`, async ({
      page,
    }) => {
      // Even with the hover-tips switch forced on (Professional reads switches as on).
      await page.addInitScript(() =>
        localStorage.setItem('learning-notes:advanced.hoverTips', '"on"'),
      )
      await open(page, { level, mode })
      const box = (await page.getByTestId('v8-tool-eraser').boundingBox())!
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
      await page.waitForTimeout(800)
      await expect(page.getByTestId('v8-hover-tip')).toHaveCount(0)
      await expect(page.locator('[data-hover-name]')).toHaveCount(0)
    })

test('v9 phone, Professional: "Back to <tool>" sits in ⋯ › On this bar, not in the top row', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: [] }),
    )
  })
  await open(page, { level: 'professional', size: { width: 390, height: 844 } })
  // Use another tool, so a "back" tool exists.
  await page.getByTestId('v8-tool-text').click()
  await page.getByTestId('v8-tool-pen').click()
  await expect(page.getByTestId('v8-back')).toHaveCount(0)
  await page.getByTestId('v8-more').click()
  await expect(
    page
      .getByTestId('v8-card-fold.bar')
      .getByRole('group', { name: 'On this bar' })
      .getByTestId('v8-fold-back'),
  ).toBeVisible()
})

test('v9 Add sheet: "What it keeps" uses ticks (checkboxes), not switches', async ({
  page,
}) => {
  await open(page, { size: { width: 1700, height: 900 } })
  await page.getByTestId('v8-add').click()
  const sheet = page.getByTestId('v8-addsheet')
  await expect(sheet).toBeVisible()
  await expect(sheet.getByRole('switch')).toHaveCount(0)
  const ticks = sheet.getByRole('checkbox')
  await expect(ticks.first()).toBeVisible()
  expect(await ticks.count()).toBeGreaterThan(1)
  const first = ticks.first()
  const before = await first.getAttribute('aria-checked')
  await first.click()
  await expect(first).not.toHaveAttribute('aria-checked', before!)
  await expect(first.locator('.pcard-check')).toHaveCount(1)
})
