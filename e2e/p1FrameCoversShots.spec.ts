// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import fs from 'node:fs'
import { createNotebook, startInMode } from './helpers.ts'

/**
 * P1.9 pictures (flag foundation.shell): Page options, Pin an action and the
 * side list, Beginner and Professional, light and dark, iPad upright and
 * sideways and phone; and the tool bar in Computer, Touch and Pencil mode.
 * Written to screenshots/phase-1/p1-frame-covers/<project>/ with an index.md.
 */
const SIZES: [string, number, number][] = [
  ['ipad-upright', 820, 1180],
  ['ipad-sideways', 1180, 820],
  ['phone', 390, 844],
]
const THEMES = [
  ['light', 'day'],
  ['dark', 'night'],
] as const
const OUT = () =>
  'screenshots/phase-1/p1-frame-covers/' + test.info().project.name

function note(name: string, what: string, sz: string, w: number, h: number) {
  fs.mkdirSync(OUT(), { recursive: true })
  fs.appendFileSync(
    `${OUT()}/index.md`,
    `- ${name}: ${what}, ${sz} ${w}x${h}, taken after the last source edit\n`,
  )
}

async function start(
  page: Page,
  level: string,
  attr: string,
  width: number,
  height: number,
  flags = 'foundation.shell,page.menus',
) {
  await page.setViewportSize({ width, height })
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: l, unlocked: [] }),
    )
  }, level)
  await page.goto('/?flags=' + flags)
  await createNotebook(page, 'Biology', 'Cells')
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    attr,
  )
  // Close the list the steps above opened, so each picture starts clean.
  const close = page.getByTestId('sb-head-close')
  if (await close.isVisible()) await close.click()
  await page.waitForTimeout(400)
}

const sheet = (page: Page) => page.getByTestId('page-sheet')

for (const level of ['beginner', 'professional'])
  for (const [th, attr] of THEMES)
    for (const [sz, width, height] of SIZES) {
      test(`P1.9 shots options and pin ${level} ${th} ${sz}`, async ({
        page,
      }) => {
        await start(page, level, attr, width, height)
        await page.getByRole('button', { name: 'More options' }).click()
        await expect(sheet(page)).toBeVisible()
        await page.waitForTimeout(700)
        let name = `page-options-${level}-${th}-${sz}.png`
        await page.screenshot({ path: `${OUT()}/${name}` })
        note(
          name,
          `Page options as it opens (all folded), ${level}, ${th}`,
          sz,
          width,
          height,
        )
        if (level === 'professional') {
          await sheet(page)
            .getByRole('button', { name: /^Protect/ })
            .click()
          await page.waitForTimeout(300)
          name = `page-options-protect-open-${th}-${sz}.png`
          await page.screenshot({ path: `${OUT()}/${name}` })
          note(
            name,
            `Page options, Protect opened (switches), ${th}`,
            sz,
            width,
            height,
          )
          await sheet(page).getByTestId('ps-pin-add').click()
          await page.waitForTimeout(400)
          name = `pin-an-action-${th}-${sz}.png`
          await page.screenshot({ path: `${OUT()}/${name}` })
          note(
            name,
            `Pin an action (X top left, tick top right), ${th}`,
            sz,
            width,
            height,
          )
        }
      })

      test(`P1.9 shots side list ${level} ${th} ${sz}`, async ({ page }) => {
        await start(page, level, attr, width, height)
        const open = page.getByRole('button', { name: /^(Open|Show) menu$/ })
        if (await open.first().isVisible()) await open.first().click()
        await page.waitForTimeout(700)
        const name = `side-list-${level}-${th}-${sz}.png`
        await page.screenshot({ path: `${OUT()}/${name}` })
        note(
          name,
          `Side list open (own bar, page beside it), ${level}, ${th}`,
          sz,
          width,
          height,
        )
      })
    }

for (const [th, attr] of THEMES)
  for (const [sz, width, height] of SIZES)
    for (const mode of ['computer', 'pencil'] as const)
      test(`P1.9 shots bar ${mode} ${th} ${sz}`, async ({ page }) => {
        await startInMode(page, mode)
        await start(
          page,
          'professional',
          attr,
          width,
          height,
          'foundation.shell',
        )
        const name = `tool-bar-${mode}-${th}-${sz}.png`
        await page.screenshot({ path: `${OUT()}/${name}` })
        note(
          name,
          `Tool bar in ${mode} mode (64 px in every mode), ${th}`,
          sz,
          width,
          height,
        )
      })
