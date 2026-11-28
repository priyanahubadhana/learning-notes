// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from './frameFixture.ts'
import {
  createNotebook,
  hideSidebar,
  startInMode,
  typeInEditor,
} from './helpers.ts'
import { focusEditor } from './editorFocus.ts'

/** 2A.10 (T15): the Format card shows an "on" state for every option that is a state. */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function open(
  page: Page,
  level: Level = 'beginner',
  unlocked: string[] = [],
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, unlocked] as const,
  )
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await hideSidebar(page)
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByText('The nucleus holds the DNA').click({ clickCount: 3 })
}

const card = (page: Page) => page.getByTestId('v8-card-text.format')
const tab = (c: Locator, id: string) => c.getByTestId(`v8-format-tab-${id}`)
const tile = (c: Locator, id: string) => c.getByTestId(`v8-format-${id}`)
async function openCard(page: Page, tabId: string) {
  if ((await card(page).count()) === 0)
    await page.getByTestId('v8-chip-text.format').click()
  const c = card(page)
  await expect(c).toHaveAttribute('data-settled', 'true')
  await tab(c, tabId).click()
  return c
}
const on = (l: Locator) => expect(l).toHaveAttribute('data-selected', 'true')
const off = (l: Locator) => expect(l).not.toHaveAttribute('data-selected')

test('T15 emphasis tiles show on with an accent fill and a check, and follow the selection', async ({
  page,
}) => {
  await open(page)
  let c = await openCard(page, 'text')
  await off(tile(c, 'bold'))
  await tile(c, 'bold').click()
  await tile(c, 'italic').click()
  await on(tile(c, 'bold'))
  await on(tile(c, 'italic'))
  await off(tile(c, 'underline'))
  // The check badge is drawn on an on tile only.
  const badge = (l: Locator) =>
    l.evaluate((e) => getComputedStyle(e, '::before').content)
  expect(await badge(tile(c, 'bold'))).not.toBe('none')
  expect(await badge(tile(c, 'underline'))).toBe('none')
  // Undo turns it off again.
  await page.keyboard.press('Control+Z')
  await page.keyboard.press('Control+Z')
  c = await openCard(page, 'text')
  await off(tile(c, 'bold'))
})

test('T15 the state moves with the selection: bold in one line, not in the next', async ({
  page,
}) => {
  await open(page)
  const c0 = await openCard(page, 'text')
  await tile(c0, 'bold').click()
  await page.getByTestId('pcard-close').click()
  await expect(card(page)).toHaveCount(0)
  // The editor's after-focus check would undo the End if the click focused it.
  await focusEditor(page)
  await page.getByText('The nucleus holds the DNA').click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line')
  const c = await openCard(page, 'text')
  await off(tile(c, 'bold'))
  // The card covers the page: move the caret with the keyboard, card still open.
  await focusEditor(page)
  await page.keyboard.press('ArrowUp')
  await on(tile(c, 'bold'))
  await expect(card(page)).toHaveCount(1)
  await page.keyboard.press('ArrowDown')
  await off(tile(c, 'bold'))
})

test('T15 key point shows on when the selection is marked', async ({
  page,
}) => {
  await open(page)
  const c = await openCard(page, 'text')
  await off(tile(c, 'mark:key'))
  await tile(c, 'mark:key').click()
  await on(tile(c, 'mark:key'))
  await tile(c, 'mark:key').click()
  await off(tile(c, 'mark:key'))
})

test('T15 Style tab: list type, heading and callout show the block the cursor is in', async ({
  page,
}) => {
  await open(page)
  const c = await openCard(page, 'style')
  await tile(c, 'bulletList').click()
  await on(tile(c, 'bulletList'))
  await off(tile(c, 'numberedList'))
  await tile(c, 'numberedList').click()
  await on(tile(c, 'numberedList'))
  await off(tile(c, 'bulletList'))
  await tile(c, 'checklist').click()
  await on(tile(c, 'checklist'))
  await tile(c, 'checklist').click()
  await off(tile(c, 'checklist'))
  await tile(c, 'heading2').click()
  await expect(tile(c, 'heading2')).toHaveAttribute('aria-pressed', 'true')
  await expect(tile(c, 'heading1')).toHaveAttribute('aria-pressed', 'false')
  await tile(c, 'heading2').click()
  await expect(tile(c, 'heading2')).toHaveAttribute('aria-pressed', 'false')
  await tile(c, 'callout').click()
  await on(tile(c, 'callout'))
})

test('T15 one-off actions never show an on state', async ({ page }) => {
  await open(page)
  const c = await openCard(page, 'style')
  await tile(c, 'bulletList').click()
  for (const id of ['indent', 'outdent', 'divider']) {
    await off(tile(c, id))
    await expect(tile(c, id)).not.toHaveAttribute('aria-checked')
  }
  await tile(c, 'indent').click()
  await off(tile(c, 'indent'))
})

test('T15 Paragraph tab: the alignment of the block is on; Professional inline code is on', async ({
  page,
}) => {
  await open(page, 'professional', ['tb.textMarks', 'tb.textFonts'])
  let c = await openCard(page, 'paragraph')
  await expect(tile(c, 'alignLeft')).toHaveAttribute('aria-checked', 'true')
  await tile(c, 'alignCenter').click()
  await expect(tile(c, 'alignCenter')).toHaveAttribute('aria-checked', 'true')
  await expect(tile(c, 'alignLeft')).toHaveAttribute('aria-checked', 'false')
  await tab(c, 'style').click()
  await off(tile(c, 'code'))
  await tile(c, 'code').click()
  await on(tile(c, 'code'))
  c = await openCard(page, 'advanced')
  await expect(tile(c, 'line-default')).toHaveAttribute('aria-checked', 'true')
})

test('T15 colour, highlight, size and font show the current value', async ({
  page,
}) => {
  await open(page, 'professional', ['tb.textFonts'])
  const c = await openCard(page, 'text')
  await expect(tile(c, 'textColor-default')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await tile(c, 'textColor-red').click()
  await expect(tile(c, 'textColor-red')).toHaveAttribute('aria-checked', 'true')
  await tile(c, 'highlight-yellow').click()
  await expect(tile(c, 'highlight-yellow')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(tile(c, 'size-100')).toHaveAttribute('aria-checked', 'true')
  await tile(c, 'size-130').click()
  await expect(tile(c, 'size-130')).toHaveAttribute('aria-checked', 'true')
  await expect(tile(c, 'size-100')).toHaveAttribute('aria-checked', 'false')
  // Font: the default tile is on, a picked one takes over, with the same check.
  const fonts = c.locator("[data-card-chips='font'] [role='radio']")
  await expect(fonts.first()).toHaveAttribute('aria-checked', 'true')
  await fonts.nth(1).click()
  await expect(fonts.nth(1)).toHaveAttribute('aria-checked', 'true')
  await expect(fonts.first()).toHaveAttribute('aria-checked', 'false')
  const badge = (l: Locator) =>
    l.evaluate((e) => getComputedStyle(e, '::before').content)
  expect(await badge(fonts.nth(1))).not.toBe('none')
  expect(await badge(fonts.first())).toBe('none')
  const fill = (l: Locator) =>
    l.evaluate((e) => getComputedStyle(e).backgroundColor)
  expect(await fill(fonts.nth(1))).not.toBe(await fill(fonts.first()))
})

test('T15 a list is on only on its own line and follows the cursor to another line', async ({
  page,
}) => {
  await open(page)
  const c0 = await openCard(page, 'style')
  await tile(c0, 'bulletList').click()
  await on(tile(c0, 'bulletList'))
  await page.getByTestId('pcard-close').click()
  await expect(card(page)).toHaveCount(0)
  // The editor's after-focus check would undo the End if the click focused it.
  await focusEditor(page)
  await page.getByText('The nucleus holds the DNA').click()
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Plain line')
  const c = await openCard(page, 'style')
  await on(tile(c, 'bulletList'))
  await tile(c, 'bulletList').click()
  await off(tile(c, 'bulletList'))
  await focusEditor(page)
  await page.keyboard.press('ArrowUp')
  await on(tile(c, 'bulletList'))
  await page.keyboard.press('ArrowDown')
  await off(tile(c, 'bulletList'))
})
