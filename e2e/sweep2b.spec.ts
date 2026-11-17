// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  row,
  showSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { pick } from './cBoxesHelpers.ts'

/**
 * Bug sweep to Phase 2B (owner, 17 Nov), with the owner's preset "Up to
 * Phase 2B" (every switch of Phases 1, 2A and 2B on):
 *  - S1 / S2: every ⋯ of a box (its frame, its box bar, the page's first box)
 *    opens the one v2 "Box actions" list, never the old Box style / Copy /
 *    Cut list, and only one list at a time;
 *  - S3: a box made at the sheet's right edge is the whole line wide, so its
 *    words never wrap one letter per line;
 *  - S5: no help tip shows while a menu is open.
 * Checklist: docs/plans/sweep-2b-checklist.md.
 */
test.use({ hasTouch: true })

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
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const MAIN = '[data-paper-box="main"]'
const SIZES = [
  { name: 'ipad-sideways', width: 1180, height: 820 },
  { name: 'ipad-upright', width: 820, height: 1180 },
]
const rect = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, size: { width: number; height: number }) {
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    PRESET_2B,
  )
  await page.setViewportSize(size)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Sweep')
  await typeInEditor(page, 'Main text')
}

/** A new box under the main text at `fx` of the sheet's width, with `text`. */
async function newBox(page: Page, fx: number, text: string) {
  const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
  // Under the lowest box (a new box is the whole line wide).
  const bottom = await page.evaluate(() =>
    Math.max(
      ...[...document.querySelectorAll('[data-paper-box]')].map(
        (el) => el.getBoundingClientRect().bottom,
      ),
    ),
  )
  const n = await page.locator(EXTRA).count()
  await page.mouse.click(sheet.x + sheet.width * fx, bottom + 60)
  const box = page.locator(EXTRA).nth(n)
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(600)
  return box
}

/** The open box list: its rows, and that there is exactly one. */
async function openList(page: Page) {
  const list = page.getByRole('menu', { name: 'Box actions' })
  await expect(list).toHaveCount(1)
  await expect(list.getByRole('menuitem', { name: /Delete box/ })).toBeVisible()
  await expect(
    list.getByRole('menuitem', { name: /Lock in place/ }),
  ).toBeVisible()
  // The old list's rows never show.
  await expect(page.getByRole('menuitem', { name: /^Box style/ })).toHaveCount(
    0,
  )
  await expect(page.getByRole('menuitem', { name: /^Cut$/ })).toHaveCount(0)
  await expect(page.getByRole('menu')).toHaveCount(1)
}

async function closeList(page: Page) {
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
}

for (const size of SIZES) {
  test(`S1/S2 ${size.name}: every ⋯ of a box opens the one v2 Box actions list`, async ({
    page,
  }) => {
    await start(page, size)
    const box = await newBox(page, 0.4, 'Alpha')
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(400)
    await pick(page, box)
    // The ⋯ on the box's frame.
    await box.locator('[data-box-menu]').tap()
    await openList(page)
    // The ⋯ on the box bar while that list is open: the same list, still one.
    await page.getByTestId('ob-boxmore').tap()
    await openList(page)
    await closeList(page)
    // The page's first box (its ⋯ shows while the caret is in it, TB-08).
    await page.locator(`${MAIN} .bn-editor`).click()
    const mainMenu = page.locator('[data-box-menu]:visible')
    await expect(mainMenu).toHaveCount(1)
    await mainMenu.tap()
    await openList(page)
    await closeList(page)
  })

  test(`S3 ${size.name}: a box made at the right edge of the text (or in the margin) is the whole line wide; a word stays on one line`, async ({
    page,
  }) => {
    await start(page, size)
    const main = await rect(page.locator(MAIN))
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    // 8 px inside the text's right edge.
    const fx = (main.x + main.width - 8 - sheet.x) / sheet.width
    const box = await newBox(page, fx, 'Hello world')
    const b = await rect(box)
    expect(Math.abs(b.width - main.width), 'width').toBeLessThan(6)
    expect(Math.abs(b.x - main.x), 'left').toBeLessThan(6)
    // One line: the words did not wrap.
    const line = box.locator('.bn-inline-content').first()
    const lh = await line.evaluate((el) =>
      parseFloat(getComputedStyle(el).lineHeight),
    )
    expect((await rect(line)).height, 'one line').toBeLessThan(lh * 1.5)
    // In the sheet's margin, right of the text: no squeezed box either.
    await page.evaluate(() => (document.activeElement as HTMLElement).blur())
    await page.waitForTimeout(400)
    const bottom = b.y + b.height
    await page.mouse.click(sheet.x + sheet.width - 10, bottom + 60)
    await page.waitForTimeout(600)
    for (const r of await page.locator(EXTRA).all())
      expect(Math.abs((await rect(r)).width - main.width)).toBeLessThan(6)
  })
}

/** What the empty first line of `box` shows as its hint (its ::after). */
const lineHint = (box: Locator) =>
  box
    .locator('.bn-block-content')
    .first()
    .evaluate((el) => getComputedStyle(el, '::after').content)

// Owner decision 17 Nov (14:3x), replaces "Type here … goes when writing
// starts": no "Type here" anywhere except the first starting block, and
// that one goes the moment typing starts. Switch textbox.v2 (the live app
// keeps its own rule: textTool.spec.ts, switch off).
for (const size of SIZES)
  test(`Type here (owner 17 Nov) ${size.name}: a new empty box shows no "Type here"; only an empty page shows its one hint, gone once typing starts`, async ({
    page,
  }) => {
    await page.addInitScript(
      (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
      PRESET_2B,
    )
    await page.setViewportSize(size)
    await startInMode(page, 'computer')
    await page.goto('/')
    await createNotebook(page, 'Paper', 'Hints')
    // The empty page: its one hint, nothing else.
    await expect(page.getByText('Tap here to keep writing')).toHaveCount(0)
    await typeInEditor(page, 'Main text')
    await expect(page.getByText('Tap here to keep writing')).toHaveCount(0)
    // A new empty box with the caret in it: no "Type here".
    const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
    const main = await rect(page.locator(MAIN))
    await page.mouse.click(
      sheet.x + sheet.width * 0.4,
      main.y + main.height + 60,
    )
    const box = page.locator(EXTRA).first()
    await expect(box.locator('.bn-editor')).toBeFocused()
    await page.waitForTimeout(300)
    expect(await lineHint(box)).not.toContain('Type here')
    await expect(box).not.toContainText('Type here')
    await page.screenshot({
      path: `screenshots/c30/${test.info().project.name}-new-box-${size.name}.png`,
    })
    await page.keyboard.type('Hi')
    expect(await lineHint(box)).not.toContain('Type here')
    await expect(page.getByText('Tap here to keep writing')).toHaveCount(0)
  })

test('S5: no help tip shows while the sidebar page ⋯ menu is open', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    PRESET_2B,
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'First')
  await addPage(page, 'Paper', 'Second')
  await showSidebar(page)
  const more = row(page, 'First').getByRole('button', { name: /^More for/ })
  const tip = page.getByRole('tooltip')
  // The tip itself still works: a Pencil or mouse resting on the ⋯ shows it.
  const m = await rect(more)
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
  await expect(tip).toBeVisible()
  await expect(tip).toContainText('actions')
  await page.mouse.move(m.x + m.width / 2, m.y + 300)
  await expect(tip).toHaveCount(0)
  // Rest on the ⋯ and press it: the menu opens, the tip never shows.
  await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
  await page.mouse.down()
  await page.mouse.up()
  const card = page.getByRole('menu').last()
  await expect(
    card.getByRole('menuitem', { name: /^Delete page/ }),
  ).toBeVisible()
  await page.waitForTimeout(1200)
  await expect(tip).toBeHidden()
  await page.screenshot({
    path: `screenshots/sweep-2b/s5-pagemenu-${test.info().project.name}.png`,
  })
})
