// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode } from './helpers.ts'

/**
 * P1.1 (first look L4 + L1), all behind the new app frame (foundation.shell).
 *  SC-11 the Pencil works on the bar like a finger (thumb drag, arrows, track
 *        tap) and never reaches the tool bar or rows behind it.
 *  SC-12 a sheet docked over the page hides the covered page's bar (one bar
 *        per edge).
 *  SC-13 the bar is a bit bigger than 14 Nov (thumb, width, arrows) and every
 *        touch area is at least 44 pt.
 */
const ON = '/?flags=foundation.shell,toolbar.v8'

test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

/** Makes the page long, so its bar shows. */
async function longPage(page: Page, url = ON) {
  await startInMode(page, 'pencil')
  await page.goto(url)
  await createNotebook(page, 'Heart', 'Cardiology')
  const main = page.locator('main[data-page-scroller]')
  await expect(main).toBeVisible()
  await main.evaluate((el) => {
    const filler = document.createElement('div')
    filler.style.height = '5000px'
    filler.setAttribute('data-test-filler', '')
    el.appendChild(filler)
  })
  await expect(page.locator('[data-pagebar-root]')).toBeVisible()
  return main
}

/** What a Pencil sends: pointer events with pointerType pen, at a point. */
async function pen(
  page: Page,
  steps: { type: 'down' | 'move' | 'up'; x: number; y: number }[],
) {
  await page.evaluate((list) => {
    for (const s of list) {
      const el = document.elementFromPoint(s.x, s.y) ?? document.body
      el.dispatchEvent(
        new PointerEvent('pointer' + s.type, {
          pointerType: 'pen',
          pointerId: 41,
          clientX: s.x,
          clientY: s.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: s.type === 'up' ? 0 : 1,
        }),
      )
    }
  }, steps)
}

const centre = async (page: Page, sel: string) => {
  const b = (await page.locator(sel).boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

test('SC-11 a Pencil drags the page bar thumb and the page follows', async ({
  page,
}) => {
  const main = await longPage(page)
  const at = await centre(page, '[data-pagebar-thumb]')
  await pen(page, [
    { type: 'down', ...at },
    { type: 'move', x: at.x, y: at.y + 60 },
    { type: 'move', x: at.x, y: at.y + 120 },
    { type: 'up', x: at.x, y: at.y + 120 },
  ])
  await expect
    .poll(() => main.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(200)
})

test('SC-11 a Pencil tap on an arrow and on the track moves the page', async ({
  page,
}) => {
  const main = await longPage(page)
  const down = await centre(page, '[data-pagebar-arrow="down"]')
  await pen(page, [
    { type: 'down', ...down },
    { type: 'up', ...down },
  ])
  await expect
    .poll(() => main.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(100)
  await main.evaluate((el) => (el.scrollTop = 0))
  const track = (await page.locator('[data-pagebar-track]').boundingBox())!
  const near = {
    x: track.x + track.width / 2,
    y: track.y + track.height * 0.8,
  }
  await pen(page, [
    { type: 'down', ...near },
    { type: 'up', ...near },
  ])
  await expect
    .poll(() => main.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(1000)
})

test('SC-11 a Pencil tap anywhere across the bar width (not only on the thin track) moves the page', async ({
  page,
}) => {
  const main = await longPage(page)
  const track = (await page.locator('[data-pagebar-track]').boundingBox())!
  const bar = (await page.locator('[data-pagebar-root]').boundingBox())!
  for (const x of [bar.x + 2, bar.x + bar.width - 2]) {
    await main.evaluate((el) => (el.scrollTop = 0))
    // The thumb is back at the top before the next tap.
    await expect
      .poll(
        async () =>
          (await page.locator('[data-pagebar-thumb]').boundingBox())!.y,
      )
      .toBeLessThan(track.y + 5)
    const p = { x, y: track.y + track.height * 0.7 }
    await pen(page, [
      { type: 'down', ...p },
      { type: 'up', ...p },
    ])
    await expect
      .poll(() => main.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(500)
  }
})

test('SC-11 a Pencil touch inside the bar column reaches nothing behind the bar', async ({
  page,
}) => {
  await longPage(page)
  const bar = (await page.locator('[data-pagebar-root]').boundingBox())!
  // Everywhere across the bar's width and height the top element is the bar itself.
  const stray = await page.evaluate((b) => {
    const bad: string[] = []
    for (const fx of [0.05, 0.25, 0.5, 0.75, 0.95])
      for (const fy of [0.02, 0.1, 0.3, 0.5, 0.7, 0.9, 0.98]) {
        const el = document.elementFromPoint(
          b.x + b.width * fx,
          b.y + b.height * fy,
        )
        if (!el?.closest('[data-pagebar-root]'))
          bad.push(`${fx},${fy}:${el?.tagName}`)
      }
    return bad
  }, bar)
  expect(stray).toEqual([])
})

test('SC-12 a sheet over the page (More) hides the page bar: one bar per edge', async ({
  page,
}) => {
  await longPage(page)
  await page.getByRole('button', { name: 'More', exact: true }).first().click()
  await expect(page.getByRole('dialog', { name: 'More' })).toBeVisible()
  await expect(page.locator('[data-pagebar-root]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-pagebar-root]')).toBeVisible()
})

test('SC-12 the tool bar ⋯ menu over the page hides the page bar; its own list keeps one bar', async ({
  page,
}) => {
  await longPage(page, '/?flags=foundation.shell')
  await page.getByRole('button', { name: 'Toolbar menu' }).first().click()
  await expect(
    page.getByRole('button', { name: /^Edit toolbar/ }).first(),
  ).toBeVisible()
  await expect(page.locator('[data-pagebar-root]')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-pagebar-root]')).toBeVisible()
})

test('SC-13 the bar is a bit bigger: thumb 8 px (12 dragged), bar 22 px, arrows 38, 44 pt touch areas', async ({
  page,
}) => {
  await longPage(page)
  const bar = (await page.locator('[data-pagebar-root]').boundingBox())!
  expect(bar.width).toBe(22)
  const thumb = page.locator('[data-pagebar-thumb]')
  const visible = await thumb.evaluate((el) => el.getBoundingClientRect().width)
  expect(visible).toBe(8)
  const arrow = (await page
    .locator('[data-pagebar-arrow="down"]')
    .boundingBox())!
  expect(arrow.height).toBeGreaterThanOrEqual(38)
  // The thumb's touch area (its ::before) is 44 pt wide: hit-test 22 px each side of its centre.
  const hit = await thumb.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const y = r.top + r.height / 2
    const cx = r.left + r.width / 2
    const probe = (dx: number) => document.elementFromPoint(cx + dx, y) === el
    return { l: probe(-21), r: probe(10) }
  })
  expect(hit).toEqual({ l: true, r: true })
})
