import { expect, test, type Page } from '@playwright/test'
import { barMenu, mainBar, openNote, pref } from './mainBarHelpers.ts'

/**
 * The Edit toolbar sheet (R7-11): one clear screen with the bar preview and
 * the other tools; drag, arrows, Done / ✕ keep, Cancel reverts. Also R7-10:
 * the chosen bar is still there after a reload.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const sheet = (page: Page) => page.getByRole('dialog', { name: 'Edit toolbar' })
const barNames = (page: Page) =>
  mainBar(page)
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))

async function openSheet(page: Page) {
  await expect(async () => {
    if (
      !(await page.getByRole('button', { name: 'Edit toolbar…' }).isVisible())
    )
      await barMenu(page).click()
    await expect(
      page.getByRole('button', { name: 'Edit toolbar…' }),
    ).toBeVisible({ timeout: 2000 })
  }).toPass()
  await page.getByRole('button', { name: 'Edit toolbar…' }).click()
  await expect(sheet(page)).toBeVisible()
}

/** Finds a tool in More tools so it is in view. */
async function find(page: Page, name: string) {
  await sheet(page).getByRole('searchbox').fill(name)
  return sheet(page).locator('[data-more-id]').first()
}

test('add a tool with + , move it up with the arrow, Done keeps it, a reload too', async ({
  page,
}) => {
  await openNote(page)
  await openSheet(page)
  await expect(sheet(page).locator('[data-edit-preview]')).toBeVisible()
  await find(page, 'Write pad')
  await sheet(page).getByRole('button', { name: 'Add Write pad' }).click()
  const list = sheet(page).locator('[data-edit-list="bar"] [data-row-id]')
  await expect(list.last()).toHaveAttribute('data-row-id', 'x:writePad')
  for (let i = 0; i < 12; i++) {
    const up = sheet(page).getByRole('button', {
      name: 'Move Write pad earlier',
    })
    if (await up.isDisabled()) break
    await up.click()
  }
  await expect(list.first()).toHaveAttribute('data-row-id', 'x:writePad')
  await sheet(page).getByRole('button', { name: 'Done' }).click()
  await expect(sheet(page)).toHaveCount(0)
  expect((await barNames(page))[2]).toBe('Write pad') // after Undo, Redo
  expect((await pref<string[]>(page, 'toolbar.order'))?.[0]).toBe('x:writePad')
  await page.reload()
  await expect(mainBar(page)).toBeVisible()
  expect((await barNames(page)).includes('Write pad')).toBe(true)
})

test('drag a tool from More tools to the top; Cancel reverts, ✕ keeps', async ({
  page,
}) => {
  await openNote(page)
  await openSheet(page)
  await find(page, 'Write pad')
  const handle = sheet(page)
    .locator('[data-more-id] [data-edit-handle]')
    .first()
  const first = sheet(page)
    .locator('[data-edit-list="bar"] [data-row-id]')
    .first()
  const from = (await handle.boundingBox())!
  const to = (await first.boundingBox())!
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  await page.mouse.move(to.x + 40, to.y + to.height / 2, { steps: 6 })
  await page.mouse.move(to.x + 40, to.y + 2, { steps: 4 })
  await expect(sheet(page).locator('[data-drop-slot="0"]')).toBeVisible()
  await page.mouse.up()
  await expect(
    sheet(page).locator('[data-edit-list="bar"] [data-row-id]').first(),
  ).toHaveAttribute('data-row-id', 'x:writePad')
  // Cancel: nothing changed.
  await sheet(page).getByRole('button', { name: 'Cancel' }).click()
  expect(await barNames(page)).not.toContain('Write pad')
  // Again, and close with ✕: kept.
  await openSheet(page)
  await find(page, 'Write pad')
  await sheet(page).getByRole('button', { name: 'Add Write pad' }).click()
  await sheet(page)
    .getByRole('button', { name: 'Close and keep changes' })
    .click()
  expect(await barNames(page)).toContain('Write pad')
})

test('remove a tool with −, the last main tool cannot go', async ({ page }) => {
  await openNote(page)
  await openSheet(page)
  await sheet(page).getByRole('button', { name: 'Remove Highlighter' }).click()
  await sheet(page).getByRole('button', { name: 'Done' }).click()
  expect(await barNames(page)).not.toContain('Highlighter')
  await openSheet(page)
  for (const name of [
    'Pen',
    'Eraser',
    'New line',
    'Backspace',
    'Lasso',
    'Insert',
    'Read',
  ]) {
    await sheet(page)
      .getByRole('button', { name: `Remove ${name}` })
      .click()
  }
  await expect(
    sheet(page).getByRole('button', { name: 'Remove Text' }),
  ).toBeDisabled()
})
