import { expect, test } from '@playwright/test'
import { openNote, pref, tool } from './mainBarHelpers.ts'

/**
 * Polish 2, item 4: a ⇄ Last tool button (pinned in Pencil mode the first
 * time) and "Go back to the previous tool after one erase".
 */

test.use({ viewport: { width: 1024, height: 768 } })

test('Pen, Eraser, ⇄ is the Pen again with the same colour', async ({
  page,
}) => {
  await openNote(page, 'pencil', { 'toolbar.lastToolOffered': false })
  // Pencil mode pinned the button by itself, once.
  const last = tool(page, 'Last tool')
  await expect(last).toBeVisible()
  expect(await pref<string[]>(page, 'toolbar.extras')).toContain('lastTool')
  await tool(page, 'Pen').click()
  const colour = await pref<{ colour: string }>(page, 'ink.pen')
  await tool(page, 'Eraser').click()
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true')
  await last.click()
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'true')
  expect((await pref<{ colour: string }>(page, 'ink.pen'))?.colour).toBe(
    colour?.colour,
  )
  // Again: back to the Eraser.
  await last.click()
  await expect(tool(page, 'Eraser')).toHaveAttribute('aria-pressed', 'true')
})

test('an Eraser that returns after one erase', async ({ page }) => {
  await openNote(page, 'pencil', {
    'ink.eraser': { returnAfter: true },
  })
  await tool(page, 'Pen').click()
  await tool(page, 'Eraser').click()
  const pad = page.locator('[data-ink-pad]')
  const box = (await pad.boundingBox())!
  await page.mouse.move(box.x + 200, box.y + 200)
  await page.mouse.down()
  await page.mouse.move(box.x + 260, box.y + 220, { steps: 4 })
  await page.mouse.up()
  await expect(tool(page, 'Pen')).toHaveAttribute('aria-pressed', 'true')
})
