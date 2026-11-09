// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { inkNote, line, stroke, textBox } from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { appSwitch, loopAround, machineState, section } from './toolsHelpers.ts'

/**
 * Tools robustness, step 3: one owner of the page's contenteditable. The
 * Lasso, the Pencil text drag and the grip drag only lock and unlock the
 * page; what comes back is worked out from the page mode, never from a value
 * remembered earlier. So after a tool change or an app switch in the middle
 * of a gesture, the Text tool still types.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

/** The lift of a touch, sent to whatever is under it (or the document). */
const lift = (page: Page, id: number) =>
  page.evaluate((pointerId) => {
    document.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerId,
        pointerType: 'pen',
        bubbles: true,
      }),
    )
  }, id)

/** The Text tool types again. */
async function typingWorks(page: Page, word: string) {
  await tool(page, 'Text').click()
  await expect
    .poll(async () => (await section(page, 'ink')).editorEditable)
    .toBe('true')
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.type(' ' + word)
  await expect(page.locator('.bn-editor')).toContainText(word)
}

test('a Lasso gesture held while Text is chosen, then lifted: typing works', async ({
  page,
}) => {
  await inkNote(page, 'Lasso')
  await page.keyboard.press('Escape')
  const box = await textBox(page)
  const y = box.y + box.height + 60
  await stroke(page, line([box.x + 20, y], [box.x + 90, y + 10], 8), {
    keepDown: true,
    id: 21,
  })
  await expect.poll(() => machineState(page)).toBe('selecting')
  expect((await section(page, 'editLock')).owners).toContain('ink')
  await tool(page, 'Text').click()
  await lift(page, 21)
  await typingWorks(page, 'alpha')
  expect((await section(page, 'editLock')).owners).toEqual([])
})

test('an app switch in the middle of a Lasso loop, then Text: typing works', async ({
  page,
}) => {
  await inkNote(page, 'Lasso')
  await page.keyboard.press('Escape')
  const box = await textBox(page)
  const y = box.y + box.height + 60
  await stroke(page, loopAround({ x: box.x + 20, y, width: 80, height: 30 }), {
    keepDown: true,
    id: 22,
  })
  await expect.poll(() => machineState(page)).toBe('selecting')
  await appSwitch(page) // no pointercancel: the lift is lost
  expect(await machineState(page)).toBe('idle')
  await typingWorks(page, 'bravo')
})

test('a Pencil text drag and a Lasso gesture together, Text chosen, lifted: typing works', async ({
  page,
}) => {
  await inkNote(page, 'Pen')
  await tool(page, 'Text').click()
  // The caret goes to a second line: a drag in an already marked line is a tap.
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Other line')
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  // The Pencil goes down on the words themselves (not on the pad) and drags:
  // penSelect locks the page, and the Lasso takes a gesture of its own.
  const at = await textBox(page)
  await page.evaluate(
    ([x, y]) => {
      const text = document.querySelector(
        '.bn-block-content p, .bn-block-content',
      )!
      const make = (type: string, dx: number) =>
        new PointerEvent(type, {
          pointerType: 'pen',
          pointerId: 23,
          clientX: x + dx,
          clientY: y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: 1,
          pressure: 0.4,
        })
      text.dispatchEvent(make('pointerdown', 0))
      for (let dx = 4; dx <= 40; dx += 4)
        text.dispatchEvent(make('pointermove', dx))
    },
    [at.x + 6, at.y + at.height / 2],
  )
  await expect
    .poll(async () => (await section(page, 'editLock')).owners)
    .toContain('penSelect')
  await tool(page, 'Text').click()
  await lift(page, 23)
  expect((await section(page, 'editLock')).owners).toEqual([])
  await typingWorks(page, 'charlie')
})
