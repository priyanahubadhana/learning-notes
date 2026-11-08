import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'

/** Use with Claude: the Skill zip in Settings › AI, and importing its .lnskill.json file. */

test.use({ viewport: { width: 1200, height: 800 } })

const answer = {
  format: 'ln-skill/1',
  title: 'Cells',
  summary: 'Cells are the unit of life.',
  sources: [{ n: 1, title: 'Notes', url: '' }],
  points: [
    { text: 'All life is made of cells.', stars: 9, icon: '🧫', sources: [1] },
    { text: 'Cells divide.', stars: 4, sources: [] },
  ],
  cards: [{ kind: 'qa', q: 'Unit of life?', a: 'The cell.', point: 0 }],
}

test('Settings › AI › Use with Claude: steps and a real zip download', async ({
  page,
}) => {
  await page.goto('/#/settings/ai')
  const card = page.getByTestId('claude-skill')
  await expect(card).toBeVisible()
  await expect(card).toContainText('Capabilities')
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByTestId('claude-skill-download').click(),
  ])
  expect(download.suggestedFilename()).toBe('learning-notes-skill.zip')
  const path = await download.path()
  const bytes = readFileSync(path)
  expect(bytes.subarray(0, 2).toString()).toBe('PK')
  expect(bytes.includes(Buffer.from('learning-notes/SKILL.md'))).toBe(true)
})

test('a .lnskill.json file is imported by Import and by drop, like a paste', async ({
  page,
}) => {
  await page.goto('/')
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('ai-prompts').click()
  const dialog = page.getByTestId('prompts-dialog')
  await dialog.getByTestId('prompt-search').fill('quick digest')
  await dialog.getByTestId('prompt-row').first().click()
  await dialog.getByText('No AI key? Use any AI chat (free)').click()

  // A wrong file is refused and nothing opens.
  await dialog.getByTestId('paste-file').setInputFiles({
    name: 'bad.lnskill.json',
    mimeType: 'application/json',
    buffer: Buffer.from('not json'),
  })
  await expect(dialog.getByTestId('paste-problem')).toBeVisible()
  await expect(dialog.getByTestId('skill-preview')).toHaveCount(0)

  // A good file opens the preview.
  await dialog.getByTestId('paste-file').setInputFiles({
    name: 'cells.lnskill.json',
    mimeType: 'application/json',
    buffer: Buffer.from(JSON.stringify(answer)),
  })
  await expect(dialog.getByTestId('skill-preview')).toBeVisible()
  await expect(dialog.getByTestId('skill-point')).toHaveCount(2)
})
