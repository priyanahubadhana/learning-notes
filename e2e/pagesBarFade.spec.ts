/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import {
  openById,
  openPanel,
  panel,
  rows,
  seedNotebook,
  start,
} from './notebooksV2PanelHelpers.ts'

/**
 * The Pages tab's Object bar (Organise) fades in place: it never slides, so a
 * button does not move while a finger reaches for it (same as the box bar).
 */
test('the Object bar of the Pages tab fades in and never moves while it does', async ({
  page,
}) => {
  await start(page, {})
  const ids = await seedNotebook(page, 'Panel book', 'Page 01', [
    { title: 'Page 02', lines: ['two'] },
  ])
  await openById(page, ids['Page 01'])
  await openPanel(page)
  await expect(rows(page).first()).toBeVisible()
  await page.evaluate(() => {
    const seen = {
      transforms: new Set<string>(),
      tops: new Set<number>(),
      frames: 0,
    }
    ;(window as unknown as { __ob: typeof seen }).__ob = seen
    const tick = () => {
      const bar = document.querySelector('[data-testid="object-bar"]')
      if (bar) {
        seen.frames++
        seen.transforms.add(getComputedStyle(bar).transform)
        seen.tops.add(Math.round(bar.getBoundingClientRect().top))
      }
      requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
  await panel(page).getByTestId('lpv2-organise').click()
  await expect(page.getByTestId('object-bar')).toBeVisible()
  await page.waitForTimeout(600)
  const seen = await page.evaluate(() => {
    const s = (
      window as unknown as {
        __ob: { transforms: Set<string>; tops: Set<number>; frames: number }
      }
    ).__ob
    return {
      transforms: [...s.transforms],
      tops: [...s.tops],
      frames: s.frames,
    }
  })
  expect(seen.frames).toBeGreaterThan(3)
  expect(seen.transforms).toEqual(['none'])
  expect(seen.tops).toHaveLength(1)
})
