// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
  waitForSaved,
} from './helpers.ts'
import { rect } from './cBoxesHelpers.ts'
import {
  installRealPen,
  realPen,
  realPenTaps,
  type PenTap,
  type Pt,
} from './realPen.ts'

/**
 * Re-test 18 Nov, F5 / F6 / F7 and the tap-speed rule (owner decisions "Tap
 * speed, owner 18 Nov"): iPadOS's own selection UI (the Paste / Select bar)
 * never shows inside notes, a Pencil circle selects exactly what is inside
 * it, and a double / triple tap selects the word / line every time, at normal
 * and slow speed, also on the word where the caret already is.
 *
 * Playwright cannot show the iOS callout, so these assert its CAUSE: the
 * lift (touchend) of the tap or circle is cancelled, the selection range is
 * exact, our own strip shows, and the selection is still there 800 ms later.
 * Page: made through the sidebar's Add page in a notebook that has pages,
 * iPad sideways, Pencil and Touch device modes, Pencil (pen) and finger.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const FLAGS = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'ai.framework',
  'journal.monthRepair',
]
const MAIN = '[data-paper-box="main"]'
const LINE1 = 'Service rate-is on 23-11-2000 done'
const LINE2 = 'Another line of plain words'

/** An older page: a Q/A card in the first paper box (made on the page itself), caret out. */
async function openCardPage(page: Page, mode: 'pencil' | 'touch') {
  await installRealPen(page)
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    FLAGS,
  )
  // The card is made in Computer mode (the block menu is there); the page is
  // then reloaded in the wanted device mode, as an older page would open.
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Old page')
  await typeInEditor(page, 'Question about lakes')
  await page
    .locator('.bn-block-content', { hasText: 'Question about lakes' })
    .first()
    .hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('An answer with fresh rivers here')
  await expect(page.locator(MAIN)).toContainText('with fresh rivers here')
  await waitForSaved(page)
  await page.waitForTimeout(700)
  await page.evaluate((m) => {
    const presets = {
      touch: ['top', 'normal', 'off', 'off'],
      pencil: ['top', 'large', 'off', 'off'],
    }[m as 'touch' | 'pencil']
    const set = (k: string, v: string) =>
      localStorage.setItem('learning-notes:' + k, JSON.stringify(v))
    set('general.deviceMode', m)
    set('advanced.barPlacement', presets[0])
    set('advanced.barSize', presets[1])
    set('advanced.hoverTips', presets[2])
    set('advanced.shortcutHints', presets[3])
  }, mode)
  await page.reload()
  await expect(page.locator(MAIN)).toContainText('with fresh rivers here')
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await page.waitForTimeout(900)
}

async function open(page: Page, mode: 'pencil' | 'touch') {
  await installRealPen(page)
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    FLAGS,
  )
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Old page')
  await typeInEditor(page, 'Old words')
  await addPage(page, 'Paper', 'iOS select')
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await expect(text).toHaveAttribute('aria-pressed', 'true')
  // Two lines of words, then the caret out of the box.
  const main = page.locator(MAIN)
  const first = await rect(main.locator('.bn-block-content').first())
  await realPen(page, [{ x: first.x + 6, y: first.y + 8 }])
  await expect(main.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(LINE1)
  await expect(page.locator('[data-paper-hint]')).toHaveCount(0)
  await waitForSaved(page)
  await page.waitForTimeout(500)
  await page.keyboard.press('ControlOrMeta+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type(LINE2)
  await expect(main).toContainText(LINE2)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  await page.waitForTimeout(900)
}

type How = 'pen' | 'finger'
type Box = { x: number; y: number; width: number; height: number }

/** The screen box of characters from..to of the first match of `word` in the main box. */
const boxOf = (page: Page, word: string, from = 0, to = word.length) =>
  page.evaluate(
    ({ sel, word, from, to }) => {
      const walker = document.createTreeWalker(
        document.querySelector(sel)!,
        NodeFilter.SHOW_TEXT,
      )
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = (n.textContent ?? '').indexOf(word)
        if (i < 0) continue
        const r = document.createRange()
        r.setStart(n, i + from)
        r.setEnd(n, i + to)
        const b = r.getBoundingClientRect()
        return { x: b.x, y: b.y, width: b.width, height: b.height }
      }
      throw new Error('no text ' + word)
    },
    { sel: MAIN, word, from, to },
  ) as Promise<Box>

const centre = (b: Box): Pt => ({ x: b.x + b.width / 2, y: b.y + b.height / 2 })
const selectedText = (page: Page) =>
  page.evaluate(() => window.getSelection()?.toString() ?? '')
const editorText = (page: Page) =>
  page.evaluate(
    (s) =>
      (document.querySelector(s) as HTMLElement).innerText.replace(/\n+/g, ' '),
    MAIN,
  )

/** Records which events the page cancelled (preventDefault) from now on. */
const watchCancels = (page: Page) =>
  page.evaluate(() => {
    const w = window as unknown as { __cancelled: string[]; __pd: boolean }
    w.__cancelled = []
    if (w.__pd) return
    w.__pd = true
    const orig = Event.prototype.preventDefault
    Event.prototype.preventDefault = function (this: Event) {
      if (this.cancelable) w.__cancelled.push(this.type)
      return orig.call(this)
    }
  })
const cancelled = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __cancelled: string[] }).__cancelled,
  )

/** The lift of a Pencil touch (touchType "stylus") at (x, y): was it cancelled? */
const stylusLiftCancelled = (page: Page, at: Pt) =>
  page.evaluate(({ x, y }) => {
    const e = new Event('touchend', { bubbles: true, cancelable: true })
    const t = { identifier: 1, clientX: x, clientY: y, touchType: 'stylus' }
    Object.defineProperty(e, 'changedTouches', { value: [t] })
    Object.defineProperty(e, 'touches', { value: [] })
    const target = document.elementFromPoint(x, y) ?? document.body
    target.dispatchEvent(e)
    return e.defaultPrevented
  }, at)

/** Our own strip: the Paste / Copy / Cut strip, or the mini toolbar of the words. */
const ourStrip = (page: Page) =>
  page.locator('[data-mini-toolbar], [role="menubar"]').first()

async function tapRun(
  page: Page,
  how: How,
  at: Pt,
  count: number,
  gap: number,
) {
  if (how === 'pen') {
    const taps: PenTap[] = [{ hold: 60 }]
    for (let i = 1; i < count; i++) taps.push({ hold: 60, gap })
    await realPenTaps(page, at, taps)
  } else {
    for (let i = 0; i < count; i++) {
      if (i) await page.waitForTimeout(gap)
      await page.touchscreen.tap(at.x, at.y)
    }
  }
}

const MODES = ['pencil', 'touch'] as const
const HOWS = ['pen', 'finger'] as const

for (const mode of MODES) {
  for (const how of HOWS) {
    const name = `${mode} mode, ${how}`

    for (const gap of [150, 600, 950]) {
      test(`F7 ${name}: a double tap ${gap} ms apart selects the word at once, still there 800 ms later, our strip, no Apple lift`, async ({
        page,
      }) => {
        await open(page, mode)
        const word = await boxOf(page, 'plain')
        // The caret goes in at the word first (the worst case: a double tap on the caret).
        await tapRun(page, how, centre(word), 1, 0)
        await page.waitForTimeout(1300)
        await watchCancels(page)
        await tapRun(page, how, centre(word), 2, gap)
        // A Pencil's lift comes right after its last tap: was it cancelled?
        const lift =
          how === 'pen' && (await stylusLiftCancelled(page, centre(word)))
        // Acts at once: no waiting for a third tap.
        await expect
          .poll(() => selectedText(page), { timeout: 600 })
          .toBe('fresh')
        await page.waitForTimeout(800)
        expect(await selectedText(page)).toBe('fresh')
        await expect(ourStrip(page)).toBeVisible()
        if (how === 'finger')
          expect(await cancelled(page)).toContain('touchend')
        else expect(lift).toBe(true)
      })
    }

    test(`F7 ${name}: a triple tap (600 ms apart) selects the line, still there 800 ms later`, async ({
      page,
    }) => {
      await open(page, mode)
      const word = await boxOf(page, 'plain')
      await tapRun(page, how, centre(word), 3, 600)
      await expect
        .poll(() => selectedText(page), { timeout: 800 })
        .toContain(LINE2)
      await page.waitForTimeout(800)
      expect((await selectedText(page)).trim()).toBe(LINE2)
      await expect(ourStrip(page)).toBeVisible()
    })

    test(`F7 ${name}: two taps on far-apart words 600 ms apart are not a double tap`, async ({
      page,
    }) => {
      await open(page, mode)
      const a = await boxOf(page, 'Service')
      const b = await boxOf(page, 'done')
      await tapRun(page, how, centre(a), 1, 0)
      await page.waitForTimeout(600)
      await tapRun(page, how, centre(b), 1, 0)
      await page.waitForTimeout(900)
      expect(await selectedText(page)).toBe('')
    })
  }

  // A circle is the Pencil's gesture (a finger does not make one).
  const circles: [string, string, number, number, string][] = [
    ['a plain word', 'plain', 0, 5, 'plain'],
    ['a date with dashes', '23-11-2000', 0, 10, '23-11-2000'],
    ['a word with a dash', 'rate-is', 0, 7, 'rate-is'],
    ['a few letters inside a word', 'Service', 3, 5, 'vi'],
  ]
  for (const [what, word, from, to, want] of circles) {
    test(`F5/F6 ${mode} mode, pen: a circle round ${what} selects exactly "${want}", our strip, no Apple lift`, async ({
      page,
    }) => {
      await open(page, mode)
      const b = await boxOf(page, word, from, to)
      const c = centre(b)
      const rx = b.width / 2 + 1
      const ry = b.height / 2 + 5
      const ring: Pt[] = []
      for (let i = 0; i <= 26; i++) {
        const a = Math.PI + (i / 24) * Math.PI * 2
        ring.push({ x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry })
      }
      const before = await editorText(page)
      await realPen(page, ring)
      const lift = await stylusLiftCancelled(page, c)
      await expect.poll(() => selectedText(page), { timeout: 800 }).toBe(want)
      await page.waitForTimeout(800)
      expect(await selectedText(page)).toBe(want)
      expect(await editorText(page)).toBe(before)
      await expect(page.getByRole('menubar').first()).toBeVisible()
      expect(lift).toBe(true)
    })
  }
}

/** A loop round (cx, cy), starting at its left edge as a hand does. */
const loop = (c: Pt, rx: number, ry: number): Pt[] =>
  Array.from({ length: 27 }, (_, i) => {
    const a = Math.PI + (i / 24) * Math.PI * 2
    return { x: c.x + Math.cos(a) * rx, y: c.y + Math.sin(a) * ry }
  })

for (const mode of MODES) {
  test(`F6 ${mode} mode, pen: a handwriting-sized loop that encloses no character is left alone (nothing selected, no strip, text unchanged)`, async ({
    page,
  }) => {
    await open(page, mode)
    // The gap between "Service" and "rate-is": too small to hold a character centre.
    const gap = await boxOf(page, 'e r', 1, 2)
    const before = await editorText(page)
    await realPen(page, loop(centre(gap), 4.5, 5.5))
    await page.waitForTimeout(900)
    expect(await selectedText(page)).toBe('')
    await expect(page.getByRole('menubar')).toHaveCount(0)
    expect(await editorText(page)).toBe(before)
  })

  test(`F5/F7 ${mode} mode, pen: in a card's answer inside a paper box a double tap and a circle select a word`, async ({
    page,
  }) => {
    await openCardPage(page, mode)
    const box = page.locator(MAIN)
    await expect(box.locator('.recall-card-label')).toHaveCount(1)
    const where = (word: string) =>
      page.evaluate((w) => {
        const walker = document.createTreeWalker(
          document.querySelector('[data-paper-box="main"]')!,
          NodeFilter.SHOW_TEXT,
        )
        for (let n = walker.nextNode(); n; n = walker.nextNode()) {
          const i = (n.textContent ?? '').indexOf(w)
          if (i < 0) continue
          const r = document.createRange()
          r.setStart(n, i)
          r.setEnd(n, i + w.length)
          const b = r.getBoundingClientRect()
          return { x: b.x, y: b.y, width: b.width, height: b.height }
        }
        throw new Error('no text ' + w)
      }, word) as Promise<Box>
    // A double tap (600 ms apart) on "plain": the word, still there later.
    const plain = await where('fresh')
    await tapRun(page, 'pen', centre(plain), 1, 0)
    await page.waitForTimeout(1300)
    await tapRun(page, 'pen', centre(plain), 2, 600)
    await expect.poll(() => selectedText(page), { timeout: 800 }).toBe('fresh')
    await page.waitForTimeout(800)
    expect(await selectedText(page)).toBe('fresh')
    // A circle round "words": exactly that word, our strip.
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    const words = await where('rivers')
    const c = centre(words)
    await realPen(page, loop(c, words.width / 2 + 1, words.height / 2 + 5))
    await expect.poll(() => selectedText(page), { timeout: 800 }).toBe('rivers')
    await page.waitForTimeout(800)
    expect(await selectedText(page)).toBe('rivers')
    await expect(page.getByRole('menubar').first()).toBeVisible()
  })
}
