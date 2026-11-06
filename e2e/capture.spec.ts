// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { strToU8, zipSync } from 'fflate'

/** Wave 3 part A, CR2: notes from your own AI (prompt out, notes in). */

test.use({ viewport: { width: 1200, height: 800 } })

const main = (page: Page) => page.getByRole('main')

const NOTES = `# How to Sketch Faces

## Key points
- Start with a light oval
- Mark the eye line halfway down

## Steps
1. Draw the oval
2. Draw the guide lines

## Mind map
- Faces
  - Shape
  - Guides

## Cards
Q: Where does the eye line sit?
A: Halfway down the oval.
Q: What goes in last?
A: The nose and the mouth.
Cloze: The {{eye line}} sits halfway down.

## Screenshots
[0:45] the oval guide
[12:34] the shading step`

// A 1 x 1 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==',
  'base64',
)

async function openCapture(page: Page) {
  await page.goto('/#/capture')
  await expect(page.getByTestId('notes-panel')).toBeVisible()
}

test('Copy prompt holds the link, the format and your extra instructions; presets are kept', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await openCapture(page)
  await page.getByTestId('capture-url').fill('https://youtu.be/dQw4w9WgXcQ')
  await page.getByTestId('preset-text').fill('Name every tool icon')
  await page.getByTestId('preset-name').fill('Photoshop')
  await page.getByTestId('preset-save').click()
  await page.getByTestId('copy-prompt').click()
  const prompt = await page.evaluate(() => navigator.clipboard.readText())
  expect(prompt).toContain('https://youtu.be/dQw4w9WgXcQ')
  expect(prompt).toContain('## Mind map')
  expect(prompt).toContain('Name every tool icon')

  await page.reload()
  await expect(page.getByTestId('preset-select')).toContainText('Photoshop')
  await page.getByTestId('preset-select').selectOption({ label: 'Photoshop' })
  await expect(page.getByTestId('preset-text')).toHaveValue(
    'Name every tool icon',
  )
})

test('paste an AI answer: a page with sections, three cards and screenshot slots, marked as AI-made', async ({
  page,
}) => {
  await openCapture(page)
  await page.getByTestId('notes-text').fill(NOTES)
  await page.getByTestId('notes-import').click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'How to Sketch Faces',
  )
  for (const h of ['Key points', 'Steps', 'Mind map', 'Cards', 'Screenshots']) {
    await expect(main(page).getByRole('heading', { name: h })).toBeVisible()
  }
  await expect(main(page).getByText('📷 0:45 the oval guide')).toBeVisible()
  await expect(main(page).getByText('Draw the guide lines')).toBeVisible()
  await expect(page.getByTestId('ai-badge')).toHaveText(
    'Made with your AI · edited by you',
  )

  // The cards are real cards: they appear in All cards.
  await page.getByRole('button', { name: 'Space: Review' }).click()
  await page.getByRole('button', { name: 'All cards' }).first().click()
  await expect(
    main(page).getByText('Where does the eye line sit?'),
  ).toBeVisible()
  await expect(main(page).getByText('What goes in last?')).toBeVisible()
})

test('Remove this AI result takes the answer away; Undo brings it back', async ({
  page,
}) => {
  await openCapture(page)
  await page.getByTestId('notes-text').fill(NOTES)
  await page.getByTestId('notes-import').click()
  await expect(
    main(page).getByRole('heading', { name: 'Key points' }),
  ).toBeVisible()
  await page.getByTestId('remove-ai').click()
  await expect(
    main(page).getByRole('heading', { name: 'Key points' }),
  ).toHaveCount(0)
  await expect(page.getByTestId('ai-badge')).toHaveCount(0)
  await page.getByRole('button', { name: 'Undo' }).click()
  await expect(
    main(page).getByRole('heading', { name: 'Key points' }),
  ).toBeVisible()
})

test('on a source page, Paste notes adds the answer to that page', async ({
  page,
}) => {
  await page.goto('/#/capture')
  await page.getByTestId('capture-url').fill('https://example.com/post')
  await page.getByTestId('capture-title').fill('A post')
  await page.getByTestId('capture-text').fill('Original words')
  await page.getByTestId('capture-save').click()
  await expect(main(page).getByText('Original words')).toBeVisible()
  await page.getByTestId('page-paste-notes').click()
  await page.getByTestId('notes-text').fill(NOTES)
  await page.getByTestId('notes-import').click()
  await expect(main(page).getByText('Original words')).toBeVisible()
  await expect(
    main(page).getByRole('heading', { name: 'Key points' }),
  ).toBeVisible()
})

test('a bad paste says so and writes nothing; a zip brings its pictures', async ({
  page,
}) => {
  await openCapture(page)
  await page.getByTestId('notes-text').fill('   ')
  await expect(page.getByTestId('notes-import')).toBeDisabled()

  const zip = zipSync({
    'notes.md': strToU8(
      '# Zip notes\n\n## Cards\nQ: What is the picture?\nA: A dot ![dot](images/dot.png)\n\n## Notes\n![the dot](images/dot.png)\n',
    ),
    'images/dot.png': new Uint8Array(PNG),
  })
  await page.getByTestId('notes-zip').setInputFiles({
    name: 'notes.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(zip),
  })
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Zip notes',
  )
  await expect(main(page).locator('img')).not.toHaveCount(0)

  // A zip without notes.md is refused.
  await page.goto('/#/capture')
  await expect(page.getByTestId('notes-panel')).toBeVisible()
  await page.getByTestId('notes-zip').setInputFiles({
    name: 'bad.zip',
    mimeType: 'application/zip',
    buffer: Buffer.from(zipSync({ 'a.txt': strToU8('x') })),
  })
  await expect(page.getByRole('alert')).toContainText('notes.md')
})
