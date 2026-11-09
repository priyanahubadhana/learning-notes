// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  stroke,
  textBox,
  wave,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { loopAround, machineState, section } from './toolsHelpers.ts'

/**
 * Tools robustness, step 1: one input state machine. A pointer that went
 * down and never lifted (the iPad drops lifts) is dropped after 4 s, and a
 * tool change drops it at once, so the next Lasso loop selects.
 */
test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

async function inkAndLasso(page: import('@playwright/test').Page) {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  const y = box.y + box.height + 60
  await stroke(page, wave(box.x + 20, box.x + 200, y))
  await expectStrokes(page, 1)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  return { box, y }
}

const ink = (page: import('@playwright/test').Page) => section(page, 'ink')

test('a touch with no lift is dropped after 4 s and the next Lasso loop selects', async ({
  page,
}) => {
  const { box, y } = await inkAndLasso(page)
  // A loop starts and its lift never comes.
  await stroke(page, line([box.x + 20, y + 80], [box.x + 60, y + 90], 6), {
    keepDown: true,
    id: 31,
  })
  await expect.poll(() => machineState(page)).toBe('selecting')
  await page.waitForTimeout(4500)
  await expect.poll(() => machineState(page)).toBe('idle')
  expect((await ink(page)).gesture).toBe('none')
  // The next loop selects.
  await stroke(
    page,
    loopAround({ x: box.x + 20, y: y - 14, width: 180, height: 28 }, 6),
  )
  await expect.poll(async () => (await ink(page)).selection).toBe(1)
  expect(await machineState(page)).toBe('idle')
})

test('a tool change drops a half Lasso gesture at once', async ({ page }) => {
  const { box, y } = await inkAndLasso(page)
  await stroke(page, line([box.x + 20, y + 80], [box.x + 60, y + 90], 6), {
    keepDown: true,
    id: 32,
  })
  await expect.poll(() => machineState(page)).toBe('selecting')
  await tool(page, 'Text').click()
  await expect.poll(() => machineState(page)).toBe('idle')
  expect((await ink(page)).gesture).toBe('none')
})

test('a normal loop leaves the machine idle', async ({ page }) => {
  const { box, y } = await inkAndLasso(page)
  await stroke(
    page,
    loopAround({ x: box.x + 20, y: y - 14, width: 180, height: 28 }, 6),
  )
  await expect.poll(async () => (await ink(page)).selection).toBe(1)
  expect(await machineState(page)).toBe('idle')
})
