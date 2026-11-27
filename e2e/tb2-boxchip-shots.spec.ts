// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from './frameFixture.ts'
import fs from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Task 2B.11 pictures: the Box ▾ card of the Text tool (T6), Beginner and
 * Professional, light and dark, iPad upright and sideways, and phone. Written
 * to screenshots/phase-2b/2b11-pencil/<project>/ with an index.md.
 */
const SIZES: [string, number, number][] = [
  ['ipad-upright', 820, 1180],
  ['ipad-sideways', 1180, 820],
  ['phone', 390, 844],
]
const OUT = () => 'screenshots/phase-2b/2b11-pencil/' + test.info().project.name

for (const level of ['beginner', 'professional'])
  for (const [th, attr] of [
    ['light', 'day'],
    ['dark', 'night'],
  ])
    for (const [sz, width, height] of SIZES)
      test(`2B.11 Box card ${level} ${th} ${sz}`, async ({ page }) => {
        await page.setViewportSize({ width, height })
        await page.addInitScript((l) => {
          localStorage.setItem(
            'learning-notes:level',
            JSON.stringify({ level: l, unlocked: [] }),
          )
          localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"')
        }, level)
        await startInMode(page, 'pencil')
        await page.goto('/?flags=toolbar.v8')
        await createNotebook(page, 'Paper', 'Shots')
        await typeInEditor(page, 'Main text')
        await page.evaluate(
          (t) => document.documentElement.setAttribute('data-theme', t),
          attr,
        )
        await page.getByTestId('v8-tool-text').click()
        const hide = page.getByRole('button', { name: 'Hide menu' })
        if (await hide.isVisible()) await hide.click()
        await page.waitForTimeout(700)
        await page.getByTestId('v8-chip-text.box').click()
        await expect(page.getByTestId('v8-card-text.box')).toBeVisible()
        await page.waitForTimeout(1500)
        fs.mkdirSync(OUT(), { recursive: true })
        const name = `box-card-${level}-${th}-${sz}.png`
        await page.screenshot({ path: `${OUT()}/${name}` })
        fs.appendFileSync(
          `${OUT()}/index.md`,
          `- ${name}: Box card open from the Text tool chip, ${level}, ${th}, ${sz} ${width}x${height}, taken after the last source edit\n`,
        )
      })
