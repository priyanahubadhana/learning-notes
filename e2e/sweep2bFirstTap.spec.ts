// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addBox,
  centre,
  drag,
  pick,
  rect,
  ring,
  start,
} from './cBoxesHelpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * C30 (owner 17 Nov, docs/design/owner-decisions.md "First tap in a box";
 * replaces the first tap of TB-01 / TB-05), switch textbox.v2, Text tool:
 *  - a tap on or near the words of a box that is not selected (on a written
 *    line, up to about 1.75 letters past its last letter) puts the caret
 *    there at once;
 *  - a tap in the box's empty part further right on a line selects
 *    the box (owner 25 Nov: within 22 px of the border, any tap picks it);
 *  - a tap in the empty part of a selected box keeps it selected.
 * With the Pencil and with a finger.
 */
test.use({
  viewport: { width: 1180, height: 820 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const PRESET_2B = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
]

test.beforeEach(async ({ page }) => {
  await installRealPen(page)
})

/** The right edge of the box's last letter on its first line, and its font size. */
const lineEnd = (box: Locator) =>
  box
    .locator('.bn-inline-content')
    .first()
    .evaluate((el) => {
      const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
      let last: Text | null = null
      for (let n = w.nextNode(); n; n = w.nextNode()) last = n as Text
      const r = document.createRange()
      r.setStart(last!, last!.length - 1)
      r.setEnd(last!, last!.length)
      const b = r.getBoundingClientRect()
      return {
        right: b.right,
        mid: (b.top + b.bottom) / 2,
        bottom: b.bottom,
        fs: parseFloat(getComputedStyle(el).fontSize),
      }
    })

const typingIn = (box: Locator) =>
  box.evaluate((b) => b.contains(document.activeElement))

async function tapAt(page: Page, x: number, y: number, how: 'pen' | 'finger') {
  if (how === 'pen') await realPen(page, [{ x, y }])
  else await page.touchscreen.tap(x, y)
  await page.waitForTimeout(500)
}

async function boxWithWords(page: Page, name: string) {
  await start(page, name, true, PRESET_2B)
  const box = await addBox(page, ['Hello world'], 0.3, 60)
  await expect(box).not.toHaveAttribute('data-picked', '')
  return box
}

for (const how of ['pen', 'finger'] as const) {
  for (const letters of [0.5, 0.9])
    test(`C30 (${how}): a tap ${letters} letter(s) past the last word of an unselected box puts the caret there at once`, async ({
      page,
    }) => {
      const box = await boxWithWords(page, `Near ${how} ${letters}`)
      const e = await lineEnd(box)
      await tapAt(page, e.right + letters * 0.6 * e.fs, e.mid, how)
      expect(await typingIn(box)).toBe(true)
      await expect(box).not.toHaveAttribute('data-picked', '')
    })

  test(`C30 (${how}): a tap 1.5 letters or more past the words selects the box (no caret)`, async ({
    page,
  }) => {
    const box = await boxWithWords(page, `Far ${how}`)
    const e = await lineEnd(box)
    await tapAt(page, e.right + 1.5 * 0.6 * e.fs, e.mid, how)
    await expect(box).toHaveAttribute('data-picked', '')
    expect(await typingIn(box)).toBe(false)
  })

  // C30, rewritten on the owner's word (owner, 25 Nov: "the border should
  // click text box selection"): a tap within about 22 px inside the border
  // picks the box; the rest of the inside (empty or not) takes the caret
  // with the Text tool.
  test(`C30 (${how}): below the lines selects the box; a tap in the empty part of a selected box keeps it selected`, async ({
    page,
  }) => {
    const box = await boxWithWords(page, `Below ${how}`)
    // Make the box taller than its words (its bottom dot).
    await pick(page, box)
    const s = await centre(ring(box, 's'))
    await drag(page, s, { x: s.x, y: s.y + 160 })
    await page.keyboard.press('Escape')
    await page.waitForTimeout(500)
    await expect(box).not.toHaveAttribute('data-picked', '')
    // The whole tall box must be on screen for the edge taps (tablet height).
    await box.evaluate((el) => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(300)
    const e = await lineEnd(box)
    const r = await rect(box)
    const unpick = async () => {
      await page.keyboard.press('Escape')
      await page.evaluate(() =>
        (document.activeElement as HTMLElement | null)?.blur?.(),
      )
      await page.waitForTimeout(500)
      await expect(box).not.toHaveAttribute('data-picked', '')
    }
    // (a) 80 px below the words, well inside: the caret, not a pick.
    const below = { x: r.x + r.width / 2, y: e.bottom + 80 }
    expect(below.y).toBeLessThan(r.y + r.height - 40)
    await tapAt(page, below.x, below.y, how)
    expect(await typingIn(box)).toBe(true)
    await expect(box).not.toHaveAttribute('data-picked', '')
    await unpick()
    // (b) within 22 px inside the bottom, left and right border: picks, no caret.
    const edges = [
      { x: r.x + r.width / 2, y: r.y + r.height - 10 },
      { x: r.x + 10, y: r.y + 90 },
      { x: r.x + r.width - 10, y: r.y + 90 },
    ]
    for (const [i, p] of edges.entries()) {
      await tapAt(page, p.x, p.y, how)
      await expect(box, `border ${i}`).toHaveAttribute('data-picked', '')
      expect(await typingIn(box), `caret after border ${i}`).toBe(false)
      if (i === 0) {
        // (c) on a picked box a border tap keeps it picked.
        await page.waitForTimeout(500)
        await tapAt(page, p.x + 20, p.y, how)
        await expect(box).toHaveAttribute('data-picked', '')
        expect(await typingIn(box)).toBe(false)
      }
      await unpick()
    }
    // (d) Its words still take the caret.
    await tapAt(page, e.right - 10, e.mid, how)
    expect(await typingIn(box)).toBe(true)
  })
}
