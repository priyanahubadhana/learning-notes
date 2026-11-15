// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** First-look pictures for the 2A.12 ⋯ More card. Run by hand (SHOTS=1). */
const OUT = 'docs/mockups/toolbar-v9-build-shots/2a12-more'
const SIZES = [
  ['ipad-upright', 820, 1180],
  ['ipad-sideways', 1180, 820],
  ['phone', 390, 844],
] as const

test.skip(!process.env.SHOTS, 'pictures are taken by hand (SHOTS=1)')
test.use({ hasTouch: true })

for (const level of ['beginner', 'professional'] as const)
  for (const theme of ['light', 'dark'] as const)
    for (const [size, width, height] of SIZES)
      test(`more ${level} ${theme} ${size}`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.emulateMedia({ colorScheme: theme })
        await page.addInitScript(
          (x) => {
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({
                level: x.level,
                unlocked:
                  x.level === 'professional'
                    ? ['tb.layouts', 'tb.allTools']
                    : [],
              }),
            )
            localStorage.setItem(
              'learning-notes:theme',
              JSON.stringify(x.theme === 'dark' ? 'night' : x.theme),
            )
          },
          { level, theme },
        )
        await startInMode(page, 'touch')
        await page.goto('/?flags=toolbar.v8,toolbar.menu')
        await createNotebook(page, 'Biology', 'First')
        await typeInEditor(page, 'The nucleus holds the DNA')
        await page.getByTestId('v8-tool-pen').click()
        await page.getByTestId('v8-tool-eraser').click()
        await page.getByTestId('v8-more').click()
        await openFold(page, 'more-group-study')
        if (theme === 'dark') {
          // Section 7: the dark picture must really be dark.
          await expect(page.locator('html')).toHaveAttribute(
            'data-theme',
            'night',
          )
          const bg = await page.evaluate(
            () => getComputedStyle(document.body).backgroundColor,
          )
          const [r, g, b] = (bg.match(/\d+/g) ?? []).map(Number)
          expect(r + g + b, `body background ${bg}`).toBeLessThan(150)
        }
        mkdirSync(OUT, { recursive: true })
        await page.screenshot({
          path: `${OUT}/more-${level}-${theme}-${size}.png`,
        })
      })

/** Opens a More card fold by its test id; a missed click fails the shot. */
async function openFold(page: Page, testId: string) {
  const head = page.getByTestId(testId).locator('.fgroup-head')
  await head.scrollIntoViewIfNeeded()
  await head.click()
  await expect(head).toHaveAttribute('aria-expanded', 'true')
  await page.waitForTimeout(600)
}

test('more professional light ipad-upright copy open', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 1180 })
  await page.emulateMedia({ colorScheme: 'light' })
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({
        level: 'professional',
        unlocked: ['tb.layouts', 'tb.allTools'],
      }),
    )
    localStorage.setItem('learning-notes:theme', JSON.stringify('light'))
  })
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8,toolbar.menu')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-more').click()
  await openFold(page, 'more-group-copy')
  for (const id of ['copy', 'cut', 'paste']) {
    const tile = page.getByTestId(`v8-more-${id}`)
    await tile.scrollIntoViewIfNeeded()
    await expect(tile).toBeVisible()
  }
  mkdirSync(OUT, { recursive: true })
  await page.screenshot({
    path: `${OUT}/more-professional-light-ipad-upright-copy.png`,
  })
})
