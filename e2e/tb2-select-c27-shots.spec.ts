// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import { mkdirSync, writeFileSync } from 'node:fs'
import { pick, tapEmptyPart } from './cBoxesHelpers.ts'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * First-look pictures of C27 (owner, 17 Nov 2026; switch textbox.v2 ON): a
 * new box (whole line wide, one line tall), typing in it (C11: thin border,
 * no dots), the box selected (dots, ≡, bar) and the first box of an empty
 * page. Light and dark; iPad sideways, iPad upright and phone. Written to
 * screenshots/c27/<project>/<what>-<theme>-<size>.png (INDEX.md there).
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const MAIN = '[data-paper-box="main"]'
const rect = async (l: Locator) => (await l.boundingBox())!
const SIZES = [
  { name: 'ipad-sideways', width: 1180, height: 820 },
  { name: 'ipad-upright', width: 820, height: 1180 },
  { name: 'phone', width: 390, height: 844 },
]
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
]
const OUT = () => 'screenshots/c27/' + test.info().project.name

async function start(
  page: Page,
  name: string,
  theme: string,
  vp: (typeof SIZES)[0],
) {
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await page.setViewportSize(vp)
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', name)
  await page.evaluate(
    (th) => document.documentElement.setAttribute('data-theme', th),
    theme,
  )
  await page.waitForTimeout(500)
}

const shot = (page: Page, file: string) => {
  mkdirSync(OUT(), { recursive: true })
  return page.screenshot({ path: `${OUT()}/${file}.png` })
}

test.afterAll(() => {
  const name = test.info().project.name
  const lines = [
    `# C27 pictures (${name})`,
    '',
    'Taken by e2e/tb2-select-c27-shots.spec.ts after the last source edit.',
    'Each in light and dark; ipad-sideways 1180x820, ipad-upright 820x1180, phone 390x844.',
    '',
    '- new-box-<theme>-<size>.png: a Text-tool tap under the first box: the new box is the whole line wide and one line tall, "Type here".',
    '- typing-<theme>-<size>.png: three lines typed; C11 typing look: thin accent border, no dots, no ≡, no bar.',
    '- selected-<theme>-<size>.png: the same box picked: 8 dots, ≡ tab and the box bar.',
    '- first-box-<theme>-<size>.png: an empty page: the first box is one line tall with the page hint.',
    '',
  ]
  mkdirSync('screenshots/c27/' + name, { recursive: true })
  writeFileSync(`screenshots/c27/${name}/INDEX.md`, lines.join('\n'))
})

for (const [tname, theme] of THEMES)
  for (const vp of SIZES) {
    test(`C27 pictures: new box, typing, selected (${tname} ${vp.name})`, async ({
      page,
    }) => {
      await start(page, `C27 shots ${tname} ${vp.name}`, theme, vp)
      await typeInEditor(page, 'Main text')
      if (vp.name === 'phone') {
        await page.getByRole('button', { name: 'Add a box here' }).click()
      } else {
        const sheet = await rect(page.locator('[data-paper-sheet="1"]'))
        const main = await rect(page.locator(MAIN))
        await page.mouse.click(
          sheet.x + sheet.width * 0.4,
          main.y + main.height + 60,
        )
      }
      const box = page.locator(EXTRA)
      await expect(box).toHaveCount(1)
      await expect(box.locator('.bn-editor')).toBeFocused()
      await page.waitForTimeout(500)
      await shot(page, `new-box-${tname}-${vp.name}`)
      await page.keyboard.type('Line one')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Line two')
      await page.keyboard.press('Enter')
      await page.keyboard.type('Line three')
      // C11: typing in a box just made: thin border, no dots, no bar.
      await expect(box).toHaveAttribute('data-typing', '')
      await expect(box).not.toHaveAttribute('data-picked', '')
      await expect(box.locator('[data-resize-handle]')).toHaveCount(0)
      const bw = await box
        .locator('[data-box-frame]')
        .first()
        .evaluate((el) => parseFloat(getComputedStyle(el).borderTopWidth))
      expect(bw).toBeGreaterThan(0)
      expect(bw).toBeLessThanOrEqual(1.01)
      await page.waitForTimeout(500)
      await shot(page, `typing-${tname}-${vp.name}`)
      // Caret away (nothing selected: the box was never picked), then pick it.
      await page.evaluate(() => (document.activeElement as HTMLElement).blur())
      await page.waitForTimeout(800)
      await expect(box).not.toHaveAttribute('data-typing', '')
      if (vp.name === 'phone') await tapEmptyPart(page, box)
      else await pick(page, box)
      await expect(box).toHaveAttribute('data-picked', '')
      await expect(page.locator('[data-box-bar]')).toBeVisible()
      await page.waitForTimeout(500)
      await shot(page, `selected-${tname}-${vp.name}`)
    })

    test(`C27 pictures: first box of an empty page (${tname} ${vp.name})`, async ({
      page,
    }) => {
      await start(page, `C27 first ${tname} ${vp.name}`, theme, vp)
      await expect(page.locator(MAIN)).toBeVisible()
      await page.waitForTimeout(500)
      await shot(page, `first-box-${tname}-${vp.name}`)
    })
  }
