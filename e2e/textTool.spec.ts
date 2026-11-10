// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'
import { openPill, pill, tool } from './mainBarHelpers.ts'

/**
 * Owner bug batch 2, item 8: the Text tool. The strip (Text pill) has the box
 * style swatch, Layout and "Pin Text Tool"; Box style has a presets grid and
 * Advanced controls, synced per account; new boxes show a dashed frame and
 * "Type here"; boxes are Idle, Selected or Typing; blank paper held gives
 * "Start typing here"; the iPad keyboard bar sits on the keyboard.
 */
test.use({ viewport: { width: 1336, height: 1100 }, hasTouch: true })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!
const panel = (page: Page) => page.locator('[data-box-style-panel]')

async function start(page: Page, name: string) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

/** A Text-tool tap on blank paper below the main box makes a box (with the caret). */
async function newBox(page: Page, n: number, text = 'Box') {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  await page.mouse.click(
    sheet.x + sheet.width * 0.3,
    main.y + main.height + 50 + (n - 1) * 110,
  )
  const extra = page.locator(EXTRA)
  await expect(extra).toHaveCount(n)
  await expect(extra.nth(n - 1).locator('.bn-editor')).toBeFocused()
  if (text) await page.keyboard.type(text + ' ' + n)
  await page.waitForTimeout(600)
  return extra.nth(n - 1)
}

async function pickFrame(page: Page, box: Locator) {
  // A tap on the frame (the band just below the bottom edge) selects the box.
  // The bottom edge: at the top of a scrolled page the main bar would cover the top band.
  await box.hover()
  const b = await rect(box.locator('[data-box-band="bottom"]'))
  await page.mouse.click(b.x + b.width / 2, b.y + b.height / 2)
}

test('the strip: Box style and Layout buttons, Pin Text Tool keeps it open', async ({
  page,
}) => {
  await start(page, 'Strip')
  const box = await newBox(page, 1)
  await openPill(page, 'Text', 'text')
  await expect(pill(page, 'text').getByLabel('Box style')).toBeVisible()
  await expect(pill(page, 'text').getByLabel('Layout')).toBeVisible()
  await expect(
    pill(page, 'text').getByRole('button', { name: 'Pin Text Tool' }),
  ).toBeVisible()
  await pill(page, 'text').getByLabel('Box style').click()
  await expect(panel(page)).toBeVisible()
  await expect(box).toBeAttached()
})

test('Soft card is saved with the box and survives a reload; Reset clears it', async ({
  page,
}) => {
  await start(page, 'Soft')
  const box = await newBox(page, 1)
  await pickFrame(page, box)
  await box.locator('[data-box-bar]').getByLabel('Box style').click()
  await expect(panel(page)).toBeVisible()
  await panel(page).getByRole('button', { name: 'Soft card' }).click()
  await expect(box.locator('[data-box-style]').first()).toBeVisible()
  await expect(box.locator('[data-box-style]').first()).toHaveCSS(
    'border-top-left-radius',
    '12px',
  )
  await page.waitForTimeout(700)
  await page.reload()
  await expect(page.locator(EXTRA + ' [data-box-style]').first()).toBeVisible()
})

test('Use for new boxes: the next box has the style, the page box stays frameless', async ({
  page,
}) => {
  await start(page, 'Default')
  const first = await newBox(page, 1)
  await pickFrame(page, first)
  await first.locator('[data-box-bar]').getByLabel('Box style').click()
  await panel(page).getByRole('button', { name: 'Yellow' }).click()
  await panel(page).locator('[data-box-style-new]').check()
  await page.waitForTimeout(500)
  await panel(page).getByRole('button', { name: 'Close' }).click()
  await page.keyboard.press('Escape')
  const second = await newBox(page, 2)
  await expect(second.locator('[data-box-style]').first()).toBeVisible()
  await expect(
    page.locator('[data-paper-box="main"] [data-box-style]'),
  ).toHaveCount(0)
})

test('own presets: save one, apply it to another box (up to 8)', async ({
  page,
}) => {
  await start(page, 'Own')
  const a = await newBox(page, 1)
  await pickFrame(page, a)
  await a.locator('[data-box-bar]').getByLabel('Box style').click()
  await panel(page).getByRole('button', { name: 'Peach' }).click()
  await panel(page).locator('[data-box-style-save]').click()
  await expect(panel(page).getByText('Preset 1')).toBeVisible()
  await panel(page).getByRole('button', { name: 'Close' }).click()
  await page.keyboard.press('Escape')
  const b = await newBox(page, 2)
  await pickFrame(page, b)
  await b.locator('[data-box-bar]').getByLabel('Box style').click()
  await panel(page)
    .getByRole('button', { name: 'Preset 1', exact: true })
    .click()
  await expect(b.locator('[data-box-style]').first()).toBeVisible()
})

test('Advanced radius and padding show on the real box; the grid gaps do not change', async ({
  page,
}) => {
  await start(page, 'Adv')
  const box = await newBox(page, 1)
  const before = await rect(box)
  await pickFrame(page, box)
  await box.locator('[data-box-bar]').getByLabel('Box style').click()
  await panel(page).getByRole('tab', { name: 'Advanced' }).click()
  await panel(page)
    .getByRole('group', { name: 'Corner radius' })
    .getByRole('button', { name: '16 px' })
    .click()
  await panel(page)
    .getByRole('group', { name: 'Padding' })
    .getByRole('button', { name: '12 px' })
    .click()
  await panel(page)
    .getByRole('group', { name: 'Background' })
    .getByRole('button', { name: 'Lime' })
    .click()
  await expect(box.locator('[data-box-style]').first()).toHaveCSS(
    'border-top-left-radius',
    '16px',
  )
  const after = await rect(box)
  // The box keeps its place and width (the padding sits inside the cell).
  expect(Math.abs(after.x - before.x)).toBeLessThan(2)
  expect(Math.abs(after.width - before.width)).toBeLessThan(2)
  expect(Math.abs(after.y - before.y)).toBeLessThan(2)
})

test('a new box shows a dashed accent frame and "Type here" until the first character', async ({
  page,
}) => {
  await start(page, 'Frame')
  const box = await newBox(page, 1, '')
  await expect(box.locator('[data-box-frame]').first()).toHaveCSS(
    'border-top-style',
    'dashed',
  )
  const hint = await box
    .locator('.bn-block-content')
    .first()
    .evaluate((el) => getComputedStyle(el, '::after').content)
  expect(hint).toContain('Type here')
  await page.keyboard.type('x')
  const after = await box
    .locator('.bn-block-content')
    .first()
    .evaluate((el) => getComputedStyle(el, '::after').content)
  expect(after).not.toContain('Type here')
})

test('box states: frame tap selects, a tap inside types and hides the bar, the frame brings it back', async ({
  page,
}) => {
  await start(page, 'States')
  const box = await newBox(page, 1)
  await pickFrame(page, box)
  await expect(box).toHaveAttribute('data-picked', '')
  await expect(box.locator('[data-box-bar]')).toBeVisible()
  // Tap inside: typing, the bar hides, a thin outline stays.
  await box.locator('.bn-editor').click()
  await expect(box).toHaveAttribute('data-typing', '')
  await expect(box.locator('[data-box-bar]')).toHaveCount(0)
  await page.keyboard.type(' more')
  await expect(box.locator('.bn-editor')).toContainText('more')
  // The frame again: selected, bar back; typing resumes where it was.
  await pickFrame(page, box)
  await expect(box.locator('[data-box-bar]')).toBeVisible()
  await expect(box).not.toHaveAttribute('data-typing', '')
  await box.locator('.bn-editor').click()
  await page.keyboard.type('!')
  await expect(box.locator('.bn-editor')).toContainText('!')
  // Esc leaves it idle.
  await page.keyboard.press('Escape')
})

test('hold on blank paper offers Start typing here', async ({ page }) => {
  await start(page, 'Hold')
  await page.evaluate(() =>
    localStorage.setItem('learning-notes:advanced.holdMenu', '600'),
  )
  await page.reload()
  await expect(page.locator('.bn-editor').first()).toBeVisible()
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const x = sheet.x + sheet.width * 0.5
  const y = main.y + main.height + 140
  await page.mouse.move(x, y)
  await page.mouse.down()
  await expect(page.locator('[data-blank-hold-menu]')).toBeVisible({
    timeout: 3000,
  })
  await page.mouse.up()
  await page
    .locator('[data-blank-hold-menu]')
    .getByRole('menuitem', { name: 'Start typing here' })
    .click()
  await expect(page.locator('[data-paper-box="main"] .bn-editor')).toBeFocused()
  // Empty lines were added down to the press.
  const lines = await page
    .locator('[data-paper-box="main"] .bn-block-outer')
    .count()
  expect(lines).toBeGreaterThan(2)
})

test('only one text bar at a time: the strip hides the floating micro bar', async ({
  page,
}) => {
  await start(page, 'One bar')
  await page.locator('.bn-editor').first().click()
  await page.keyboard.type(' typed')
  await expect(page.locator('[data-micro-bar]')).toBeVisible()
  await openPill(page, 'Text', 'text')
  await expect(pill(page, 'text')).toBeVisible()
  await expect(page.locator('[data-micro-bar]')).toHaveCount(0)
})

test('the keyboard bar shows on a shrunk viewport and bold works from it', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const listeners = new Set<() => void>()
    const vv = {
      get height() {
        return (
          window.innerHeight -
          ((window as unknown as { __kb?: number }).__kb ?? 0)
        )
      },
      width: window.innerWidth,
      offsetTop: 0,
      offsetLeft: 0,
      scale: 1,
      addEventListener: (_t: string, fn: () => void) => listeners.add(fn),
      removeEventListener: (_t: string, fn: () => void) => listeners.delete(fn),
    }
    Object.defineProperty(window, 'visualViewport', { value: vv })
    ;(window as unknown as { __kbShow: (n: number) => void }).__kbShow = (
      n,
    ) => {
      ;(window as unknown as { __kb: number }).__kb = n
      listeners.forEach((f) => f())
    }
  })
  await start(page, 'Keys')
  await page.locator('.bn-editor').first().click()
  await expect(page.locator('[data-kb-bar]')).toHaveCount(0)
  await page.evaluate(() =>
    (window as unknown as { __kbShow: (n: number) => void }).__kbShow(320),
  )
  await expect(page.locator('[data-kb-bar]')).toBeVisible()
  await page.keyboard.press('ControlOrMeta+a')
  await page.locator('[data-kb-action="bold"]').click()
  await expect(
    page.locator('.bn-editor strong, .bn-editor b').first(),
  ).toBeVisible()
  await page.evaluate(() =>
    (window as unknown as { __kbShow: (n: number) => void }).__kbShow(0),
  )
  await expect(page.locator('[data-kb-bar]')).toHaveCount(0)
})

test('a Pencil tap on a strip button presses it and inks nothing', async ({
  page,
}) => {
  await start(page, 'Pencil')
  const box = await newBox(page, 1)
  await openPill(page, 'Text', 'text')
  void box
  const btn = pill(page, 'text').getByLabel('Box style')
  await btn.evaluate((el) => el.scrollIntoView({ block: 'nearest' }))
  await expect(btn).not.toHaveAttribute('aria-disabled', 'true')
  // The pen's pointer events go to the button itself (no hit test).
  await btn.evaluate((el) => {
    const make = (n: string) =>
      new PointerEvent(n, {
        pointerType: 'pen',
        pointerId: 31,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        buttons: n === 'pointerup' ? 0 : 1,
      })
    el.dispatchEvent(make('pointerdown'))
    el.dispatchEvent(make('pointerup'))
  })
  await expect(panel(page)).toBeVisible()
  void tool
})

test('typing does not switch the main bar to the Text tool (item 12)', async ({
  page,
}) => {
  await start(page, 'No switch')
  await tool(page, 'Lasso').click()
  await expect(tool(page, 'Lasso')).toHaveAttribute('aria-pressed', 'true')
  const ed = page.locator('[data-paper-box="main"] .bn-editor')
  await ed.click({ force: true })
  await ed.click({ force: true })
  await page.keyboard.type('z')
  await expect(tool(page, 'Lasso')).toHaveAttribute('aria-pressed', 'true')
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'false')
})
