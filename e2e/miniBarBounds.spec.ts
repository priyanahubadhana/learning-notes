import { expect, test, type Page } from '@playwright/test'
import { openNote } from './mainBarHelpers.ts'

/**
 * BUG-002: the floating format bar (the mini bar) never leaves the screen,
 * wherever the selected word is, at every iPad and phone size, after turning
 * the screen, with the Aa pop-up open and with the keyboard's short window.
 */

test.use({ hasTouch: true })

const SIZES = [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]

const mini = (page: Page) => page.locator('[data-mini-toolbar]')

async function tap(page: Page, at: { x: number; y: number }) {
  await page.evaluate((a) => {
    const make = (name: string) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 9,
        clientX: a.x,
        clientY: a.y,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        button: 0,
        buttons: name === 'pointerup' ? 0 : 1,
      })
    const el = document.elementFromPoint(a.x, a.y)!
    el.dispatchEvent(make('pointerdown'))
    el.dispatchEvent(make('pointerup'))
  }, at)
}

/** Selects the nth word of the page the way the pen does: a double tap. */
async function selectWordAt(page: Page, align: 'left' | 'right') {
  await page.evaluate((a) => {
    const p = document.querySelector<HTMLElement>(
      '.bn-editor [data-content-type="paragraph"]',
    )
    if (p) p.style.textAlign = a
  }, align)
  const at = await page.evaluate((a) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? ''
      const i = a === 'left' ? text.search(/\S/) : text.trimEnd().length - 3
      if (i < 0 || text.trim().length < 5) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + 2)
      const b = r.getBoundingClientRect()
      if (b.width === 0) continue
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('no word')
  }, align)
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, { x: at.x + 2, y: at.y + 1 })
  await expect(mini(page)).toBeVisible()
}

async function expectOnScreen(page: Page) {
  const m = (await mini(page).boundingBox())!
  const v = page.viewportSize()!
  expect(m.x).toBeGreaterThanOrEqual(-0.5)
  expect(m.y).toBeGreaterThanOrEqual(-0.5)
  expect(m.x + m.width).toBeLessThanOrEqual(v.width + 0.5)
  expect(m.y + m.height).toBeLessThanOrEqual(v.height + 0.5)
  // Never taller than the screen, never wider than the screen.
  expect(m.width).toBeLessThanOrEqual(v.width)
}

type Box = { x: number; y: number; width: number; height: number }
const box = async (page: Page, sel = '[data-mini-toolbar]') => {
  const b = await page.locator(sel).first().boundingBox()
  expect(b, `${sel} is on the page`).not.toBeNull()
  return b as Box
}
const apart = (a: Box, b: Box) =>
  a.x + a.width <= b.x ||
  b.x + b.width <= a.x ||
  a.y + a.height <= b.y ||
  b.y + b.height <= a.y

async function prepare(page: Page, size: { width: number; height: number }) {
  // The one-time Pencil offer would cover the bar and steal taps.
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:pencil.offer', JSON.stringify('no')),
  )
  await page.setViewportSize(size)
  await openNote(page)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
}

for (const size of SIZES) {
  for (const align of ['left', 'right'] as const) {
    test(`BUG-002: ${size.width}x${size.height}, word at the ${align} edge: the format bar stays on the screen, also with ⋯ open`, async ({
      page,
    }) => {
      await prepare(page, size)
      await selectWordAt(page, align)
      await expectOnScreen(page)
      const more = mini(page).locator('[data-mini="more"]')
      await expect(more).toBeVisible()
      await more.click()
      await expect(mini(page).getByRole('group')).toBeVisible()
      await expectOnScreen(page)
    })
  }
}

test('BUG-002: turning the screen with the bar open keeps it on the screen', async ({
  page,
}) => {
  await prepare(page, { width: 1180, height: 820 })
  await selectWordAt(page, 'right')
  await expectOnScreen(page)
  for (const s of [
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
    { width: 390, height: 844 },
    { width: 1024, height: 400 },
  ]) {
    await page.setViewportSize(s)
    await page.waitForTimeout(250)
    await expectOnScreen(page)
  }
})

// Owner (owner-decisions.md:69): the bar must keep its size and its place. It
// may not grow or jump when its pop-ups open, when the format changes, when
// another word is picked, when the screen turns or when the keyboard shows.
for (const size of [
  { width: 820, height: 1180 },
  { width: 1180, height: 820 },
  { width: 390, height: 844 },
]) {
  test(`BUG-002: ${size.width}x${size.height}, the bar keeps its size and place through pop-ups, formatting, a new word, a turn and the keyboard`, async ({
    page,
  }) => {
    await prepare(page, size)
    await selectWordAt(page, 'left')
    const first = await box(page)
    const same = async (what: string) => {
      await page.waitForTimeout(200)
      const now = await box(page)
      expect(now.width, `${what}: width`).toBeCloseTo(first.width, 0)
      expect(now.height, `${what}: height`).toBeCloseTo(first.height, 0)
      expect(now.x, `${what}: x`).toBeCloseTo(first.x, 0)
      expect(now.y, `${what}: y`).toBeCloseTo(first.y, 0)
    }
    // Its three pop-ups: the card never covers the bar, the bar does not move.
    for (const id of ['colour', 'size', 'style']) {
      const b = mini(page).locator(`[data-mini="${id}"]`)
      await expect(b).toBeVisible()
      await b.click()
      const card = page.locator('[data-pill-card]')
      await expect(card).toBeVisible()
      const c = await box(page, '[data-pill-card]')
      const v = page.viewportSize()!
      expect(c.x).toBeGreaterThanOrEqual(-0.5)
      expect(c.y).toBeGreaterThanOrEqual(-0.5)
      expect(c.x + c.width).toBeLessThanOrEqual(v.width + 0.5)
      expect(c.y + c.height).toBeLessThanOrEqual(v.height + 0.5)
      expect(apart(c, await box(page)), `${id} card covers the bar`).toBe(true)
      expect(
        apart(c, await box(page, '[data-options-pill]')),
        `${id} card covers its pill`,
      ).toBe(true)
      await same(`${id} pop-up`)
    }
    // Formatting: the selected word changes width, the bar does not.
    for (const id of ['bold', 'italic']) {
      await mini(page).locator(`[data-mini="${id}"]`).click()
      await same(id)
    }
    // ⋯ opens a second row: the bar may grow only downward, never move up or sideways.
    await mini(page).locator('[data-mini="more"]').click()
    const grown = await box(page)
    expect(grown.x).toBeCloseTo(first.x, 0)
    expect(grown.y + grown.height).toBeLessThanOrEqual(
      page.viewportSize()!.height,
    )
    await mini(page).locator('[data-mini="more"]').click()
    await same('⋯ closed again')
    // The keyboard: a short window. Same size; it moves only if it no longer fits.
    const v = page.viewportSize()!
    await page.setViewportSize({
      width: v.width,
      height: Math.round(v.height * 0.6),
    })
    await page.waitForTimeout(250)
    const kb = await box(page)
    expect(kb.width).toBeCloseTo(first.width, 0)
    expect(kb.height).toBeCloseTo(first.height, 0)
    expect(kb.y + kb.height).toBeLessThanOrEqual(
      Math.round(v.height * 0.6) + 0.5,
    )
    await page.setViewportSize(v)
    await page.waitForTimeout(250)
    // A turn: the bar wraps to the new width (rows may change), stays on the
    // screen, and comes back to the same size and place when turned back.
    await page.setViewportSize({ width: v.height, height: v.width })
    await page.waitForTimeout(250)
    await expectOnScreen(page)
    await page.setViewportSize(v)
    await page.waitForTimeout(250)
    // The page may have scrolled meanwhile, so the place is checked against the
    // words: the bar is next to them, never over them, and has its own size.
    const back = await box(page)
    expect(back.width).toBeCloseTo(first.width, 0)
    expect(back.height).toBeCloseTo(first.height, 0)
    const word = await page.evaluate(() => {
      const r = getSelection()!.getRangeAt(0).getBoundingClientRect()
      return { x: r.x, y: r.y, width: r.width, height: r.height }
    })
    expect(
      apart(back, word),
      `the bar covers its words: ${JSON.stringify({ back, word })}`,
    ).toBe(true)
    expect(
      Math.abs(back.y + back.height / 2 - (word.y + word.height / 2)),
    ).toBeLessThan(160)
  })
}

// The frame rule: cards are solid. The scroll-hint fade used to sit on the card
// itself, so the page showed through its lower edge.
test('BUG-002 side fix: the pop-up card is solid, only its inside scrolls', async ({
  page,
}) => {
  await prepare(page, { width: 390, height: 844 })
  await selectWordAt(page, 'left')
  await mini(page).locator('[data-mini="colour"]').click()
  const card = page.locator('[data-pill-card]')
  await expect(card).toBeVisible()
  const look = await card.evaluate((el) => ({
    mask: getComputedStyle(el).maskImage,
    bg: getComputedStyle(el).backgroundColor,
    inner: getComputedStyle(el.firstElementChild!).overflowY,
  }))
  expect(look.mask).toBe('none')
  expect(look.bg).not.toMatch(/rgba\(.*, 0\)|transparent/)
  expect(look.inner).toBe('auto')
})
