// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  savedInk,
  stroke,
  textBox,
  type Pt,
} from './inkHelpers.ts'
import { openNote, option, tool } from './mainBarHelpers.ts'

/**
 * Round 6 bar fixes (7 Nov): R6-1 grip drags are drag-only, R6-3 the
 * rectangle Lasso, R6-4 the iOS callout, R6-6 Deselect, R6-8 choosing a tool
 * never moves the page, R6-10 "Toolbar: finger only". Simulated pointer events;
 * runs in Chromium and in the iPad stand-in (ipad-webkit).
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

/** Ink over the first line of words, then the Lasso. */
async function inkThenLasso(page: Page) {
  await inkNote(page, 'Pen')
  await page.keyboard.press('Escape') // the pill would cover the first line
  await page.evaluate(() => {
    document.querySelector('[data-page-scroller]')!.scrollTop = 0
  })
  await page.waitForTimeout(600)
  const box = await textBox(page)
  const y = box.y + 300 // blank paper under the words
  await stroke(page, line([box.x + 10, y], [box.x + 180, y]))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  return { box, y }
}

test('R6-3: the rectangle Lasso draws a live rectangle and selects by it', async ({
  page,
}) => {
  const { box, y } = await inkThenLasso(page)
  await option(page, 'Rectangle').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const now = await textBox(page)
  const dy = now.y - box.y
  const from: Pt = [box.x + 2, y + dy + 25]
  const to: Pt = [box.x + 200, y + dy - 25]
  // A diagonal drag: a freeform loop would paint a thin line, a rectangle
  // paints its four sides.
  await stroke(page, line(from, to, 12), { keepDown: true, id: 51 })
  const px = await painted(page, 'live')
  expect(px).toBeGreaterThan(5000) // the tinted box, not a thin line
  await stroke(page, [to], { id: 51 })
  await expect(page.locator('[data-ink-box]')).toBeVisible()
})

for (const grip of ['[data-keys="grip"]', '[data-pill-grip]']) {
  test(`R6-1: dragging ${grip} draws no ink and the page leaves text input until the lift`, async ({
    page,
  }) => {
    await gripDragTest(page, grip)
  })
}

async function gripDragTest(page: Page, grip: string) {
  if (grip === '[data-pill-grip]') await inkNote(page, 'Pen')
  else await openNote(page, 'pencil', { 'toolbar.miniKeys': true })
  await expect(page.locator(grip)).toBeVisible()
  const editable = () =>
    page.evaluate(() =>
      document.querySelector('.bn-editor')?.getAttribute('contenteditable'),
    )
  // Under the Pen the page is read-only already; the lock matters in text mode.
  const before = await editable()
  const g = (await page.locator(grip).boundingBox())!
  const box = await textBox(page)
  const during = await page.evaluate(
    async ({ g, box, sel }) => {
      const make = (name: string, x: number, y: number) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: 61,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
          pressure: 0.5,
        })
      const grip = document.querySelector(sel)!
      grip.dispatchEvent(make('pointerdown', g.x + 8, g.y + 8))
      // The pen strays over the page while the grip is held.
      for (let i = 0; i < 12; i++) {
        const x = box.x + 20 + i * 12
        const y = box.y + 8
        ;(document.elementFromPoint(x, y) ?? document.body).dispatchEvent(
          make('pointermove', x, y),
        )
        await new Promise((r) => setTimeout(r, 8))
      }
      const state = document
        .querySelector('.bn-editor')
        ?.getAttribute('contenteditable')
      grip.dispatchEvent(make('pointerup', box.x + 140, box.y + 8))
      return state
    },
    { g, box, sel: grip },
  )
  expect(during).toBe('false')
  await expect.poll(editable).toBe(before)
  await page.waitForTimeout(400)
  expect((await savedInk(page)).strokes.length).toBe(0)
}
test('R6-8: choosing any tool on the main bar never moves the page', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Enter')
    await page.keyboard.type(`Line number ${i}`)
  }
  // Where one line of the page is on the screen (what the person sees).
  const top = () =>
    page.evaluate(() => {
      const line = [...document.querySelectorAll('.bn-block-content')].find(
        (b) => b.textContent === 'Line number 30',
      )!
      return line.getBoundingClientRect().top
    })
  // Look at the middle of the page while the caret is at the end.
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')!
    s.scrollTop = (s.scrollHeight - s.clientHeight) / 2
  })
  await page.waitForTimeout(300)
  const start = await top()
  for (const name of [
    'Lasso',
    'Text',
    'Lasso',
    'Pen',
    'Highlighter',
    'Eraser',
    'Text',
    'Lasso',
  ]) {
    await tool(page, name).click()
    await page.waitForTimeout(300)
    // With its pill open, and again after the pill is closed.
    expect(Math.abs((await top()) - start), `after ${name}`).toBeLessThan(2)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300)
    expect(Math.abs((await top()) - start), `closed ${name}`).toBeLessThan(2)
  }
})
/** A tap on an element with a pen or a finger, as pointer events. */
async function tapEl(
  page: Page,
  selector: string,
  type: 'pen' | 'touch',
  id = 71,
) {
  await page.evaluate(
    ({ selector, type, id }) => {
      const el = document.querySelector(selector)!
      const r = el.getBoundingClientRect()
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: id,
          clientX: r.x + r.width / 2,
          clientY: r.y + r.height / 2,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
          pressure: name === 'pointerup' ? 0 : 0.4,
        })
      el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
    },
    { selector, type, id },
  )
}

const LASSO = '[data-bar-tool="eraser"]'
const isOn = (page: Page) =>
  page.locator(LASSO).evaluate((b) => b.getAttribute('aria-pressed') === 'true')

test('R6-10: by default the Pencil and a finger both tap the bar buttons', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  await tapEl(page, LASSO, 'pen')
  await expect.poll(() => isOn(page)).toBe(true)
  await page.waitForTimeout(700) // past the palm window after the Pencil lifts
  await page.locator('[data-bar-tool="text"]').tap()
  await expect.poll(() => isOn(page)).toBe(false)
})

test('R6-10: Toolbar: finger only ignores Pencil taps on bars, not the finger', async ({
  page,
}) => {
  await openNote(page, 'pencil', { 'toolbar.fingerOnly': true })
  await tapEl(page, LASSO, 'pen')
  await page.waitForTimeout(700)
  expect(await isOn(page)).toBe(false)
  await page.locator(LASSO).tap()
  await expect.poll(() => isOn(page)).toBe(true)
})

test('R6-10: a palm (a touch just after the Pencil lifts) is ignored on a bar', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  await tapEl(page, '[data-bar-tool="insert"]', 'pen') // a Pencil tap, then at once a palm
  await page.locator(LASSO).tap()
  await page.waitForTimeout(400)
  expect(await isOn(page)).toBe(false)
  await page.keyboard.press('Escape') // close the Insert pill
  await page.waitForTimeout(600) // later, a finger works
  await page.locator(LASSO).tap()
  await expect.poll(() => isOn(page)).toBe(true)
})
test('R6-6: the Lasso menu has an ⓧ Deselect that clears the selection', async ({
  page,
}) => {
  const { box, y } = await inkThenLasso(page)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(500)
  const now = await textBox(page)
  const dy = now.y - box.y
  await stroke(
    page,
    [
      [box.x + 2, y + dy + 30],
      [box.x + 2, y + dy - 30],
      [box.x + 200, y + dy - 30],
      [box.x + 200, y + dy + 30],
      [box.x + 4, y + dy + 28],
    ].flatMap((p, i, c) => (i === 0 ? [] : line(c[i - 1] as Pt, p as Pt, 8))),
  )
  const menu = page.locator('[data-ink-menu]')
  await expect(menu).toBeVisible()
  await menu.getByRole('button', { name: 'Deselect' }).click()
  await expect(page.locator('[data-ink-box]')).toHaveCount(0)
})

test('R6-6: a Pencil tap on empty page space clears a text selection (typing mode)', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  await tool(page, 'Text').click()
  await page.keyboard.press('Escape') // the pill
  await page.evaluate(() =>
    document.querySelector<HTMLElement>('.bn-editor')!.focus(),
  )
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Shift+Home')
  await page.waitForTimeout(300)
  const selected = () =>
    page.evaluate(() => (window.getSelection()?.toString() ?? '').length)
  expect(await selected()).toBeGreaterThan(3)
  // Empty paper well under the one line, inside the page column.
  const at = await page.evaluate(() => {
    const s = document
      .querySelector('[data-page-scroller]')!
      .getBoundingClientRect()
    const e = document.querySelector('.bn-editor')!.getBoundingClientRect()
    return [e.x + e.width / 2, s.bottom - 24]
  })
  await page.evaluate(([x, y]) => {
    const el = document.elementFromPoint(x, y)!
    const make = (name: string) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 81,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        button: 0,
        buttons: name === 'pointerup' ? 0 : 1,
      })
    el.dispatchEvent(make('pointerdown'))
    el.dispatchEvent(make('pointerup'))
  }, at)
  await expect.poll(selected).toBe(0)
})
test('R6-4: our own bars and menus show no iOS callout and no system menu', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  await tool(page, 'Pen').click()
  const info = await page.evaluate(() => {
    const css = (sel: string) => {
      const el = document.querySelector(sel)!
      const s = getComputedStyle(el) as CSSStyleDeclaration & {
        webkitTouchCallout?: string
      }
      return {
        select: [s.userSelect, s.webkitUserSelect].includes('none')
          ? 'none'
          : s.userSelect,
        callout: s.webkitTouchCallout,
      }
    }
    const menu = (sel: string) => {
      const el = document.querySelector(sel)!
      const e = new MouseEvent('contextmenu', {
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(e)
      return e.defaultPrevented
    }
    return {
      bar: css('[data-main-bar]'),
      pill: css('[data-options-pill]'),
      barMenu: menu('[data-bar-tool="eraser"]'),
      pageMenu: menu('.bn-block-content'),
      supportsCallout: CSS.supports('-webkit-touch-callout', 'none'),
    }
  })
  expect(info.bar.select).toBe('none')
  expect(info.pill.select).toBe('none')
  if (info.supportsCallout) {
    expect(info.bar.callout).toBe('none')
    expect(info.pill.callout).toBe('none')
  }
  expect(info.barMenu).toBe(true)
  expect(info.pageMenu).toBe(false) // the page keeps its own text menus
})
// END
