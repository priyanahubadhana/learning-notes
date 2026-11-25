// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { sidebar } from './helpers.ts'

/**
 * B11: on a phone the drawer's rows never move sideways while it opens. The
 * list reserved its scroll gutter (24 px) only after it had measured that it
 * overflowed, so the rows (and the ⋯ buttons) jumped 24 px left a moment after
 * the drawer was open and a tap on ⋯ could land beside the button.
 * Both frames: the old one and the new one (foundation.shell).
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
})

const monthName = () =>
  new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(
    new Date(),
  )

for (const [frame, url] of [
  ['old frame', '/'],
  ['new frame (shell on)', '/?flags=foundation.shell'],
] as const)
  test(`B11 the drawer rows and their ⋯ do not move while it opens (${frame})`, async ({
    page,
  }) => {
    const label = `More for ${monthName()}`
    await page.goto(url)
    const side = sidebar(page)
    await page.getByRole('button', { name: 'Open menu' }).click()
    await expect(side).toBeVisible()
    await page.getByRole('button', { name: 'Open today’s journal' }).tap()
    await expect.poll(() => page.url()).toContain('#/page/')
    await expect(side).toBeHidden()
    // The month row is made a moment after the page (slow in WebKit): wait for it.
    await expect(page.locator(`aside [aria-label="${label}"]`)).toBeAttached()
    // From the tap on Open menu, once per frame for 600 ms (and at least 20 frames: a slow
    // machine draws fewer frames in 600 ms, so the count, not the clock, decides): where the ⋯ of the
    // month row is inside the drawer, and how wide the row is.
    const seen = await page.evaluate(
      (name) =>
        new Promise<string[]>((done) => {
          const out: string[] = []
          const t0 = performance.now()
          document
            .querySelector<HTMLElement>('button[aria-label="Open menu"]')!
            .click()
          const tick = () => {
            const more = document.querySelector<HTMLElement>(
              `aside [aria-label="${name}"]`,
            )
            const aside = document.querySelector('aside')!
            if (more) {
              const row = more.closest('div.group')!
              out.push(
                Math.round(
                  more.getBoundingClientRect().x -
                    aside.getBoundingClientRect().x,
                ) +
                  '/' +
                  Math.round(row.getBoundingClientRect().width),
              )
            }
            const enough = performance.now() - t0 >= 600 && out.length >= 20
            if (!enough && performance.now() - t0 < 4000)
              requestAnimationFrame(tick)
            else done(out)
          }
          tick()
        }),
      label,
    )
    expect(seen.length).toBeGreaterThan(10)
    expect(
      [...new Set(seen)],
      'x in the drawer / row width, per frame',
    ).toHaveLength(1)
  })
