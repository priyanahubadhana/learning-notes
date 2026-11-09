// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { expectStrokes, inkNote, stroke, textBox, wave } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'
import { loopAround, machineState, section } from './toolsHelpers.ts'

/**
 * Tools robustness, step 4: the remaining "a pointer is down" flags. A touch
 * that ends with pointercancel no longer carries into the next tap; a
 * Pencil press whose lift is lost is forgotten by every guard after 4 s (the
 * input machine) without an app switch; the dump counts the listeners.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const LONG =
  'Learning works best when the notes are short, the summary is shorter and the recall cards ask one thing at a time.'

type Pt2 = { x: number; y: number }

async function typingNote(page: Page) {
  await openNote(page, 'touch', { 'advanced.autoSwitch': 'off' })
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await page.keyboard.type(LONG)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
}

const wordPoint = (page: Page, word: string): Promise<Pt2> =>
  page.evaluate((w) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const at = (n.textContent ?? '').indexOf(w)
      if (at < 0) continue
      const r = document.createRange()
      r.setStart(n, at)
      r.setEnd(n, at + w.length)
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('word not found: ' + w)
  }, word)

const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

/** Pencil events on the word under `at`; `end` is how the touch finishes. */
async function pen(
  page: Page,
  at: Pt2,
  id: number,
  steps: ('down' | 'up' | 'cancel')[],
) {
  await page.evaluate(
    ({ at, id, steps }) => {
      const el = document.elementFromPoint(at.x, at.y)!
      for (const s of steps) {
        el.dispatchEvent(
          new PointerEvent(
            s === 'down'
              ? 'pointerdown'
              : s === 'up'
                ? 'pointerup'
                : 'pointercancel',
            {
              pointerType: 'pen',
              pointerId: id,
              clientX: at.x,
              clientY: at.y,
              bubbles: true,
              cancelable: true,
              isPrimary: true,
              button: 0,
              buttons: s === 'down' ? 1 : 0,
            },
          ),
        )
      }
    },
    { at, id, steps },
  )
}

/** Two quick Pencil taps on the same spot, `gap` ms apart, on the page's own clock. */
async function doubleTap(page: Page, at: Pt2, id = 31) {
  await page.evaluate(
    async ({ at, id }) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: id,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      for (let i = 0; i < 2; i++) {
        if (i > 0) await sleep(160)
        const el = document.elementFromPoint(at.x, at.y)!
        const kept = el.dispatchEvent(make('pointerdown'))
        el.dispatchEvent(make('pointerup'))
        if (kept) {
          setTimeout(() => {
            for (const name of ['mousedown', 'mouseup', 'click']) {
              el.dispatchEvent(
                new MouseEvent(name, {
                  clientX: at.x,
                  clientY: at.y,
                  bubbles: true,
                  cancelable: true,
                  button: 0,
                }),
              )
            }
          }, 0)
        }
      }
    },
    { at, id },
  )
}

test('a tap that ends with pointercancel does not spoil the next double tap', async ({
  page,
}) => {
  await typingNote(page)
  const at = await wordPoint(page, 'summary')
  await pen(page, at, 31, ['down', 'cancel'])
  expect((await section(page, 'tapSelect')).down).toBeNull()
  await doubleTap(page, at)
  await expect.poll(() => marked(page)).toBe('summary')
})

test('a Pencil press whose lift is lost is forgotten by every guard after 4 s', async ({
  page,
}) => {
  await typingNote(page)
  const at = await wordPoint(page, 'recall')
  await pen(page, at, 77, ['down'])
  // The guards believe the Pencil is down.
  await expect
    .poll(async () => (await section(page, 'penGuard')).down)
    .toBe(true)
  expect((await section(page, 'ownSelection')).pointerDown).toBe(true)
  expect(await machineState(page)).not.toBe('idle')
  await page.waitForTimeout(4800)
  expect(await machineState(page)).toBe('idle')
  expect((await section(page, 'penGuard')).down).toBe(false)
  expect((await section(page, 'ownSelection')).pointerDown).toBe(false)
  expect((await section(page, 'penTap')).penDown).toBe(false)
  // And a double tap still selects a word.
  await doubleTap(page, await wordPoint(page, 'summary'))
  await expect.poll(() => marked(page)).toBe('summary')
})

test('a hold-select whose lift is lost does not stop a Lasso loop (no app switch)', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + box.height + 60
  await stroke(page, wave(box.x + 20, box.x + 200, y))
  await expectStrokes(page, 1)
  await tool(page, 'Text').click()
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Other line')
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const at = await wordPoint(page, 'nucleus')
  // Press and hold on the words (holdSelect begins after 500 ms): no lift.
  await pen(page, at, 55, ['down'])
  await expect
    .poll(async () => (await section(page, 'selectGesture')).active)
    .toBe(true)
  // It is dropped after 4 s without movement, with the Text tool still on.
  await page.waitForTimeout(4800)
  expect((await section(page, 'selectGesture')).active).toBe(false)
  expect(await machineState(page)).toBe('idle')
  // A Lasso loop around the drawing selects.
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  await stroke(
    page,
    loopAround({ x: box.x + 20, y: y - 16, width: 180, height: 32 }, 6),
  )
  await expect.poll(async () => (await section(page, 'ink')).selection).toBe(1)
})

test('a hold-select held when the tool changes is dropped at once', async ({
  page,
}) => {
  await typingNote(page)
  const at = await wordPoint(page, 'summary')
  await pen(page, at, 56, ['down'])
  await expect
    .poll(async () => (await section(page, 'selectGesture')).active)
    .toBe(true)
  await tool(page, 'Lasso').click()
  await expect
    .poll(async () => (await section(page, 'selectGesture')).active)
    .toBe(false)
})

test('the tool-state dump counts the document listeners by type', async ({
  page,
}) => {
  await typingNote(page)
  const dump = await section(page, 'listeners')
  expect(Number(dump.pointerTotal)).toBeGreaterThan(0)
  expect(Number(dump.editors)).toBeGreaterThan(0)
  const doc = dump.document as Record<string, number>
  expect(doc['pointerdown (capture)']).toBeGreaterThan(0)
  expect(doc['pointerup (capture)']).toBeGreaterThan(0)
})
