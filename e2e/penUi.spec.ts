// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { inkNote, savedInk } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Owner bug batch 2, items 2 and 3: with the Pencil, a tap on a dialog or on
 * any in-page button/bar/chip presses it and never inks or types. While a
 * modal dialog is open the ink pad ignores every pointer.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

/** A pen tap with pointer events only, at a point, on whatever is there. */
async function penTapAt(page: Page, x: number, y: number) {
  await page.evaluate(
    ({ x, y }) => {
      const make = (name: string) =>
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
      const el = document.elementFromPoint(x, y)!
      el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
    },
    { x, y },
  )
}

test('a Pencil tap on Done in a dialog presses it; the ink pad takes nothing while it is open', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await page.evaluate(() => {
    const d = document.createElement('dialog')
    d.setAttribute('aria-label', 'Name your page')
    d.style.cssText = 'width:300px;padding:20px'
    d.innerHTML = '<button id="done" type="button">Done</button>'
    document.body.append(d)
    ;(window as unknown as { done: number }).done = 0
    d.querySelector('#done')!.addEventListener('click', () => {
      ;(window as unknown as { done: number }).done++
    })
    d.showModal()
  })
  // The pad is sent a whole stroke while the dialog is open: no ink.
  await page.evaluate(() => {
    const pad = document.querySelector('[data-ink-pad]')!
    const r = pad.getBoundingClientRect()
    const make = (name: string, dx: number) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 9,
        clientX: r.x + 100 + dx,
        clientY: r.y + 100,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        pressure: 0.5,
        buttons: name === 'pointerup' ? 0 : 1,
      })
    pad.dispatchEvent(make('pointerdown', 0))
    for (let i = 1; i < 12; i++) pad.dispatchEvent(make('pointermove', i * 6))
    pad.dispatchEvent(make('pointerup', 80))
  })
  const b = (await page.locator('#done').boundingBox())!
  await penTapAt(page, b.x + b.width / 2, b.y + b.height / 2)
  await expect
    .poll(() =>
      page.evaluate(() => (window as unknown as { done: number }).done),
    )
    .toBe(1)
  await page.waitForTimeout(800)
  expect((await savedInk(page)).strokes).toHaveLength(0)
})

test('a Pencil tap on an in-page button (data-ui) presses it once and does not move the caret', async ({
  page,
}) => {
  await openNote(page, 'pencil')
  await tool(page, 'Text').click()
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  await page.waitForTimeout(700) // the page hold after a tool is chosen
  const info = await page.evaluate(() => {
    const ed = document.querySelector('.bn-editor') as HTMLElement
    ed.focus()
    const host = ed.closest('[data-paper-box]') ?? ed.parentElement!
    const btn = document.createElement('button')
    btn.type = 'button'
    btn.setAttribute('data-ui', '')
    btn.id = 'ui-btn'
    btn.textContent = 'Keep mine'
    btn.style.cssText = 'position:relative;min-height:44px;min-width:120px'
    host.prepend(btn)
    ;(window as unknown as { n: number; down: boolean }).n = 0
    btn.addEventListener('click', () => {
      ;(window as unknown as { n: number }).n++
    })
    btn.addEventListener('pointerdown', (e) => {
      ;(window as unknown as { down: boolean }).down = e.defaultPrevented
    })
    const sel = getSelection()!
    return { anchor: sel.anchorOffset }
  })
  const before = await page.evaluate(() => getSelection()?.anchorOffset)
  // The button must be what is on top at its centre (WebKit lays the page out
  // later than Chromium); a tap on anything else is not a tap on the button.
  // WebKit scrolls the page to the focused editor's caret, which can leave
  // the button (prepended above it) under the page bar: bring it into view.
  const hit = () =>
    page.evaluate(() => {
      const btn = document.querySelector('#ui-btn')!
      btn.scrollIntoView({ block: 'center' })
      const r = btn.getBoundingClientRect()
      return (
        document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)?.id ??
        'other'
      )
    })
  await expect.poll(hit).toBe('ui-btn')
  const b = (await page.locator('#ui-btn').boundingBox())!
  await penTapAt(page, b.x + b.width / 2, b.y + b.height / 2)
  await expect
    .poll(() => page.evaluate(() => (window as unknown as { n: number }).n))
    .toBe(1)
  expect(await page.evaluate(() => getSelection()?.anchorOffset)).toBe(before)
  expect(info.anchor).toBe(before)
  // Nothing was typed.
  expect(
    await page.evaluate(
      () => document.querySelector('.bn-editor')!.textContent ?? '',
    ),
  ).not.toMatch(/[.,]{2}/)
})
