// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { line, stroke } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Phase 2B, task 2B.4 (switch textbox.v2 ON): TB-04 the first tap only selects
 * the box and the count starts with the next tap (caret, word, line,
 * paragraph); TB-42 an empty page shows one hint only.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
type Kind = 'pen' | 'touch'

async function start(page: Page, name: string) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
}

async function oneBox(page: Page, lines: string[]) {
  await typeInEditor(page, 'Main text')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 60)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  for (const [n, l] of lines.entries()) {
    if (n > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(1000)
  await expect(box).not.toHaveAttribute('data-picked', '')
  return box
}

/** One pointer event of a tap, `dx` px away from the press point. */
function send(
  page: Page,
  type: 'pointerdown' | 'pointerup',
  x: number,
  y: number,
  kind: Kind,
  dx = 0,
) {
  return page.evaluate(
    ({ type, x, y, kind, dx }) => {
      const el = document.elementFromPoint(x, y)!
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerType: kind,
          pointerId: kind === 'pen' ? 41 : 42,
          isPrimary: true,
          clientX: x + dx,
          clientY: y,
          button: 0,
          buttons: type === 'pointerdown' ? 1 : 0,
          bubbles: true,
          cancelable: true,
          composed: true,
        }),
      )
    },
    { type, x, y, kind, dx },
  )
}

/** Taps in a row, about `gap` ms from lift to the next press. */
async function taps(
  page: Page,
  n: number,
  at: { x: number; y: number },
  kind: Kind,
  gap = 120,
  wiggle = 0,
) {
  for (let i = 0; i < n; i++) {
    if (i > 0) await page.waitForTimeout(gap)
    await send(page, 'pointerdown', at.x, at.y, kind)
    await send(page, 'pointerup', at.x, at.y, kind, i % 2 ? wiggle : 0)
  }
}

/** Two Pencil taps whose lift and next press are exactly `gap` ms apart (timed inside the page). */
const exactPair = (page: Page, at: { x: number; y: number }, gap: number) =>
  page.evaluate(
    async ({ x, y, gap }) => {
      const fire = (type: string) =>
        document.elementFromPoint(x, y)!.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'pen',
            pointerId: 41,
            isPrimary: true,
            clientX: x,
            clientY: y,
            button: 0,
            buttons: type === 'pointerdown' ? 1 : 0,
            bubbles: true,
            cancelable: true,
            composed: true,
          }),
        )
      const wait = (ms: number) =>
        new Promise<void>((done) => {
          const t0 = performance.now()
          const tick = () =>
            performance.now() - t0 >= ms ? done() : requestAnimationFrame(tick)
          tick()
        })
      fire('pointerdown')
      await wait(30)
      fire('pointerup')
      await wait(gap)
      fire('pointerdown')
      await wait(30)
      fire('pointerup')
    },
    { ...at, gap },
  )

const selected = (page: Page) =>
  page.evaluate(() => window.getSelection()?.toString() ?? '')

/** The screen point inside text node `para`, at character `i`. */
const charPoint = (page: Page, i: number, para = 0) =>
  page.evaluate(
    ({ i, para }) => {
      const ed = document.querySelector(
        '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
      )!
      const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
      const lines: Node[] = []
      for (let m = w.nextNode(); m; m = w.nextNode())
        if ((m.textContent ?? '').trim().length > 1) lines.push(m)
      const n = lines[para]
      const a = document.createRange()
      a.setStart(n, i)
      a.setEnd(n, Math.min(i + 1, (n.textContent ?? '').length))
      const b = a.getBoundingClientRect()
      return { x: b.x + 2, y: b.y + b.height / 2 }
    },
    { i, para },
  )

const L1 = 'Alpha beta gamma'
const L2 = 'Second line here'
// Tall enough that the middle line is clear of the 44 pt dots (2B.5).
const LINES = ['First filler', 'Second filler', L1, L2, 'Last filler']

for (const kind of ['pen', 'touch'] as const) {
  test(`TB-04 ${kind}: a double-tap on an unselected box only selects the box; no word`, async ({
    page,
  }) => {
    await start(page, 'TB04a' + kind)
    const box = await oneBox(page, LINES)
    const at = await charPoint(page, 13, 2)
    await taps(page, 2, at, kind, 120)
    await expect(box).toHaveAttribute('data-picked', '')
    expect(await selected(page)).not.toMatch(/gamma/)
  })

  test(`TB-04 ${kind}: in a selected box 2 taps = word, 3 = line, 4 = paragraph (6 px wiggle, 120 ms apart)`, async ({
    page,
  }) => {
    await start(page, 'TB04b' + kind)
    const box = await oneBox(page, LINES)
    const at = await charPoint(page, 13, 2) // inside "beta"
    // The first tap selects the box; wait so the next run starts fresh.
    await taps(page, 1, at, kind)
    await expect(box).toHaveAttribute('data-picked', '')
    await page.waitForTimeout(900)
    await taps(page, 2, at, kind, 120, 6)
    await expect.poll(() => selected(page)).toBe('gamma')
    await page.waitForTimeout(900)
    await taps(page, 3, at, kind, 120, 6)
    await expect.poll(() => selected(page)).toBe(L1)
    await page.waitForTimeout(900)
    await taps(page, 4, at, kind, 120, 6)
    // Box lines are soft breaks of one paragraph: four taps take all of them.
    await expect
      .poll(async () => (await selected(page)).split(/\s+/).join(' ').trim())
      .toBe(LINES.join(' '))
    await expect(box).toHaveAttribute('data-picked', '')
    // Nothing deleted or replaced after the selection.
    await page.waitForTimeout(500)
    expect(await box.locator('.bn-editor').innerText()).toContain(L2)
  })
}

test('TB-04: taps 80 to 350 ms apart (Pencil) all make a word', async ({
  page,
}) => {
  await start(page, 'TB04c')
  const box = await oneBox(page, LINES)
  const at = await charPoint(page, 13, 2)
  await taps(page, 1, at, 'pen')
  await expect(box).toHaveAttribute('data-picked', '')
  for (const gap of [80, 150, 250, 350]) {
    await page.waitForTimeout(900)
    await page.evaluate(() => window.getSelection()?.removeAllRanges())
    await exactPair(page, at, gap)
    await expect.poll(() => selected(page), 'gap ' + gap).toBe('gamma')
  }
})

test('TB-04: a tap a second after the run puts a caret again (Scribble can write)', async ({
  page,
}) => {
  await start(page, 'TB04d')
  const box = await oneBox(page, LINES)
  const at = await charPoint(page, 13, 2)
  await taps(page, 1, at, 'pen')
  await page.waitForTimeout(900)
  await taps(page, 2, at, 'pen')
  await expect.poll(() => selected(page)).toBe('gamma')
  await page.waitForTimeout(1000)
  const other = await charPoint(page, 3, 3)
  await taps(page, 1, other, 'pen')
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = window.getSelection()!
        return s.isCollapsed && !!s.anchorNode
      }),
    )
    .toBe(true)
  await expect(box.locator('.bn-editor')).toBeFocused()
})

test('TB-42: an empty page shows one hint; "Tap here to keep writing" waits for text; typing removes the hint', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'TB42')
  const hint = page.locator('[data-paper-hint]')
  const below = page.locator('.ln-tap-below')
  await expect(hint).toBeVisible()
  await expect(hint).toHaveText('Type, or tap anywhere to start writing')
  await expect(below).toHaveCount(0)
  await typeInEditor(page, 'Hello')
  await expect(hint).toHaveCount(0)
  await expect(below).toBeVisible()
})

test('TB-42 phone: the line below is the one hint on an empty page, then it says "keep writing"', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'touch')
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await createNotebook(page, 'Paper', 'TB42p')
  const one = page.locator('[data-paper-hint], .ln-tap-below')
  await expect(one).toHaveCount(1)
  await expect(one).toHaveText('Type, or tap anywhere to start writing')
  await typeInEditor(page, 'Hello')
  await expect(one).toHaveText('Tap here to keep writing')
})

test('TB-42: drawing on an empty page removes the hint at once', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'TB42ink')
  const hint = page.locator('[data-paper-hint]')
  await expect(hint).toBeVisible()
  await tool(page, 'Pen').click()
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const y = main.y + 60
  await stroke(page, line([main.x + 40, y], [main.x + 220, y + 10]))
  await expect(hint).toHaveCount(0)
})

test('TB-42: turning the screen moves the one hint between the paper and the line below', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'touch')
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.goto('/')
  await createNotebook(page, 'Paper', 'TB42turn')
  const one = page.locator('[data-paper-hint], .ln-tap-below')
  await expect(one).toHaveCount(1)
  await expect(page.locator('[data-paper-hint]')).toHaveCount(1)
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(page.locator('.ln-tap-below')).toHaveCount(1)
  await expect(one).toHaveCount(1)
  await page.setViewportSize({ width: 1180, height: 820 })
  await expect(page.locator('[data-paper-hint]')).toHaveCount(1)
  await expect(one).toHaveCount(1)
})
