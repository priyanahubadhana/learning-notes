// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  createNotebook,
  pickBox,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { line, savedInk, stroke } from './inkHelpers.ts'
import { mainBar, openNote, tool } from './mainBarHelpers.ts'

/**
 * Item 3: one Undo / Redo history per page. Every kind of action goes
 * through it: do it, Undo, Redo, and the page is exactly as it was after the
 * action. A random walk of 50 steps goes back to the start and forward again.
 */

interface Snap {
  page: unknown
  blocks: unknown[]
  strokes: number
}

/** What the page is, read from the saved data (not from the screen). */
async function snap(page: Page, title = 'Undo page'): Promise<Snap> {
  await page.waitForTimeout(900) // autosave
  const data = await page.evaluate(
    (want: string) =>
      new Promise<{ page: unknown; blocks: unknown[] }>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const tx = db.transaction(['pages', 'blocks'])
          const p = tx.objectStore('pages').getAll()
          const b = tx.objectStore('blocks').getAll()
          tx.oncomplete = () => {
            db.close()
            const pages = (p.result as Record<string, unknown>[]).filter(
              (r) => r.deletedAt === null && r.title === want,
            )
            const cur = pages[pages.length - 1] as Record<string, unknown>
            resolve({
              page: {
                title: cur?.title,
                inkBg: cur?.inkBg ?? null,
                sheet: cur?.sheet ?? null,
                boxes: cur?.boxes ?? null,
                tagIds: cur?.tagIds ?? null,
              },
              blocks: (b.result as Record<string, unknown>[])
                .filter((r) => r.deletedAt === null && r.pageId === cur?.id)
                // An empty line is the same as no line (it is saved only after a change).
                .filter(
                  (r) =>
                    !(
                      r.type === 'paragraph' &&
                      JSON.stringify(
                        (r.content as { text?: unknown[] }).text ?? [],
                      ) === '[]'
                    ),
                )
                .map((r) => ({
                  id: r.id,
                  type: r.type,
                  content: r.content,
                  boxId: r.boxId ?? null,
                }))
                .sort((x, y) => String(x.id).localeCompare(String(y.id))),
            })
          }
        }
      }),
    title,
  )
  const ink = await savedInk(page)
  return { ...data, strokes: ink.strokes.length }
}

const undoBtn = (page: Page) =>
  mainBar(page).getByRole('button', { name: 'Undo', exact: true })
const redoBtn = (page: Page) =>
  mainBar(page).getByRole('button', { name: 'Redo', exact: true })

async function undo(page: Page) {
  // The bar can hide with the focus (the box that had it is gone).
  if ((await undoBtn(page).count()) === 0)
    await page.getByText('First line').click()
  await undoBtn(page).click()
  await page.waitForTimeout(250)
}
async function redo(page: Page) {
  await redoBtn(page).click()
  await page.waitForTimeout(250)
}

/** Do `act`, then Undo gives the state before, Redo the state after. */
async function roundTrip(page: Page, act: () => Promise<void>) {
  await page.waitForTimeout(900) // a pause: the next action is a new step
  const before = await snap(page)
  await act()
  const after = await snap(page)
  expect(after).not.toEqual(before)
  await expect(undoBtn(page)).toBeEnabled()
  await undo(page)
  expect(await snap(page)).toEqual(before)
  // The bar can hide with the focus (the box that had it is gone).
  if ((await redoBtn(page).count()) === 0)
    await page.getByText('First line').click()
  await expect(redoBtn(page)).toBeEnabled()
  await redo(page)
  expect(await snap(page)).toEqual(after)
}

async function startPage(page: Page) {
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'History', 'Undo page')
  await typeInEditor(page, 'First line')
  await page.waitForTimeout(900)
}

const more = (page: Page) => page.getByRole('button', { name: 'More options' })

test('typing, then Undo and Redo', async ({ page }) => {
  await startPage(page)
  await roundTrip(page, async () => {
    await page.keyboard.press('Enter')
    await page.keyboard.type('Second line')
  })
})

test('paper style and size are steps of the same history', async ({ page }) => {
  await startPage(page)
  await roundTrip(page, async () => {
    await more(page).click()
    await page.getByRole('menuitem', { name: /Paper style/ }).click()
    await page.getByRole('menuitemradio', { name: /Grid/ }).click()
  })
  await roundTrip(page, async () => {
    await more(page).click()
    await page.getByRole('menuitem', { name: /Paper size/ }).click()
    await page.getByRole('menuitemradio', { name: /Letter/ }).click()
  })
})

test('a new box, its text and a lock are steps; a deleted box comes back', async ({
  page,
}) => {
  await startPage(page)
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const extra = page.locator('[data-paper-box]:not([data-paper-box="main"])')
  await roundTrip(page, async () => {
    await page.mouse.click(
      sheet.x + sheet.width * 0.3,
      main.y + main.height + 60,
    )
    await expect(extra).toHaveCount(1)
    await expect(extra.locator('.bn-editor')).toBeFocused()
  })
  await roundTrip(page, async () => {
    await extra.locator('.bn-editor').click()
    await page.keyboard.type('Box text')
  })
  // Delete the box, then Undo from the tool bar (not the toast).
  await page.waitForTimeout(900)
  const before = await snap(page)
  await pickBox(page, extra)
  await extra.locator('[data-box-menu]').click()
  await page.getByRole('menuitem', { name: 'Delete box' }).click()
  await expect(extra).toHaveCount(0)
  await undo(page)
  await expect(extra).toHaveCount(1)
  await expect(extra).toContainText('Box text')
  expect(await snap(page)).toEqual(before)
})

test('a drawing is a step; text typed after it is undone first', async ({
  page,
}) => {
  await openNote(page, 'computer')
  await page.waitForTimeout(900)
  await tool(page, 'Pen').click()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  const box = (await page.locator('.bn-editor').first().boundingBox())!
  await roundTrip(page, async () => {
    await stroke(
      page,
      line([box.x + 40, box.y + 120], [box.x + 240, box.y + 160]),
      { type: 'mouse' },
    )
    await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(1)
  })
})

test('Undo never does nothing silently', async ({ page }) => {
  await startPage(page)
  // Everything undone: the buttons are off.
  for (let i = 0; i < 20 && (await undoBtn(page).isEnabled()); i++)
    await undo(page)
  await expect(undoBtn(page)).toBeDisabled()
  // The keyboard says so instead of failing quietly.
  await page.locator('.bn-editor').first().click()
  await page.keyboard.press('Control+z')
  await expect(page.getByText('Nothing left to undo.')).toBeVisible()
})

test('50 random steps go back to the start and forward again', async ({
  page,
}) => {
  test.setTimeout(240_000)
  await startPage(page)
  const start = await snap(page)
  let seed = 7
  const rnd = (n: number) => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff
    return seed % n
  }
  const styles = ['Grid', 'Dots', 'Lined']
  for (let i = 0; i < 50; i++) {
    await page.waitForTimeout(850) // each action is its own step
    const pick = rnd(10)
    if (pick < 6) {
      await page.locator('[data-paper-box="main"] .bn-editor').first().click()
      await page.keyboard.press('Control+End')
      await page.keyboard.press('Enter')
      await page.keyboard.type(`Line ${i}`)
    } else if (pick < 8) {
      await more(page).click()
      await page.getByRole('menuitem', { name: /Paper style/ }).click()
      const name = styles[rnd(styles.length)]
      await page.getByRole('menuitemradio', { name: new RegExp(name) }).click()
    } else {
      await more(page).click()
      await page.getByRole('menuitem', { name: /Paper size/ }).click()
      await page
        .getByRole('menuitemradio', { name: rnd(2) ? /Letter/ : /A4/ })
        .click()
    }
  }
  const end = await snap(page)
  expect(end).not.toEqual(start)
  let steps = 0
  while ((await undoBtn(page).isEnabled()) && steps < 60) {
    await undoBtn(page).click()
    await page.waitForTimeout(120)
    steps++
  }
  expect(steps).toBeGreaterThan(20)
  // Back at the very start: only the first line.
  await expect(page.locator('.bn-editor').first()).not.toContainText('Line 0')
  let redoSteps = 0
  while ((await redoBtn(page).isEnabled()) && redoSteps < 80) {
    await redoBtn(page).click()
    await page.waitForTimeout(120)
    redoSteps++
  }
  expect(redoSteps).toBe(steps)
  expect(await snap(page)).toEqual(end)
})

test('typing can be undone after a reload (batch 1 item 47)', async ({
  page,
}) => {
  await startPage(page)
  const before = await snap(page)
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line')
  await page.waitForTimeout(1800) // autosave and the saved Undo list
  const after = await snap(page)
  expect(after).not.toEqual(before)
  await page.reload()
  await page.getByText('Second line').first().click()
  await undo(page)
  expect(await snap(page)).toEqual(before)
  await redo(page)
  expect(await snap(page)).toEqual(after)
})

test('a drawing can be undone after a reload (batch 1 item 47)', async ({
  page,
}) => {
  await openNote(page, 'computer')
  await page.waitForTimeout(900)
  await tool(page, 'Pen').click()
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  const box = (await page.locator('.bn-editor').first().boundingBox())!
  await stroke(
    page,
    line([box.x + 40, box.y + 120], [box.x + 240, box.y + 160]),
    { type: 'mouse' },
  )
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(1)
  await page.waitForTimeout(1800)
  await page.reload()
  await expect(page.locator('.bn-editor').first()).toBeVisible()
  await page.waitForTimeout(900)
  // (a click on the page would add its own empty-line step)
  await undoBtn(page).click()
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(0)
  await redoBtn(page).click()
  await expect.poll(async () => (await savedInk(page)).strokes.length).toBe(1)
})
