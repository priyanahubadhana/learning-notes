// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { tool } from './mainBarHelpers.ts'

/**
 * Task 2B.8 review 1, fix 1. The tap that selects a box holds back all its
 * own mouse events: a link next to the words does not open (Safari moves a
 * finger's mouse events onto a nearby link), the caret does not move. A tap on
 * the box bar right after still works.
 * Why: the pass-through for the bar first let any link, page link or toggle in
 * the box answer the selecting tap, with textbox.v2 OFF too (the Lasso).
 */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const ED = EXTRA + ' .bn-editor'

async function start(page: Page, v2: boolean) {
  await page.addInitScript((on) => {
    if (on) localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    const w = window as unknown as { __opened: string[] }
    w.__opened = []
    window.open = (u?: string | URL) => {
      w.__opened.push(String(u))
      return null
    }
  }, v2)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Taps', v2 ? 'Link on' : 'Link off')
  await typeInEditor(page, 'Main text')
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  await page.mouse.click(sheet.x + sheet.width * 0.3, main.y + main.height + 60)
  const box = page.locator(EXTRA)
  await expect(box).toHaveCount(1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Read about ')
  await page.evaluate((sel) => {
    const data = new DataTransfer()
    data.setData('text/html', '<a href="https://example.com/">this site</a>')
    data.setData('text/plain', 'this site')
    document.querySelector(sel)!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  }, ED)
  await expect(box.locator('a[href="https://example.com/"]')).toHaveCount(1)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.waitForTimeout(900)
  await expect(box).not.toHaveAttribute('data-picked', '')
  await tool(page, v2 ? 'Text' : 'Lasso').click()
  return box
}

/**
 * A finger tap on "Read" whose mouse events land on the link, as Safari's
 * touch adjustment does. `tap` false sends only the mouse events. `empty`
 * taps the box's empty part instead of its words (owner 17 Nov, "First tap in
 * a box": the words take the caret, the empty part selects the box).
 */
const tapWithMouseOnLink = (page: Page, tap: boolean, empty = false) =>
  page.evaluate(
    ({ sel, tap, empty }) => {
      const ed = document.querySelector(sel)!
      const n = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT).nextNode()!
      const r = document.createRange()
      r.setStart(n, 1)
      r.setEnd(n, 2)
      const b = r.getBoundingClientRect()
      const x = empty ? ed.getBoundingClientRect().right - 14 : b.x + 1
      const y = b.y + b.height / 2
      if (tap)
        for (const type of ['pointerdown', 'pointerup'])
          document.elementFromPoint(x, y)!.dispatchEvent(
            new PointerEvent(type, {
              pointerType: 'touch',
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
      const a = ed.querySelector('a')!
      const ab = a.getBoundingClientRect()
      for (const type of ['mousedown', 'mouseup', 'click'])
        a.dispatchEvent(
          new MouseEvent(type, {
            clientX: ab.x + 4,
            clientY: ab.y + ab.height / 2,
            button: 0,
            buttons: type === 'mousedown' ? 1 : 0,
            detail: 1,
            bubbles: true,
            cancelable: true,
            composed: true,
          }),
        )
    },
    { sel: ED, tap, empty },
  )

const opened = (page: Page) =>
  page.evaluate(() => (window as unknown as { __opened: string[] }).__opened)

for (const v2 of [false, true]) {
  test(`textbox.v2 ${v2 ? 'ON' : 'OFF'}: the first tap on a box selects it and opens no link`, async ({
    page,
  }) => {
    const box = await start(page, v2)
    // The empty part selects (v2); with the switch off a tap on the words does.
    await tapWithMouseOnLink(page, true, v2)
    await expect(box).toHaveAttribute('data-picked', '')
    await page.waitForTimeout(400)
    expect(await opened(page)).toEqual([])
    await expect(box.locator('.bn-editor')).not.toBeFocused()
  })
}

test('textbox.v2 ON (owner 17 Nov): a tap on the words puts the caret there, selects nothing and opens no link', async ({
  page,
}) => {
  const box = await start(page, true)
  await tapWithMouseOnLink(page, true)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await expect(box).not.toHaveAttribute('data-picked', '')
  await page.waitForTimeout(400)
  expect(await opened(page)).toEqual([])
})

test('textbox.v2 ON: a click on the link with no selecting tap opens it (the check above can see it)', async ({
  page,
}) => {
  await start(page, true)
  await tapWithMouseOnLink(page, false)
  await expect.poll(() => opened(page)).toEqual(['https://example.com/'])
})

test('textbox.v2 ON: a bar tap within the selecting tap’s 350 ms works', async ({
  page,
}) => {
  const box = await start(page, true)
  // Once first, so the bar's code is loaded: then time the second.
  await tapWithMouseOnLink(page, true, true)
  await expect(page.locator('[data-box-bar]')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(box).not.toHaveAttribute('data-picked', '')
  // Owner 18 Nov (tap window about 1 s, taps close together are one run): wait
  // it out so this tap is a fresh first tap, not the second of a double tap.
  await page.waitForTimeout(1500)
  const ms = await page.evaluate(async (sel) => {
    const ed = document.querySelector(sel)!
    const n = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT).nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    const x = ed.getBoundingClientRect().right - 14
    const y = b.y + b.height / 2
    const t0 = performance.now()
    for (const type of ['pointerdown', 'pointerup'])
      document.elementFromPoint(x, y)!.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'touch',
          pointerId: 42,
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
    let btn: Element | null = null
    while (!btn && performance.now() - t0 < 300) {
      await new Promise((f) => requestAnimationFrame(f))
      btn = document.querySelector(
        '[data-box-bar] button[aria-label="Box actions"]',
      )
    }
    if (!btn) return -1
    for (const type of ['mousedown', 'mouseup', 'click'])
      btn.dispatchEvent(
        new MouseEvent(type, { button: 0, bubbles: true, cancelable: true }),
      )
    return performance.now() - t0
  }, ED)
  expect(ms).toBeGreaterThan(0)
  expect(ms).toBeLessThan(350)
  // Owner 18 Nov (Box actions in the bar): Duplicate lives in the ⋯ list now.
  await page.getByRole('menuitem', { name: 'Duplicate box' }).click()
  // The copy is made; one box is picked (the duplicate step may move the pick).
  await expect(page.locator(EXTRA)).toHaveCount(2)
  await expect(page.locator(EXTRA + '[data-picked]')).toHaveCount(1)
})

test('textbox.v2 ON: the first selecting tap on a page shows the bar at once, fading in place', async ({
  page,
}) => {
  // Why: the bar waited about 300 ms (a lazy part held back by React's
  // Suspense), then slid 5 px down while the finger reached for it.
  const box = await start(page, true)
  const ms = await page.evaluate(async (sel) => {
    const ed = document.querySelector(sel)!
    const n = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT).nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    const x = ed.getBoundingClientRect().right - 14
    const y = b.y + b.height / 2
    // The moment the bar enters the page (a frame-by-frame poll is too
    // coarse on WebKit, whose frames run late while the tap is handled).
    let shown = -1
    const seen = new MutationObserver(() => {
      if (shown < 0 && document.querySelector('[data-box-bar]'))
        shown = performance.now() - t0
    })
    seen.observe(document.body, { childList: true, subtree: true })
    const t0 = performance.now()
    for (const type of ['pointerdown', 'pointerup'])
      document.elementFromPoint(x, y)!.dispatchEvent(
        new PointerEvent(type, {
          pointerType: 'touch',
          pointerId: 43,
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
    while (shown < 0 && performance.now() - t0 < 1000)
      await new Promise((f) => requestAnimationFrame(f))
    seen.disconnect()
    return shown
  }, ED)
  await expect(box).toHaveAttribute('data-picked', '')
  expect(ms).toBeGreaterThanOrEqual(0)
  expect(ms).toBeLessThan(150)
  const bar = page.locator('[data-box-bar] .pm-ob')
  expect(await bar.evaluate((el) => getComputedStyle(el).animationName)).toBe(
    'pm-fade',
  )
  // It stands still from its first frame on.
  const y0 = (await bar.boundingBox())!.y
  await page.waitForTimeout(300)
  expect((await bar.boundingBox())!.y).toBe(y0)
})
