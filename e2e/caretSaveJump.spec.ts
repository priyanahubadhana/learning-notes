// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import {
  addPage,
  createNotebook,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { installRealPen, penCaretInFirstBox } from './realPen.ts'

/**
 * Bug B7 (18 Nov): on a blank page the save of the first letters could move
 * the caret to the START of the first box, so words typed on at once came out
 * in the wrong order. Type continuously through the first save (no waits) and
 * check the exact order. Repeated 30 times in one run.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const FLAGS = [
  'foundation.shell',
  'settings.v3',
  'storage.safety',
  'update.v2',
  'security.m1',
  'toolbar.v8',
  'toolbar.menu',
  'page.menus',
  'textbox.v2',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'ai.framework',
  'journal.monthRepair',
]
const MAIN = '[data-paper-box="main"]'

async function open(page: Page, mode: 'pencil' | 'touch', n: number) {
  await installRealPen(page)
  await page.addInitScript(
    (f) => localStorage.setItem('learning-notes:flags', JSON.stringify(f)),
    FLAGS,
  )
  await startInMode(page, mode)
  await page.goto('/')
  await createNotebook(page, 'Paper', 'Old page')
  await typeInEditor(page, 'Old words')
  await addPage(page, 'Paper', `Jump ${n}`)
  const text = page.getByRole('button', { name: 'Text', exact: true }).first()
  if ((await text.getAttribute('aria-pressed')) !== 'true') await text.click()
  await expect(text).toHaveAttribute('aria-pressed', 'true')
}

const WORDS = 'abcdefghij klmnopqrst uvwxyz 0123456789 end'

for (const mode of ['pencil', 'touch'] as const)
  for (let i = 0; i < 30; i++)
    test(`B7 ${mode} #${i}: typing through the first save keeps the order`, async ({
      page,
    }) => {
      await open(page, mode, i)
      const main = page.locator(MAIN)
      await penCaretInFirstBox(page, main)
      // No waits: letters keep coming while the first save runs.
      await page.keyboard.type(WORDS, { delay: 15 })
      await page.waitForTimeout(400)
      const got = (await main.locator('.bn-editor').innerText())
        .replace(/\s+/g, ' ')
        .trim()
      expect(got).toBe(WORDS)
    })
