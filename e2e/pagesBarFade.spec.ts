/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
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
 *
 * Why the fade is held and stepped through (G1, run 46013460259): the check
 * used to count the frames the browser drew in a fixed 600 ms. The iPad engine
 * on the hosted machine draws without a graphics card, a frame of this glass
 * bar can take 230-350 ms there, so only 2-3 frames were drawn and the test
 * failed on the machine, not on the app. Now the bar's own fade is caught the
 * moment the bar appears, held, and set to 11 points from start to end; at
 * each point the bar must not have moved. The test then lets the fade finish
 * (it waits for that, not for a time) and checks the bar is still in place.
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
  // Before the tap: the moment the bar is put on the page (before it is
  // drawn), its fade is held at the start.
  await page.evaluate(() => {
    const w = window as unknown as {
      __ob?: { bar: Element; fade: Animation | null }
    }
    const watch = new MutationObserver(() => {
      const bar = document.querySelector('[data-testid="object-bar"]')
      if (!bar) return
      watch.disconnect()
      const fade = bar.getAnimations().find((a) => 'animationName' in a) ?? null
      fade?.pause()
      w.__ob = { bar, fade }
    })
    watch.observe(document.body, { childList: true, subtree: true })
  })
  await panel(page).getByTestId('lpv2-organise').click()
  await expect(page.getByTestId('object-bar')).toBeVisible()
  const seen = await page.evaluate(async () => {
    const { bar, fade } = (
      window as unknown as { __ob: { bar: Element; fade: Animation | null } }
    ).__ob
    const look = () => ({
      opacity: Number(getComputedStyle(bar).opacity),
      transform: getComputedStyle(bar).transform,
      top: Math.round(bar.getBoundingClientRect().top),
    })
    if (!fade) return null
    const name = (fade as Animation & { animationName: string }).animationName
    const length = Number(fade.effect?.getComputedTiming().duration ?? 0)
    const steps = []
    for (let i = 0; i <= 10; i++) {
      fade.currentTime = (length * i) / 10
      steps.push(look())
    }
    fade.play()
    await fade.finished
    const after = look()
    return {
      name,
      length,
      steps,
      after,
      same: document.querySelector('[data-testid="object-bar"]') === bar,
    }
  })
  // The bar fades (it is not shown at once, nor slid in) …
  expect(seen).not.toBeNull()
  expect(seen!.name).toBe('pm-fade')
  expect(seen!.length).toBeGreaterThan(0)
  expect(seen!.steps).toHaveLength(11)
  expect(seen!.steps[0].opacity).toBeLessThan(1)
  expect(seen!.steps[10].opacity).toBe(1)
  // … and never moves while it does, nor when it ends.
  const all = [...seen!.steps, seen!.after]
  expect([...new Set(all.map((s) => s.transform))]).toEqual(['none'])
  expect(new Set(all.map((s) => s.top)).size).toBe(1)
  expect(seen!.after.opacity).toBe(1)
  // It is the same bar all along (not put on the page again).
  expect(seen!.same).toBe(true)
})
