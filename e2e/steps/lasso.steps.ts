// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, type Page } from '@playwright/test'
import { Given, When, Then } from './world.ts'
import type { World } from './world.ts'
import { centre, loopAround, type Box } from './geometry.ts'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  savedInk,
  stroke,
  textBox,
  wave,
  type Pt,
} from '../inkHelpers.ts'
import { tool } from '../mainBarHelpers.ts'
import { realPenHover } from '../realPen.ts'

/**
 * Steps of e2e/features/lasso.feature. Each sentence of the feature has
 * exactly one step here. Input is as in lassoLoops.spec.ts (simulated pen
 * events), so the same scenarios run on chromium and on the iPad stand-in.
 * `@ipad` scenarios only stand in: the owner's check decides.
 */

const PICKS = {
  ink: { ink: true, text: false, pictures: false },
  text: { ink: false, text: true, pictures: false },
  all: { ink: true, text: true, pictures: true },
} as const

const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

const inkSelected = (page: Page) =>
  page.evaluate(() => Number(window.__lnTools!.toolState().ink.selection))

const handles = (page: Page): Promise<Box | null> =>
  page.evaluate(() => {
    const b = document.querySelector('[data-ink-box]')?.getBoundingClientRect()
    return b ? { x: b.x, y: b.y, width: b.width, height: b.height } : null
  })

/** Pixels of an open loop line: the ink loop (canvas) or the paper's own (svg). */
const loopLine = async (page: Page) =>
  (await painted(page, 'live')) +
  (await page.locator('[data-paper-lasso]').count())

/** The saved strokes' points, oldest first. */
async function points(page: Page): Promise<number[][]> {
  const s = (await savedInk(page)).strokes
  return [...s].sort((a, b) => a.at - b.at).map((x) => x.pts)
}

/** Opens a note with the Pen and draws `n` small drawings below the first line. */
async function pageWithDrawings(page: Page, w: World, n: number) {
  await inkNote(page, 'Pen', 'pencil', { 'ink.lasso': PICKS.ink })
  const l1 = await textBox(page)
  for (let i = 0; i < n; i++) {
    const y = l1.y + l1.height + 70 + i * 90
    await stroke(page, wave(l1.x + 20, l1.x + 200, y))
    w.drawings.push({ x: l1.x + 20, y: y - 16, width: 180, height: 32 })
  }
  await expectStrokes(page, n)
}

async function pickLasso(page: Page) {
  await tool(page, 'Lasso').click()
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'free' }))
  await page.waitForTimeout(600) // past the page's hold after a tool is chosen
}

/** A loop round drawing `i`; the lift is withheld when `open`. */
async function loopRound(
  page: Page,
  w: World,
  i: number,
  open = false,
  id = 7,
) {
  await stroke(page, loopAround(w.drawings[i]), { keepDown: open, id })
}

/** Opens a note whose second line holds `words`. */
async function typeWords(page: Page, w: World, words: string) {
  await inkNote(page, 'Pen', 'pencil', { 'ink.lasso': PICKS.ink })
  await tool(page, 'Text').click()
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type(words)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  await tool(page, 'Pen').click()
  w.words = words
}

/** The screen box of a phrase inside the page's text. */
const phraseBox = (page: Page, phrase: string): Promise<Box> =>
  page.evaluate((p) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const at = (n.textContent ?? '').indexOf(p)
      if (at < 0) continue
      const r = document.createRange()
      r.setStart(n, at)
      r.setEnd(n, at + p.length)
      const b = r.getBoundingClientRect()
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    }
    throw new Error('phrase not found: ' + p)
  }, phrase)

const typingCursor = (page: Page) =>
  page.evaluate(
    () => !!document.activeElement?.closest('[contenteditable="true"]'),
  )

// ---- Givens ---------------------------------------------------------------

Given('a page with a small drawing', async ({ page, world }) => {
  await pageWithDrawings(page, world, 1)
})

Given('the Lasso tool is picked', async ({ page }) => {
  await pickLasso(page)
})

Given(
  'a text box with the words {string}',
  async ({ page, world }, words: string) => {
    await typeWords(page, world, words)
  },
)

Given(
  /^the Lasso tool is picked with Picks set to (Ink only|Text)$/,
  async ({ page }, picks: string) => {
    await page.evaluate(
      (p) => window.__lnTools!.setLasso(p),
      picks === 'Text' ? PICKS.text : PICKS.ink,
    )
    await pickLasso(page)
  },
)

Given('a drawing is selected with the Lasso', async ({ page, world }) => {
  await pageWithDrawings(page, world, 2)
  await pickLasso(page)
  await loopRound(page, world, 0)
  await expect.poll(() => inkSelected(page)).toBeGreaterThan(0)
  world.before = await points(page)
  world.box = await handles(page)
})

Given(
  'I am drawing a loop round a drawing with the Lasso',
  async ({ page, world }) => {
    await pageWithDrawings(page, world, 1)
    await pickLasso(page)
    await loopRound(page, world, 0, true)
  },
)

Given('a loop whose lift was missed is still open', async ({ page, world }) => {
  await pageWithDrawings(page, world, 2)
  await pickLasso(page)
  await loopRound(page, world, 0, true)
})

Given(
  'I am drawing a loop that started in the page margin',
  async ({ page, world }) => {
    await typeWords(page, world, 'Service 23-11 2000 rate-is')
    await page.evaluate((p) => window.__lnTools!.setLasso(p), PICKS.all)
    await pickLasso(page)
    const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
    const words = await phraseBox(page, 'The nucleus')
    const start: Pt = [sheet.x + 6, words.y + words.height / 2]
    const ring = loopAround(words)
    await stroke(page, [...line(start, ring[0], 8), ...ring], {
      keepDown: true,
    })
  },
)

Given('my hand rests on the screen', async ({ page, world }) => {
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const at: Pt = [sheet.x + sheet.width - 40, world.drawings[1].y + 200]
  await stroke(page, [at], { type: 'touch', id: 3, keepDown: true })
})

// ---- Whens ----------------------------------------------------------------

When(
  'I draw a loop round the whole drawing with the Pencil',
  async ({ page, world }) => {
    await loopRound(page, world, 0)
  },
)

When(
  'I draw a loop over the words with the Pencil',
  async ({ page, world }) => {
    await stroke(page, loopAround(await phraseBox(page, world.words)))
    await page.waitForTimeout(400)
  },
)

When('I draw a loop round {string}', async ({ page }, phrase: string) => {
  await stroke(page, loopAround(await phraseBox(page, phrase), 5))
})

When('I draw a new loop round another drawing', async ({ page, world }) => {
  await loopRound(page, world, 1)
})

When(
  'I draw a new loop round another drawing with the Pencil',
  async ({ page, world }) => {
    await loopRound(page, world, 1)
  },
)

When('I drag it to a new place', async ({ page, world }) => {
  const from = centre(world.box!)
  await stroke(page, line(from, [from[0] + 140, from[1] + 20], 16))
})

When('I undo once', async ({ page }) => {
  await tool(page, 'Undo').click()
})

When(
  'I draw a stroke that starts outside its dashed box',
  async ({ page, world }) => {
    const b = world.box!
    const y = b.y + b.height + 60
    await stroke(page, line([b.x - 70, y], [b.x + b.width + 70, y + 40], 20))
  },
)

When('the iPad does not report that the Pencil lifted', async ({ page }) => {
  // The lift was withheld by the sentence before: the loop is still open,
  // so nothing is selected yet.
  expect(await inkSelected(page)).toBe(0)
  expect(await marked(page)).toBe('')
})

When('the Pencil moves away in the air', async ({ page }) => {
  const away = line([700, 120], [800, 160], 6).map(([x, y]) => ({ x, y }))
  await realPenHover(page, away)
  await page.waitForTimeout(300)
})

When(
  'I touch the page again and draw a loop round another drawing',
  async ({ page, world }) => {
    await loopRound(page, world, 1, false, 8)
  },
)

// ---- Thens ----------------------------------------------------------------

Then(
  'the drawing is selected, with its dashed box and handles',
  async ({ page }) => {
    await expect.poll(() => inkSelected(page)).toBeGreaterThan(0)
    await expect(page.locator('[data-ink-box]')).toBeVisible()
    await expect(
      page.locator('[data-ink-handles][data-handle="rotate"]'),
    ).toBeVisible()
  },
)

Then('the Lasso bar shows', async ({ page }) => {
  await expect(page.locator('[data-ink-menu]')).toBeVisible()
})

Then(
  'no word is selected, typed, deleted or moved',
  async ({ page, world }) => {
    expect(await marked(page)).toBe('')
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? ''),
    ).toBe('')
    await expect(page.locator('.bn-editor')).toContainText(world.words)
  },
)

Then("Apple's own bar does not show", async ({ page }) => {
  // Stand-in: no focused editor, so no system bar. The iPad decides.
  expect(await typingCursor(page)).toBe(false)
})

Then('exactly {string} is selected', async ({ page }, words: string) => {
  await expect.poll(() => marked(page)).toBe(words)
})

Then('only the other drawing is selected', async ({ page, world }) => {
  await expect.poll(() => inkSelected(page)).toBe(1)
  await expect
    .poll(async () => {
      const b = await handles(page)
      if (!b) return false
      const y = centre(b)[1]
      const other = world.drawings[1]
      return y > other.y - 30 && y < other.y + other.height + 30
    })
    .toBe(true)
})

Then('the first drawing has not moved or changed', async ({ page, world }) => {
  expect(await points(page)).toEqual(world.before)
})

Then('the drawing is back where it was', async ({ page, world }) => {
  await expect.poll(() => points(page)).toEqual(world.before)
})

Then(
  'the selected drawing has not moved, resized or changed',
  async ({ page, world }) => {
    await page.waitForTimeout(300)
    expect(await points(page)).toEqual(world.before)
    expect(await handles(page)).toEqual(world.box)
  },
)

Then('the drawing is selected, as after a normal lift', async ({ page }) => {
  await expect.poll(() => inkSelected(page)).toBeGreaterThan(0)
})

Then('no loop line is left on the screen', async ({ page }) => {
  await expect.poll(() => loopLine(page)).toBe(0)
})

Then('the new loop starts at once', async ({ page }) => {
  await expect
    .poll(() => inkSelected(page), { timeout: 500 })
    .toBeGreaterThan(0)
})

Then('what is inside the loop is selected', async ({ page }) => {
  await expect.poll(() => marked(page)).toContain('nucleus')
})

Then('the first drawing has not moved or turned', async ({ page, world }) => {
  expect(await points(page)).toEqual(world.before)
})

Then('no typing cursor was placed', async ({ page }) => {
  expect(await typingCursor(page)).toBe(false)
})
