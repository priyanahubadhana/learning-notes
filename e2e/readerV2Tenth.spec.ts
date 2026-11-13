/// <reference lib="dom" />
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures/readerReady.ts'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7 (reader v2), gate 3 tenth visit, fix list B (6 fixes).
 */
type Size = { width: number; height: number }
const PHONE: Size = { width: 390, height: 844 }
const IPAD_PORT: Size = { width: 820, height: 1180 }
const IPAD_LAND: Size = { width: 1180, height: 820 }

async function openBook(page: Page, size: Size, unlocked: string[] = []) {
  await page.setViewportSize(size)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((on) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: on }),
    )
  }, unlocked)
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from({ length: 4 }, (_, i) => `Page ${i + 1} words here`),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
  await expect(page.locator('[data-bars-ready]')).toHaveCount(1)
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
}

async function highlight(page: Page) {
  await expect(async () => {
    await page.evaluate(() => {
      const span = document.querySelector('.textLayer span')!
      const range = document.createRange()
      range.selectNodeContents(span)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1000,
    })
  }).toPass()
  await page.getByTestId('hl-yellow').click()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
}

/** Press a reader bar button, from the More card when it is folded there. */
async function press(page: Page, id: string) {
  const b = page.getByTestId(id)
  if (await b.isVisible()) return b.click()
  await page.getByTestId('reader-more').click()
  await page
    .getByTestId(id + '-card')
    .or(page.getByTestId('reader-more-card').getByTestId(id))
    .click()
}

const box = async (l: Locator) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

test('fix 1: Settings on phone, the Preview pill has its own docked row; the list ends above it', async ({
  page,
}) => {
  await page.setViewportSize(PHONE)
  await page.goto('/?flags=settings.v3,foundation.shell#/settings/general')
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  const dock = page.locator('[data-preview-dock]')
  const d = await box(dock)
  expect(d.height).toBeGreaterThanOrEqual(56)
  expect(d.height).toBeLessThanOrEqual(64)
  expect(d.x).toBeLessThanOrEqual(0.5)
  expect(d.width).toBeGreaterThanOrEqual(PHONE.width - 1)
  const p = await box(page.locator('[data-preview-pill]'))
  expect(p.y).toBeGreaterThanOrEqual(d.y)
  expect(p.y + p.height).toBeLessThanOrEqual(d.y + d.height)
  // Nothing of the list shows in the row, wherever the list is scrolled.
  for (const to of [3, 1]) {
    await page.evaluate((to) => {
      let el: HTMLElement | null = document.querySelector('[data-settings-v3]')
      while (
        el &&
        !(
          el.scrollHeight > el.clientHeight + 2 &&
          /auto|scroll/.test(getComputedStyle(el).overflowY)
        )
      )
        el = el.parentElement
      const s = el ?? document.scrollingElement!
      s.scrollTop = s.scrollHeight / to
    }, to)
    const clear = await page.evaluate(
      (y) => {
        const dock = document.querySelector('[data-preview-dock]')!
        return [12, 100, 200].every((x) => {
          const hit = document.elementFromPoint(x, y)
          return !!hit && dock.contains(hit)
        })
      },
      d.y + d.height / 2,
    )
    expect(clear).toBe(true)
  }
  const last = await box(page.locator('[data-setting-id]').last())
  expect(last.y + last.height).toBeLessThanOrEqual(d.y + 0.5)
  // The sheet opens above the row; the pill stays visible to close it.
  await page.locator('[data-preview-pill]').click()
  const s = await box(page.locator('[data-preview-sheet]'))
  expect(s.y + s.height).toBeLessThanOrEqual(d.y + 0.5)
  await page.locator('[data-preview-pill]').click()
  await expect(page.locator('[data-preview-sheet]')).toHaveCount(0)
})

test('fix 2: phone pen bar is 2 rows with Done on the tools row; the options ▾ has a name', async ({
  page,
}) => {
  await openBook(page, PHONE, ['reader.inkLook', 'reader.inkTools'])
  await press(page, 'reader-ink')
  const bar = page.getByTestId('reader-ink-bar')
  const pen = await box(bar.getByTestId('reader-ink-pen'))
  const done = await box(bar.getByTestId('reader-ink-done'))
  expect(Math.abs(done.y - pen.y)).toBeLessThan(4)
  const b = await box(bar)
  expect(b.height).toBeLessThanOrEqual(2 * 52)
  await expect(bar.getByTestId('reader-ink-options')).toHaveText(/\w{3,}/)
})

test('fix 3: pen options show dot and stroke previews under "Size" and "Pen type"', async ({
  page,
}) => {
  await openBook(page, PHONE, ['reader.inkLook'])
  await press(page, 'reader-ink')
  await page.getByTestId('reader-ink-options').click()
  for (const name of ['Size', 'Pen type'])
    await expect(
      page.locator('.pcard-glabel', { hasText: name }).first(),
    ).toBeVisible()
  for (const id of [
    'reader-ink-size-0',
    'reader-ink-size-2',
    'reader-ink-type-fountain',
  ]) {
    const face = await box(
      page.getByTestId(id).locator('.pcard-tile-face > *').first(),
    )
    expect(face.width).toBeGreaterThan(3)
  }
})

test('fix 4: selection pop-up on phone shows the thin track when its row is wider than it', async ({
  page,
}) => {
  await openBook(page, PHONE, ['reader.selExtras'])
  await expect(async () => {
    await page.evaluate(() => {
      const span = document.querySelector('.textLayer span')!
      const range = document.createRange()
      range.selectNodeContents(span)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1000,
    })
  }).toPass()
  const pop = page.getByTestId('selection-popup')
  const pb = await box(pop)
  expect(pb.x + pb.width).toBeLessThanOrEqual(PHONE.width)
  const cut = await pop.evaluate((el) => {
    const r = el.getBoundingClientRect()
    return Array.from(el.querySelectorAll('button')).some((b) => {
      const x = b.getBoundingClientRect()
      return x.right > r.right + 0.5 || x.left < r.left - 0.5
    })
  })
  expect(cut).toBe(true) // all actions on a 390 px phone do not fit…
  await expect(pop.getByTestId('scroll-track')).toBeVisible() // …so the track shows
  // The track still shows after a highlight colour is picked (no update loop).
  await page.getByTestId('hl-yellow').click()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
})

test('fix 5: notes panel uses one button style; filter chips stay on one row', async ({
  page,
}) => {
  await openBook(page, IPAD_PORT, [
    'reader.noteFilters',
    'reader.bulkCards',
    'reader.pagesTab',
  ])
  await highlight(page)
  await page.getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await panel.getByRole('tab', { name: 'Notes' }).click()
  const row = page.getByTestId('annotation-row').first()
  const look = (l: Locator) =>
    l.evaluate((el) => {
      const c = getComputedStyle(el)
      return `${c.borderTopStyle} ${c.borderTopLeftRadius} ${c.minHeight}`
    })
  const want = await look(row.getByRole('button', { name: 'Edit note' }))
  expect(
    await look(row.getByRole('button', { name: 'Delete', exact: true })),
  ).toBe(want)
  expect(await look(page.getByTestId('make-cards-all'))).toBe(want)
  const chips = panel.getByRole('group', { name: /type/i }).getByRole('button')
  const n = await chips.count()
  expect(n).toBeGreaterThan(2)
  const y0 = (await box(chips.first())).y
  for (let i = 1; i < n; i++)
    expect(Math.abs((await box(chips.nth(i))).y - y0)).toBeLessThan(2)
  await panel.getByRole('tab', { name: 'Pages' }).click()
  expect(await look(panel.locator('.rv2-pg-chip').first())).toBe(want)
})

test('fix 6: line focus clears whole lines (the band snaps to the line)', async ({
  page,
}) => {
  await openBook(page, IPAD_LAND, ['reader.lineFocus'])
  await press(page, 'reader-aa')
  await page.getByTestId('aa-tab-more').click()
  await page.getByTestId('aa-ruler-focus').click()
  await page.getByTestId('aa-close').click()
  const words = page.locator('[data-pdf-page="1"] .textLayer span').first()
  await expect(words).toBeVisible()
  const ruler = page.getByTestId('reading-ruler')
  await expect(ruler).toHaveAttribute('data-mode', 'focus')
  await expect(async () => {
    // Measured each try: the text layer can still settle or scroll.
    const span = await words.evaluate(
      (el) => el.getBoundingClientRect().toJSON() as DOMRect,
    )
    expect(span.y).toBeGreaterThan(20)
    // Just under the line: a band centred here would cut through the words.
    await page.mouse.move(span.x + 10, span.y + span.height * 1.6)
    const [above, below] = await ruler.evaluate((el) => {
      const k = el.children
      return [
        (k[0] as HTMLElement).getBoundingClientRect().bottom,
        (k[1] as HTMLElement).getBoundingClientRect().top,
      ]
    })
    expect(above).toBeLessThanOrEqual(span.y + 0.5)
    expect(below).toBeGreaterThanOrEqual(span.y + span.height - 0.5)
  }).toPass()
})

/** Rows of the first page's canvas that carry glyph ink, in page pixels. */
async function inkLines(page: Page) {
  return page.locator('[data-pdf-page="1"] canvas').evaluate((c) => {
    const canvas = c as HTMLCanvasElement
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    const { data, width, height } = ctx.getImageData(
      0,
      0,
      canvas.width,
      canvas.height,
    )
    const r = canvas.getBoundingClientRect()
    const k = r.height / height
    const lines: { top: number; bottom: number }[] = []
    let open = -1
    for (let y = 0; y <= height; y++) {
      let ink = false
      if (y < height)
        for (let x = 0; x < width; x += 1) {
          const i = (y * width + x) * 4
          if (data[i + 3] > 0 && data[i] + data[i + 1] + data[i + 2] < 300) {
            ink = true
            break
          }
        }
      if (ink && open < 0) open = y
      if (!ink && open >= 0) {
        lines.push({ top: r.top + open * k, bottom: r.top + y * k })
        open = -1
      }
    }
    return lines
  })
}

test('tenth final look, fix 1: the clear band holds the whole line it snaps to (canvas ink)', async ({
  page,
}) => {
  // Why: the band was worked out once, when the pointer moved. Closing the
  // Aa card re-lays the page and rebuilds its text layer, so the band kept
  // its unsnapped place, one line low (line-focus-pro-night-ipad-land.png).
  await openBook(page, IPAD_LAND, ['reader.lineFocus'])
  await press(page, 'reader-aa')
  await page.getByTestId('aa-tab-more').click()
  await page.getByTestId('aa-ruler-focus').click()
  await page.getByTestId('aa-close').click()
  const ruler = page.getByTestId('reading-ruler')
  await expect(ruler).toHaveAttribute('data-mode', 'focus')
  // The page settles (ink drawn), then the pointer moves once.
  await expect
    .poll(async () => (await inkLines(page)).length)
    .toBeGreaterThan(0)
  const w = await page
    .locator('[data-pdf-page="1"] .textLayer span')
    .first()
    .evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect)
  await page.mouse.move(w.x + 10, w.y + w.height * 1.6)
  const check = async () => {
    const lines = await inkLines(page)
    const ink = lines[0]
    const h = ink.bottom - ink.top
    const [above, below] = await ruler.evaluate((el) => {
      const k = el.children
      return [
        (k[0] as HTMLElement).getBoundingClientRect().bottom,
        (k[1] as HTMLElement).getBoundingClientRect().top,
      ]
    })
    // Every ink row is inside the band: none is cut at either edge.
    expect(above).toBeLessThanOrEqual(ink.top + 0.5)
    expect(below).toBeGreaterThanOrEqual(ink.bottom - 0.5)
    // Band top is the line top, band height is that line's height.
    expect(ink.top - above).toBeLessThan(h * 0.4)
    expect(below - above).toBeLessThan(h * 1.5)
  }
  await expect(check).toPass({ timeout: 5000 })
  // The Aa card opens and shuts again (the page re-lays, the text layer is
  // rebuilt) while the pointer stays put (clicks sent without moving it):
  // the band snaps again.
  await page.getByTestId('reader-aa').dispatchEvent('click')
  await page.getByTestId('aa-close').dispatchEvent('click')
  await expect(check).toPass({ timeout: 5000 })
  // Pointer on the middle of the line: the same band.
  const ink = (await inkLines(page))[0]
  await page.mouse.move(400, (ink.top + ink.bottom) / 2)
  await expect(check).toPass({ timeout: 5000 })
})
