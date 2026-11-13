/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

/**
 * Pictures for gate 3, tenth visit (Reader v2): the Settings Preview pill in
 * its docked row (list end, sheet open), the book panel (Pages,
 * Notes), a toast above the Aa card, the whole Aa More card, the padlock
 * menu, the pen bar (and its options on a phone), line focus, the ruler, the
 * selection pop-up and Settings, Professional features at the Reader rows
 * with "Coming later". Day, Night, Sepia x phone, iPad landscape and
 * portrait, PC x Beginner and Professional. Toasts are hidden except in the
 * toast picture. Only with SHOTS=1; saved in screenshots/s7/v6/.
 */
const OUT = 'screenshots/s7/v6'
const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-land': { width: 1180, height: 820 },
  'ipad-port': { width: 820, height: 1180 },
  pc: { width: 1440, height: 900 },
} as const
const ON = [
  'reader.pagesTab',
  'reader.inkLook',
  'reader.lineFocus',
  'reader.noteFilters',
  'reader.bulkCards',
  'reader.selExtras',
]
const HIDE_TOASTS = '[data-toast]{visibility:hidden !important}'

const shots = process.env.SHOTS
  ? (['beginner', 'professional'] as const).flatMap((level) =>
      (['day', 'night', 'sepia'] as const).flatMap((theme) =>
        Object.entries(SIZES).map(([name, viewport]) => ({
          level,
          theme,
          name,
          viewport,
        })),
      ),
    )
  : []

const press = async (page: Page, id: string) => {
  await expect(page.getByTestId('reader-close')).toBeVisible()
  const b = page.getByTestId(id)
  if (await b.isVisible()) return b.click()
  await page.getByTestId('reader-more').click()
  await page
    .getByTestId(id + '-card')
    .or(page.getByTestId('reader-more-card').getByTestId(id))
    .click()
}

const select = (page: Page) =>
  expect(async () => {
    await page.evaluate(() => {
      const span = document.querySelector('.textLayer span')!
      const range = document.createRange()
      range.selectNodeContents(span)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1000,
    })
  }).toPass()

const aaMore = async (page: Page) => {
  await press(page, 'reader-aa')
  await page.getByTestId('aa-tab-more').click()
}

for (const { level, theme, name, viewport } of shots)
  test(`shot v6 ${level} ${theme} ${name}`, async ({ browser }) => {
    const touch = name !== 'pc'
    const context = await browser.newContext({
      viewport,
      hasTouch: touch,
      isMobile: name === 'phone',
      storageState: {
        cookies: [],
        origins: [
          {
            origin: `http://localhost:${process.env.PW_PORT}`,
            localStorage: [
              { name: 'learning-notes:devicePicker.done', value: 'true' },
              { name: 'learning-notes:onboarding.done', value: 'true' },
              { name: 'learning-notes:accountGate.off', value: '1' },
              { name: 'learning-notes:theme', value: JSON.stringify(theme) },
              {
                name: 'learning-notes:level',
                value: JSON.stringify({ level, unlocked: ON }),
              },
            ],
          },
        ],
      },
    })
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    const lv = level === 'beginner' ? 'beg' : 'pro'
    const shot = async (what: string) => {
      await page.waitForTimeout(500)
      await page.screenshot({
        path: `${OUT}/${what}-${lv}-${theme}-${name}.png`,
      })
    }
    await page.goto('/?flags=reader.v2')
    const quiet = await page.addStyleTag({ content: HIDE_TOASTS })
    const menu = page.getByRole('button', { name: 'Open menu' })
    if (await menu.isVisible()) await menu.click()
    await page
      .getByRole('navigation', { name: 'Spaces' })
      .getByRole('button', { name: 'Space: Library' })
      .click()
    await page.getByTestId('library-file').setInputFiles({
      name: 'fixture.pdf',
      mimeType: 'application/pdf',
      buffer: makePdf(
        Array.from({ length: 4 }, (_, i) => `Page ${i + 1} words here`),
        { title: 'Fixture Book' },
      ),
    })
    await page.getByRole('button', { name: 'Start reading' }).click()
    await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
    const hide = page.getByRole('button', { name: 'Hide menu' })
    if (await hide.isVisible()) await hide.click()
    // The selection pop-up, then a highlight for the notes panel.
    await select(page)
    await shot('selection-popup')
    await page.getByTestId('hl-yellow').click()
    await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
    // Fixes 1 and 2: the panel; fix 7: the note actions.
    const panel = page.getByTestId('left-panel')
    if (!(await panel.isVisible()))
      await page.getByTestId('panel-toggle').click()
    await expect(panel).toBeVisible()
    await shot('panel-pages')
    await panel.getByRole('tab', { name: 'Notes' }).click()
    await expect(page.getByTestId('annotation-row').first()).toBeVisible()
    await shot('panel-notes')
    // Fix 3: Delete (Undo toast), then the toast above the Aa card.
    await page
      .getByTestId('annotation-row')
      .first()
      .getByRole('button', { name: 'Delete', exact: true })
      .click()
    await page.getByRole('button', { name: 'Close panel' }).click()
    await quiet.evaluate((el) => (el as Element).remove())
    await aaMore(page)
    await shot('toast-over-aa')
    await page.addStyleTag({ content: HIDE_TOASTS })
    // Fix 4: the whole More card, settled.
    await shot('aa-more')
    // Line focus, then the ruler, then off again.
    await page.getByTestId('aa-ruler-focus').click()
    await page.getByTestId('aa-close').click()
    // Fix 6: pointer just under the first line; the band snaps to it.
    const w = await page
      .locator('[data-pdf-page="1"] .textLayer span')
      .first()
      .evaluate((el) => el.getBoundingClientRect().toJSON() as DOMRect)
    await page.mouse.move(w.x + 10, w.y + w.height * 1.6)
    await shot('line-focus')
    await aaMore(page)
    await page.getByTestId('aa-ruler-ruler').click()
    await page.getByTestId('aa-close').click()
    await shot('ruler')
    await aaMore(page)
    await page.getByTestId('aa-ruler-off').click()
    await page.getByTestId('aa-close').click()
    // Fix 7: the padlock menu.
    await press(page, 'reader-lock')
    await expect(page.getByTestId('rv2-lock-menu')).toBeVisible()
    await shot('lock')
    await page.keyboard.press('Escape')
    // Fix 6: the pen bar (and its options on a phone).
    await press(page, 'reader-ink')
    await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
    await shot('pen-bar')
    const opts = page.getByTestId('reader-ink-options')
    if (await opts.isVisible()) {
      await opts.click()
      await shot('pen-options')
      await page.keyboard.press('Escape')
    }
    // Settings, Professional features at the Reader rows (Coming later).
    await page.goto('/?flags=settings.v3#/settings/pro')
    await page.addStyleTag({ content: HIDE_TOASTS })
    const later = page.locator('[data-pro-feature="reader.liquid"]')
    await expect(later).toBeAttached()
    await later.scrollIntoViewIfNeeded()
    await shot('settings-reading-later')
    // Fix 1: the pill in its docked row, list at its end, sheet shut and open.
    await page.evaluate(() => {
      let el: HTMLElement | null = document.querySelector('[data-settings-v3]')
      while (
        el &&
        !(
          el.scrollHeight > el.clientHeight + 2 &&
          /auto|scroll/.test(getComputedStyle(el).overflowY)
        )
      )
        el = el.parentElement
      const sc = el ?? document.scrollingElement!
      sc.scrollTop = sc.scrollHeight
    })
    await shot('settings-end')
    const pill = page.locator('[data-preview-pill]')
    if (await pill.isVisible()) {
      await pill.click()
      await shot('settings-sheet')
    }
    await context.close()
  })

// Final look, fix 3: an open EPUB with its text, on WebKit at iPad size.
test('shot v6 WebKit EPUB open with text', async ({ browser, browserName }) => {
  test.skip(!process.env.SHOTS || browserName !== 'webkit', 'pictures only')
  const context = await browser.newContext({
    viewport: SIZES['ipad-land'],
    hasTouch: true,
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${process.env.PW_PORT}`,
          localStorage: [
            { name: 'learning-notes:devicePicker.done', value: 'true' },
            { name: 'learning-notes:onboarding.done', value: 'true' },
            { name: 'learning-notes:accountGate.off', value: '1' },
          ],
        },
      ],
    },
  })
  const page = await context.newPage()
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/?flags=reader.v2')
  await page.addStyleTag({ content: HIDE_TOASTS })
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'story.epub',
    mimeType: 'application/epub+zip',
    buffer: makeEpub('The Story'),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await expect
    .poll(async () => {
      for (const f of page.frames().slice(1)) {
        const text = await f
          .evaluate(() => document.body?.innerText ?? '')
          .catch(() => '')
        if (text.includes('quick brown fox')) return true
      }
      return false
    })
    .toBe(true)
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${OUT}/epub-open-webkit-ipad-land.png` })
  await context.close()
})
