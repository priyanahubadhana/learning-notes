/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { makeEpub, makeHostileEpub, makePictureEpub } from './fixtures/books.ts'

/**
 * Pictures for the final look (Reader v2, after the book-frame privacy fix):
 * an open EPUB, an EPUB with a picture of its own (an outside picture stays
 * hidden) and the hostile book (guard states: nothing runs, text still reads).
 * Day, Night, Sepia x phone, iPad landscape and portrait, PC x Beginner and
 * Professional. Only with SHOTS=1; saved in screenshots/s7/v6/.
 */
const OUT = 'screenshots/s7/v6'
const SIZES = {
  phone: { width: 390, height: 844 },
  'ipad-land': { width: 1180, height: 820 },
  'ipad-port': { width: 820, height: 1180 },
  pc: { width: 1440, height: 900 },
} as const
const BOOKS = {
  'epub-open': () => makeEpub('The Story'),
  'epub-pictures': () => makePictureEpub(),
  'epub-guard': () => makeHostileEpub(),
} as const

const shots = process.env.SHOTS
  ? (['beginner', 'professional'] as const).flatMap((level) =>
      (['day', 'night', 'sepia'] as const).flatMap((theme) =>
        Object.entries(SIZES).flatMap(([name, viewport]) =>
          (Object.keys(BOOKS) as (keyof typeof BOOKS)[]).map((kind) => ({
            level,
            theme,
            name,
            viewport,
            kind,
          })),
        ),
      ),
    )
  : []

for (const { level, theme, name, viewport, kind } of shots)
  test(`shot v6 ${kind} ${level} ${theme} ${name}`, async ({ browser }) => {
    const context = await browser.newContext({
      viewport,
      hasTouch: name !== 'pc',
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
                value: JSON.stringify({ level, unlocked: [] }),
              },
            ],
          },
        ],
      },
    })
    const page = await context.newPage()
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.route('https://tracker.example/**', (r) =>
      r.fulfill({ status: 200, body: '' }),
    )
    await page.goto('/?flags=reader.v2')
    await page.addStyleTag({
      content: '[data-toast]{visibility:hidden !important}',
    })
    const menu = page.getByRole('button', { name: 'Open menu' })
    if (await menu.isVisible()) await menu.click()
    await page
      .getByRole('navigation', { name: 'Spaces' })
      .getByRole('button', { name: 'Space: Library' })
      .click()
    await page.getByTestId('library-file').setInputFiles({
      name: 'book.epub',
      mimeType: 'application/epub+zip',
      buffer: BOOKS[kind](),
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
    const hide = page.getByRole('button', { name: 'Hide menu' })
    if (await hide.isVisible()) await hide.click()
    await page.waitForTimeout(700)
    const lv = level === 'beginner' ? 'beg' : 'pro'
    await page.screenshot({ path: `${OUT}/${kind}-${lv}-${theme}-${name}.png` })
    await context.close()
  })

test('final-look pictures are made only with SHOTS=1', () => {
  test.skip(!process.env.SHOTS, 'pictures only')
})
