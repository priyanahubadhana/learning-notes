// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { stroke, textBox, line } from './inkHelpers.ts'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Task 2A.8: the eraser as in mock v9 (TB-30, TB-30a to TB-30d, T10).
 * The bar parts run on the v8 bar (`toolbar.v8`); the word-erasing parts run
 * on today's bar, which shares the same eraser settings and the same code.
 */
test.use({ viewport: { width: 1180, height: 1000 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function openV8(page: Page, level: Level, unlocked: string[] = []) {
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
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-eraser').click()
}

const chip = (page: Page, id: string) => page.getByTestId(`v8-chip-${id}`)
const card = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)
const stored = (page: Page) =>
  page.evaluate(() =>
    JSON.parse(localStorage.getItem('learning-notes:ink.eraser') ?? '{}'),
  )

test('TB-30 Professional: three menus on the row, Mode, Size and Options', async ({
  page,
}) => {
  await openV8(page, 'professional', ['tb.eraserOptions'])
  await expect(chip(page, 'eraser.mode')).toBeVisible()
  await expect(chip(page, 'eraser.size')).toBeVisible()
  await expect(chip(page, 'eraser.options')).toBeVisible()
  // Mode: three tiles and no switches (the old switch is gone).
  await chip(page, 'eraser.mode').click()
  await expect(card(page, 'eraser.mode').getByRole('radio')).toHaveCount(3)
  await expect(card(page, 'eraser.mode').getByRole('switch')).toHaveCount(0)
  await page.getByTestId('v8-eraser-mode-precise').click()
  // A quick picker closes after a pick.
  await expect(card(page, 'eraser.mode')).toHaveCount(0)
  expect((await stored(page)).mode).toBe('precise')
})

test('TB-30 Beginner: one Eraser menu holding the type and the size', async ({
  page,
}) => {
  await openV8(page, 'beginner')
  await expect(chip(page, 'eraser.mode')).toBeVisible()
  await expect(chip(page, 'eraser.size')).toHaveCount(0)
  await expect(chip(page, 'eraser.options')).toHaveCount(0)
  await chip(page, 'eraser.mode').click()
  const c = card(page, 'eraser.mode')
  // Two types and three sizes in the one card.
  await expect(c.getByRole('radio')).toHaveCount(5)
  await page.getByTestId('v8-eraser-size-2').click()
  expect((await stored(page)).size).toBe(2)
})

test('TB-30b Options: Erases is a segmented control; at least one stays on', async ({
  page,
}) => {
  await openV8(page, 'professional', ['tb.eraserOptions'])
  await chip(page, 'eraser.options').click()
  const erases = page.getByTestId('v8-eraser-erases')
  await expect(erases).toBeVisible()
  const hl = page.getByTestId('v8-eraser-erases-hl')
  const text = page.getByTestId('v8-eraser-erases-text')
  const pen = page.getByTestId('v8-eraser-erases-pen')
  // Default: Highlighter + Pen, as today.
  await expect(hl).toHaveAttribute('aria-checked', 'true')
  await expect(text).toHaveAttribute('aria-checked', 'false')
  await expect(pen).toHaveAttribute('aria-checked', 'true')
  await text.click()
  await expect(text).toHaveAttribute('aria-checked', 'true')
  expect((await stored(page)).eraseText).toBe(true)
  await pen.click()
  await hl.click()
  // Text is the last one: it cannot be turned off, and a toast says why.
  await text.click()
  await expect(text).toHaveAttribute('aria-checked', 'true')
  await expect(
    page.getByText('The eraser needs at least one thing to erase'),
  ).toBeVisible()
  // The Options card stays open after a pick, and has the "go back" switch.
  await expect(card(page, 'eraser.options')).toBeVisible()
  await card(page, 'eraser.options').getByRole('switch').click()
  expect((await stored(page)).returnAfter).toBe(true)
})

test('TB-30 the old "highlights only" switch and the Highlighter target are one thing', async ({
  page,
}) => {
  await openV8(page, 'professional', ['tb.eraserOptions'])
  await chip(page, 'eraser.options').click()
  await page.getByTestId('v8-eraser-erases-pen').click()
  const e = await stored(page)
  // Highlighter alone: what the old switch meant.
  expect([e.eraseHl, e.eraseText, e.erasePen]).toEqual([true, false, false])
})

/** Opens a note on today's bar with the eraser settings seeded, and picks the Eraser. */
async function eraseNote(page: Page, eraser: Record<string, unknown>) {
  await openNote(page, 'pencil', { 'ink.eraser': eraser })
  await hideSidebar(page).catch(() => {})
  await tool(page, 'Eraser').click({ force: true })
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')
    if (s) s.scrollTop = 0
  })
  await page.waitForTimeout(600)
}

const pageText = (page: Page) =>
  page.locator('.bn-block-content').first().innerText()

test('TB-30c Text on: rubbing over typed words removes them in one Undo step', async ({
  page,
}) => {
  await eraseNote(page, { eraseText: true, eraseHl: false, erasePen: false })
  const box = await textBox(page)
  const y = box.y + box.height / 2
  await stroke(page, line([box.x + 2, y], [box.x + 90, y], 30))
  await expect.poll(() => pageText(page)).not.toContain('The nucleus')
  expect(await pageText(page)).toContain('DNA')
  await tool(page, 'Undo').click()
  await expect.poll(() => pageText(page)).toBe('The nucleus holds the DNA')
})

test('TB-30c Text off: typed words are never touched', async ({ page }) => {
  await eraseNote(page, { eraseText: false })
  const box = await textBox(page)
  const y = box.y + box.height / 2
  await stroke(page, line([box.x + 2, y], [box.x + 200, y], 30))
  await page.waitForTimeout(300)
  expect(await pageText(page)).toBe('The nucleus holds the DNA')
})

test('TB-30c typed words are dimmed while the Pencil is still down', async ({
  page,
}) => {
  await eraseNote(page, { eraseText: true, eraseHl: false, erasePen: false })
  const box = await textBox(page)
  const y = box.y + box.height / 2
  await stroke(page, line([box.x + 2, y], [box.x + 90, y], 30), {
    keepDown: true,
  })
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          (
            CSS as unknown as { highlights?: Map<string, { size: number }> }
          ).highlights?.get('ink-erasing')?.size ?? 0,
      ),
    )
    .toBeGreaterThan(0)
  // Text is still there until the Pencil lifts.
  expect(await pageText(page)).toContain('The nucleus')
})

const LONG =
  ' ' + 'Claude by Anthropic reads and writes careful notes. '.repeat(14)

/** Highlights the first `lines` lines of the text (snapped to the words). */
async function highlightLines(page: Page, lines: number) {
  await tool(page, 'Highlighter').click({ force: true })
  await page.waitForTimeout(600)
  const box = await textBox(page)
  const lh = await page.evaluate(() => {
    const el = document.querySelector('.bn-block-content')!
    return parseFloat(getComputedStyle(el).lineHeight) || 26
  })
  for (let i = 0; i < lines; i++) {
    const y = box.y + lh * i + lh / 2
    await stroke(page, line([box.x + 2, y], [box.x + box.width - 2, y], 20))
  }
  return { box, lh }
}

test('T10 highlights only: smooth rubbing, letters measured once, no gaps', async ({
  page,
}) => {
  await openNote(page, 'pencil', { 'ink.eraser': { highlightsOnly: true } })
  await typeInEditor(page, LONG)
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')
    if (s) s.scrollTop = 0
  })
  const { box, lh } = await highlightLines(page, 4)
  const marks = page.locator('.bn-editor [data-style-type="backgroundColor"]')
  await expect.poll(() => marks.count()).toBeGreaterThan(0)
  const before = (await marks.allInnerTexts()).join('')
  await tool(page, 'Eraser').click({ force: true })
  await page.waitForTimeout(600)

  // One rub along the first line, 80 moves in one go; time each move and
  // count how often the page's letters are measured.
  const y = box.y + lh / 2
  const x0 = box.x + 2
  const x1 = box.x + box.width * 0.55
  const result = await page.evaluate(
    async ({ x0, x1, y }) => {
      const proto = Range.prototype as unknown as {
        getClientRects: () => DOMRectList
      }
      const orig = proto.getClientRects
      let measured = 0
      proto.getClientRects = function (this: Range) {
        measured++
        return orig.call(this)
      }
      const target = document.elementFromPoint(x0, y)!
      const make = (name: string, x: number) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: 7,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
          pressure: 0.5,
        })
      target.dispatchEvent(make('pointerdown', x0))
      const times: number[] = []
      const N = 80
      for (let i = 1; i <= N; i++) {
        const t = performance.now()
        target.dispatchEvent(make('pointermove', x0 + ((x1 - x0) * i) / N))
        times.push(performance.now() - t)
        if (i % 8 === 0) await new Promise((r) => requestAnimationFrame(r))
      }
      const afterMoves = measured
      target.dispatchEvent(make('pointerup', x1))
      await new Promise((r) => requestAnimationFrame(r))
      proto.getClientRects = orig
      times.sort((a, b) => a - b)
      return {
        p95: times[Math.floor(N * 0.95)]!,
        max: times[N - 1]!,
        measured: afterMoves,
        measuredTotal: measured,
      }
    },
    { x0, x1, y },
  )
  console.log('T10 numbers', JSON.stringify(result))
  // Smooth: a move is cheap (a frame is 16 ms); letters are measured once
  // for the stroke (about as many as the letters on the first four lines).
  expect(result.p95).toBeLessThan(8)
  expect(result.measuredTotal).toBeLessThan(600)

  // No gaps: nothing under the rubbed stretch of line one stays highlighted,
  // spaces included, and what is far from it stays highlighted.
  const left = await page.evaluate(
    ({ x0, x1, y, lh }) => {
      const spans = [
        ...document.querySelectorAll(
          '.bn-editor [data-style-type="backgroundColor"]',
        ),
      ]
      const range = document.createRange()
      let inside = 0
      let outside = 0
      for (const s of spans) {
        const walker = document.createTreeWalker(s, NodeFilter.SHOW_TEXT)
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const node = n as Text
          for (let i = 0; i < node.data.length; i++) {
            range.setStart(node, i)
            range.setEnd(node, i + 1)
            const r = range.getClientRects()[0]
            if (!r) continue
            const cx = r.left + r.width / 2
            const cy = r.top + r.height / 2
            if (Math.abs(cy - y) < lh / 2 && cx > x0 + 14 && cx < x1 - 14)
              inside++
            if (Math.abs(cy - y) < lh / 2 && cx > x1 + 40) outside++
          }
        }
      }
      return { inside, outside }
    },
    { x0, x1, y, lh },
  )
  expect(left.inside).toBe(0)
  expect(left.outside).toBeGreaterThan(5)
  // One Undo puts the whole rub back.
  await tool(page, 'Undo').click()
  await expect
    .poll(async () => (await marks.allInnerTexts()).join(''))
    .toBe(before)
})
