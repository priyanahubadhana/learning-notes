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
async function longPage(page: Page, url = ON, bar = true) {
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
  if (bar) await expect(page.locator('[data-pagebar-root]')).toBeVisible()
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
  // An arrow stays inside the bar: just left of it is the page, not the arrow.
  const edge = await page.evaluate((x) => {
    const r = document
      .querySelector('[data-pagebar-arrow="down"]')!
      .getBoundingClientRect()
    return document
      .elementsFromPoint(x - 3, r.top + r.height / 2)
      .some((e) => e.closest('[data-pagebar-arrow]'))
  }, bar.x)
  expect(edge).toBe(false)
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

test('SC-13 on touch each end arrow is 44 pt tall inside the gutter, the thumb travels between them, and a tap at its top or bottom edge scrolls', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const main = await longPage(page)
  expect(
    await page.evaluate(() => matchMedia('(any-pointer: coarse)').matches),
  ).toBe(true)
  const bar = (await page.locator('[data-pagebar-root]').boundingBox())!
  const arrowBox = async (dir: 'up' | 'down') =>
    (await page.locator(`[data-pagebar-arrow="${dir}"]`).boundingBox())!
  for (const dir of ['up', 'down'] as const) {
    const box = await arrowBox(dir)
    expect(box.height).toBeGreaterThanOrEqual(44)
    // Inside the bar's own gutter: never over the rows, never past the bar's ends.
    expect(box.x).toBeGreaterThanOrEqual(bar.x - 0.5)
    expect(box.x + box.width).toBeLessThanOrEqual(bar.x + bar.width + 0.5)
    expect(box.y).toBeGreaterThanOrEqual(bar.y - 0.5)
    expect(box.y + box.height).toBeLessThanOrEqual(bar.y + bar.height + 0.5)
    // The whole 44 pt is the arrow's own: its top and bottom pixel rows hit it.
    const own = await page.evaluate(
      ({ s, b }) =>
        [b.y + 1, b.y + b.height - 1].map(
          (y) => !!document.elementFromPoint(b.x + b.width / 2, y)?.closest(s),
        ),
      { s: `[data-pagebar-arrow="${dir}"]`, b: box },
    )
    expect(own).toEqual([true, true])
  }
  // The thumb travels the whole track between the arrows, never under them.
  const thumbBox = async () =>
    (await page.locator('[data-pagebar-thumb]').boundingBox())!
  const up = await arrowBox('up')
  const down = await arrowBox('down')
  expect((await thumbBox()).y).toBeCloseTo(up.y + up.height, 0)
  await main.evaluate((el) => (el.scrollTop = el.scrollHeight))
  await expect
    .poll(async () => {
      const t = await thumbBox()
      return Math.round(t.y + t.height)
    })
    .toBe(Math.round(down.y))

  // A finger and a Pencil tap at the arrow's top and bottom edge both scroll.
  const at = (b: { x: number; width: number }, y: number) => ({
    x: b.x + b.width / 2,
    y,
  })
  for (const [dir, start] of [
    ['down', 0],
    ['up', 3000],
  ] as const) {
    const b = await arrowBox(dir)
    for (const y of [b.y + 2, b.y + b.height - 2])
      for (const input of ['finger', 'pen'] as const) {
        await main.evaluate((el, s) => (el.scrollTop = s), start)
        const arrow = page.locator(`[data-pagebar-arrow="${dir}"]`)
        await expect(arrow).toBeEnabled()
        const p = at(b, y)
        if (input === 'finger') await page.touchscreen.tap(p.x, p.y)
        else
          await pen(page, [
            { type: 'down', ...p },
            { type: 'up', ...p },
          ])
        const moved = expect.poll(() => main.evaluate((el) => el.scrollTop), {
          message: `${input} tap at ${dir} arrow y=${Math.round(y - b.y)}`,
        })
        if (dir === 'down') await moved.toBeGreaterThan(start)
        else await moved.toBeLessThan(start)
      }
  }
})

for (const [name, size] of [
  ['phone', { width: 390, height: 844 }],
  ['short iPad window', { width: 820, height: 600 }],
] as const)
  test(`SC-01 SC-12 the overflowing ⋯ menu shows exactly one bar of its own on a ${name}`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await longPage(page, '/?flags=foundation.shell', false)
    await page.getByRole('button', { name: 'Toolbar menu' }).first().click()
    const edit = page.getByRole('button', { name: /^Edit toolbar/ }).first()
    await expect(edit).toBeVisible()
    await expect(page.locator('[data-pagebar-root]')).toHaveCount(0)
    await expect(page.locator('[data-scrollbar-root]')).toHaveCount(1)
  })
