// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Phase 2B, task 2B.3 (switch textbox.v2 ON): select and cursor.
 * TB-01 first tap selects the box, the next puts the caret exactly there;
 * TB-02 one selection look; TB-03 one kind of selection at a time; TB-05
 * padding counts as the box; TB-06 tap on paper makes a box under; TB-07 tap
 * on paper deselects; TB-08 first box has the same tab and the menu; TB-09
 * Delete; TB-10 a new box stays one line wide. Plus the keyboard rule.
 */
// Pixel ratio 2, like the iPad: a 1.5 px line is not rounded down to 1 px.
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
  await typeInEditor(page, 'Main text')
}

/** One box with the text, nothing focused, nothing selected. */
async function oneBox(page: Page, text: string) {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 60)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  const lines = text.split('|')
  for (const [n, l] of lines.entries()) {
    if (n > 0) await page.keyboard.press('Enter')
    await page.keyboard.type(l)
  }
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(1000)
  await expect(box).toHaveCount(1)
  await expect(box).not.toHaveAttribute('data-picked', '')
  return box
}

/** A mouse tap on bare paper, right of and below the boxes, inside the screen. */
async function tapEmptyPaper(page: Page) {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const boxes = page.locator('[data-paper-box]')
  let bottom = 0
  for (let i = 0; i < (await boxes.count()); i++) {
    const r = await rect(boxes.nth(i))
    bottom = Math.max(bottom, r.y + r.height)
  }
  const y = Math.min(bottom + 160, 1020)
  await page.mouse.click(sheet.x + sheet.width * 0.92, y)
}

/** A tap of this kind at a point (pointer events like the real devices send). */
async function tapAt(
  page: Page,
  x: number,
  y: number,
  kind: Kind,
  on?: string,
) {
  await page.evaluate(
    ({ x, y, kind, on }) => {
      // `on`: send it to this element even where a handle lies on top of it.
      const el = on
        ? document.querySelector(on)!
        : document.elementFromPoint(x, y)!
      const mk = (type: string, buttons: number) =>
        new PointerEvent(type, {
          pointerType: kind,
          pointerId: kind === 'pen' ? 31 : 32,
          isPrimary: true,
          clientX: x,
          clientY: y,
          button: 0,
          buttons,
          bubbles: true,
          cancelable: true,
          composed: true,
        })
      el.dispatchEvent(mk('pointerdown', 1))
      el.dispatchEvent(mk('pointerup', 0))
    },
    { x, y, kind, on },
  )
}

const state = (page: Page) =>
  page.evaluate(() => {
    const box = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"])',
    )!
    const s = window.getSelection()!
    const ed = box.querySelector<HTMLElement>('.bn-editor')!
    return {
      picked: box.hasAttribute('data-picked'),
      focused: box.contains(document.activeElement),
      caret: !!s.anchorNode && box.contains(s.anchorNode) && s.isCollapsed,
      // Characters from the start of the box text to the caret (line breaks add none).
      offset: (() => {
        if (!s.anchorNode || !ed.contains(s.anchorNode)) return -1
        const r = document.createRange()
        r.setStart(ed, 0)
        r.setEnd(s.anchorNode, s.anchorOffset)
        return r.toString().length
      })(),
      inputMode: ed.getAttribute('inputmode'),
    }
  })

/** The screen point at the left edge of character `i` of the box's first text node. */
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
      return { x: b.x + 1, y: b.y + b.height / 2 }
    },
    { i, para },
  )

const LINE = 'Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda'

test('TB-01: the first tap selects the box and nothing else; the keyboard stays closed', async ({
  page,
}) => {
  await start(page, 'TB01')
  const box = await oneBox(page, LINE)
  for (const kind of ['touch', 'pen'] as const) {
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    if ((await box.getAttribute('data-picked')) !== null)
      await tapEmptyPaper(page)
    await page.waitForTimeout(1000)
    await expect(box).not.toHaveAttribute('data-picked', '')
    const at = await charPoint(page, 12)
    await tapAt(page, at.x, at.y, kind)
    await expect(box).toHaveAttribute('data-picked', '')
    const s = await state(page)
    expect(s.focused, kind + ': no caret, so no keyboard').toBe(false)
  }
})

test('TB-01: the next tap puts the caret within 1 character, 20 spots, no jump after typing', async ({
  page,
}) => {
  await start(page, 'TB01b')
  const box = await oneBox(page, [LINE, LINE, LINE].join('|'))
  const at0 = await charPoint(page, 3)
  await tapAt(page, at0.x, at0.y, 'touch')
  await expect(box).toHaveAttribute('data-picked', '')
  for (let n = 0; n < 20; n++) {
    const i = 2 + ((n * 3) % (LINE.length - 4))
    const p = await charPoint(page, i, 1)
    await page.waitForTimeout(520)
    await tapAt(page, p.x, p.y, 'touch')
    await expect
      .poll(async () => {
        const s = await state(page)
        return Math.abs(s.offset - (LINE.length + i))
      }, 'spot ' + i)
      .toBeLessThanOrEqual(1)
  }
  const keep = (await state(page)).offset
  await page.keyboard.type('xyz')
  expect((await state(page)).offset).toBe(keep + 3)
})

test('keyboard rule: a Pencil tap that places the caret keeps the keyboard down; a finger opens it', async ({
  page,
}) => {
  await start(page, 'KB')
  const box = await oneBox(page, LINE)
  const p = await charPoint(page, 6)
  await tapAt(page, p.x, p.y, 'touch')
  await expect(box).toHaveAttribute('data-picked', '')
  await page.waitForTimeout(520)
  await tapAt(page, p.x, p.y, 'pen')
  await expect.poll(async () => (await state(page)).caret).toBe(true)
  expect((await state(page)).inputMode).toBe('none')
  await page.waitForTimeout(520)
  const q = await charPoint(page, 9)
  await tapAt(page, q.x, q.y, 'touch')
  await expect.poll(async () => (await state(page)).inputMode).not.toBe('none')
})

test('TB-02: Select tool tap selects the whole box: 1.5 px accent border, no line outline, halo in dark and sepia', async ({
  page,
}) => {
  await start(page, 'TB02')
  const box = await oneBox(page, LINE)
  await tool(page, 'Lasso').click()
  const p = await charPoint(page, 5)
  await tapAt(page, p.x, p.y, 'touch')
  await expect(box).toHaveAttribute('data-picked', '')
  const look = () =>
    box
      .locator('[data-box-frame]')
      .first()
      .evaluate((el) => {
        const c = getComputedStyle(el)
        return {
          w: c.borderTopWidth,
          style: c.borderTopStyle,
          shadow: c.boxShadow,
          blocks: [...document.querySelectorAll('.bn-block-content')].map(
            (b) => getComputedStyle(b).outlineStyle,
          ),
        }
      })
  const day = await look()
  // Chromium rounds a 1.5 px line down in its computed value; the rule itself
  // (1.5 px) is checked in boxSelection.test.ts.
  expect(parseFloat(day.w)).toBeGreaterThanOrEqual(1)
  expect(day.style).toBe('solid')
  expect(day.blocks.every((o) => o === 'none')).toBe(true)
  for (const theme of ['night', 'sepia']) {
    await page.evaluate(
      (th) => document.documentElement.setAttribute('data-theme', th),
      theme,
    )
    expect((await look()).shadow, theme).not.toBe('none')
  }
})

test('TB-03: selecting a box clears the text selection elsewhere', async ({
  page,
}) => {
  await start(page, 'TB03')
  const box = await oneBox(page, LINE)
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  await page.keyboard.press('ControlOrMeta+a')
  expect(
    await page.evaluate(() => window.getSelection()!.toString()),
  ).toContain('Main text')
  const p = await charPoint(page, 5)
  await tapAt(page, p.x, p.y, 'touch')
  await expect(box).toHaveAttribute('data-picked', '')
  expect(await page.evaluate(() => window.getSelection()!.toString())).toBe('')
})

test('TB-05: the padding of a box counts as the box: first tap selects, next puts the caret', async ({
  page,
}) => {
  await start(page, 'TB05')
  const box = await oneBox(page, LINE)
  const r = await rect(box)
  // The padding inside the right edge (sent to the content frame itself:
  // the resize dot of a selected box lies over that spot on a real screen).
  const x = r.x + r.width - 2
  const y = r.y + r.height / 2
  const pad = EXTRA + ' [data-box-content]'
  await tapAt(page, x, y, 'touch', pad)
  await expect(box).toHaveAttribute('data-picked', '')
  expect((await state(page)).focused).toBe(false)
  await page.waitForTimeout(520)
  await tapAt(page, x, y, 'touch', pad)
  await expect.poll(async () => (await state(page)).focused).toBe(true)
  await expect(page.locator(EXTRA)).toHaveCount(1)
})

test('TB-06: a tap on empty paper makes a box under the last one, never beside it; the Pencil keeps the keyboard down', async ({
  page,
}) => {
  await start(page, 'TB06')
  const box = await oneBox(page, 'Short')
  const r = await rect(box)
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  // Beside the box (same height, to its right).
  await page.mouse.click(
    Math.min(r.x + r.width + 120, sheet.x + sheet.width - 60),
    r.y + 4,
  )
  await expect(page.locator(EXTRA)).toHaveCount(2)
  const second = await rect(page.locator(EXTRA).nth(1))
  expect(second.y).toBeGreaterThanOrEqual(r.y + r.height - 2)
  await expect(page.locator(EXTRA).nth(1).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Second')
  await page.waitForTimeout(700)
  // The Pencil: a box with the caret, but inputmode none.
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(1000)
  const last = await rect(page.locator(EXTRA).nth(1))
  await tapAt(
    page,
    sheet.x + sheet.width * 0.5,
    last.y + last.height + 90,
    'pen',
  )
  await expect(page.locator(EXTRA)).toHaveCount(3)
  expect(
    await page
      .locator(EXTRA)
      .nth(2)
      .locator('.bn-editor')
      .getAttribute('inputmode'),
  ).toBe('none')
})

test('TB-07: a tap on empty paper with a box selected only deselects it', async ({
  page,
}) => {
  await start(page, 'TB07')
  const box = await oneBox(page, LINE)
  const p = await charPoint(page, 5)
  await tapAt(page, p.x, p.y, 'touch')
  await expect(box).toHaveAttribute('data-picked', '')
  await tapEmptyPaper(page)
  await expect(box).not.toHaveAttribute('data-picked', '')
  await expect(page.locator(EXTRA)).toHaveCount(1)
})

test('TB-08: the first box shows the same tab and menu as every other box', async ({
  page,
}) => {
  await start(page, 'TB08')
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  const chrome = page.locator('[data-main-chrome]')
  await expect(chrome.locator('[data-box-grip]')).toBeVisible()
  await expect(chrome.locator('[data-box-menu]')).toBeVisible()
})

test('TB-09: Delete with a box selected and no caret deletes it; a toast offers Undo', async ({
  page,
}) => {
  await start(page, 'TB09')
  const box = await oneBox(page, LINE)
  const p = await charPoint(page, 5)
  await tapAt(page, p.x, p.y, 'touch')
  await expect(box).toHaveAttribute('data-picked', '')
  await page.keyboard.press('Delete')
  await expect(page.locator(EXTRA)).toHaveCount(0)
  await expect(
    page.locator('[data-toast]').getByRole('button', { name: 'Undo' }),
  ).toBeVisible()
})

test('TB-10: a new box stays one line wide until the right margin; never a letter per line', async ({
  page,
}) => {
  await start(page, 'TB10')
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 60)
  const box = page.locator(EXTRA)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Hi')
  const one = await rect(box)
  await page.keyboard.type(' extraordinarily')
  await page.waitForTimeout(300)
  const two = await rect(box)
  expect(two.width).toBeGreaterThan(one.width)
  expect(two.height).toBeLessThan(one.height * 1.6)
  expect(two.width).toBeGreaterThan(80)
})
