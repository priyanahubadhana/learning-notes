// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Our own selection (Phase A3): it stays until the person dismisses it, is
 * always drawn, has handles, a cross and Delete, and the ⌫ key on the bar
 * deletes without a keyboard. Pencil taps are simulated pen events.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

type Pt = { x: number; y: number }

async function wordPoint(page: Page, word: string): Promise<Pt> {
  return page.evaluate((w) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const at = (n.textContent ?? '').indexOf(w)
      if (at < 0) continue
      const r = document.createRange()
      r.setStart(n, at)
      r.setEnd(n, at + w.length)
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('word not found')
  }, word)
}

async function tap(page: Page, at: Pt, type: 'pen' | 'touch' = 'pen') {
  await page.evaluate(
    ({ at, type }) => {
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: 9,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      const el = document.elementFromPoint(at.x, at.y)!
      el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
    },
    { at, type },
  )
}

const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

/** Lasso, then a double-tap on a word: the word is selected. */
async function selectWord(page: Page, word: string) {
  await openNote(page)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  const at = await wordPoint(page, word)
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, at)
  await expect.poll(() => marked(page)).toBe(word)
  return at
}

test('the selection stays drawn for 3 s with nobody touching it', async ({
  page,
}) => {
  await selectWord(page, 'nucleus')
  await page.waitForTimeout(3000)
  expect(await marked(page)).toBe('nucleus')
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
  await expect(page.locator('[data-sel-handle]')).toHaveCount(2)
})

test('a selection that collapses by itself (no input) is put back', async ({
  page,
}) => {
  await selectWord(page, 'nucleus')
  await page.waitForTimeout(900)
  await page.evaluate(() => {
    window.getSelection()?.removeAllRanges()
    ;(document.activeElement as HTMLElement | null)?.blur()
  })
  await page.waitForTimeout(500)
  expect(await marked(page)).toBe('nucleus')
})

test('the cross, Esc and a tap elsewhere dismiss it', async ({ page }) => {
  await selectWord(page, 'nucleus')
  await page.waitForTimeout(600)
  await page.getByRole('button', { name: 'Deselect' }).click()
  await expect.poll(() => marked(page)).toBe('')
  await expect(page.locator('[data-mini-toolbar]')).toHaveCount(0)

  const at = await wordPoint(page, 'nucleus')
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, at)
  await expect.poll(() => marked(page)).toBe('nucleus')
  await page.waitForTimeout(600)
  await page.keyboard.press('Escape')
  await expect.poll(() => marked(page)).toBe('')

  await page.waitForTimeout(400)
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, at)
  await expect.poll(() => marked(page)).toBe('nucleus')
  await page.waitForTimeout(600)
  await tap(page, await wordPoint(page, 'DNA'))
  await expect.poll(() => marked(page)).toBe('')
})

test('Delete removes the selection with one Undo', async ({ page }) => {
  await selectWord(page, 'nucleus')
  await page.waitForTimeout(500)
  await page
    .locator('[data-mini-toolbar]')
    .getByRole('button', { name: 'Delete' })
    .click()
  await expect(page.locator('.bn-editor')).not.toContainText('nucleus')
  await page.getByRole('button', { name: 'Undo', exact: true }).click()
  await expect(page.locator('.bn-editor')).toContainText('nucleus')
})

test('⌫ on the bar: a tap deletes one character, a hold keeps going', async ({
  page,
}) => {
  await openNote(page)
  const editor = page.locator('.bn-editor')
  await page.getByText('The nucleus').click()
  await page.keyboard.press('End')
  const before = (await editor.innerText()).length
  const back = page.getByRole('button', { name: 'Backspace' })
  await back.click()
  await expect
    .poll(async () => (await editor.innerText()).length)
    .toBe(before - 1)
  const box = (await back.boundingBox())!
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  await page.mouse.down()
  await page.waitForTimeout(1200)
  await page.mouse.up()
  const after = (await editor.innerText()).length
  expect(after).toBeLessThan(before - 6)
})
