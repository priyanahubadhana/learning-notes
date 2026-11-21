/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * A tap run belongs to the page it was made on (19 Nov, CI reds). The page
 * editor is made again for each page, so the count of taps starts at nothing
 * on the new page; the test reads that through the tool-state seam
 * (window.__lnTools.toolState().tapSelect), with no timing.
 */
test('a tap run does not cross to the next page', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Page A')
  await typeInEditor(page, 'Words on page A')
  const run = () =>
    page.evaluate(
      () =>
        (
          window as unknown as {
            __lnTools: {
              toolState: () => Record<string, Record<string, unknown>>
            }
          }
        ).__lnTools.toolState().tapSelect?.lastCount ?? null,
    )
  await expect.poll(run).toBeGreaterThan(0)
  await addPage(page, 'Paper', 'Page B')
  await expect.poll(run).toBe(0)
})
