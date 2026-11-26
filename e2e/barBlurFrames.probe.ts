// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Measurement (issue 73, cause 4): the time between drawn frames around the
 * first show of the box bar, with the bar's blur (the app's own look) and with
 * the lighter look (`data-glass='lite'`, no blur). It asserts nothing about
 * speed: it writes the numbers into the result (annotations "bar frames") and
 * the log, so the two looks can be compared on the machine that runs it. The
 * only checks are that the box is picked and its bar is shown.
 */
test.use({
  viewport: { width: 834, height: 1194 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!

async function ready(page: Page, name: string) {
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
  })
  await startInMode(page, 'pencil')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count()) ? await rect(sheetEl) : main
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + 300)
  const box = page.locator(EXTRA).first()
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Alpha beta')
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.keyboard.press('Escape')
  return box
}

/** A finger tap in the empty part of the box selects it. */
async function pickNow(page: Page, box: Locator) {
  const p = await box.locator('.bn-editor').evaluate((ed) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    return { x: ed.getBoundingClientRect().right - 14, y: b.y + b.height / 2 }
  })
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        pointerType: 'touch',
        pointerId: 32,
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
  }, p)
}

/** Frame times (ms) for `span` ms from now, started in the page itself. */
const watchFrames = (page: Page, span: number) =>
  page.evaluate(
    (ms) =>
      new Promise<{ gaps: number[] }>((resolve) => {
        const gaps: number[] = []
        let last = performance.now()
        const t0 = last
        const step = (t: number) => {
          gaps.push(t - last)
          last = t
          if (t - t0 < ms) requestAnimationFrame(step)
          else resolve({ gaps })
        }
        requestAnimationFrame(step)
      }),
    span,
  )

const sum = (gaps: number[]) => {
  const s = [...gaps].sort((a, b) => a - b)
  const q = (f: number) => s[Math.min(s.length - 1, Math.floor(s.length * f))]
  return `${gaps.length} frames in the window, median ${q(0.5).toFixed(1)} ms, p90 ${q(0.9).toFixed(1)} ms, worst ${s[s.length - 1].toFixed(1)} ms`
}

for (const look of ['blur', 'lite'] as const) {
  for (let round = 0; round < 6; round++) {
    test(`bar frames: ${look} (${round})`, async ({ page }) => {
      const box = await ready(
        page,
        'Fr' + Math.random().toString(36).slice(2, 6),
      )
      if (look === 'lite')
        await page.evaluate(() =>
          document.documentElement.setAttribute('data-glass', 'lite'),
        )
      const quiet = await watchFrames(page, 1000)
      // The window starts in the page just before the tap and covers the
      // bar's first show (200 ms fade) and the second after it.
      const during = watchFrames(page, 2500)
      await pickNow(page, box)
      await expect(page.locator('[data-picked]')).toHaveCount(1)
      await expect(page.locator('[data-box-bar]')).toHaveCount(1)
      const { gaps } = await during
      // The app's own frame probe may turn the blur off by itself: say what the page had at the end.
      const glass = await page.evaluate(
        () => document.documentElement.dataset.glass ?? 'blur',
      )
      const text = `${look} (glass at the end: ${glass}): before the bar ${sum(quiet.gaps)}; around its first show ${sum(gaps)}`
      test.info().annotations.push({ type: 'bar frames', description: text })
      console.log(`BARFRAMES ${test.info().project.name} ${text}`)
    })
  }
}
