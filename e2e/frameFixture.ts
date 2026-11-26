// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { test as base } from '@playwright/test'

export * from '@playwright/test'

/**
 * The time between two drawn frames of the page, in ms (median of `n` frames,
 * measured with requestAnimationFrame), or null when the page cannot say.
 *
 * Why (issue 73): on some hosted machines the iPad engine (WebKit on Linux,
 * drawn without a graphics card) redraws about once a second while the page
 * itself answers in milliseconds. A test that waits for frames or animations
 * then fails for the machine, not for the app. The number is written into
 * every result (annotation "frame time"), so a machine that is not drawing is
 * seen next to a failure and is not taken for a fault of the app.
 */
export async function frameTime(
  page: import('@playwright/test').Page,
  n = 6,
  limit = 3000,
): Promise<number | null> {
  try {
    return await Promise.race([
      page.evaluate(
        (count) =>
          new Promise<number>((resolve) => {
            const gaps: number[] = []
            let last = performance.now()
            const step = () =>
              requestAnimationFrame((t) => {
                gaps.push(t - last)
                last = t
                if (gaps.length >= count) {
                  gaps.sort((a, b) => a - b)
                  resolve(gaps[Math.floor(gaps.length / 2)])
                } else step()
              })
            step()
          }),
        n,
      ),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), limit)),
    ])
  } catch {
    return null
  }
}

/**
 * `test` with one automatic step: after the test body, on the iPad engine, the
 * frame time of its page is measured and written into the result. It never
 * fails a test and never waits more than `limit` ms (a page that draws nothing
 * is reported as "no frame in 3000 ms").
 */
export const test = base.extend<{ frameTimeNote: void }>({
  frameTimeNote: [
    async ({ page }, use, testInfo) => {
      await use()
      if (!testInfo.project.name.includes('ipad')) return
      if (page.isClosed()) return
      const ms = await frameTime(page)
      const text =
        ms === null ? 'no frame in 3000 ms' : `${ms.toFixed(1)} ms per frame`
      testInfo.annotations.push({ type: 'frame time', description: text })
      // The list reporter does not print annotations: a failed test says it
      // in the log, so a machine that is not drawing is seen at once.
      if (testInfo.status !== testInfo.expectedStatus)
        console.log(
          `FRAMETIME ${testInfo.project.name} ${testInfo.title.slice(0, 60)}: ${text}`,
        )
    },
    // Its own time limit: the note never eats the test's own time.
    { auto: true, timeout: 5_000 },
  ],
})
