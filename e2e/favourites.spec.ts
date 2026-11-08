import { expect, test } from '@playwright/test'
import { openNote, openPill, option, pref } from './mainBarHelpers.ts'

/**
 * Polish 2, item 5: pen favourites. Save a pen with the ★, change the pen,
 * tap the favourite and the pen is as it was.
 */

test.use({ viewport: { width: 1200, height: 900 }, hasTouch: true })

test('save a red thin pen, switch to blue, tap the favourite: red thin again', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Pen', 'pen')
  // Red, thin.
  await option(page, 'Red').click()
  await option(page, 'Thin').click()
  const red = await pref<{ colour: string; size: number }>(page, 'ink.pen')
  expect(red?.size).toBe(0)
  await option(page, 'Save as favourite').click()
  expect(await pref<unknown[]>(page, 'toolbar.favourites')).toHaveLength(1)
  // Blue, thick.
  await option(page, 'Blue').click()
  await option(page, 'Thick').click()
  const blue = await pref<{ colour: string; size: number }>(page, 'ink.pen')
  expect(blue?.colour).not.toBe(red?.colour)
  // Tap the favourite.
  await option(page, /^Favourite 1/).click()
  const back = await pref<{ colour: string; size: number }>(page, 'ink.pen')
  expect(back?.colour).toBe(red?.colour)
  expect(back?.size).toBe(0)
  // Saving the same pen again says so and keeps one.
  await option(page, 'Save as favourite').click()
  expect(await pref<unknown[]>(page, 'toolbar.favourites')).toHaveLength(1)
  // Removing: right-click (a mouse stands in for press and hold).
  await option(page, /^Favourite 1/).click({ button: 'right' })
  expect(await pref<unknown[]>(page, 'toolbar.favourites')).toHaveLength(0)
})
