// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  savedInk,
  stroke,
  textBox,
  wave,
} from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * The gesture watchdog (Round 7: R7-1, R7-3, R7-5, R7-6, R7-8). On the iPad
 * a pointer that is down when the app goes to the background never gets its
 * lift; the ink engine, the Lasso, the grip drag, the palm guard and the
 * selection guard then stayed stuck until the app was restarted. Coming
 * back (visibility, focus, a bfcache pageshow) now forgets every half
 * gesture and arms the pad and the tap counters again.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

/** Pretends the app went to the background (or came back). */
async function setVisibility(page: Page, state: 'hidden' | 'visible') {
  await page.evaluate((s) => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      get: () => s,
    })
    document.dispatchEvent(new Event('visibilitychange'))
  }, state)
}

async function hideAndShow(page: Page) {
  await setVisibility(page, 'hidden')
  await page.waitForTimeout(60)
  await setVisibility(page, 'visible')
  await page.waitForTimeout(60)
}

/** The bfcache waking the page as it was. */
const pageShow = (page: Page) =>
  page.evaluate(() => window.dispatchEvent(new Event('pageshow')))

/** A Pencil pressed on the pad and never lifted (the lift was lost). */
async function penDownOnly(page: Page, at: [number, number]) {
  await stroke(page, [at, [at[0] + 1, at[1]]], { keepDown: true, id: 42 })
}

const editable = (page: Page) =>
  page.evaluate(() =>
    document.querySelector('.bn-editor')?.getAttribute('contenteditable'),
  )

test('Pen, Eraser and Lasso work again after a stroke lost its lift while hidden', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + box.height + 40
  await stroke(page, wave(box.x + 20, box.x + 200, y))
  await expectStrokes(page, 1)
  // The Pencil is down when the app goes to the background; no lift ever comes.
  await penDownOnly(page, [box.x + 30, y + 60])
  await hideAndShow(page)
  // The Pen draws again (the half stroke was a stray touch: dropped).
  await stroke(page, wave(box.x + 20, box.x + 200, y + 100))
  const two = await expectStrokes(page, 2)
  // The Eraser erases the first stroke (Precise: it is cut into pieces, so
  // the stroke as drawn is gone from what is saved).
  const first = two.sort((a, b) => a.at - b.at)[0].id
  await tool(page, 'Eraser').click()
  await stroke(page, line([box.x + 100, y - 30], [box.x + 100, y + 30], 20))
  await expect
    .poll(async () =>
      (await savedInk(page)).strokes.some((s) => s.id === first),
    )
    .toBe(false)
  // The Lasso selects what is left.
  await tool(page, 'Lasso').click()
  const ly = y + 100
  await stroke(page, [
    [box.x, ly - 40],
    [box.x + 230, ly - 40],
    [box.x + 230, ly + 40],
    [box.x, ly + 40],
    [box.x, ly - 40],
  ])
  await expect(page.locator('[data-ink-box]')).toBeVisible()
})

test('a Lasso loop left open while hidden: the page is editable again and the next loop selects', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + box.height + 40
  await stroke(page, wave(box.x + 20, box.x + 200, y))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  // A loop begins (the page is held not editable for it) and is never finished.
  await stroke(
    page,
    [
      [box.x + 10, y - 60],
      [box.x + 60, y - 60],
    ],
    {
      keepDown: true,
      id: 43,
    },
  )
  expect(await editable(page)).toBe('false')
  await hideAndShow(page)
  expect(await editable(page)).not.toBe('false')
  await stroke(page, [
    [box.x, y - 40],
    [box.x + 230, y - 40],
    [box.x + 230, y + 40],
    [box.x, y + 40],
    [box.x, y - 40],
  ])
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  await expect(page.locator('[data-ink-menu]')).toBeVisible()
})

test('a bfcache pageshow arms the pad again', async ({ page }) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + box.height + 40
  await penDownOnly(page, [box.x + 30, y])
  await pageShow(page)
  await stroke(page, wave(box.x + 20, box.x + 200, y + 60))
  await expectStrokes(page, 1)
})

test('the eraser still erases after the Pen, the Lasso and a background trip in a row', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + box.height + 40
  await stroke(page, wave(box.x + 20, box.x + 200, y))
  const [drawn] = await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await stroke(page, [
    [box.x, y - 40],
    [box.x + 230, y - 40],
    [box.x + 230, y + 40],
    [box.x, y + 40],
    [box.x, y - 40],
  ])
  await expect(page.locator('[data-ink-box]')).toBeVisible()
  // A handle drag begins and the app goes away before it ends.
  const handle = page.locator('[data-handle="rotate"]')
  const hb = (await handle.boundingBox())!
  await stroke(page, [[hb.x + hb.width / 2, hb.y + hb.height / 2]], {
    keepDown: true,
    id: 44,
  })
  await hideAndShow(page)
  await tool(page, 'Eraser').click()
  await stroke(page, line([box.x + 100, y - 30], [box.x + 100, y + 30], 20))
  // The stroke as drawn is gone (cut into pieces or erased).
  await expect
    .poll(async () =>
      (await savedInk(page)).strokes.some((s) => s.id === drawn.id),
    )
    .toBe(false)
})

// ---- Pencil taps in typing mode (R7-4, R7-6) ----

const LONG =
  'Learning works best when the notes are short, the summary is shorter and the recall cards ask one thing at a time, so that each review session stays quick and the memory of the page grows stronger every single day of the week.'

/**
 * A note with a long paragraph, Text tool on, in Touch mode with the
 * automatic switch to Pencil mode off (it would turn "tap twice" on after
 * the first pen tap and cancel the next one, which is not the iPad's state:
 * the owner's iPad is in Pencil mode throughout).
 */
async function typingNote(page: Page) {
  await openNote(page, 'touch', { 'advanced.autoSwitch': 'off' })
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await page.keyboard.press('Enter')
  await page.keyboard.type(LONG)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
}

type Pt2 = { x: number; y: number }

async function wordPoint(page: Page, word: string): Promise<Pt2> {
  return page.evaluate((w) => {
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
}

/**
 * Pencil taps run INSIDE the page on its own clock (a slow test runner
 * cannot stretch the gaps), `gap` ms apart: pointer events, and (as iPadOS
 * does after a tap that was not cancelled) the synthetic mouse events a
 * moment later.
 */
async function taps(page: Page, at: Pt2, n: number, gap = 160) {
  await page.evaluate(
    async ({ at, n, gap }) => {
      const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
      const make = (name: string, x: number, y: number) =>
        new PointerEvent(name, {
          pointerType: 'pen',
          pointerId: 31,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      for (let i = 0; i < n; i++) {
        if (i > 0) await sleep(gap)
        const el = document.elementFromPoint(at.x, at.y)!
        const kept = el.dispatchEvent(make('pointerdown', at.x, at.y))
        el.dispatchEvent(make('pointerup', at.x + (i % 2 ? 4 : 0), at.y))
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
    { at, n, gap },
  )
}

/** A Pencil pressed on the words and never lifted (the lift was lost). */
async function penDownLost(page: Page, at: Pt2) {
  await page.evaluate((at) => {
    const el = document.elementFromPoint(at.x, at.y)!
    el.dispatchEvent(
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
  }, at)
}

const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

const markedRows = (page: Page) =>
  page.evaluate(() => {
    const tops = new Set<number>()
    for (const el of document.querySelectorAll('.bn-editor .ln-sel')) {
      for (const r of el.getClientRects()) {
        if (r.width > 0) tops.add(Math.round(r.top / 4))
      }
    }
    return tops.size
  })

/** The iPad sequence behind R7-6: a press whose lift is lost, then away and back. */
async function lostLiftAndBack(page: Page, at: Pt2) {
  await penDownLost(page, at)
  await hideAndShow(page)
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
}

test('R7-6: a double tap still selects the word after a lost lift and a background trip, Text tool on', async ({
  page,
}) => {
  await typingNote(page)
  const at = await wordPoint(page, 'summary')
  await lostLiftAndBack(page, at)
  await taps(page, at, 2)
  await expect.poll(() => marked(page)).toBe('summary')
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
  // It stays (R7-4): a late collapse with no new tap is put back.
  await page.waitForTimeout(2000)
  expect(await marked(page)).toBe('summary')
})

test('R7-6: a triple tap still selects the screen row after a lost lift and a background trip', async ({
  page,
}) => {
  await typingNote(page)
  const at = await wordPoint(page, 'review')
  await lostLiftAndBack(page, at)
  await taps(page, at, 3)
  await expect.poll(() => marked(page)).toContain('review')
  expect(await markedRows(page)).toBe(1)
  const text = await marked(page)
  expect(text.length).toBeLessThan(LONG.length - 20)
  await page.waitForTimeout(2000)
  expect(await marked(page)).toBe(text)
})

test('R7-6: four taps still select the paragraph after a lost lift and a background trip', async ({
  page,
}) => {
  await typingNote(page)
  const at = await wordPoint(page, 'review')
  await lostLiftAndBack(page, at)
  await taps(page, at, 4)
  await expect.poll(() => marked(page)).toBe(LONG)
})

test('R7-4: a double-tap selection is still there after 5 s with sync live-apply running', async ({
  page,
}) => {
  // Sync is on for this device: the open editor listens for synced blocks.
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:sync.enabled', '1')
  })
  await typingNote(page)
  const at = await wordPoint(page, 'summary')
  await taps(page, at, 2)
  await expect.poll(() => marked(page)).toBe('summary')
  // The churn after a selection on the real iPad: a late collapse of the
  // browser's selection, a focus trip, and a synced change to another block
  // of this page arriving from "the other device".
  await page.evaluate(() => {
    const s = window.getSelection()
    if (s && s.anchorNode) s.collapse(s.anchorNode, s.anchorOffset)
    window.dispatchEvent(new Event('blur'))
    window.dispatchEvent(new Event('focus'))
  })
  const remote = await page.evaluate(
    () =>
      new Promise<string>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction('blocks', 'readwrite')
          const store = tx.objectStore('blocks')
          const all = store.getAll()
          all.onsuccess = () => {
            type Row = {
              id: string
              pageId: string
              content: {
                text?: { type: string; text: string; styles: object }[]
              }
              updatedAt: number
              deletedAt: number | null
            }
            const rows = (all.result as Row[]).filter((r) => !r.deletedAt)
            const page = rows.find((r) =>
              JSON.stringify(r.content).includes('recall cards'),
            )!
            const other = rows.find(
              (r) => r.pageId === page.pageId && r.id !== page.id,
            )!
            other.content = {
              ...other.content,
              text: [
                { type: 'text', text: 'From the other device', styles: {} },
              ],
            }
            other.updatedAt = Date.now()
            store.put(other)
            tx.oncomplete = () => {
              db.close()
              new BroadcastChannel('learning-notes:sync.applied').postMessage({
                table: 'blocks',
                ids: [other.id],
                pageIds: [other.pageId],
              })
              resolve(other.id)
            }
          }
        }
      }),
  )
  expect(remote).toBeTruthy()
  // Live apply put the other device's text into the page...
  await expect(page.locator('.bn-editor')).toContainText(
    'From the other device',
    { timeout: 10_000 },
  )
  await page.waitForTimeout(5000)
  // ...and the selection is still there.
  expect(await marked(page)).toBe('summary')
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
})
