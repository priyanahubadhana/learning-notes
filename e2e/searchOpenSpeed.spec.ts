import { expect, test } from './frameFixture.ts'
import { createNotebook, openSearchPopup, typeInEditor } from './helpers.ts'

/**
 * F7 (freezeWatch): opening Search must not block the screen for 500 ms or
 * more. CI run 45918658223 noted a 621 ms block at Ctrl+K with the results
 * list open. Measured here (CPU profile, fast PC, no load): one 205-225 ms
 * task when the popup opens, 203 ms of it in `englishName`
 * (src/app/tools/controlRows.ts), which copies the whole English word list
 * ({ ...en, ...enLate }) once for every tool and every setting row that
 * buildRows makes. GitHub's machine has 2 cores and is about 3 times slower:
 * the same task crosses 500 ms there, and on a slow iPad.
 *
 * The page runs on a CPU slowed 4 times (as the CI machine and an older
 * iPad), so the case is made on any PC. Chromium only (the slowdown is a
 * Chromium tool).
 */
test.skip(
  ({ browserName }) => browserName !== 'chromium',
  'CPU slowdown is a Chromium DevTools feature',
)

const FLAGS = ['foundation.shell', 'toolbar.v8', 'search.v2']

test('F7s opening Search never blocks the screen for 500 ms, on a 4x slower CPU', async ({
  page,
}) => {
  test.setTimeout(120_000)
  await page.goto('/#/')
  await createNotebook(page, 'Speed check', 'First page')
  await typeInEditor(page, 'A note about recall and memory.')
  await page.evaluate(
    (flags) =>
      localStorage.setItem('learning-notes:flags', JSON.stringify(flags)),
    FLAGS,
  )
  await page.goto('/#/')
  await expect(page.locator('main')).toBeVisible()
  await page.evaluate(() => {
    const w = window as unknown as {
      __long: number[]
      __longObs: PerformanceObserver
    }
    w.__long = []
    w.__longObs = new PerformanceObserver((list) => {
      for (const e of list.getEntries()) w.__long.push(Math.round(e.duration))
    })
    w.__longObs.observe({ type: 'longtask' })
  })
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
  const popup = await openSearchPopup(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 })
  await page.keyboard.press('Escape')
  await expect(popup).toHaveCount(0)
  // Every long task so far, those not yet handed to the observer too.
  const long = await page.evaluate(() => {
    const w = window as unknown as {
      __long: number[]
      __longObs: PerformanceObserver
    }
    for (const e of w.__longObs.takeRecords())
      w.__long.push(Math.round(e.duration))
    return w.__long
  })
  console.log('F7s long tasks (ms)', JSON.stringify(long))
  expect(Math.max(0, ...long)).toBeLessThan(500)
})
