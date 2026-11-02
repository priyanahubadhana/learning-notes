import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  selectText,
  typeInEditor,
  openSidebar,
} from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

test('mark words in a note; they collect on the lesson’s Revise sheet', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart sounds')
  await typeInEditor(page, 'The first heart sound is S1 and CO = HR x SV')
  await selectText(page, 'first heart sound')
  await page.getByRole('button', { name: 'Key point', exact: true }).click()
  await selectText(page, 'CO = HR x SV')
  await page.getByRole('button', { name: 'Formula', exact: true }).click()
  await expect(page.locator('.recall-mark[data-mark="key"]')).toHaveText(
    'first heart sound',
  )
  await page.waitForTimeout(800) // autosave

  // A sub-page's marks count for its lesson.
  await addPage(page, 'Heart sounds', 'Valves', 'sub-page')
  await typeInEditor(page, 'Mitral valve')
  await selectText(page, 'Mitral')
  await page.getByRole('button', { name: 'Keyword', exact: true }).click()
  await page.waitForTimeout(800)

  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Revise' }).click()
  const sheet = main(page).getByRole('region', { name: 'Revise' })
  await expect(
    sheet.getByRole('button', { name: /^Heart sounds\s*3$/ }),
  ).toBeVisible()
  await expect(sheet.getByRole('region', { name: 'Key point' })).toContainText(
    'first heart sound',
  )
  await expect(sheet.getByRole('region', { name: 'Formula' })).toContainText(
    'CO = HR x SV',
  )
  await expect(sheet.getByRole('region', { name: 'Keyword' })).toContainText(
    'Mitral',
  )
  await expect(sheet.getByRole('region', { name: 'Must know' })).toHaveCount(0)

  // Own summary is kept.
  await sheet
    .getByRole('textbox', { name: 'My summary' })
    .fill('S1 = valves closing')
  await page.keyboard.press('Tab') // leaving the box saves it
  await page.waitForTimeout(500)
  await page.reload()
  await (
    await openSidebar(page)
  )
    .getByRole('button', { name: 'Cardiology', exact: true })
    .click()
  await main(page).getByRole('tab', { name: 'Revise' }).click()
  await expect(
    main(page).getByRole('textbox', { name: 'My summary' }),
  ).toHaveValue('S1 = valves closing')

  // A mark opens its note.
  await main(page).getByRole('button', { name: 'first heart sound' }).click()
  await expect(page.locator('.recall-mark[data-mark="key"]')).toBeVisible()
})

for (const [theme, width, height] of [
  ['Day', 1280, 800],
  ['Night', 1280, 800],
  ['Sepia', 1280, 800],
  ['Day', 390, 844],
] as const) {
  test(`screenshot: Revise and Save & restore ${theme} ${width}×${height}`, async ({
    page,
  }) => {
    await page.goto('/')
    await createNotebook(page, 'Cardiology', 'Heart sounds')
    await typeInEditor(page, 'The first heart sound is S1 and CO = HR x SV')
    await selectText(page, 'first heart sound')
    await page.getByRole('button', { name: 'Key point', exact: true }).click()
    await selectText(page, 'CO = HR x SV')
    await page.getByRole('button', { name: 'Formula', exact: true }).click()
    await page.waitForTimeout(800)
    await (
      await openSidebar(page)
    )
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme })
      .click()
    await page.setViewportSize({ width, height })
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: 'Cardiology', exact: true })
      .click()
    await main(page).getByRole('tab', { name: 'Revise' }).click()
    await expect(
      main(page).getByRole('region', { name: 'Key point' }),
    ).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: `test-results/screens/revise-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
    const overflow = await page.evaluate(
      () =>
        document.querySelector('main')!.scrollWidth -
        document.querySelector('main')!.clientWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    // On a phone the notebook covers the sidebar until it is closed.
    if (width < 500) {
      await page.getByRole('button', { name: 'Close notebook' }).click()
    }
    await (
      await openSidebar(page)
    )
      .getByRole('button', { name: 'Save & restore' })
      .click()
    await page.waitForTimeout(300)
    await page.screenshot({
      path: `test-results/screens/data-${theme}-${width}x${height}.png`,
      fullPage: true,
    })
  })
}
