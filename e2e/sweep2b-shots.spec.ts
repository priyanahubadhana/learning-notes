// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  row,
  showSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { pick } from './cBoxesHelpers.ts'

/**
 * Bug sweep to Phase 2B: pictures for the owner's quick OK, with the preset
 * "Up to Phase 2B". Light and dark; iPad sideways, iPad upright and phone.
 * Written to screenshots/sweep-2b/<project>/ with an INDEX.md.
 */
test.use({ hasTouch: true })

const PRESET_2B = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
]
const SIZES = [
  { name: 'ipad-sideways', width: 1180, height: 820 },
  { name: 'ipad-upright', width: 820, height: 1180 },
  { name: 'phone', width: 390, height: 844 },
]
const THEMES: [string, string][] = [
  ['light', 'day'],
  ['dark', 'night'],
]
const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'
const OUT = () => 'screenshots/sweep-2b/' + test.info().project.name

async function start(page: Page, theme: string, vp: (typeof SIZES)[0]) {
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    PRESET_2B,
  )
  await startInMode(page, 'computer')
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Sweep')
  await addPage(page, 'Paper', 'Second')
  await row(page, 'Sweep').click()
  await typeInEditor(page, 'Main text')
  await page.setViewportSize(vp)
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

async function boxWithText(page: Page, phone: boolean) {
  if (phone) {
    await page.getByRole('button', { name: 'Add a box here' }).click()
  } else {
    const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
    const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
    await page.mouse.click(
      sheet.x + sheet.width * 0.4,
      main.y + main.height + 60,
    )
  }
  const box = page.locator(EXTRA).first()
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type('Photosynthesis turns light into sugar.')
  await page.waitForTimeout(600)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  await page.waitForTimeout(400)
  return box
}

for (const [tname, theme] of THEMES)
  for (const vp of SIZES)
    test(`sweep 2B pictures (${tname} ${vp.name})`, async ({ page }) => {
      const phone = vp.width < 480
      await start(page, theme, vp)
      const box = await boxWithText(page, phone)
      if (phone) {
        // A phone stacks the boxes: one tap on the box picks it (C23 spec).
        const r = (await box.boundingBox())!
        await page.mouse.click(r.x + r.width / 2, r.y + r.height / 2)
        await expect(page.getByTestId('ob-boxmore')).toBeVisible()
      } else await pick(page, box)
      await shot(page, `box-selected-${tname}-${vp.name}`)
      await page.getByTestId('ob-boxmore').tap()
      await expect(
        page.getByRole('menu', { name: 'Box actions' }),
      ).toBeVisible()
      await page.waitForTimeout(300)
      await shot(page, `box-list-${tname}-${vp.name}`)
      await page.keyboard.press('Escape')
      if (!phone) {
        await page.locator('[data-paper-box="main"] .bn-editor').click()
        await page.locator('[data-box-menu]:visible').tap()
        await expect(
          page.getByRole('menu', { name: 'Box actions' }),
        ).toBeVisible()
        await page.waitForTimeout(300)
        await shot(page, `first-box-list-${tname}-${vp.name}`)
        await page.keyboard.press('Escape')
        await showSidebar(page)
        const more = row(page, 'Sweep').getByRole('button', {
          name: /^More for/,
        })
        const m = (await more.boundingBox())!
        await page.mouse.move(m.x + m.width / 2, m.y + m.height / 2)
        await page.mouse.down()
        await page.mouse.up()
        await expect(page.getByRole('menu').last()).toBeVisible()
        await page.waitForTimeout(1000)
        await expect(page.getByRole('tooltip')).toBeHidden()
        await shot(page, `page-menu-no-tip-${tname}-${vp.name}`)
      }
    })

test.afterAll(() => {
  const name = test.info().project.name
  mkdirSync(OUT(), { recursive: true })
  writeFileSync(
    `${OUT()}/INDEX.md`,
    [
      `# Sweep 2B pictures (${name})`,
      '',
      'Preset "Up to Phase 2B". Each in light and dark; ipad-sideways 1180x820, ipad-upright 820x1180, phone 390x844.',
      '',
      '- box-selected-<theme>-<size>.png: a box picked: 8 dots, ≡ tab, the frame ⋯ and the box bar (approved picture states.html panel 1).',
      '- box-list-<theme>-<size>.png: the bar ⋯ opens the one v2 "Box actions" list (S1).',
      '- first-box-list-<theme>-<size>.png: the first box ⋯ opens the same v2 list, never the old one (S2). iPad only.',
      '- page-menu-no-tip-<theme>-<size>.png: the sidebar page ⋯ menu with no help tip behind it (S5). iPad only.',
      '',
    ].join('\n'),
  )
})
