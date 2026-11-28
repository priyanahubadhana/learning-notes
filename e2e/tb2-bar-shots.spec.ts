// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import { mkdirSync } from 'node:fs'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * Task 2B.8 first-look pictures (switch textbox.v2 ON): the Object bar, the
 * ⋯ list and a locked box, in light, dark and sepia on an iPad upright, an iPad
 * sideways and a phone. Written to screenshots/phase-2b/2b8-bar/<project>/.
 * The theme is set on the page before each shot.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/phase-2b/2b8-bar/' + test.info().project.name
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
  ['sepia', 'sepia'],
]
type Size = { width: number; height: number }

async function theme(page: Page, th: string) {
  await page.evaluate(
    (t) => document.documentElement.setAttribute('data-theme', t),
    th,
  )
  await expect(page.locator('html')).toHaveAttribute('data-theme', th)
}

/** Nothing selected, then a finger tap in the empty part of the box selects it (owner 17 Nov). */
async function pick(page: Page) {
  const box = page.locator(EXTRA)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape')
  await expect(box).not.toHaveAttribute('data-picked', '')
  await box.evaluate((e) => e.scrollIntoView({ block: 'center' }))
  const r = (await box.boundingBox())!
  await page.evaluate(
    ({ x, y }) => {
      const el = document.elementFromPoint(x, y)!
      for (const type of ['pointerdown', 'pointerup'])
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'touch',
            pointerId: 7,
            isPrimary: true,
            clientX: x,
            clientY: y,
            buttons: type === 'pointerdown' ? 1 : 0,
            bubbles: true,
            cancelable: true,
          }),
        )
    },
    { x: r.x + r.width - 4, y: r.y + r.height / 2 }, // on the border: a tap near words puts the caret
  )
  await expect(box).toHaveAttribute('data-picked', '')
  await page.waitForTimeout(700)
}

const more = (page: Page) => page.getByRole('menu', { name: 'Box actions' })

async function run(
  page: Page,
  mode: 'computer' | 'touch',
  vp: Size,
  tag: string,
) {
  mkdirSync(OUT(), { recursive: true })
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:flags', '["textbox.v2"]'),
  )
  await startInMode(page, mode)
  await page.setViewportSize(vp)
  await page.goto('/')
  await createNotebook(page, 'Shots', 'Bar')
  await typeInEditor(page, 'Main text')
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const sheetEl = page.locator('[data-paper-sheet="1"]')
  const sheet = (await sheetEl.count()) ? await sheetEl.boundingBox() : null
  await page.mouse.click(
    sheet ? sheet.x + sheet.width * 0.3 : vp.width / 2,
    main.y + main.height + (sheet ? 60 : 40),
  )
  await expect(page.locator(EXTRA)).toHaveCount(1)
  await expect(page.locator(EXTRA + ' .bn-editor')).toBeFocused()
  await page.keyboard.type('Photosynthesis: light, water and carbon dioxide')
  await page.waitForTimeout(900)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(900)

  const shot = (name: string, label: string) =>
    page.screenshot({ path: `${OUT()}/${tag}-${name}-${label}.png` })
  for (const [label, th] of THEMES) {
    await theme(page, th)
    await pick(page)
    await expect(page.getByTestId('object-bar')).toHaveCount(1)
    await shot('bar', label)
    await page.getByTestId('ob-boxmore').tap()
    await expect(more(page)).toBeVisible()
    await page.waitForTimeout(300)
    await shot('list', label)
    await page.keyboard.press('Escape')
    await expect(more(page)).toHaveCount(0)
  }
  // Lock it from the list, then the same three themes.
  await pick(page)
  await page.getByTestId('ob-boxmore').tap()
  await more(page).getByRole('menuitem', { name: 'Lock in place' }).click()
  await expect(page.locator(EXTRA)).toHaveAttribute('data-locked', '')
  // A phone stacks its boxes: every box there already shows the lock and no
  // dots, so the phone shot opens the ⋯ list, where the lock shows as Unlock.
  const phone = vp.width < 600
  for (const [label, th] of THEMES) {
    await theme(page, th)
    await pick(page)
    if (phone) {
      await page.getByTestId('ob-boxmore').tap()
      await expect(
        more(page).getByRole('menuitem', { name: 'Unlock' }),
      ).toBeVisible()
      await page.waitForTimeout(300)
    }
    await shot('locked', label)
    if (phone) {
      await page.keyboard.press('Escape')
      await expect(more(page)).toHaveCount(0)
    }
  }
}

test('2B.8 pictures: iPad upright', async ({ page }) => {
  await run(page, 'computer', { width: 820, height: 1180 }, 'ipad-upright')
})

test('2B.8 pictures: iPad sideways', async ({ page }) => {
  await run(page, 'computer', { width: 1180, height: 820 }, 'ipad-sideways')
})

test('2B.8 pictures: phone', async ({ page }) => {
  await run(page, 'touch', { width: 390, height: 844 }, 'phone')
})
