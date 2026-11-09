// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  stroke,
  textBox,
  wave,
} from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'
import { appSwitch, loopAround, machineState, section } from './toolsHelpers.ts'

/**
 * Tools robustness, step 7: everything still works after the app was away
 * (the iPad drops the lift of a touch that was down, with or without a
 * pointercancel). The app switch is faked with visibilitychange + pageshow.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

/** A note with two drawings to loop around, the Lasso on. */
async function drawings(page: Page) {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const yA = box.y + box.height + 60
  const yB = yA + 90
  await stroke(page, wave(box.x + 20, box.x + 200, yA))
  await stroke(page, wave(box.x + 20, box.x + 200, yB))
  await expectStrokes(page, 2)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const at = (y: number) => ({
    x: box.x + 20,
    y: y - 16,
    width: 180,
    height: 32,
  })
  return { box, a: at(yA), b: at(yB) }
}

async function loops(
  page: Page,
  scene: Awaited<ReturnType<typeof drawings>>,
  n: number,
  from = 0,
) {
  for (let i = from; i < from + n; i++) {
    const b = i % 2 ? scene.b : scene.a
    await stroke(page, loopAround(b, 6))
    await expect
      .poll(async () => (await section(page, 'ink')).selection, {
        message: `loop ${i + 1}`,
      })
      .toBe(1)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(60)
  }
}

for (const cancel of [true, false]) {
  test(`10 Lasso loops, an app switch in the middle of a loop (${cancel ? 'with' : 'without'} pointercancel), 10 more loops`, async ({
    page,
  }) => {
    const scene = await drawings(page)
    await loops(page, scene, 10)
    // A loop is half drawn when the app goes away.
    await stroke(page, loopAround(scene.a, 6).slice(0, 20), {
      keepDown: true,
      id: 7,
    })
    await expect.poll(() => machineState(page)).toBe('selecting')
    await appSwitch(page, cancel ? 7 : undefined)
    expect(await machineState(page)).toBe('idle')
    expect((await section(page, 'ink')).gesture).toBe('none')
    await loops(page, scene, 10, 10)
  })
}

const LONG =
  'Learning works best when the notes are short, the summary is shorter and the recall cards ask one thing at a time.'

const wordPoint = (page: Page, word: string) =>
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

/** Pencil taps on the page's own clock (`n` taps, 160 ms apart). */
const taps = (page: Page, at: { x: number; y: number }, n: number) =>
  page.evaluate(
    async ({ at, n }) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: 31,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      for (let i = 0; i < n; i++) {
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
    { at, n },
  )

const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

test('the Pencil still works after the app was away: tap, double tap, drag-select, Pen, Text', async ({
  page,
}) => {
  await openNote(page, 'touch', { 'advanced.autoSwitch': 'off' })
  await page.keyboard.press('Enter')
  await page.keyboard.type(LONG)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  const lost = await wordPoint(page, 'recall')
  // The Pencil is down on the words when the app goes away; its lift is lost.
  await page.evaluate((at) => {
    document.elementFromPoint(at.x, at.y)!.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        pointerId: 77,
        clientX: at.x,
        clientY: at.y,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        button: 0,
        buttons: 1,
      }),
    )
  }, lost)
  await appSwitch(page)
  // A single tap places the caret.
  const summary = await wordPoint(page, 'summary')
  await taps(page, summary, 1)
  await expect
    .poll(() =>
      page.evaluate(() => {
        const s = window.getSelection()
        return (
          !!s &&
          s.isCollapsed &&
          !!s.anchorNode &&
          !!document.querySelector('.bn-editor')?.contains(s.anchorNode)
        )
      }),
    )
    .toBe(true)
  await page.waitForTimeout(700) // the next tap is a new one, not a double
  // A double tap selects the word.
  await taps(page, summary, 2)
  await expect.poll(() => marked(page)).toBe('summary')
  // A Pencil loop with the Text filter selects the words inside it.
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.evaluate(() =>
    (
      window.__lnTools as unknown as {
        setLasso: (p: object) => Promise<void>
      }
    ).setLasso({ text: true, ink: true, shape: 'free' }),
  )
  const w = await wordPoint(page, 'Learning')
  const m = 16
  const c: [number, number][] = [
    [w.x + 70 + m, w.y + m],
    [w.x - 60 - m, w.y + m],
    [w.x - 60 - m, w.y - m],
    [w.x + 70 + m, w.y - m],
    [w.x + 70 + m - 1, w.y + m - 2],
  ]
  await stroke(
    page,
    c.slice(1).flatMap((q, i) => line(c[i], q, 10)),
  )
  await expect.poll(() => marked(page)).toContain('Learning')
  // A Pen stroke draws.
  await tool(page, 'Pen').click()
  const box = await textBox(page)
  await stroke(page, wave(box.x + 20, box.x + 200, box.y + box.height + 150))
  await expectStrokes(page, 1)
  // And the Text tool types.
  await tool(page, 'Text').click()
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' typed after')
  await expect(page.locator('.bn-editor')).toContainText('typed after')
})

test('a Lasso loop is half drawn, Text is chosen, the app goes away and comes back: typing works', async ({
  page,
}) => {
  const scene = await drawings(page)
  await stroke(page, loopAround(scene.a, 6).slice(0, 20), {
    keepDown: true,
    id: 7,
  })
  await expect.poll(() => machineState(page)).toBe('selecting')
  await tool(page, 'Text').click()
  await appSwitch(page)
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' typed again')
  await expect(page.locator('.bn-editor')).toContainText('typed again')
  expect((await section(page, 'editLock')).owners).toEqual([])
})
