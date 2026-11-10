// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  savedInk,
  stroke,
  type Pt,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { machineState, section, toolsReady } from './toolsHelpers.ts'

/**
 * Owner bug batch (10 Nov), items 1, 2, 15, 17: the Lasso as the owner uses
 * it on the iPad. The Pencil is a "pen" pointer with a NEW pointer id for every
 * touch (iPadOS does that), loops mix free and rectangle, the selection bar is
 * pinned and the next loops must still work; the handles are dragged after.
 */
test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

type Box = { x: number; y: number; width: number; height: number }

/** The words (client px) of the first line that start with this text. */
const wordsBox = (page: Page, text: string): Promise<Box> =>
  page.evaluate((t) => {
    const w = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = w.nextNode(); n; n = w.nextNode()) {
      const i = (n.textContent ?? '').indexOf(t)
      if (i < 0) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + t.length)
      const b = r.getBoundingClientRect()
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    }
    throw new Error('no text ' + t)
  }, text)

/** The selected words, or ''. */
const selectedWords = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

/**
 * A loop (or rectangle drag) round a box. It starts at a corner that is not
 * under a floating bar (a hand would not start on the bar either).
 */
async function loop(
  page: Page,
  b: Box,
  rect: boolean,
  from?: Pt,
): Promise<Pt[]> {
  const m = 6
  const xr = b.x + b.width + m
  const xl = b.x - m
  const yt = b.y - m
  const yb = b.y + b.height + m
  const all: Pt[] = [
    [xr, yt],
    [xl, yt],
    [xl, yb],
    [xr, yb],
  ]
  const free = await page.evaluate((cs) => {
    return cs.map(
      ([x, y]) =>
        !document
          .elementFromPoint(x, y)
          ?.closest(
            '[data-chrome], [data-sel-handle], [data-mini-toolbar] button',
          ),
    )
  }, all)
  let k = free.findIndex(Boolean)
  if (k < 0) k = 0
  const cs = [...all.slice(k), ...all.slice(0, k)]
  if (rect) return line(cs[0], cs[2], 14)
  const ring = [
    ...cs,
    [cs[0][0] + (cs[1][0] - cs[0][0]) * 0.02, cs[0][1] + 2] as Pt,
  ]
  const path = ring.slice(1).flatMap((p, i) => line(ring[i], p, 10))
  return from ? [...line(from, cs[0], 8), ...path] : path
}

test('item 2: a loop that starts in the page margin selects the words it covers', async ({
  page,
}) => {
  await inkNote(page, 'Lasso', 'pencil', {
    'ink.lasso': { text: true, pictures: true, ink: true },
  })
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const words = await wordsBox(page, 'The nucleus')
  // Start well left of the text box (in the sheet's margin), enter the loop.
  const margin: Pt = [sheet.x + 6, words.y + words.height / 2]
  expect(margin[0]).toBeLessThan(words.x - 20)
  await page.evaluate(() => window.__lnTools?.setLasso({ shape: 'free' }))
  await toolsReady(page)
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'free' }))
  await stroke(page, await loop(page, words, false, margin))
  await expect.poll(() => selectedWords(page)).toContain('nucleus')
  // And a rectangle drag from the margin works too.
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'rect' }))
  await stroke(
    page,
    line(
      [sheet.x + 6, words.y - 8],
      [words.x + words.width + 8, words.y + words.height + 8],
      14,
    ),
  )
  await expect.poll(() => selectedWords(page)).toContain('nucleus')
  expect(await machineState(page)).toBe('idle')
})

const LINES = [
  'alpha beta gamma delta epsilon zeta eta theta iota kappa',
  'lambda mu nu xi omicron pi rho sigma tau upsilon phi chi',
  'monday tuesday wednesday thursday friday saturday sunday',
  'red orange yellow green blue indigo violet black white grey',
  'apple banana cherry grape lemon mango melon olive peach plum',
]

/** A note with five lines of words and one pen stroke below them. */
async function scene(page: Page) {
  await inkNote(page, 'Lasso', 'pencil', {
    'ink.lasso': { text: true, pictures: true, ink: true },
  })
  await tool(page, 'Text').click()
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  for (const l of LINES) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(800)
  await tool(page, 'Pen').click()
  await page.evaluate(() => {
    document.querySelector('[data-page-scroller]')!.scrollTop = 0
  })
  await page.waitForTimeout(300)
  const last = await wordsBox(page, 'apple banana')
  const ink = { x: last.x + 40, y: last.y + 80, width: 200, height: 40 }
  await stroke(page, line([ink.x, ink.y], [ink.x + 200, ink.y + 30], 30), {
    id: 3,
  })
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  return { ink }
}

/** Where the pen stroke of scene() is now (the page may have moved since). */
const inkNow = async (page: Page) => {
  const last = await wordsBox(page, 'apple banana')
  return { x: last.x + 40, y: last.y + 80, width: 200, height: 40 }
}

/** Browser state that must be clean while a Lasso selection shows. */
const stale = (page: Page) =>
  page.evaluate(() => {
    const sel = window.getSelection()
    const a = document.activeElement as HTMLElement | null
    return {
      // Only our own selection may show: no browser range and no focused editor.
      native: !!sel && !sel.isCollapsed ? sel.toString() : '',
      caret:
        !!a && a.isContentEditable && !!sel && sel.rangeCount > 0
          ? 'caret in ' + a.className
          : '',
      loops: document.querySelectorAll('[data-paper-lasso]').length,
    }
  })

let nextId = 20
const pen = (page: Page, pts: Pt[]) => stroke(page, pts, { id: nextId++ })

test('item 17: ten and more loops (free and rectangle) in a row, pin the bar, loop again, drag a handle', async ({
  page,
}) => {
  await scene(page)
  // Part of a line each time (more than about half a line is the whole line).
  const targets = [
    'beta',
    'omicron',
    'friday',
    'indigo',
    'cherry',
    'zeta',
    'sigma',
    'tuesday',
    'green',
    'mango',
    'gamma',
    'upsilon',
  ]
  const check = async (i: number, text: string) => {
    const squash = (w: string) => w.split(' ').join('')
    await expect
      .poll(() => selectedWords(page).then(squash), {
        message: 'loop ' + (i + 1) + ' ' + text,
      })
      .toBe(squash(text))
    const s = await stale(page)
    expect(s.native, `native selection after loop ${i + 1}`).toBe('')
    expect(s.caret, `caret after loop ${i + 1}`).toBe('')
    expect(s.loops, `leftover loop path after loop ${i + 1}`).toBe(0)
    expect(await machineState(page)).toBe('idle')
  }
  for (let i = 0; i < targets.length; i++) {
    const rect = i % 2 === 1
    await page.evaluate(
      (shape) => window.__lnTools!.setLasso({ shape }),
      rect ? 'rect' : 'free',
    )
    const b = await wordsBox(page, targets[i])
    await pen(page, await loop(page, b, rect))
    await check(i, targets[i])
    // Now and then a tap on blank paper, Esc, or nothing at all.
    if (i % 3 === 0) await page.keyboard.press('Escape')
  }
  // Pin the selection bar: drag it to the top, then press the pin.
  const mini = page.locator('[data-mini-toolbar]')
  await expect(mini).toBeVisible()
  const grip = (await mini.locator('[data-mini="grip"]').boundingBox())!
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2)
  await page.mouse.down()
  await page.mouse.move(grip.x + 60, 190, { steps: 6 })
  await page.mouse.up()
  await mini
    .getByRole('button', { name: 'Keep the selection tools here' })
    .click()
  await expect(mini).toHaveAttribute('data-pinned', 'true')
  const pinnedAt = (await mini.boundingBox())!
  // Loop again and again: the pinned bar shows for each selection, in place.
  for (let i = 0; i < 6; i++) {
    const rect = i % 2 === 0
    await page.evaluate(
      (shape) => window.__lnTools!.setLasso({ shape }),
      rect ? 'rect' : 'free',
    )
    const text = targets[(i * 5) % targets.length]
    if (i % 2) await page.keyboard.press('Escape')
    const b = await wordsBox(page, text)
    await pen(page, await loop(page, b, rect))
    await check(100 + i, text)
    await expect(mini, `pinned bar after loop ${i + 1}`).toBeVisible()
    await expect(mini).toHaveAttribute('data-pinned', 'true')
    const now = (await mini.boundingBox())!
    expect(Math.abs(now.y - pinnedAt.y)).toBeLessThan(2)
    expect(Math.abs(now.x - pinnedAt.x)).toBeLessThan(2)
  }
  // The ink: a loop selects it, and a corner handle drag resizes it.
  await page.keyboard.press('Escape')
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'free' }))
  await pen(page, await loop(page, await inkNow(page), false))
  const box = page.locator('[data-ink-box]')
  await expect(box).toBeVisible()
  const [orig] = await expectStrokes(page, 1)
  const b0 = (await box.boundingBox())!
  const corner = (await page
    .locator('[data-handle="scale"]')
    .nth(3)
    .boundingBox())!
  await pen(
    page,
    line(
      [corner.x + corner.width / 2, corner.y + corner.height / 2],
      [b0.x + b0.width + 120, b0.y + b0.height + 80],
      12,
    ),
  )
  await expect
    .poll(async () => (await savedInk(page)).strokes[0].id)
    .not.toBe(orig.id)
  const span = (pts: number[]) => {
    const ys = pts.filter((_, k) => k % 6 === 0)
    return Math.max(...ys) - Math.min(...ys)
  }
  expect(span((await savedInk(page)).strokes[0].pts)).toBeGreaterThan(
    span(orig.pts) * 1.2,
  )
  // And the machine is clean at the end.
  expect(await machineState(page)).toBe('idle')
  expect((await section(page, 'ink')).gesture).toBe('none')
})

test('item 15: an earlier word selection, its handles and caret are gone when a new loop selects ink', async ({
  page,
}) => {
  await scene(page)
  // Select a word with the Text tool (our handles and bar show).
  await tool(page, 'Text').click()
  // Past the page's 450 ms hold after a tool is chosen: a tap point measured
  // while the page is still being put back goes stale (see lassoPencil.spec).
  await page.waitForTimeout(600)
  const w = await wordsBox(page, 'monday')
  const at: Pt = [w.x + w.width / 2, w.y + w.height / 2]
  await pen(page, [at])
  await page.waitForTimeout(60)
  await pen(page, [[at[0] + 2, at[1] + 1]])
  await expect(page.locator('[data-sel-handle]')).toHaveCount(2)
  await tool(page, 'Lasso').click()
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'free' }))
  await pen(page, await loop(page, await inkNow(page), false))
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  await expect(page.locator('[data-sel-handle]')).toHaveCount(0)
  await expect(page.locator('[data-mini-toolbar]')).toHaveCount(0)
  await expect(page.locator('.bn-editor .ln-sel')).toHaveCount(0)
  const s = await stale(page)
  expect(s.native).toBe('')
  expect(s.caret).toBe('')
  // The same on the next selection of words, with ink selected before.
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'rect' }))
  const b = await wordsBox(page, 'cherry')
  await pen(page, await loop(page, b, true))
  await expect.poll(() => selectedWords(page)).toBe('cherry')
  await expect(page.locator('[data-ink-box]')).toHaveCount(0)
  await expect(page.locator('[data-sel-handle]')).toHaveCount(2)
})

test('item 42: selected words show a soft tint with no outline; a handle drag shows the loupe', async ({
  page,
}) => {
  await scene(page)
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'free' }))
  await pen(page, await loop(page, await wordsBox(page, 'cherry'), false))
  await expect.poll(() => selectedWords(page)).toBe('cherry')
  const look = await page.evaluate(() => {
    const c = getComputedStyle(document.querySelector('.bn-editor .ln-sel')!)
    return { bg: c.backgroundColor, outline: c.outlineStyle }
  })
  expect(look.outline).toBe('none')
  expect(look.bg).not.toBe('rgba(0, 0, 0, 0)')
  const h = (await page.locator('[data-sel-handle="end"]').boundingBox())!
  expect(h.width).toBeLessThanOrEqual(16)
  await page.evaluate(
    ([x, y]) => {
      const el = document.querySelector('[data-sel-handle="end"]')!
      const mk = (n: string, dx: number) =>
        new PointerEvent(n, {
          pointerId: 5,
          pointerType: 'pen',
          clientX: x + dx,
          clientY: y,
          bubbles: true,
          buttons: 1,
        })
      el.dispatchEvent(mk('pointerdown', 0))
      el.dispatchEvent(mk('pointermove', 30))
    },
    [h.x + h.width / 2, h.y + h.height / 2],
  )
  await expect(page.locator('[data-sel-loupe]')).toBeVisible()
})

test.afterEach(async ({ page }, info) => {
  if (info.status === info.expectedStatus) return
  // On a failure: the tool state, to read in the report.
  const dump = await page
    .evaluate(() => {
      const t = window.__lnTools!.toolState()
      return {
        ink: t.ink,
        machine: t.machine,
        grip: t.gripDrag,
        lock: t.editLock,
        own: t.ownSelection,
        gripAttr: document.documentElement.hasAttribute('data-grip-drag'),
      }
    })
    .catch(() => null)
  console.log('STATE ' + JSON.stringify(dump))
  if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT })
})
