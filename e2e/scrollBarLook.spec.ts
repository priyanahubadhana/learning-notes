// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, startInTheme } from './helpers.ts'

/**
 * P1.4 (owner 14 Nov, L1: "make it premium ... in dark colour mode it is not
 * visible"), behind the new app frame (foundation.shell). The LOOK of the
 * shared scroll bar; sizes and behaviour are P1.1's (SC-11 to SC-13).
 *  SC-04  (rewritten) the colours the eye sees: the thumb is at least 3:1 on
 *         what it really sits on (track over the page), in Light, Dark, Sepia.
 *  SC-14  at rest / hover / press / drag the thumb changes colour and width
 *         calmly: rest 8 px, hover stronger ink, drag 12 px in the accent.
 *  SC-15  the arrows are the app's icon style (Lucide chevron, stroke 1.6),
 *         dimmed at their end; a quiet round hover well appears on hover.
 *  SC-16  the track is a quiet pill with a hairline, the thumb a pill with a
 *         hairline halo.
 *  SC-17  motion is calm: 180 ms (the --dur-2 token); reduced motion = instant.
 */
const ON = '/?flags=foundation.shell,toolbar.v8'
test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

async function longPage(page: Page, theme: 'day' | 'night' | 'sepia') {
  await startInMode(page, 'pencil')
  await startInTheme(page, theme)
  await page.goto(ON)
  await createNotebook(page, 'Heart', 'Cardiology')
  const main = page.locator('main[data-page-scroller]')
  await expect(main).toBeVisible()
  await main.evaluate((el) => {
    const filler = document.createElement('div')
    filler.style.height = '5000px'
    el.appendChild(filler)
  })
  await expect(page.locator('[data-pagebar-thumb]')).toBeVisible()
}

/** Contrast of the thumb against what is behind it, as rendered. */
function seen(page: Page) {
  return page.evaluate(() => {
    type Rgba = [number, number, number, number]
    const cv = document.createElement('canvas')
    cv.width = cv.height = 1
    const ctx = cv.getContext('2d', { willReadFrequently: true })!
    const parse = (c: string): Rgba => {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = '#000'
      ctx.fillStyle = c
      ctx.fillRect(0, 0, 1, 1)
      const d = ctx.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const over = (t: Rgba, b: Rgba): Rgba => [
      t[0] * t[3] + b[0] * (1 - t[3]),
      t[1] * t[3] + b[1] * (1 - t[3]),
      t[2] * t[3] + b[2] * (1 - t[3]),
      1,
    ]
    // Behind the bar: the page scroller and everything it sits in.
    let bg: Rgba = [255, 255, 255, 1]
    const chain: Element[] = []
    for (
      let n: Element | null = document.querySelector(
        'main[data-page-scroller]',
      );
      n;
      n = n.parentElement
    )
      chain.push(n)
    for (const n of chain.reverse()) {
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c[3] > 0) bg = over(c, bg)
    }
    const track = document.querySelector('[data-pagebar-track]')!
    const withTrack = over(
      parse(getComputedStyle(track, '::before').backgroundColor),
      bg,
    )
    const thumb = parse(
      getComputedStyle(document.querySelector('[data-pagebar-thumb]')!)
        .backgroundColor,
    )
    const lum = ([r, g, b]: Rgba) => {
      const f = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const ratio = (a: Rgba, b: Rgba) => {
      const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x)
      return (hi + 0.05) / (lo + 0.05)
    }
    return {
      onTrack: ratio(thumb, withTrack),
      onPage: ratio(thumb, bg),
      trackOnPage: ratio(withTrack, bg),
    }
  })
}

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`SC-04 ${theme}: the rendered thumb is at least 3:1 on its track and on the page`, async ({
    page,
  }) => {
    await longPage(page, theme)
    const r = await seen(page)
    expect(r.onTrack, 'thumb on track').toBeGreaterThanOrEqual(3)
    expect(r.onPage, 'thumb on page').toBeGreaterThanOrEqual(3)
    // The track is quiet: a little different from the page, never louder than the thumb.
    expect(r.trackOnPage).toBeGreaterThan(1.02)
    expect(r.trackOnPage).toBeLessThan(r.onTrack)
  })
}

const style = (page: Page, sel: string, prop: string) =>
  page
    .locator(sel)
    .evaluate((el, p) => getComputedStyle(el).getPropertyValue(p), prop)

// Hover states exist where a pointer hovers (a mouse or trackpad; `(hover: hover)`), so these two run without touch.
test.describe('pointer states', () => {
  test.use({ hasTouch: false })
  test('SC-14 thumb: rest 8 px, hover stronger, drag 12 px in the accent colour', async ({
    page,
  }) => {
    await longPage(page, 'night')
    const thumb = page.locator('[data-pagebar-thumb]')
    const bg = () => style(page, '[data-pagebar-thumb]', 'background-color')
    const width = () => thumb.evaluate((el) => el.getBoundingClientRect().width)
    const rest = await bg()
    expect(await width()).toBeCloseTo(8, 0)
    const box = (await thumb.boundingBox())!
    const at = { x: box.x + box.width / 2, y: box.y + box.height / 2 }
    await page.mouse.move(at.x, at.y)
    await expect.poll(bg).not.toBe(rest)
    const hover = await bg()
    // Hover is the stronger ink: brighter than rest on a dark page.
    const light = (c: string) =>
      c
        .match(/\d+/g)!
        .slice(0, 3)
        .reduce((a, b) => a + +b, 0)
    expect(light(hover)).toBeGreaterThan(light(rest))
    await page.mouse.down()
    await page.mouse.move(at.x, at.y + 80, { steps: 4 })
    await expect.poll(width).toBeCloseTo(12, 0)
    const accent = await page.evaluate(() => {
      const p = document.createElement('i')
      p.style.color = 'var(--color-accent)'
      document.body.appendChild(p)
      const c = getComputedStyle(p).color
      p.remove()
      return c
    })
    await expect.poll(bg).toBe(accent)
    await page.mouse.up()
    await expect.poll(width).toBeCloseTo(8, 0)
  })

  test('SC-15 arrows are Lucide chevrons (stroke 1.6), dimmed at their end, with a round hover well', async ({
    page,
  }) => {
    await longPage(page, 'day')
    for (const dir of ['up', 'down']) {
      const svg = page.locator(`[data-pagebar-arrow="${dir}"] svg`)
      await expect(svg).toHaveClass(new RegExp(`lucide-chevron-${dir}`))
      await expect(svg).toHaveAttribute('stroke-width', '1.6')
    }
    // At the top the up arrow is dimmed, the down arrow is not.
    const dim = (d: string) =>
      style(page, `[data-pagebar-arrow="${d}"]`, 'opacity')
    expect(Number(await dim('up'))).toBeLessThan(0.5)
    expect(Number(await dim('down'))).toBe(1)
    // Hover: a quiet round well (the ::before) in the app's hover colour.
    const down = (await page
      .locator('[data-pagebar-arrow="down"]')
      .boundingBox())!
    await page.mouse.move(down.x + down.width / 2, down.y + down.height / 2)
    const well = () =>
      page.locator('[data-pagebar-arrow="down"]').evaluate((el) => {
        const s = getComputedStyle(el, '::before')
        return { bg: s.backgroundColor, r: s.borderTopLeftRadius }
      })
    await expect
      .poll(async () => (await well()).bg)
      .not.toBe('rgba(0, 0, 0, 0)')
    expect(parseFloat((await well()).r)).toBeGreaterThanOrEqual(8)
  })
})

test('SC-16 the track is a quiet pill with a hairline; the thumb a pill with a halo', async ({
  page,
}) => {
  await longPage(page, 'night')
  const track = await page.locator('[data-pagebar-track]').evaluate((el) => {
    const s = getComputedStyle(el, '::before')
    return {
      r: parseFloat(s.borderTopLeftRadius),
      w: parseFloat(s.width),
      shadow: s.boxShadow,
    }
  })
  expect(track.r).toBeGreaterThanOrEqual(7)
  // Wider than the 8 px thumb, so the thumb sits inside it with air; not the whole 22 px bar.
  expect(track.w).toBeGreaterThan(8)
  expect(track.w).toBeLessThan(22)
  expect(track.shadow).not.toBe('none')
  expect(await style(page, '[data-pagebar-thumb]', 'box-shadow')).not.toBe(
    'none',
  )
})

test('SC-17 motion: 180 ms by the token; reduced motion is instant', async ({
  page,
}) => {
  await longPage(page, 'day')
  const all = async (sel: string, want: string) =>
    (await style(page, sel, 'transition-duration'))
      .split(',')
      .every((d) => d.trim() === want)
  expect(await all('[data-pagebar-thumb]', '0.18s')).toBe(true)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  expect(await all('[data-pagebar-thumb]', '0s')).toBe(true)
  expect(await all('[data-pagebar-arrow="down"]', '0s')).toBe(true)
})
