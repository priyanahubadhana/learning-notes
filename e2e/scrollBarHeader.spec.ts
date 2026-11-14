// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  sheetFill,
  showSidebar,
  startInMode,
} from './helpers.ts'

/**
 * P1.4 fix (owner re-check): the sidebar's "+" (New notebook) was covered by
 * the bar thumb's 44 pt touch area once the list scrolled (6+ notebooks).
 *  SC-18 when a list overflows → no touch box of its bar (thumb area, track,
 *        arrows) overlaps a control of that list, and no control's touch box
 *        overlaps the bar, at any scroll position; a finger tap and a Pencil
 *        tap (pointerType pen) on "+" each create a notebook.
 *        Run on a touch device (touch boxes are 32 x 44 there).
 */
const ON = '/?flags=foundation.shell'
/** The sidebar's list: the one that carries the bar's gutter attribute. */
const LIST = 'aside#sidebar[data-scrollbar], aside#sidebar [data-scrollbar]'
test.use({ hasTouch: true })
const SIZES = {
  upright: { width: 820, height: 450 },
  sideways: { width: 1180, height: 700 },
}

/**
 * Scrolls the sidebar's list to `top` and waits until its bar has followed: the
 * thumb sits where the scroll position says (no fixed sleep).
 */
async function scrollList(page: Page, top: number) {
  await expect(page.locator(LIST).first()).toBeAttached()
  const max = await page.evaluate(
    ([t, list]) => {
      const sc = document.querySelector<HTMLElement>(list as string)!
      sc.scrollTop = t as number
      return sc.scrollHeight - sc.clientHeight
    },
    [top, LIST],
  )
  await expect
    .poll(
      () =>
        page.evaluate((list) => {
          const sc = document.querySelector<HTMLElement>(list)!
          const thumb = document.querySelector('[data-scrollbar-thumb]')
          const track = document.querySelector('[data-scrollbar-track]')
          const root = document.querySelector('[data-scrollbar-root]')
          if (!thumb || !track || !root) return 999
          const t = thumb.getBoundingClientRect()
          const k = track.getBoundingClientRect()
          const m = sc.scrollHeight - sc.clientHeight
          const want =
            k.top + (m ? sc.scrollTop / m : 0) * (k.height - t.height)
          // Also the bar must sit at the list's right edge (the drawer has stopped sliding).
          const edge = Math.abs(
            root.getBoundingClientRect().right -
              sc.getBoundingClientRect().right,
          )
          return Math.max(Math.abs(t.top - want), edge)
        }, LIST),
      { message: `bar follows scrollTop ${top}` },
    )
    .toBeLessThanOrEqual(1)
  return max
}

/** Controls of the list whose whole touch box overlaps the bar column. */
function overlaps(page: Page) {
  return page.evaluate((list) => {
    const side = document.querySelector<HTMLElement>('aside#sidebar')!
    const sc = document.querySelector<HTMLElement>(list)!
    const bad: string[] = []
    const bars = Array.from(
      document.querySelectorAll<HTMLElement>('.sbar'),
    ).map((e) => e.getBoundingClientRect())
    const s = sc.getBoundingClientRect()
    for (const b of Array.from(
      side.querySelectorAll<HTMLElement>('button, input, a, .tip-info'),
    )) {
      const r = b.getBoundingClientRect()
      if (r.width === 0 || r.bottom < s.top || r.top > s.bottom) continue
      // The control's whole touch box against the bar's whole column.
      for (const q of bars)
        if (
          r.right > q.left + 0.5 &&
          r.left < q.right - 0.5 &&
          r.bottom > q.top &&
          r.top < q.bottom
        )
          bad.push(
            (b.getAttribute('aria-label') ?? b.textContent ?? 'control') +
              ' ' +
              Math.round(r.left) +
              '-' +
              Math.round(r.right) +
              ' bar ' +
              Math.round(q.left),
          )
    }
    return bad
  }, LIST)
}

/** Waits until a control holds still between two looks (a drawer has stopped sliding). */
async function holdStill(target: Locator) {
  let last = ''
  await expect
    .poll(
      async () => {
        const now = JSON.stringify(await target.boundingBox())
        const same = now === last
        last = now
        return same
      },
      { intervals: [150] },
    )
    .toBe(true)
}

/** A Pencil tap: pointer events only (pointerType pen), no click. */
async function penTap(target: Locator) {
  const b = (await target.boundingBox())!
  const x = b.x + b.width / 2
  const y = b.y + b.height / 2
  await target.page().evaluate(
    ([px, py]) => {
      const el = document.elementFromPoint(px, py)!
      const make = (type: string) =>
        new PointerEvent(type, {
          pointerType: 'pen',
          pointerId: 52,
          clientX: px,
          clientY: py,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: type === 'pointerup' ? 0 : 1,
        })
      el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
    },
    [x, y],
  )
}

for (const [name, size] of Object.entries(SIZES)) {
  test(`SC-18 ${name}: bar and controls never overlap; "+" creates a notebook (tap and Pencil)`, async ({
    page,
  }) => {
    // 7 real notebooks. Upright is slow to fill by hand (a drawer), so they are made at the
    // wide size and the window is turned upright afterwards: the notebooks stay.
    await page.setViewportSize(SIZES.sideways)
    await startInMode(page, 'pencil')
    await page.goto(ON)
    for (let i = 1; i <= 7; i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    await page.setViewportSize(size)
    const side = page.locator('aside#sidebar')
    await showSidebar(page)
    await expect(side.locator('[data-notebook-row]').last()).toBeVisible()
    // The test runs with the touch sizes on (32 x 44 boxes), or it would prove nothing.
    expect(
      await page.evaluate(
        () => matchMedia('(hover: none), (any-pointer: coarse)').matches,
      ),
    ).toBe(true)
    const max = await scrollList(page, 0)
    expect(max, 'the sidebar overflows').toBeGreaterThan(20)
    for (let top = 0; top <= max; top += 40) {
      await scrollList(page, top)
      expect(await overlaps(page), `scrollTop ${top}`).toEqual([])
    }
    await scrollList(page, 0)
    // "+" is not under any bar part, and a real finger tap and a Pencil tap each create a notebook
    // (on a touch device the new notebook asks for its name in a sheet).
    const plus = side.getByLabel('New notebook')
    const rows = () => side.locator('[data-notebook-row]').count()
    const before = await rows()
    await page.evaluate(() => {
      const el = document.querySelector('[aria-label="New notebook"]')!
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(
        r.left + r.width / 2,
        r.top + r.height / 2,
      )
      if (hit?.closest('.sbar')) throw new Error('a bar part sits over "+"')
    })
    await holdStill(plus)
    const tapAt = (await plus.boundingBox())!
    await page.touchscreen.tap(
      tapAt.x + tapAt.width / 2,
      tapAt.y + tapAt.height / 2,
    )
    await expect(page.getByTestId('name-sheet')).toBeVisible()
    expect(await sheetFill(page, 'Finger notebook')).toBe(true)
    await showSidebar(page)
    // The finger tap made a notebook: one more row (its name is not the point here).
    await expect.poll(rows).toBeGreaterThanOrEqual(before + 1)
    // The drawer closes by itself after naming: open it again until "+" is really on top at the list's start.
    await expect(async () => {
      await showSidebar(page)
      await page.evaluate((list) => {
        document.querySelector<HTMLElement>(list)!.scrollTop = 0
      }, LIST)
      await holdStill(side.getByLabel('New notebook'))
      const b = (await side.getByLabel('New notebook').boundingBox())!
      const top = await page.evaluate(
        ([x, y]) =>
          !!document
            .elementFromPoint(x, y)
            ?.closest('[aria-label="New notebook"]'),
        [b.x + b.width / 2, b.y + b.height / 2],
      )
      expect(top).toBe(true)
    }).toPass()
    await penTap(side.getByLabel('New notebook'))
    await expect(page.getByTestId('name-sheet')).toBeVisible()
    expect(await sheetFill(page, 'Pencil notebook')).toBe(true)
    // The Pencil tap made a notebook too: two more rows than before (its name is not the point here).
    await showSidebar(page)
    await expect.poll(rows).toBeGreaterThanOrEqual(before + 2)
  })
}
