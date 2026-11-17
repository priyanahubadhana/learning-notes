// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import {
  createNotebook,
  openPage,
  startInMode,
  typeInEditor,
} from './helpers.ts'

/**
 * Task 2B.9 first-look pictures (switch textbox.v2 ON): the Box card, Box and
 * Layout sections, Beginner and Professional, in light, dark and sepia on an
 * iPad upright, an iPad sideways and a phone. Written to
 * screenshots/phase-2b/2b9-card/<project>/ with an index.md. The theme is set
 * on the page before each shot.
 */
test.use({ hasTouch: true, deviceScaleFactor: 2 })

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/phase-2b/2b9-card/' + test.info().project.name
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
    { x: r.x + r.width - 30, y: r.y + r.height / 2 },
  )
  await expect(box).toHaveAttribute('data-picked', '')
  await page.waitForTimeout(500)
}

const card = (page: Page) => page.getByTestId('bc-card')

async function run(
  page: Page,
  mode: 'computer' | 'touch',
  vp: Size,
  tag: string,
  level: 'beginner' | 'professional',
) {
  mkdirSync(OUT(), { recursive: true })
  const lines: string[] = []
  {
    // A phone opens the Notebooks list when Professional is on from the start,
    // so it is made as Beginner and switched before the pictures.
    const first = tag === 'phone' ? 'beginner' : level
    await page.addInitScript((lv) => {
      localStorage.setItem('learning-notes:flags', '["textbox.v2"]')
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({
          level: localStorage.getItem('shot:level') ?? lv,
          unlocked: [],
          off: [],
        }),
      )
    }, first)
    await startInMode(page, mode)
    await page.setViewportSize(vp)
    await page.goto('/')
    await createNotebook(page, 'Shots', 'Card shots')
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

    if (first !== level) {
      await page.evaluate((lv) => localStorage.setItem('shot:level', lv), level)
      await page.reload()
      await openPage(page, 'Card shots')
      await expect(page.locator(EXTRA)).toHaveCount(1)
    }
    for (const [label, th] of THEMES) {
      await theme(page, th)
      await pick(page)
      await page.getByRole('button', { name: 'Box style' }).tap()
      await expect(card(page)).toHaveAttribute('data-settled', 'true')
      await page.waitForTimeout(400)
      const name = `${tag}-${level}-box-${label}.png`
      await page.screenshot({ path: `${OUT()}/${name}` })
      lines.push(`- ${name}: Box section, ${level}, ${label}, ${tag}`)
      await page.getByTestId('bc-tab-layout').tap()
      await page.waitForTimeout(300)
      const lay = `${tag}-${level}-layout-${label}.png`
      await page.screenshot({ path: `${OUT()}/${lay}` })
      lines.push(`- ${lay}: Layout section, ${level}, ${label}, ${tag}`)
      await card(page).getByRole('button', { name: 'Close' }).click()
      await expect(card(page)).toHaveCount(0)
    }
  }
  writeFileSync(
    `${OUT()}/index-${tag}-${level}.md`,
    `# 2B.9 Box card, ${tag}\n\n${lines.join('\n')}\n`,
  )
}

for (const level of ['beginner', 'professional'] as const) {
  test('2B.9 pictures: iPad upright, ' + level, async ({ page }) => {
    await run(
      page,
      'computer',
      { width: 820, height: 1180 },
      'ipad-upright',
      level,
    )
  })
  test('2B.9 pictures: iPad sideways, ' + level, async ({ page }) => {
    await run(
      page,
      'computer',
      { width: 1180, height: 820 },
      'ipad-sideways',
      level,
    )
  })
  test('2B.9 pictures: phone, ' + level, async ({ page }) => {
    await run(page, 'touch', { width: 390, height: 844 }, 'phone', level)
  })
}
