import { expect, test, type Page } from '@playwright/test'
import { createNotebook, openMore, cornerAction } from './helpers.ts'

const main = (page: Page) => page.getByRole('main')

async function openImport(page: Page) {
  await page.goto('/')
  await createNotebook(page, 'Mine', 'First')
  await cornerAction(page, 'Save & restore')
  await openMore(page)
  return main(page).getByRole('region', { name: 'Bring in from NotebookLM' })
}

test('Bring in from NotebookLM: pasted quiz becomes cards, one Undo', async ({
  page,
}) => {
  const nlm = await openImport(page)
  await nlm
    .getByLabel('Or paste text copied from NotebookLM')
    .fill('Q: What is ATP?\nA: Energy\n\nQ: What is DNA?\nA: Genes')
  await nlm.getByLabel('The text is').selectOption({ label: 'A quiz' })
  await nlm.getByRole('button', { name: 'Preview the text' }).click()
  await expect(nlm.locator('[data-nlm-preview]')).toContainText('2 cards')
  await nlm.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(/Added to .*2 cards/)).toBeVisible()
  await page.getByRole('button', { name: 'Undo' }).click()
})

test('Bring in from NotebookLM: a CSV table becomes a database; junk is refused', async ({
  page,
}) => {
  const nlm = await openImport(page)
  await nlm.getByLabel('Choose a file').setInputFiles({
    name: 'x.exe',
    mimeType: 'application/octet-stream',
    buffer: Buffer.from('nope'),
  })
  await expect(nlm.getByRole('alert')).toContainText('not one NotebookLM')
  await nlm.getByLabel('Choose a file').setInputFiles({
    name: 'table.csv',
    mimeType: 'text/csv',
    buffer: Buffer.from('Name,Score,Grade\nA,3,x\nB,5,y\n'),
  })
  await expect(nlm.locator('[data-nlm-preview]')).toContainText(
    'A table of 2 rows and 3 columns',
  )
  await nlm.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(/Added to /)).toBeVisible()
})

test('Bring in from NotebookLM: a video overview is kept', async ({ page }) => {
  const nlm = await openImport(page)
  await nlm.getByLabel('Choose a file').setInputFiles({
    name: 'overview.mp4',
    mimeType: 'video/mp4',
    buffer: Buffer.alloc(2048, 1),
  })
  await expect(nlm.locator('[data-nlm-preview]')).toContainText(
    'Video overview “overview.mp4”',
  )
  await nlm.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(/Added to /)).toBeVisible()
})

test('a PowerPoint from NotebookLM shows as a strip in the Slides tab', async ({
  page,
}) => {
  const { zipSync, strToU8 } = await import('fflate')
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64',
  )
  const rel = (n: string) =>
    strToU8(
      `<Relationships><Relationship Id="r1" Target="../media/${n}"/></Relationships>`,
    )
  const pptx = Buffer.from(
    zipSync({
      'ppt/slides/_rels/slide1.xml.rels': rel('a.png'),
      'ppt/slides/_rels/slide2.xml.rels': rel('b.png'),
      'ppt/media/a.png': new Uint8Array(png),
      'ppt/media/b.png': new Uint8Array(png),
    }),
  )
  const nlm = await openImport(page)
  await nlm.getByLabel('Choose a file').setInputFiles({
    name: 'deck.pptx',
    mimeType:
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    buffer: pptx,
  })
  await nlm.getByRole('button', { name: 'Add', exact: true }).click()
  await expect(page.getByText(/Added to /)).toBeVisible()
  await page.getByRole('button', { name: 'From NotebookLM' }).first().click()
  await page.locator('[data-page-tabs-menu]').click()
  await page.getByText('Slides', { exact: true }).click()
  await page.keyboard.press('Escape')
  await page
    .locator('[data-page-tabs]')
    .getByRole('button', { name: 'Slides' })
    .click()
  await expect(page.locator('[data-slide]')).toHaveCount(2)
})
