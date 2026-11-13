// Takes the pictures for slice 12 rest. Not part of the test suite: run with
// a config whose testDir is this folder (see index.md).
import { test, type Page } from '@playwright/test'
import { createNotebook, openSidebar } from '../../../../e2e/helpers.ts'

const OUT = 'docs/mockups/page-menus-build-shots/rest'
const SIZES = {
  ipadL: { width: 1180, height: 820 },
  ipadP: { width: 820, height: 1180 },
  phone: { width: 390, height: 844 },
  pc: { width: 1440, height: 900 },
}
const THEMES = ['day', 'night', 'sepia'] as const
const LEVELS = ['beginner', 'professional'] as const

async function shot(page: Page, name: string) {
  await page.waitForTimeout(350)
  await page.screenshot({ path: `${OUT}/${name}.png` })
}

async function closeSide(page: Page) {
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) {
    await hide.click()
    await page.waitForTimeout(300)
  }
}

for (const [size, viewport] of Object.entries(SIZES)) {
 test.describe(size, () => {
  // Touch screens (iPad, phone) shot with touch, so touch-only rules show.
  test.use({ hasTouch: size !== 'pc' })
  for (const theme of THEMES) {
    for (const level of LEVELS) {
      test(`${size} ${theme} ${level}`, async ({ page }) => {
        await page.setViewportSize(viewport)
        await page.addInitScript(
          ([l, th]) => {
            localStorage.setItem(
              'learning-notes:level',
              JSON.stringify({
                level: l,
                unlocked: l === 'professional' ? ['page.pastedChip'] : [],
              }),
            )
            localStorage.setItem('learning-notes:theme', JSON.stringify(th))
          },
          [level, theme],
        )
        await page.goto('/?flags=page.menus')
        await createNotebook(page, 'Biology', 'Cell division')
        await closeSide(page)
        await page.locator('.bn-editor').click()
        await page.keyboard.type(
          'Cells divide by mitosis. Chromosomes line up first.',
        )
        const tag = `${size}-${theme}-${level}`
        const box = (await page.locator('.bn-editor p').first().boundingBox())!
        await page.mouse.click(box.x + 60, box.y + box.height / 2, {
          button: 'right',
        })
        await page.getByTestId('page-strip').waitFor()
        await shot(page, `strip-${tag}`)
        await page.getByTestId('cs-paste').click()
        await shot(page, `paste-${tag}`)
        await page.keyboard.press('Escape')
        await page.keyboard.press('Escape')
        await page.getByRole('button', { name: 'More options' }).click()
        await page.getByTestId('page-sheet').waitFor()
        await shot(page, `sheet-${tag}`)
        if (level === 'professional') {
          // Two pinned actions, then the Arrange sheet (PM-63).
          const sheet = page.getByTestId('page-sheet')
          for (const id of ['history', 'review']) {
            await sheet.getByTestId('ps-pin-add').click()
            await sheet.getByTestId(`ps-pin-${id}`).click()
            await sheet.getByTestId('ps-back').click()
          }
          await sheet.getByTestId('ps-arrange').click()
          await page.getByTestId('arrange-sheet').waitFor()
          await shot(page, `arrange-${tag}`)
          await page.getByTestId('arrange-done').click()
          await sheet.getByTestId('fb-sheet-close').click()
        } else {
          await page.getByTestId('page-sheet').getByTestId('fb-sheet-close').click()
        }
        await page.getByTestId('page-sheet').waitFor({ state: 'detached' })
        // The paste chooser, then the "Pasted as" chip (Professional switch on).
        await page.evaluate(() =>
          localStorage.setItem('learning-notes:general.pasteMode', '"ask"'),
        )
        await page.locator('.bn-editor').click()
        await page.evaluate(() => {
          const data = new DataTransfer()
          data.setData('text/html', '<h2>Cell heading</h2><p><b>bold</b> and <i>rich</i> words</p>')
          data.setData('text/plain', 'Cell heading, bold and rich words')
          document.querySelector('.bn-editor')!.dispatchEvent(
            new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }),
          )
        })
        await page.getByRole('dialog', { name: 'Paste as' }).waitFor()
        await shot(page, `chooser-${tag}`)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(300)
        await shot(page, `chip-${tag}`)
        await page.evaluate(() =>
          localStorage.removeItem('learning-notes:general.pasteMode'),
        )
        // Settings, Paste row.
        await page.goto('/?flags=page.menus#/settings/general')
        await closeSide(page)
        await page.getByRole('group', { name: 'Paste' }).scrollIntoViewIfNeeded()
        await shot(page, `settings-${tag}`)
        await page.goBack()
        await closeSide(page)
        // A long-press on the page row opens the strip at that point (PM-23).
        const show = page.getByRole('button', { name: 'Show menu' })
        if (await show.isVisible()) await show.click()
        const side = await openSidebar(page)
        const row = side.getByTestId('page-row').first().getByRole('button').first()
        await page.waitForTimeout(600)
        await row.evaluate(async (el) => {
          const r = el.getBoundingClientRect()
          const o = {
            bubbles: true,
            pointerType: 'touch',
            isPrimary: true,
            pointerId: 9,
            clientX: r.left + r.width / 2,
            clientY: r.top + r.height / 2,
          }
          el.dispatchEvent(new PointerEvent('pointerdown', o))
          await new Promise((res) => setTimeout(res, 1700))
        })
        await page.getByTestId('row-strip').waitFor()
        await shot(page, `rowstrip-${tag}`)
        await page.keyboard.press('Escape')
      })
    }
  }
  })
}
