// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Phase 2B, box bar part A (switch textbox.v2 ON): the ONE bar of a selected
 * box (owner, 18 Nov 2026: docs/design/owner-decisions.md "Selected box: one
 * bar like Goodnotes" and "Box-bar mock APPROVED"; mock
 * docs/mockups/box-bar/index.html, "We will prove" and "Must never happen").
 * Moving, docking and pinning the bar is part B and is not tested here.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, name: string, mode: 'computer' = 'computer') {
  await page.addInitScript(() => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    const w = window as unknown as { __clip: string[]; __paste: string }
    w.__clip = []
    w.__paste = 'Pasted words'
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (t: string) => (w.__clip.push(t), Promise.resolve()),
        readText: () => Promise.resolve(w.__paste),
        read: () =>
          Promise.resolve([
            {
              types: ['text/plain'],
              getType: () => Promise.resolve(new Blob([w.__paste])),
            },
          ]),
      },
    })
  })
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

async function addBox(page: Page, text: string) {
  const before = await page.locator(EXTRA).count()
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count()) ? await rect(sheetEl) : main
  let bottom = 0
  const all = page.locator('[data-paper-box]')
  for (let i = 0; i < (await all.count()); i++) {
    const r = await rect(all.nth(i))
    bottom = Math.max(bottom, r.y + r.height)
  }
  await page.mouse.click(sheet.x + sheet.width * 0.3, bottom + 60)
  const boxes = page.locator(EXTRA)
  await expect(boxes).toHaveCount(before + 1)
  await expect(boxes.nth(before).locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await page.waitForTimeout(700)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  return boxes.nth(before)
}

/** A finger tap in the empty part of a box selects it (owner 17 Nov). */
async function pick(page: Page, box: Locator) {
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  await expect(page.locator('[data-picked]')).toHaveCount(0)
  const p = await box.locator('.bn-editor').evaluate((ed) => {
    const w = document.createTreeWalker(ed, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 1)
    r.setEnd(n, 2)
    const b = r.getBoundingClientRect()
    return { x: ed.getBoundingClientRect().right - 14, y: b.y + b.height / 2 }
  })
  await page.evaluate(({ x, y }) => {
    const el = document.elementFromPoint(x, y)!
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        pointerType: 'touch',
        pointerId: 32,
        isPrimary: true,
        clientX: x,
        clientY: y,
        button: 0,
        buttons,
        bubbles: true,
        cancelable: true,
        composed: true,
      })
    el.dispatchEvent(mk('pointerdown', 1))
    el.dispatchEvent(mk('pointerup', 0))
  }, p)
  await expect(box).toHaveAttribute('data-picked', '')
}

const bar = (page: Page) => page.locator('[data-box-bar]')
const btn = (page: Page, name: string) =>
  bar(page).getByRole('button', { name, exact: true })
const pop = (page: Page, id: string) =>
  page.locator(`[data-onebar-pop="${id}"]`)
const more = (page: Page) => page.getByRole('menu', { name: 'Box actions' })
const words = (box: Locator) => box.locator('.bn-inline-content').first()
/** The first words' own element: the one that carries the font and the size. */
const look = (box: Locator, prop: 'fontFamily' | 'fontSize') =>
  words(box).evaluate((el, p) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT)
    const n = w.nextNode()
    return n?.parentElement ? getComputedStyle(n.parentElement)[p] : ''
  }, prop)
const fontOf = (box: Locator) => look(box, 'fontFamily')
const sizeOf = async (box: Locator) => parseFloat(await look(box, 'fontSize'))

async function ready(page: Page, text = 'Alpha beta') {
  await start(page, 'Bar' + Math.random().toString(36).slice(2, 6))
  const box = await addBox(page, text)
  await pick(page, box)
  await expect(bar(page)).toHaveCount(1)
  return box
}

const hit = (
  a: { x: number; y: number; width: number; height: number },
  b: typeof a,
) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height

test('1. one bar over a selected box with colour, size, font, B/I, align, list, fill, Cut, Paste, Delete and ⋯; no second bar', async ({
  page,
}) => {
  await ready(page)
  await expect(bar(page)).toHaveCount(1)
  await expect(page.getByTestId('object-bar')).toHaveCount(1)
  for (const n of [
    'Text colour',
    'Size',
    'Font',
    'Bold and italic',
    'Align',
    'List',
    'Box style',
    'Cut',
    'Paste',
    'Paste options',
    'Delete box',
    'Box actions',
  ])
    await expect(btn(page, n), n).toBeVisible()
  // Today's other box bar buttons moved under ⋯ (Copy, Duplicate): not in the bar.
  await expect(btn(page, 'Copy')).toHaveCount(0)
  await expect(btn(page, 'Duplicate box')).toHaveCount(0)
})

test('2. the bar sits outside the box, inside the page frame, and never covers words', async ({
  page,
}) => {
  const box = await ready(page)
  const b = await rect(page.getByTestId('object-bar'))
  expect(hit(b, await rect(box))).toBe(false)
  const frame = await rect(page.locator('[data-paper-sheet="1"]'))
  expect(b.x).toBeGreaterThanOrEqual(frame.x)
  expect(b.x + b.width).toBeLessThanOrEqual(frame.x + frame.width)
  expect(b.y).toBeGreaterThanOrEqual(12)
  const others = page.locator('[data-paper-box] .bn-block-content')
  for (let i = 0; i < (await others.count()); i++) {
    const r = await others.nth(i).boundingBox()
    if (r) expect(hit(b, r), 'words ' + i).toBe(false)
  }
})

test('3. B/I strip opens under its button with five buttons and closes by ✕ and by a tap outside', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'Bold and italic').click()
  const p = pop(page, 'bi')
  await expect(p).toBeVisible()
  for (const n of ['Bold', 'Italic', 'Underline', 'Strike', 'Highlight'])
    await expect(p.getByRole('button', { name: n, exact: true })).toBeVisible()
  const under = await rect(btn(page, 'Bold and italic'))
  expect((await rect(p)).y).toBeGreaterThanOrEqual(under.y + under.height)
  await p.getByRole('button', { name: 'Bold', exact: true }).click()
  await expect(
    box.locator('strong, b, [data-style-type="bold"]').first(),
  ).toBeVisible()
  await p.getByRole('button', { name: 'Close' }).click()
  await expect(p).toHaveCount(0)
  await btn(page, 'Bold and italic').click()
  await expect(p).toBeVisible()
  await page.mouse.click(5, 5)
  await expect(p).toHaveCount(0)
})

test('4. Size strip: number, slider, −/+, any number; acts on the selected box; one Undo reverses', async ({
  page,
}) => {
  const box = await ready(page)
  const before = await sizeOf(box)
  await btn(page, 'Size').click()
  const p = pop(page, 'size')
  await expect(p).toBeVisible()
  await expect(p.getByRole('slider')).toBeVisible()
  await expect(p.getByRole('button', { name: 'Smaller' })).toBeVisible()
  await expect(p.getByRole('button', { name: 'Larger' })).toBeVisible()
  const num = p.getByRole('spinbutton')
  await num.fill('37')
  await num.press('Enter')
  await expect.poll(() => sizeOf(box)).toBe(37)
  await p.getByRole('button', { name: 'Larger' }).click()
  await expect.poll(() => sizeOf(box)).toBe(38)
  await p.getByRole('button', { name: 'Smaller' }).click()
  await expect.poll(() => sizeOf(box)).toBe(37)
  await p.getByRole('button', { name: 'Close' }).click()
  expect(before).not.toBe(37)
  // One Undo takes the last change back (the -1 step), another the number.
  await page.keyboard.press('Control+z')
  await expect.poll(() => sizeOf(box)).not.toBe(37)
})

test('5. Font list: Easy to read, Classic, Handwritten, More fonts…; a pick changes the box', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'Font').click()
  const p = pop(page, 'font')
  await expect(p).toBeVisible()
  for (const n of ['Easy to read', 'Classic', 'Handwritten', 'More fonts…'])
    await expect(p.getByRole('button', { name: new RegExp(n) })).toBeVisible()
  await p.getByRole('button', { name: /Classic/ }).click()
  await expect.poll(() => fontOf(box)).toContain('Literata')
  await btn(page, 'Font').click()
  await p.getByRole('button', { name: /Handwritten/ }).click()
  await expect.poll(() => fontOf(box)).toContain('Patrick Hand')
  // More fonts… keeps every existing font.
  await btn(page, 'Font').click()
  await p.getByRole('button', { name: /More fonts/ }).click()
  for (const n of ['OpenDyslexic', 'Lexend', 'Caveat'])
    await expect(p.getByText(n).first()).toBeVisible()
})

test('6. Align strip: left, centre, right, line spacing; centre aligns the box', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'Align').click()
  const p = pop(page, 'align')
  for (const n of ['Align left', 'Centre', 'Align right', 'Line spacing'])
    await expect(p.getByRole('button', { name: n, exact: true })).toBeVisible()
  await p.getByRole('button', { name: 'Centre', exact: true }).click()
  await expect(
    box.locator('.bn-block-content[data-text-alignment="center"]').first(),
  ).toBeVisible()
})

test('7. List strip: Bullets, Numbers, Checklist, Star, Toggle', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'List').click()
  const p = pop(page, 'list')
  for (const n of [
    'Bullets',
    'Numbers',
    'Checklist',
    'Star list',
    'Toggle list',
  ])
    await expect(p.getByRole('button', { name: n, exact: true })).toBeVisible()
  await p.getByRole('button', { name: 'Bullets', exact: true }).click()
  await expect(
    box.locator('[data-content-type="bulletListItem"]').first(),
  ).toBeVisible()
  await btn(page, 'List').click()
  await p.getByRole('button', { name: 'Toggle list', exact: true }).click()
  await expect(
    box.locator('[data-content-type="toggleListItem"]').first(),
  ).toBeVisible()
})

test('8. a tap on the colour button opens the ten colours; a pick colours the words', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'Text colour').click()
  const p = pop(page, 'colour')
  await expect(p.getByRole('button')).toHaveCount(11) // ten colours and ✕
  await p.getByRole('button', { name: 'Red', exact: true }).click()
  await expect(
    box.locator('[data-style-type="textColor"][data-value="red"]').first(),
  ).toBeVisible()
})

test('9. Paste ▾ offers Keep look, Match style, Plain text; a tap on Paste pastes', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'Paste options').click()
  const p = pop(page, 'paste')
  for (const n of ['Keep look', 'Match style', 'Plain text'])
    await expect(p.getByRole('button', { name: n })).toBeVisible()
  await p.getByRole('button', { name: 'Plain text' }).click()
  await expect(box.locator('.bn-editor')).toContainText('Pasted words')
  // The caret is put away; the box is still picked, so the bar is back.
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await expect(bar(page)).toHaveCount(1)
  await btn(page, 'Paste').click()
  await expect
    .poll(
      async () =>
        (await box.locator('.bn-editor').innerText()).split('Pasted words')
          .length,
    )
    .toBeGreaterThan(2)
})

test('10. the fill square opens Box style with Presets and Advanced', async ({
  page,
}) => {
  await ready(page)
  await btn(page, 'Box style').click()
  const card = page.getByRole('dialog', { name: 'Box style' })
  await expect(card).toBeVisible()
  await expect(card.getByRole('tab', { name: 'Presets' })).toBeVisible()
  await expect(card.getByRole('tab', { name: 'Advanced' })).toBeVisible()
})

test('11. ⋯ keeps every old item and adds Lock box, Box style…, Layout…, Text options…', async ({
  page,
}) => {
  await ready(page)
  await btn(page, 'Box actions').click()
  const items = more(page).getByRole('menuitem')
  await expect(items).toHaveText([
    /Copy/,
    /Duplicate/,
    /Lock/,
    /Box style…/,
    /Layout…/,
    /Text options…/,
    /Move up/,
    /Move down/,
    /Group/,
    /Delete/,
  ])
})

test('12. ⋯ › Text options… opens the Format card with Toggle heading and Toggle list first', async ({
  page,
}) => {
  await ready(page)
  await btn(page, 'Box actions').click()
  await more(page)
    .getByRole('menuitem', { name: /Text options…/ })
    .click()
  const card = page.getByRole('dialog', { name: 'Text options' })
  await expect(card).toBeVisible()
  const tiles = card.locator('[data-format-first] button')
  await expect(tiles.nth(0)).toHaveAccessibleName('Toggle heading')
  await expect(tiles.nth(1)).toHaveAccessibleName('Toggle list')
})

test('13. Lock box: a locked box cannot be moved, resized or deleted until unlocked', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'Box actions').click()
  await more(page).getByRole('menuitem', { name: /Lock/ }).click()
  await expect(box).toHaveAttribute('data-locked', '')
  await expect(box.locator('[data-resize-handle]')).toHaveCount(0)
  // Delete and Cut are off, and the box stays.
  await expect(btn(page, 'Delete box')).toBeDisabled()
  await expect(btn(page, 'Cut')).toBeDisabled()
  await expect(page.locator(EXTRA)).toHaveCount(1)
  // Move: a drag of the box changes nothing.
  const before = await rect(box)
  await page.mouse.move(before.x + 6, before.y + before.height / 2)
  await page.mouse.down()
  await page.mouse.move(before.x + 60, before.y + before.height / 2 + 30, {
    steps: 6,
  })
  await page.mouse.up()
  const after = await rect(box)
  expect(Math.abs(after.x - before.x)).toBeLessThan(2)
  // Unlock: the box is free again.
  await btn(page, 'Box actions').click()
  await more(page)
    .getByRole('menuitem', { name: /Unlock/ })
    .click()
  await expect(box).not.toHaveAttribute('data-locked', '')
  await expect(btn(page, 'Delete box')).toBeEnabled()
})

test('14. a tap on the bar types, selects and draws nothing; the words stay', async ({
  page,
}) => {
  const box = await ready(page, 'Steady words')
  for (const n of ['Text colour', 'Size', 'Font', 'Align', 'List']) {
    await btn(page, n).click()
    await btn(page, n).click()
  }
  await expect(box.locator('.bn-editor')).toHaveText(/^Steady words$/)
  expect(await page.evaluate(() => window.getSelection()?.toString())).toBe('')
})

test('15. no outside font service: fonts come from the app files', async ({
  page,
}) => {
  const hosts: string[] = []
  page.on('request', (r) => hosts.push(new URL(r.url()).host))
  const box = await ready(page)
  await btn(page, 'Font').click()
  await pop(page, 'font')
    .getByRole('button', { name: /Classic/ })
    .click()
  await expect.poll(() => fontOf(box)).toContain('Literata')
  await page.waitForTimeout(500)
  expect(hosts.filter((h) => /googleapis|gstatic|fonts\./.test(h))).toEqual([])
})

test('16. Easy to read (Atkinson Hyperlegible) is the font of a new note', async ({
  page,
}) => {
  const box = await ready(page)
  expect(await fontOf(box)).toContain('Atkinson Hyperlegible')
})

test('17. the bar, its strips and the card stay inside the page frame', async ({
  page,
}) => {
  await ready(page)
  const frame = await rect(page.locator('[data-paper-sheet="1"]'))
  for (const [name, id] of [
    ['Text colour', 'colour'],
    ['Size', 'size'],
    ['Font', 'font'],
    ['Bold and italic', 'bi'],
    ['Align', 'align'],
    ['List', 'list'],
    ['Paste options', 'paste'],
  ] as const) {
    await btn(page, name).click()
    const r = await rect(pop(page, id))
    expect(r.x, id).toBeGreaterThanOrEqual(frame.x - 1)
    expect(r.x + r.width, id).toBeLessThanOrEqual(frame.x + frame.width + 1)
    await pop(page, id).getByRole('button', { name: 'Close' }).click()
  }
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('18. a shorter bar: colour, size, B/I, align, fill, ⋯; every target is 44 pt; inside the screen', async ({
    page,
  }) => {
    await start(page, 'PhoneA')
    const box = await addBox(page, 'Phone box')
    await pick(page, box)
    for (const n of [
      'Text colour',
      'Size',
      'Bold and italic',
      'Align',
      'Box style',
      'Box actions',
    ])
      await expect(btn(page, n), n).toBeVisible()
    for (const n of ['Font', 'List', 'Cut', 'Paste', 'Delete box'])
      await expect(btn(page, n), n).toHaveCount(0)
    const btns = bar(page).getByRole('button')
    for (let i = 0; i < (await btns.count()); i++) {
      const r = await rect(btns.nth(i))
      expect(
        r.width,
        'button ' + i + ' ' + (await btns.nth(i).getAttribute('aria-label')),
      ).toBeGreaterThanOrEqual(44)
      expect(r.height).toBeGreaterThanOrEqual(44)
    }
    const b = await rect(page.getByTestId('object-bar'))
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(390)
    expect(hit(b, await rect(box))).toBe(false)
    await btn(page, 'Box actions').tap()
    for (const n of ['Font', 'List', 'Cut', 'Copy', 'Paste', 'Delete box'])
      await expect(
        more(page)
          .getByRole('menuitem', { name: new RegExp(n) })
          .first(),
      ).toBeVisible()
  })
})

test('19. the live app with the switch off is unchanged: the old box bar', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.removeItem('learning-notes:flags'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Off')
  await typeInEditor(page, 'Main text')
  const box = await addBox(page, 'Old bar')
  await pickBox(page, box)
  await expect(
    bar(page).getByRole('button', { name: 'Duplicate box' }),
  ).toBeVisible()
  await expect(btn(page, 'Text colour')).toHaveCount(0)
})

test('20. Make-toggle switch: a list becomes a toggle list and back (owner 18 Nov)', async ({
  page,
}) => {
  const box = await ready(page)
  await btn(page, 'List').click()
  await pop(page, 'list')
    .getByRole('button', { name: 'Bullets', exact: true })
    .click()
  await btn(page, 'Box actions').click()
  await more(page)
    .getByRole('menuitem', { name: /Text options…/ })
    .click()
  const card = page.getByRole('dialog', { name: 'Text options' })
  const sw = card.getByRole('switch', { name: 'Make toggle' })
  await expect(sw).toBeVisible()
  await sw.click()
  await expect(
    box.locator('[data-content-type="toggleListItem"]').first(),
  ).toBeVisible()
  await sw.click()
  await expect(
    box.locator('[data-content-type="bulletListItem"]').first(),
  ).toBeVisible()
})
