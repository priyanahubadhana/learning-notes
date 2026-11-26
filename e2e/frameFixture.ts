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
      // PROBE (branch probe/g1-frames only, never merged): PROBE_NOBLUR=1 removes
      // every backdrop-filter and nothing else, so one variable changes.
      if (process.env.PROBE_NOBLUR === '1')
        await page.addInitScript(() => {
          const s = document.createElement('style')
          s.textContent =
            '*,*::before,*::after{-webkit-backdrop-filter:none!important;backdrop-filter:none!important}'
          const add = () => {
            const r = document.documentElement
            if (!r) return false
            r.appendChild(s)
            return true
          }
          if (!add())
            new MutationObserver((_m, o) => {
              if (add()) o.disconnect()
            }).observe(document, { childList: true })
        })
      // PROBE_LITE=1: the app's own "Reduce glass" setting, from the first frame.
      if (process.env.PROBE_LITE === '1')
        await page.addInitScript(() =>
          localStorage.setItem(
            'learning-notes:general.reduceGlass',
            '"reduce"',
          ),
        )
      // PROBE_NOANIM=1: every CSS animation and transition off, nothing else.
      if (process.env.PROBE_NOANIM === '1')
        await page.addInitScript(() => {
          const s = document.createElement('style')
          s.textContent =
            '*,*::before,*::after{animation:none!important;transition:none!important}'
          const add = () => {
            const r = document.documentElement
            if (!r) return false
            r.appendChild(s)
            return true
          }
          if (!add())
            new MutationObserver((_m, o) => {
              if (add()) o.disconnect()
            }).observe(document, { childList: true })
        })
      // PROBE_NOSHADOW=all|cards|sheet|handles|scroller|rest: box-shadow off on that group only.
      if (process.env.PROBE_NOSHADOW)
        await page.addInitScript((which) => {
          const s = document.createElement('style')
          const css: Record<string, string> = {
            all: '*,*::before,*::after{box-shadow:none!important}',
            cards:
              '.pcard,.cs__bar,.cs-pick,.cl,.fb-dialog,.fb-sheet{box-shadow:none!important}',
            sheet: '[data-paper-sheet]{box-shadow:none!important}',
            handles: '.shadow-md{box-shadow:none!important}',
            scroller:
              '[class*="shadow-[var(--elev-1)]"]{box-shadow:none!important}',
            rest: '*:not(.pcard,.cs__bar,.cs-pick,.cl,.fb-dialog,.fb-sheet):not(.glass):not(.glass-flat){box-shadow:none!important}',
          }
          s.textContent = css[which as string] ?? css.all
          const add = () => {
            const r = document.documentElement
            if (!r) return false
            r.appendChild(s)
            return true
          }
          if (!add())
            new MutationObserver((_m, o) => {
              if (add()) o.disconnect()
            }).observe(document, { childList: true })
        }, process.env.PROBE_NOSHADOW)
      const t0 = Date.now()
      await use()
      if (process.env.PROBE_LOG === '1' && !page.isClosed()) {
        const ms = await frameTime(page, 20, 8000)
        const glass = await page
          .evaluate(() => document.documentElement.dataset.glass ?? 'blur')
          .catch(() => '?')
        console.log(
          `PROBEFT label=${process.env.PROBE_LABEL} title=${testInfo.title.slice(0, 20).replace(/ /g, '_')} rep=${testInfo.repeatEachIndex} status=${testInfo.status} body_s=${((Date.now() - t0) / 1000).toFixed(1)} endframe_ms=${ms === null ? 'none' : ms.toFixed(1)} glass=${glass}`,
        )
      }
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
    { auto: true, timeout: 15_000 },
  ],
})
