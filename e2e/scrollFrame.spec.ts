import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Slice fix-scroll (iPad test findings 14 Nov, F2/F3/F4/F6/F8), all behind
 * the new app frame (flag foundation.shell).
 *  F8: turning the iPad sideways and back gives exactly the layout of a fresh load.
 *  F2/F6: every scroll area scrolls from anywhere (rows and empty space) with
 *         ONE shared scroll bar with arrows at both ends.
 *  F4: the Notebooks sidebar has no Review / All cards / All summaries rows.
 */
const ON = '/?flags=foundation.shell,toolbar.v8'
const LAND = { width: 1180, height: 820 }
const PORT = { width: 820, height: 1180 }

test.use({ viewport: LAND, hasTouch: true })

/** What the frame looks like: sizes of the parts that broke after rotation. */
async function frameOf(page: Page) {
  return page.evaluate(() => {
    const box = (sel: string) => {
      const el = document.querySelector<HTMLElement>(sel)
      if (!el) return null
      const r = el.getBoundingClientRect()
      return r.width === 0 && r.height === 0
        ? null
        : {
            x: Math.round(r.x),
            w: Math.round(r.width),
            h: Math.round(r.height),
          }
    }
    return {
      top: box('header[data-shell-top]'),
      side: box('aside#sidebar'),
      panel: box('[data-testid="left-panel"]'),
      main: box('main[data-page-scroller]'),
      top2:
        document.querySelector('[data-bar-scroll]')?.getBoundingClientRect()
          .height ?? 0,
      tools: document.querySelectorAll('[data-bar-scroll] [data-tool]').length,
    }
  })
}

test('F8 rotating landscape, portrait, landscape equals a fresh load', async ({
  page,
}) => {
  await page.goto(ON)
  await expect(page.locator('.sh-frame')).toBeVisible()
  await createNotebook(page, 'Heart', 'Cardiology')
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  const settle = () => page.waitForTimeout(1500)
  await settle()
  // The pages panel is open (the owner's state when it broke).
  if ((await page.getByTestId('left-panel').count()) === 0)
    await page.getByTestId('panel-toggle').tap()
  await expect(page.getByTestId('left-panel')).toBeVisible()
  await settle()

  await page.setViewportSize(PORT)
  await settle()
  const rotatedPort = await frameOf(page)
  await page.setViewportSize(LAND)
  await settle()
  const rotatedLand = await frameOf(page)

  await page.reload()
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await settle()
  const freshLand = await frameOf(page)
  await page.setViewportSize(PORT)
  await page.reload()
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await settle()
  const freshPort = await frameOf(page)

  expect(rotatedPort).toEqual(freshPort)
  expect(rotatedLand).toEqual(freshLand)
})

test('F8 a late-reporting window size (iPad Safari right after a turn) is corrected by itself', async ({
  page,
}) => {
  // iPad Safari can report the OLD innerWidth/innerHeight while the new size
  // is already laid out. The frame must read again, not keep the old size.
  await page.addInitScript(() => {
    const w = window as unknown as { __stale?: { w: number; h: number } }
    const iw = Object.getOwnPropertyDescriptor(window, 'innerWidth')
    const ih = Object.getOwnPropertyDescriptor(window, 'innerHeight')
    Object.defineProperty(window, 'innerWidth', {
      configurable: true,
      get: () => w.__stale?.w ?? (iw?.get ? iw.get.call(window) : 0),
    })
    Object.defineProperty(window, 'innerHeight', {
      configurable: true,
      get: () => w.__stale?.h ?? (ih?.get ? ih.get.call(window) : 0),
    })
  })
  await page.goto(ON)
  await createNotebook(page, 'Heart', 'Cardiology')
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await page.evaluate(() => {
    ;(window as unknown as { __stale: unknown }).__stale = { w: 1180, h: 820 }
  })
  await page.setViewportSize(PORT)
  await page.waitForTimeout(100)
  // The window now tells the truth, and no further resize event comes.
  await page.evaluate(() => {
    delete (window as unknown as { __stale?: unknown }).__stale
  })
  await page.waitForTimeout(900)
  const rotated = await frameOf(page)
  await page.reload()
  await expect(page.locator('main[data-page-scroller]')).toBeVisible()
  await page.waitForTimeout(1500)
  expect(rotated).toEqual(await frameOf(page))
})

test('F4 the Notebooks sidebar has no Review / All cards / All summaries rows; the Review space keeps them', async ({
  page,
}) => {
  await page.goto(ON)
  await createNotebook(page, 'Heart', 'Cardiology')
  const rail = page.getByRole('navigation', { name: 'Spaces' })
  await rail.locator('[data-space="notebooks"]').click()
  const side = page.locator('aside#sidebar')
  await expect(side.locator('[data-notebook-row]').first()).toBeVisible()
  for (const name of [/^Review/, 'All cards', /^All summaries/])
    await expect(side.getByRole('button', { name })).toHaveCount(0)
  // Never dropped: the Review space lists them.
  await rail.locator('[data-space="review"]').click()
  for (const name of [/^Review/, 'All cards', /^All summaries/])
    await expect(side.getByRole('button', { name }).first()).toBeVisible()
})

/** The nearest box around a point that scrolls up and down (its test id or tag). */
const scrollerAt = (page: Page, x: number, y: number) =>
  page.evaluate(
    ([px, py]) => {
      let el = document.elementFromPoint(px, py)
      while (el && el !== document.body) {
        const o = getComputedStyle(el).overflowY
        if (
          (o === 'auto' || o === 'scroll') &&
          el.scrollHeight > el.clientHeight + 1
        )
          return el.id || el.tagName
        el = el.parentElement
      }
      return 'none'
    },
    [x, y],
  )

test.describe('F2 / F3 / F6 one scroll bar, scroll from anywhere', () => {
  test.use({ viewport: { width: 1180, height: 560 } })

  test('the Notebooks sidebar is one scroller, rows and empty space scroll alike, with the shared bar and arrows', async ({
    page,
  }) => {
    await page.goto(ON)
    for (let i = 1; i <= 6; i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    const side = page.locator('aside#sidebar')
    await expect(side).toBeVisible()
    const rail = page.getByRole('navigation', { name: 'Spaces' })
    await rail.locator('[data-space="notebooks"]').click()
    await expect(side.locator('[data-notebook-row]').last()).toBeAttached()
    const box = (await side.boundingBox())!
    const row = (await side
      .locator('[data-notebook-row]')
      .first()
      .boundingBox())!

    // One scroller: a row, the header, the padding strip at the edge: all the same.
    const atRow = await scrollerAt(page, row.x + 40, row.y + row.height / 2)
    const atHead = await scrollerAt(page, box.x + 30, box.y + 30)
    const atEdge = await scrollerAt(page, box.x + 3, box.y + box.height / 2)
    expect(atRow).toBe('sidebar')
    expect(atHead).toBe('sidebar')
    expect(atEdge).toBe('sidebar')
    // The list inside does not scroll by itself (that was the second scroller).
    expect(
      await side
        .locator('nav')
        .first()
        .evaluate((el) => getComputedStyle(el).overflowY),
    ).toBe('visible')

    // (The wheel is not available in mobile WebKit: the single scroller above is the proof that every spot scrolls.)

    // The shared bar: both arrows, a thumb, 22 px wide, ends dim.
    const bar = page.locator('[data-scrollbar-root]').first()
    await expect(bar).toBeVisible()
    expect((await bar.boundingBox())!.width).toBeLessThanOrEqual(22)
    await side.evaluate((el) => (el.scrollTop = 0))
    await expect(
      page.locator('[data-scrollbar-arrow="up"]').first(),
    ).toBeDisabled()
    await page.locator('[data-scrollbar-arrow="down"]').first().click()
    await expect
      .poll(() => side.evaluate((el) => el.scrollTop))
      .toBeGreaterThan(50)
    await side.evaluate((el) => (el.scrollTop = el.scrollHeight))
    await expect(
      page.locator('[data-scrollbar-arrow="down"]').first(),
    ).toBeDisabled()
  })
})

test.describe('a bar never shows over a panel that covers its list', () => {
  test.use({ viewport: { width: 1180, height: 560 } })
  test('the sidebar bar hides while the pages panel is open over the sidebar', async ({
    page,
  }) => {
    await page.goto(ON)
    for (let i = 1; i <= 6; i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    await expect(page.locator('[data-scrollbar-root]').first()).toBeVisible()
    await page.getByTestId('panel-toggle').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()
    // The panel is short (one page): no bar of its own, and the covered sidebar shows none.
    await expect(page.locator('[data-scrollbar-root]')).toHaveCount(0)
  })
})

test.describe('gate 2 + final look fixes', () => {
  test.use({ viewport: { width: 1180, height: 560 } })

  test('flag OFF: the page keeps the old 24 px bar and no list gets the shared bar', async ({
    page,
  }) => {
    await page.goto('/?flags=toolbar.v8')
    for (let i = 1; i <= 6; i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    const bar = page.locator('[data-pagebar-root]')
    await expect(bar).toBeVisible()
    expect(Math.round((await bar.boundingBox())!.width)).toBe(24)
    const arrow = (await page
      .locator('[data-pagebar-arrow="up"]')
      .boundingBox())!
    // 40 px (a finger device may raise it to the 44 pt touch size, as before).
    expect(Math.round(arrow.height)).toBeGreaterThanOrEqual(40)
    await expect(page.locator('[data-pagebar-arrow="up"]')).not.toHaveClass(
      /sbar/,
    )
    // The old gutter and classes, not the shared part's.
    const main = page.locator('main[data-page-scroller]')
    await expect(main).toHaveAttribute('data-pagebar', '')
    expect(await main.getAttribute('data-scrollbar')).toBeNull()
    expect(await main.evaluate((el) => getComputedStyle(el).paddingRight)).toBe(
      '24px',
    )
    await expect(page.locator('[data-pagebar-track]')).toHaveClass(
      /bg-hover\/60/,
    )
    // The sidebar overflows, yet no shared bar is drawn anywhere.
    await page.waitForTimeout(800)
    await expect(page.locator('[data-scrollbar-root]')).toHaveCount(0)
    await expect(page.locator('[data-scrollbar]')).toHaveCount(0)
  })

  test('the Card "Scrolling" sample shows the shared bar at rest; capped short it shows the thumb only', async ({
    page,
  }) => {
    await page.goto('/?flags=foundation.shell#/design-tokens')
    const body = page.getByTestId('gal-scroll-card').getByTestId('pcard-body')
    await body.scrollIntoViewIfNeeded()
    /** The bar drawn at the body's right edge (there are other lists on the page). */
    const barOf = () =>
      body.evaluate((el) => {
        const r = el.getBoundingClientRect()
        const root = Array.from(
          document.querySelectorAll<HTMLElement>('[data-scrollbar-root]'),
        ).find((b) => {
          const q = b.getBoundingClientRect()
          return (
            Math.abs(q.right - r.right) < 2 &&
            q.top >= r.top - 1 &&
            q.bottom <= r.bottom + 1
          )
        })
        if (!root) return null
        const q = root.getBoundingClientRect()
        const thumb = root
          .querySelector('[data-scrollbar-thumb]')!
          .getBoundingClientRect()
        return {
          top: q.top - r.top,
          bottom: r.bottom - q.bottom,
          arrows: root.querySelectorAll('[data-scrollbar-arrow]').length,
          thumbH: thumb.height,
        }
      })
    await expect.poll(barOf).not.toBeNull()
    expect((await barOf())!.arrows).toBe(2)
    // Capped to 70 px: no arrows on the content, a real thumb, inside the body.
    await body.evaluate((el) => {
      el.style.maxHeight = '70px'
      el.style.flex = 'none'
    })
    await expect.poll(async () => (await barOf())?.arrows).toBe(0)
    const short = (await barOf())!
    expect(short.thumbH).toBeGreaterThanOrEqual(20)
    expect(short.top).toBeGreaterThanOrEqual(-1)
    expect(short.bottom).toBeGreaterThanOrEqual(-1)
  })

  test('touch: the sidebar shows no keyboard shortcuts; a bar sits inside the rounded corners', async ({
    page,
  }) => {
    await page.goto(ON)
    for (let i = 1; i <= 6; i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    const side = page.locator('aside#sidebar')
    await expect(side).toBeVisible()
    const coarse = await page.evaluate(
      () => matchMedia('(any-pointer: coarse)').matches,
    )
    await expect(side.locator('kbd')).toHaveCount(coarse ? 0 : 2)
    const bar = page.locator('[data-scrollbar-root]').first()
    await expect(bar).toBeVisible()
    const gap = await side.evaluate((el) => {
      const r = el.getBoundingClientRect()
      let top = 0
      let bottom = 0
      for (
        let a: HTMLElement | null = el as HTMLElement;
        a;
        a = a.parentElement
      ) {
        if (Math.abs(a.getBoundingClientRect().right - r.right) > 2) break
        const s = getComputedStyle(a)
        top = Math.max(top, parseFloat(s.borderTopRightRadius) || 0)
        bottom = Math.max(bottom, parseFloat(s.borderBottomRightRadius) || 0)
      }
      return { top, bottom }
    })
    const b = (await bar.boundingBox())!
    const s = (await side.boundingBox())!
    expect(b.y - s.y).toBeGreaterThanOrEqual(gap.top - 1)
    expect(s.y + s.height - (b.y + b.height)).toBeGreaterThanOrEqual(
      gap.bottom - 1,
    )
  })
})

test.describe('phone: a list moved off the screen draws nothing', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('no bar pixels at the left edge while the sidebar drawer is closed', async ({
    page,
  }) => {
    await page.goto(ON)
    for (let i = 1; i <= 6; i++)
      await createNotebook(page, `Book ${i}`, `Page ${i}`)
    await expect(page.locator('main[data-page-scroller]')).toBeVisible()
    await page.waitForTimeout(800)
    const stray = await page.evaluate(
      () =>
        Array.from(
          document.querySelectorAll<HTMLElement>('[data-scrollbar-root]'),
        ).filter((b) => {
          const q = b.getBoundingClientRect()
          return q.left < 0 || q.right > window.innerWidth + 1
        }).length,
    )
    expect(stray).toBe(0)
  })
})

test('the CommandList sample shows the shared bar in its own gutter when its list overflows', async ({
  page,
}) => {
  await page.goto('/?flags=foundation.shell#/design-tokens')
  const list = page.getByTestId('list-demo').getByTestId('cl-list')
  await list.scrollIntoViewIfNeeded()
  await list.evaluate((el) => (el.style.maxHeight = '150px'))
  await expect(list).toHaveAttribute('data-scrollbar', '')
  const gap = await list.evaluate((el) => getComputedStyle(el).paddingRight)
  expect(gap).toBe('22px')
  const r = (await list.boundingBox())!
  const bar = page.locator('[data-scrollbar-root]').filter({
    has: page.locator('[data-scrollbar-thumb]'),
  })
  await expect
    .poll(async () => {
      for (const b of await bar.all()) {
        const q = await b.boundingBox()
        if (q && Math.abs(q.x + q.width - (r.x + r.width)) < 2) return true
      }
      return false
    })
    .toBe(true)
})
