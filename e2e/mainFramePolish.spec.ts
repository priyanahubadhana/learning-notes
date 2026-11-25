// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { addBox, rect, selectMain, start } from './cBoxesHelpers.ts'

/**
 * Polish 2B (switch textbox.v2), the page's first box when selected or typing:
 * (1) the frame keeps a small even gap round the words and grows outward (the
 * words do not move); (2) its tab never covers the page's own Notes / Summary /
 * Review tabs: it moves below the box when there is no room above.
 */
test.use({ viewport: { width: 820, height: 1180 } })

test('the first box frame has an even gap round its words and the words stay', async ({
  page,
}) => {
  await start(page, 'Frame gap')
  const main = page.locator('[data-paper-box="main"]')
  const words = async () => rect(main.locator('.bn-inline-content').first())
  const before = await words()
  await main.locator('.bn-editor').click()
  await expect(page.locator('[data-main-frame]')).toBeVisible()
  const f = await rect(page.locator('[data-main-frame]'))
  const w = await words()
  // The words did not move when the frame showed.
  expect(Math.abs(w.x - before.x)).toBeLessThan(1)
  expect(Math.abs(w.y - before.y)).toBeLessThan(1)
  // Same gap as a box beside it (words to frame: sides and top).
  // The first box is selected, so its bar floats just under it (about 24 to 80 px below a
  // one-line box) and takes a tap there; a slow machine shows the bar before the tap, a fast
  // one after it. Tap well under the bar (140 px), where nothing floats on any machine.
  const other = await addBox(page, ['One'], 0.3, 140)
  await other.locator('.bn-editor').click()
  const of = await rect(other.locator('[data-box-frame]').first())
  const ow = await rect(other.locator('.bn-inline-content').first())
  expect(Math.abs(w.x - f.x - (ow.x - of.x))).toBeLessThan(2)
  expect(Math.abs(w.y - f.y - (ow.y - of.y))).toBeLessThan(2)
})

test('the first box tab never covers the page tabs', async ({ page }) => {
  await start(page, 'Tab room')
  await selectMain(page)
  const tabs = await rect(page.locator('[data-page-tabs]'))
  const grip = await rect(page.locator('[data-main-chrome] [data-box-grip]'))
  // Q-1 (review decision 17 Nov): the first box's bar (with its ⋯) floats over the
  // page tabs while the box is selected, on purpose; only the ≡ tab keeps clear.
  expect(
    grip.y >= tabs.y + tabs.height - 0.5 || grip.y + grip.height <= tabs.y,
  ).toBe(true)
})

test('Q-2: while typing the first box shows only its thin frame', async ({
  page,
}) => {
  await start(page, 'Typing hides')
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  await expect(page.locator('[data-main-frame]')).toBeVisible()
  await expect(page.locator('[data-main-chrome] [data-box-grip]')).toHaveCount(
    0,
  )
  await expect(page.locator('[data-main-chrome] [data-box-menu]')).toHaveCount(
    0,
  )
  await expect(
    page.locator('[data-main-chrome] [data-resize-handle]'),
  ).toHaveCount(0)
})

test('Q-2: typing in the first box shows exactly one visible frame (no dashed inner line)', async ({
  page,
}) => {
  await start(page, 'One frame')
  await page.locator('[data-paper-box="main"] .bn-editor').click()
  await expect(page.locator('[data-main-frame]')).toBeVisible()
  // Every element in and round the first box that draws a line of its own.
  const lines = await page.evaluate(() => {
    const root = document.querySelector('[data-paper-box="main"]')!
    const out: string[] = []
    const all = [root, ...Array.from(root.querySelectorAll('*'))]
    for (const el of all) {
      for (const pseudo of [null, '::before', '::after']) {
        const cs = getComputedStyle(el, pseudo)
        const border = ['Top', 'Right', 'Bottom', 'Left'].some(
          (s) =>
            parseFloat(cs.getPropertyValue(`border-${s.toLowerCase()}-width`)) >
              0 &&
            cs.getPropertyValue(`border-${s.toLowerCase()}-style`) !== 'none',
        )
        const outline =
          cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0
        if ((border || outline) && (pseudo || cs.display !== 'none'))
          out.push(
            `${el.tagName}.${(el as HTMLElement).className}${pseudo ?? ''} b=${border} o=${cs.outlineStyle}`,
          )
      }
    }
    return out
  })
  const dashed = await page.evaluate(() => {
    const root = document.querySelector('[data-paper-box="main"]')!
    return [root, ...Array.from(root.querySelectorAll('*'))].filter((el) => {
      const cs = getComputedStyle(el)
      return cs.borderTopStyle === 'dashed' || cs.outlineStyle === 'dashed'
    }).length
  })
  expect(dashed, lines.join('\n')).toBe(0)
  await expect(page.locator('[data-main-frame]')).toHaveCount(1)
})
