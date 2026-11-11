// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Text box v2 (owner, 11 Nov): one tap with the Text tool makes a SMALL box
 * exactly where tapped; it grows with the text up to a little before the right
 * margin and then wraps; a user-set width is kept; an empty box disappears.
 */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

// On the iPad stand-in (ipad-webkit) only the Pencil conversion specs run.
test.beforeEach(({ browserName }, info) => {
  test.skip(
    browserName === 'webkit' &&
      info.project.name === 'ipad-webkit' &&
      !/Pencil|Pen tool/.test(info.title),
    'Pencil specs only on the iPad stand-in',
  )
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const box = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, name: string) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

async function tapBlank(page: Page, fx: number, dy: number) {
  const sheet = await box(page.locator('[data-paper-sheet="1"]'))
  const main = await box(page.locator('[data-paper-box="main"]'))
  const x = sheet.x + sheet.width * fx
  const y = main.y + main.height + dy
  await page.mouse.click(x, y)
  return { x, y, sheet }
}

test('one tap makes a small box exactly where tapped; empty ones disappear', async ({
  page,
}) => {
  await start(page, 'Small')
  const at = await tapBlank(page, 0.4, 70)
  const b = page.locator(EXTRA)
  await expect(b).toHaveCount(1)
  await expect(b.locator('.bn-editor')).toBeFocused()
  const r = await box(b)
  expect(Math.abs(r.x - at.x)).toBeLessThan(14)
  expect(r.width).toBeLessThan(60)
  expect(r.y).toBeLessThan(at.y + 4)
  expect(r.y + r.height).toBeGreaterThan(at.y - 4)
  // Left empty and tapped away: it disappears.
  const main = await box(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(main.x + 40, main.y + 10)
  await expect(page.locator(EXTRA)).toHaveCount(0, { timeout: 8000 })
})

test('it grows with the text, stops before the right margin, then wraps', async ({
  page,
}) => {
  await start(page, 'Grow')
  const at = await tapBlank(page, 0.3, 70)
  const b = page.locator(EXTRA)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Hi')
  const w1 = (await box(b)).width
  await page.keyboard.type(' there my friend')
  const w2 = (await box(b)).width
  expect(w2).toBeGreaterThan(w1 + 20)
  await page.keyboard.type(
    ' and a lot more words follow so that this line has to wrap onto the next row of the paper',
  )
  await page.waitForTimeout(500)
  const r = await box(b)
  // A little before the right margin (15 mm of a 210 mm sheet).
  const margin = at.sheet.x + at.sheet.width * (1 - 15 / 210)
  expect(r.x + r.width).toBeLessThan(margin)
  expect(r.x + r.width).toBeGreaterThan(margin - 80)
  expect(r.height).toBeGreaterThan(40) // soft-wrapped: a second line
  const paragraphs = await b.locator('.bn-block-outer').count()
  expect(paragraphs).toBe(1) // still one paragraph
})

test('a width the user sets is kept', async ({ page }) => {
  await start(page, 'Width')
  await tapBlank(page, 0.2, 70)
  const b = page.locator(EXTRA)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Wide')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  // Select the box with a frame tap, then drag its east handle.
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  const east = b.locator('[data-resize-handle="e"]')
  await expect(east).toBeVisible()
  const h = await box(east)
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2)
  await page.mouse.down()
  await page.mouse.move(h.x + h.width / 2 + 150, h.y + h.height / 2, {
    steps: 6,
  })
  await page.mouse.up()
  await page.waitForTimeout(400)
  const wide = (await box(b)).width
  expect(wide).toBeGreaterThan(150)
  await page.keyboard.press('Escape')
  await page.reload()
  await expect(page.locator(EXTRA)).toBeVisible()
  expect(Math.abs((await box(page.locator(EXTRA))).width - wide)).toBeLessThan(
    6,
  )
})

test('boxes never overlap: a second box taps below the first', async ({
  page,
}) => {
  await start(page, 'Slide')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('First box with some text')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await tapBlank(page, 0.3, 160)
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(page.locator(EXTRA + ' .bn-editor').nth(1)).toBeFocused()
  await page.keyboard.type('Second')
  await page.waitForTimeout(600)
  const boxes = page.locator(EXTRA)
  await expect(boxes).toHaveCount(2)
  const a = await box(boxes.nth(0))
  const c = await box(boxes.nth(1))
  const overlap = !(
    a.x + a.width <= c.x ||
    c.x + c.width <= a.x ||
    a.y + a.height <= c.y ||
    c.y + c.height <= a.y
  )
  expect(overlap).toBe(false)
})

test('a double tap on blank paper does not make a second box', async ({
  page,
}) => {
  await start(page, 'Double')
  const sheet = await box(page.locator('[data-paper-sheet="1"]'))
  const main = await box(page.locator('[data-paper-box="main"]'))
  await page.mouse.dblclick(
    sheet.x + sheet.width * 0.5,
    main.y + main.height + 90,
  )
  await page.waitForTimeout(500)
  expect(await page.locator(EXTRA).count()).toBeLessThanOrEqual(1)
})

test('a tap inside a box puts the caret there at once (1a)', async ({
  page,
}) => {
  await start(page, 'Caret')
  await tapBlank(page, 0.3, 70)
  const b = page.locator(EXTRA)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('alpha beta gamma')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const p = await page.evaluate(() => {
    const ed = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
    )!
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 6)
    r.setEnd(n, 7)
    const q = r.getBoundingClientRect()
    return { x: q.left + 1, y: q.top + q.height / 2 }
  })
  await page.mouse.click(p.x, p.y)
  await expect(b.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('X')
  await expect(b.locator('.bn-editor')).toContainText('alpha Xbeta gamma')
})

test('with a box selected, a tap on empty paper only deselects (2a)', async ({
  page,
}) => {
  await start(page, 'Deselect')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Keep me')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const b = page.locator(EXTRA)
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  await expect(b).toHaveAttribute('data-picked', '')
  await expect(b.locator('[data-box-bar]')).toBeVisible()
  // One tap on empty paper: deselected, no new box.
  await tapBlank(page, 0.7, 260)
  await expect(b).not.toHaveAttribute('data-picked', '')
  await page.waitForTimeout(500)
  await expect(page.locator(EXTRA)).toHaveCount(1)
  // The next tap makes a box.
  await page.waitForTimeout(800)
  await tapBlank(page, 0.7, 260)
  await expect(page.locator(EXTRA)).toHaveCount(2)
})

test('while typing only the text bar shows; the box bar waits until you stop (3b)', async ({
  page,
}) => {
  await start(page, 'OneBar')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Some words')
  await page.waitForTimeout(500)
  const b = page.locator(EXTRA)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  await expect(b.locator('[data-box-bar]')).toBeVisible()
  await b.locator('.bn-editor').click()
  await expect(b).toHaveAttribute('data-typing', '')
  await expect(b.locator('[data-box-bar]')).toHaveCount(0)
})

test('smart guides: a dragged box shows a thin magenta line and snaps onto another box', async ({
  page,
}) => {
  await start(page, 'Guides')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('First box')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.waitForTimeout(700)
  await tapBlank(page, 0.5, 170)
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(page.locator(EXTRA + ' .bn-editor').nth(1)).toBeFocused()
  await page.keyboard.type('Second box')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const a = page.locator(EXTRA).nth(0)
  const b = page.locator(EXTRA).nth(1)
  await b.hover()
  const band = await box(b.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  await expect(b).toHaveAttribute('data-picked', '')
  const ra = await box(a)
  const rb = await box(b)
  const g = await box(b.locator('[data-box-grip]'))
  const gx = g.x + g.width / 2
  const gy = g.y + g.height / 2
  await page.mouse.move(gx, gy)
  await page.mouse.down()
  await page.mouse.move(gx + (ra.x - rb.x) + 2, gy + 20, { steps: 10 })
  await expect(
    page.locator('[data-smart-guides] [data-guide]').first(),
  ).toBeVisible()
  const line = await box(
    page.locator('[data-smart-guides] [data-guide]').first(),
  )
  expect(line.width).toBeLessThanOrEqual(2)
  await page.mouse.up()
  await page.waitForTimeout(500)
  await expect(page.locator('[data-smart-guides]')).toHaveCount(0)
  const after = await box(b)
  expect(Math.abs(after.x - ra.x)).toBeLessThan(2)
})

test('Group and Ungroup: a group is picked and moved as one', async ({
  page,
}) => {
  await start(page, 'Group')
  for (const [i, text] of ['One', 'Two'].entries()) {
    await tapBlank(page, 0.3 + i * 0.3, 70 + i * 100)
    await expect(page.locator(EXTRA)).toHaveCount(i + 1)
    await expect(page.locator(EXTRA + ' .bn-editor').nth(i)).toBeFocused()
    await page.keyboard.type(text)
    await page.waitForTimeout(500)
    await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
    await page.waitForTimeout(600)
  }
  const a = page.locator(EXTRA).nth(0)
  const b = page.locator(EXTRA).nth(1)
  const pick = async (l: Locator, add = false) => {
    await l.hover()
    const band = await box(l.locator('[data-box-band="bottom"]'))
    if (add) await page.keyboard.down('Shift')
    await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
    if (add) await page.keyboard.up('Shift')
  }
  await pick(a)
  await pick(b, true)
  await expect(page.locator('[data-picked]')).toHaveCount(2)
  await page.locator('[data-group-action="group"]').click()
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-picked]')).toHaveCount(0)
  // One tap on a member picks the whole group.
  await pick(a)
  await expect(page.locator('[data-picked]')).toHaveCount(2)
  await expect(page.locator('[data-group-action="ungroup"]')).toBeVisible()
  await page.locator('[data-group-action="ungroup"]').click()
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await pick(a)
  await expect(page.locator('[data-picked]')).toHaveCount(1)
})

/** Plays a Pencil stroke (pointer events of type pen) on an element. */
async function pencil(
  page: Page,
  target: Locator,
  pts: { x: number; y: number }[],
  wait = 300,
) {
  await target.evaluate((el, points) => {
    const fire = (type: string, p: { x: number; y: number }) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'pen',
          pointerId: 7,
          isPrimary: true,
          clientX: p.x,
          clientY: p.y,
          pressure: type === 'pointerup' ? 0 : 0.5,
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
        }),
      )
    fire('pointerdown', points[0])
    for (const p of points.slice(1)) fire('pointermove', p)
    fire('pointerup', points[points.length - 1])
  }, pts)
  if (wait) await page.waitForTimeout(wait)
}

test('Text tool + Pencil: a circle round a digit makes a circled number, one Undo undoes it', async ({
  page,
}) => {
  await start(page, 'Circled')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Step 2 done')
  // Typing is its own Undo step (steps within 800 ms join).
  await page.waitForTimeout(1200)
  const b = page.locator(EXTRA)
  const r = await page.evaluate(() => {
    const ed = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
    )!
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const q = document.createRange()
    q.setStart(n, 5)
    q.setEnd(n, 6)
    const c = q.getBoundingClientRect()
    return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, h: c.height }
  })
  const ring = Array.from({ length: 41 }, (_, i) => ({
    x: r.cx + Math.cos((i / 40) * Math.PI * 2) * (r.h * 0.9),
    y: r.cy + Math.sin((i / 40) * Math.PI * 2) * (r.h * 0.9),
  }))
  await pencil(page, b.locator('.bn-editor'), ring)
  await expect(b.locator('.bn-editor')).toContainText('Step ② done')
  await page.keyboard.press('Control+z')
  // One Undo takes back ONLY the circled number; the typing stays.
  await expect(b.locator('.bn-editor')).not.toContainText('②')
  await expect(b.locator('.bn-editor')).toContainText('Step 2 done')
  // Redo brings the circled number back.
  await page.keyboard.press('Control+Shift+z')
  await expect(b.locator('.bn-editor')).toContainText('Step ② done')
})

test('Text tool + Pencil: a drawn line on blank paper becomes a clean ink line; the Pen never converts', async ({
  page,
}) => {
  await start(page, 'Shapes')
  const sheet = await box(page.locator('[data-paper-sheet="1"]'))
  const main = await box(page.locator('[data-paper-box="main"]'))
  const y = main.y + main.height + 90
  const x0 = sheet.x + sheet.width * 0.3
  // A slightly wobbly, nearly straight stroke.
  const wobbly = Array.from({ length: 24 }, (_, i) => ({
    x: x0 + i * 7,
    y: y + Math.sin(i) * 1.2,
  }))
  await pencil(page, page.locator('[data-paper-sheets]'), wobbly)
  await expect(page.locator(EXTRA)).toHaveCount(1, { timeout: 8000 })
  await expect(page.locator(EXTRA + ' [data-ink-pad]').first()).toBeAttached()
})

test('Box style: Sticky note and Callout presets; a new box remembers the last style', async ({
  page,
}) => {
  await start(page, 'Styles')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('First')
  await page.waitForTimeout(500)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const first = page.locator(EXTRA).first()
  await first.hover()
  const band = await box(first.locator('[data-box-band="bottom"]'))
  await page.mouse.click(band.x + band.width / 2, band.y + band.height / 2)
  await first.locator('[data-box-bar]').getByLabel('Box style').click()
  const panel = page.locator('[data-box-style-panel]')
  await expect(panel.getByRole('button', { name: 'Callout' })).toBeVisible()
  await panel.getByRole('button', { name: 'Sticky note' }).click()
  await expect(first.locator('[data-box-style]').first()).toBeVisible()
  await page.waitForTimeout(500)
  await panel.getByRole('button', { name: 'Close' }).click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(800)
  // No "Use for new boxes" tick: the next box has the same style.
  await tapBlank(page, 0.6, 200)
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(
    page.locator(EXTRA).nth(1).locator('[data-box-style]').first(),
  ).toBeVisible()
})

async function wobblyLine(page: Page, wait = 300, dy = 90, x0f = 0.3) {
  const sheet = await box(page.locator('[data-paper-sheet="1"]'))
  const main = await box(page.locator('[data-paper-box="main"]'))
  const y = main.y + main.height + dy
  const x0 = sheet.x + sheet.width * x0f
  const pts = Array.from({ length: 24 }, (_, i) => ({
    x: x0 + i * 7,
    y: y + Math.sin(i) * 1.2,
  }))
  await pencil(page, page.locator('[data-paper-sheets]'), pts, wait)
}

test('Text tool + Pencil: one Undo takes a converted shape back, Redo returns it', async ({
  page,
}) => {
  await start(page, 'ShapeUndo')
  await wobblyLine(page)
  await expect(page.locator(EXTRA)).toHaveCount(1, { timeout: 8000 })
  await page.waitForTimeout(1000)
  await page.keyboard.press('Control+z')
  await expect(page.locator(EXTRA)).toHaveCount(0, { timeout: 8000 })
  await expect(page.locator('[data-paper-box="main"]')).toContainText(
    'Main text',
  )
  await page.keyboard.press('Control+Shift+z')
  await expect(page.locator(EXTRA)).toHaveCount(1, { timeout: 8000 })
})

test('Text tool + Pencil: strokes that look like handwriting are not converted', async ({
  page,
}) => {
  await start(page, 'Hand')
  // Two strokes next to each other, the second within the hold time.
  await wobblyLine(page, 0)
  await wobblyLine(page, 0, 110, 0.32)
  await page.waitForTimeout(1500)
  await expect(page.locator(EXTRA)).toHaveCount(0)
  // A small round mark (a letter c) and a short dash are not shapes either.
  const sheet = await box(page.locator('[data-paper-sheet="1"]'))
  const main = await box(page.locator('[data-paper-box="main"]'))
  const cx = sheet.x + sheet.width * 0.6
  const cy = main.y + main.height + 200
  const ring = Array.from({ length: 33 }, (_, i) => ({
    x: cx + Math.cos((i / 32) * Math.PI * 1.6) * 14,
    y: cy + Math.sin((i / 32) * Math.PI * 1.6) * 14,
  }))
  await pencil(page, page.locator('[data-paper-sheets]'), ring, 1200)
  const dash = Array.from({ length: 12 }, (_, i) => ({
    x: cx + 100 + i * 3,
    y: cy + 60,
  }))
  await pencil(page, page.locator('[data-paper-sheets]'), dash, 1200)
  await expect(page.locator(EXTRA)).toHaveCount(0)
})

test('The Pen tool never converts: a ring round a digit stays a ring', async ({
  page,
}) => {
  await start(page, 'PenNever')
  await tapBlank(page, 0.3, 70)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Step 2 done')
  await page.waitForTimeout(1200)
  const b = page.locator(EXTRA).filter({ hasText: 'Step 2 done' })
  const r = await page.evaluate(() => {
    const ed = document.querySelector(
      '[data-paper-box]:not([data-paper-box="main"]) .bn-editor',
    )!
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const q = document.createRange()
    q.setStart(n, 5)
    q.setEnd(n, 6)
    const c = q.getBoundingClientRect()
    return { cx: c.left + c.width / 2, cy: c.top + c.height / 2, h: c.height }
  })
  await page.getByRole('button', { name: 'Pen', exact: true }).first().click()
  const ring = Array.from({ length: 41 }, (_, i) => ({
    x: r.cx + Math.cos((i / 40) * Math.PI * 2) * (r.h * 0.9),
    y: r.cy + Math.sin((i / 40) * Math.PI * 2) * (r.h * 0.9),
  }))
  await pencil(page, page.locator('[data-paper-sheets]'), ring, 1500)
  await expect(b.locator('.bn-editor')).toContainText('Step 2 done')
  await expect(b.locator('.bn-editor')).not.toContainText('②')
})
