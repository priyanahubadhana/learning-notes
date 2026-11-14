// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Phase 2B, task 2B.8 (switch textbox.v2 ON): the Object bar and the ⋯ list.
 * TB-19 Move up / Move down; TB-24 one bar; TB-30 the ⋯ list; TB-31 copy
 * failed; the locked box; the 12 px safe top zone; 44 pt on a phone.
 */
test.use({
  viewport: { width: 1336, height: 1100 },
  hasTouch: true,
  deviceScaleFactor: 2,
})

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const rect = async (l: Locator) => (await l.boundingBox())!

async function start(page: Page, name: string, clip: 'ok' | 'fail' = 'ok') {
  await page.addInitScript((mode) => {
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
    const w = window as unknown as { __clip: string[] }
    w.__clip = []
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: (t: string) =>
          mode === 'ok'
            ? (w.__clip.push(t), Promise.resolve())
            : Promise.reject(new Error('blocked')),
      },
    })
  }, clip)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await typeInEditor(page, 'Main text')
}

/** A new box under the last one, with this text; nothing is left selected. */
async function addBox(page: Page, text: string) {
  const before = await page.locator(EXTRA).count()
  const main = await rect(page.locator('[data-paper-box="main"]'))
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  // Phones draw no sheets (fit width): the column is the main box.
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

/** A finger tap on the words of a box: the first tap selects it. */
async function pick(page: Page, box: Locator) {
  // Start from nothing selected (a tap on a picked box puts the caret in it).
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
    return { x: b.x + 1, y: b.y + b.height / 2 }
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
const more = (page: Page) => page.getByRole('menu', { name: 'Box actions' })
const clip = (page: Page) =>
  page.evaluate(() => (window as unknown as { __clip: string[] }).__clip)
const names = (page: Page) =>
  page.locator(EXTRA + ' .bn-editor').evaluateAll((l) =>
    l
      .map((e) => ({ t: e.textContent ?? '', y: e.getBoundingClientRect().y }))
      .sort((a, b) => a.y - b.y)
      .map((e) => e.t),
  )

test('TB-24: one bar over a selected box: Cut, Copy, Duplicate, Delete, Box style, ⋯; one bar only', async ({
  page,
}) => {
  await start(page, 'TB24')
  const box = await addBox(page, 'Alpha beta')
  await pick(page, box)
  await expect(bar(page)).toHaveCount(1)
  await expect(page.getByTestId('object-bar')).toHaveCount(1)
  for (const n of [
    'Cut',
    'Copy',
    'Duplicate box',
    'Delete box',
    'Box style',
    'Box actions',
  ])
    await expect(bar(page).getByRole('button', { name: n })).toBeVisible()
  await expect(bar(page).getByRole('button')).toHaveCount(6)
  // Copy copies the text; Cut copies it and removes the box.
  await bar(page).getByRole('button', { name: 'Copy' }).click()
  expect(await clip(page)).toEqual(['Alpha beta'])
  await bar(page).getByRole('button', { name: 'Duplicate box' }).click()
  await expect(page.locator(EXTRA)).toHaveCount(2)
  // The copy takes the caret: let go of it, then pick the first box.
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)
  await pick(page, page.locator(EXTRA).first())
  await bar(page).getByRole('button', { name: 'Cut' }).click()
  await expect(page.locator(EXTRA)).toHaveCount(1)
  expect((await clip(page)).length).toBe(2)
  await pick(page, page.locator(EXTRA).first())
  await bar(page).getByRole('button', { name: 'Delete box' }).click()
  await expect(page.locator(EXTRA)).toHaveCount(0)
  await expect(
    page.locator('[data-toast]').getByRole('button', { name: 'Undo' }),
  ).toBeVisible()
})

test('TB-24: Box style opens the style card', async ({ page }) => {
  await start(page, 'TB24b')
  const box = await addBox(page, 'Styled')
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Box style' }).click()
  await expect(page.locator('[data-box-style-panel]')).toBeVisible()
})

test('TB-30: ⋯ opens a 248 px list: Lock in place, Duplicate, Move up, Move down, Group (dimmed), Delete', async ({
  page,
}) => {
  await start(page, 'TB30')
  const box = await addBox(page, 'Listed')
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Box actions' }).click()
  const list = more(page)
  await expect(list).toBeVisible()
  expect((await rect(list)).width).toBe(248)
  const items = list.getByRole('menuitem')
  await expect(items).toHaveText([
    /Lock in place/,
    /Duplicate/,
    /Move up/,
    /Move down/,
    /Group.*Pick 2 or more/,
    /Delete/,
  ])
  await expect(items.nth(4)).toBeDisabled()
  // No key names on a touch device, and a close button.
  expect(await list.innerText()).not.toMatch(/Ctrl|Cmd|⌃|⌘|⌥/)
  await expect(list.getByRole('button', { name: 'Close' })).toBeVisible()
  await items.nth(1).click()
  await expect(list).toHaveCount(0)
  await expect(page.locator(EXTRA)).toHaveCount(2)
})

test('TB-30: the ⋯ beside the ≡ tab opens the same list', async ({ page }) => {
  await start(page, 'TB30t')
  const box = await addBox(page, 'Tabbed')
  await pick(page, box)
  await box.locator('[data-box-menu]').click()
  await expect(
    more(page).getByRole('menuitem', { name: 'Lock in place' }),
  ).toBeVisible()
  expect((await rect(more(page))).width).toBe(248)
})

test('TB-30: Delete in the ⋯ list removes the box and offers Undo', async ({
  page,
}) => {
  await start(page, 'TB30d')
  const box = await addBox(page, 'Gone')
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Box actions' }).click()
  await more(page)
    .getByRole('menuitem', { name: /Delete/ })
    .click()
  await expect(page.locator(EXTRA)).toHaveCount(0)
  await expect(
    page.locator('[data-toast]').getByRole('button', { name: 'Undo' }),
  ).toBeVisible()
})

test('locked box: lock on the tab, no dots, text still edits; Unlock brings the dots back', async ({
  page,
}) => {
  await start(page, 'Lock')
  const box = await addBox(page, 'Exam dates')
  await pick(page, box)
  await expect(box.locator('[data-resize-handle]').first()).toBeVisible()
  await bar(page).getByRole('button', { name: 'Box actions' }).click()
  await more(page).getByRole('menuitem', { name: 'Lock in place' }).click()
  await expect(box).toHaveAttribute('data-locked', '')
  await expect(box.locator('[data-box-grip]')).toHaveCount(0)
  await expect(box.locator('[data-resize-handle]')).toHaveCount(0)
  // The text still edits: the box is selected, the next tap puts the caret.
  const r = await rect(box.locator('.bn-editor'))
  await page.mouse.click(r.x + 20, r.y + r.height / 2)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('!')
  await expect(box.locator('.bn-editor')).toContainText('!')
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(1200)
  // The box is still picked: with no caret in it the bar is back.
  await expect(box).toHaveAttribute('data-picked', '')
  await bar(page).getByRole('button', { name: 'Box actions' }).click()
  await expect(
    more(page).getByRole('menuitem', { name: 'Move up' }),
  ).toBeDisabled()
  await more(page).getByRole('menuitem', { name: 'Unlock' }).click()
  await expect(box).not.toHaveAttribute('data-locked', '')
  await expect(box.locator('[data-resize-handle]').first()).toBeVisible()
})

test('TB-19: Move down swaps places with the next box; Move up swaps back; one Undo', async ({
  page,
}) => {
  await start(page, 'TB19')
  await addBox(page, 'First')
  await addBox(page, 'Second')
  expect(await names(page)).toEqual(['First', 'Second'])
  await pick(page, page.locator(EXTRA).filter({ hasText: 'First' }))
  await bar(page).getByRole('button', { name: 'Box actions' }).click()
  await more(page).getByRole('menuitem', { name: 'Move down' }).click()
  await expect.poll(() => names(page)).toEqual(['Second', 'First'])
  // Visible feedback: the list closed and the same box is still the picked one.
  await expect(more(page)).toHaveCount(0)
  await expect(
    page.locator(EXTRA).filter({ hasText: 'First' }),
  ).toHaveAttribute('data-picked', '')
  await bar(page).getByRole('button', { name: 'Box actions' }).click()
  await expect(
    more(page).getByRole('menuitem', { name: 'Move down' }),
  ).toBeDisabled()
  await more(page).getByRole('menuitem', { name: 'Move up' }).click()
  await expect.poll(() => names(page)).toEqual(['First', 'Second'])
  // One Undo puts the last move back.
  await page.keyboard.press('Control+z')
  await expect.poll(() => names(page)).toEqual(['Second', 'First'])
})

test('TB-31: when Copy fails a toast says so, and Cut keeps the box', async ({
  page,
}) => {
  await start(page, 'TB31', 'fail')
  const box = await addBox(page, 'Keep me')
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Copy' }).click()
  await expect(
    page
      .locator('[data-toast]')
      .filter({ hasText: "Couldn't copy. Try again." }),
  ).toBeVisible()
  await bar(page).getByRole('button', { name: 'Cut' }).click()
  await expect(
    page
      .locator('[data-toast]')
      .filter({ hasText: "Couldn't copy. Try again." }),
  ).toBeVisible()
  await expect(page.locator(EXTRA)).toHaveCount(1)
})

test('a tap on the bar or ⋯ draws no focus ring', async ({ page }) => {
  await start(page, 'Ring')
  const box = await addBox(page, 'Ringless')
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Box actions' }).tap()
  await expect(more(page)).toBeVisible()
  const ring = await page.evaluate(() => {
    const el = document.activeElement as HTMLElement
    return {
      visible: el.matches(':focus-visible'),
      outline: getComputedStyle(el).outlineStyle,
    }
  })
  expect(ring.visible).toBe(false)
  expect(ring.outline).toBe('none')
})

test('the bar never enters the 12 px safe zone at the top of the screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1336, height: 700 })
  await start(page, 'Safe')
  const box = await addBox(page, 'Near the top')
  await pick(page, box)
  // Scroll the page until the box top is 4 px under the top of the screen.
  const y = (await rect(box)).y
  await page.evaluate((dy) => {
    let el: HTMLElement | null = document.querySelector(
      '[data-paper-box="main"]',
    )
    while (el && el.scrollHeight <= el.clientHeight + 1) el = el.parentElement
    el?.scrollBy(0, dy)
  }, y - 4)
  await page.waitForTimeout(500)
  const b = await rect(bar(page).getByTestId('object-bar'))
  expect(b.y).toBeGreaterThanOrEqual(12)
})

test('one bar at a time: with words selected in the box only the text bar shows, never the box bar', async ({
  page,
}) => {
  await start(page, 'One')
  const box = await addBox(page, 'Select these words')
  await pick(page, box)
  await expect(bar(page)).toHaveCount(1)
  const r = await rect(box.locator('.bn-editor'))
  await page.mouse.click(r.x + 20, r.y + r.height / 2)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.press('Control+a')
  await expect(bar(page)).toHaveCount(0)
  await expect(page.getByTestId('object-bar')).toHaveCount(0)
  // The words stay selected and visible: nothing of ours sits on them.
  const sel = await page.evaluate(() => {
    const b = window.getSelection()!.getRangeAt(0).getBoundingClientRect()
    return { x: b.x, y: b.y, w: b.width, h: b.height }
  })
  expect(sel.w).toBeGreaterThan(0)
  // Let go of the caret: never two bars, whatever shows.
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(300)
  expect(await page.getByTestId('object-bar').count()).toBeLessThanOrEqual(1)
})

const hit = (
  a: { x: number; y: number; width: number; height: number },
  b: typeof a,
) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height

test('a narrow box: the ⋯ list stands beside it and never covers its words', async ({
  page,
}) => {
  await start(page, 'Narrow')
  const box = await addBox(page, 'Narrow')
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Box actions' }).click()
  await expect(more(page)).toBeVisible()
  expect(hit(await rect(more(page)), await rect(box))).toBe(false)
  // The ≡-tab ⋯ opens it in the same place.
  await more(page).getByRole('button', { name: 'Close' }).click()
  await expect(more(page)).toHaveCount(0)
  await box.locator('[data-box-menu]').click()
  expect(hit(await rect(more(page)), await rect(box))).toBe(false)
})

test('a tap on the bar works at once after the tap that selected the box', async ({
  page,
}) => {
  await start(page, 'Quick')
  const box = await addBox(page, 'Quick tap')
  await pick(page, box)
  await bar(page).getByRole('button', { name: 'Duplicate box' }).click({
    timeout: 800,
  })
  await expect(page.locator(EXTRA)).toHaveCount(2)
})

test('the bar never covers the box: above its top dots and edge, or below when there is no room', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1336, height: 700 })
  await start(page, 'Cover')
  const box = await addBox(page, 'Keep the edge clear')
  await pick(page, box)
  const gap = async () => {
    const b = await rect(bar(page).getByTestId('object-bar'))
    const x = await rect(box)
    // The dots sit 16 px outside the edge: keep the bar off that band too.
    return b.y + b.height <= x.y - 16 || b.y >= x.y + x.height + 16
  }
  expect(await gap()).toBe(true)
  const y = (await rect(box)).y
  await page.evaluate((dy) => {
    let el: HTMLElement | null = document.querySelector(
      '[data-paper-box="main"]',
    )
    while (el && el.scrollHeight <= el.clientHeight + 1) el = el.parentElement
    el?.scrollBy(0, dy)
  }, y - 4)
  await expect.poll(gap).toBe(true)
  expect(
    (await rect(bar(page).getByTestId('object-bar'))).y,
  ).toBeGreaterThanOrEqual(12)
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })
  test('every bar button and every ⋯ row is at least 44 pt', async ({
    page,
  }) => {
    await start(page, 'Phone')
    const box = await addBox(page, 'Phone box')
    await pick(page, box)
    const btns = bar(page).getByRole('button')
    for (let i = 0; i < (await btns.count()); i++) {
      const r = await rect(btns.nth(i))
      expect(r.width, 'button ' + i).toBeGreaterThanOrEqual(44)
      expect(r.height).toBeGreaterThanOrEqual(44)
    }
    // Nothing overlaps: not the box, not another box, not Add a box here
    // (measured again until the page has settled).
    expect(
      hit(await rect(bar(page).getByTestId('object-bar')), await rect(box)),
    ).toBe(false)
    await expect(async () => {
      const b = await rect(bar(page).getByTestId('object-bar'))
      for (const sel of [
        '[data-paper-add-end]',
        '[data-paper-box] .bn-block-content',
      ]) {
        const els = page.locator(sel)
        for (let i = 0; i < (await els.count()); i++) {
          const r = await els.nth(i).boundingBox()
          if (r) expect(hit(b, r), sel + ' ' + i).toBe(false)
        }
      }
    }).toPass()
    const b = await rect(bar(page).getByTestId('object-bar'))
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(390)
    await bar(page).getByRole('button', { name: 'Box actions' }).tap()
    const rows = more(page).getByRole('menuitem')
    for (let i = 0; i < (await rows.count()); i++)
      expect((await rect(rows.nth(i))).height).toBeGreaterThanOrEqual(44)
  })
})
