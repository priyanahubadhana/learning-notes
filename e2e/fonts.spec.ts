import { expect, test } from '@playwright/test'
import { card, openNote, openPill, option } from './mainBarHelpers.ts'

/** H1: a small font set with live previews, and importing your own font. */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const TILES = [
  'Same as notes',
  'OpenDyslexic',
  'Literata',
  'Source Serif 4',
  'Atkinson Hyperlegible',
  'Lexend',
  'Caveat',
  'Kalam',
  'Patrick Hand',
  'Shantell Sans',
]

test('the Style card shows the font set; each pick changes the note font', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await option(page, /^Text style/).click()
  const c = card(page)
  await c.getByRole('button', { name: /^Font/ }).click()
  const group = c.getByRole('radiogroup', { name: 'Font' })
  await expect(group.getByRole('radio')).toHaveCount(TILES.length)
  for (const name of TILES) {
    await expect(group.getByRole('radio', { name })).toBeVisible()
  }
  for (const name of TILES.slice(1)) {
    await group.getByRole('radio', { name }).click()
    const family = await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--note-font'),
    )
    expect(family).toContain(
      name === 'Atkinson Hyperlegible' ? 'Atkinson' : name,
    )
  }
  await group.getByRole('radio', { name: 'Same as notes' }).click()
  await expect(page.locator('html')).not.toHaveAttribute('data-note-font', '')
})

test('the preview shows your own sentence', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await option(page, /^Text style/).click()
  const c = card(page)
  await c.getByRole('button', { name: /^Font/ }).click()
  await c.getByLabel('Try your own words').fill('Mitochondria')
  await expect(
    c.getByRole('radio', { name: 'Lexend' }).getByText('Mitochondria'),
  ).toBeVisible()
})

test('import a font: it becomes a tile, stays after a reload, and can be removed', async ({
  page,
}) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await option(page, /^Text style/).click()
  const c = card(page)
  await c.getByRole('button', { name: /^Font/ }).click()
  // A file with a TrueType header (the app checks the first bytes).
  const bytes = Buffer.alloc(64)
  bytes.set([0, 1, 0, 0])
  await c.locator('input[type=file]').setInputFiles({
    name: 'My Hand.ttf',
    mimeType: 'font/ttf',
    buffer: bytes,
  })
  const tile = c.getByRole('radio', { name: 'My Hand' })
  await expect(tile).toHaveAttribute('aria-checked', 'true')
  expect(
    await page.evaluate(() =>
      document.documentElement.style.getPropertyValue('--note-font'),
    ),
  ).toContain('LN ')

  await page.reload()
  await openPill(page, 'Text', 'text')
  await option(page, /^Text style/).click()
  await card(page).getByRole('button', { name: /^Font/ }).click()
  await expect(
    card(page).getByRole('radio', { name: 'My Hand' }),
  ).toHaveAttribute('aria-checked', 'true')

  await card(page).getByRole('button', { name: 'Remove this font' }).click()
  await expect(card(page).getByRole('radio', { name: 'My Hand' })).toHaveCount(
    0,
  )
  await expect(page.locator('html')).not.toHaveAttribute('data-note-font', '')
})

test('a file that is not a font is refused', async ({ page }) => {
  await openNote(page)
  await openPill(page, 'Text', 'text')
  await option(page, /^Text style/).click()
  const c = card(page)
  await c.getByRole('button', { name: /^Font/ }).click()
  await c.locator('input[type=file]').setInputFiles({
    name: 'photo.ttf',
    mimeType: 'font/ttf',
    buffer: Buffer.alloc(64, 7),
  })
  await expect(c.getByRole('alert')).toContainText('not a font file')
})
