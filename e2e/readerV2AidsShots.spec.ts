/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

/**
 * Pictures of the parts new in slice 7i: the select pop-up at the top of a
 * page, the book's daily highlight in Annotations, Aa › More (Bar and screen,
 * Reading aids), Line focus on a PDF and an EPUB, and "Coming later" in
 * Settings. Light, dark, sepia x phone, iPad, PC. Only with SHOTS=1; saved in
 * screenshots/s7/v2/.
 */
const OUT = 'screenshots/s7/v2'
const SIZES = {
  phone: { width: 390, height: 844 },
  ipad: { width: 1180, height: 820 },
  pc: { width: 1440, height: 900 },
} as const
const ON = [
  'reader.dailyHighlight',
  'reader.barScroll',
  'reader.lockDirection',
  'reader.liquid',
  'reader.lineFocus',
  'reader.keepAwake',
]

const shots = process.env.SHOTS
  ? (['day', 'night', 'sepia'] as const).flatMap((theme) =>
      Object.entries(SIZES).map(([name, viewport]) => ({
        theme,
        name,
        viewport,
      })),
    )
  : []

async function start(
  browser: import('@playwright/test').Browser,
  theme: string,
  viewport: { width: number; height: number },
  phone: boolean,
) {
  const context = await browser.newContext({
    viewport,
    hasTouch: phone,
    isMobile: phone,
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
              value: JSON.stringify({ level: 'beginner', unlocked: ON }),
            },
          ],
        },
      ],
    },
  })
  return { context, page: await context.newPage() }
}

async function open(page: Page, kind: 'pdf' | 'epub') {
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles(
    kind === 'pdf'
      ? {
          name: 'fixture.pdf',
          mimeType: 'application/pdf',
          buffer: makePdf(
            Array.from({ length: 4 }, (_, i) => `Page ${i + 1} words here`),
            { title: 'Fixture Book' },
          ),
        }
      : {
          name: 'story.epub',
          mimeType: 'application/epub+zip',
          buffer: makeEpub('The Story'),
        },
  )
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  const hide = page.getByRole('button', { name: 'Hide menu' })
  if (await hide.isVisible()) await hide.click()
}

const press = async (page: Page, id: string) => {
  const b = page.getByTestId(id)
  if (await b.isVisible()) return b.click()
  await page.getByTestId('reader-more').click()
  await page.getByTestId(id + '-card').click()
}

async function aaMore(page: Page) {
  await page.getByTestId('reader-aa').click()
  await page.getByTestId('aa-tab-more').click()
  await page.getByTestId('aa-aids').scrollIntoViewIfNeeded()
  await page.waitForTimeout(400)
}

for (const { theme, name, viewport } of shots) {
  test(`shot 7i pdf ${theme} ${name}`, async ({ browser }) => {
    const { context, page } = await start(
      browser,
      theme,
      viewport,
      name === 'phone',
    )
    await open(page, 'pdf')
    await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
    // The pop-up for words at the top of the page.
    await expect(async () => {
      await page.evaluate(() => {
        const span = document.querySelector('.textLayer span')!
        const range = document.createRange()
        range.selectNodeContents(span)
        const sel = window.getSelection()!
        sel.removeAllRanges()
        sel.addRange(range)
      })
      await expect(page.getByTestId('selection-popup')).toBeVisible({
        timeout: 1500,
      })
    }).toPass({ timeout: 15_000 })
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/7i-popup-${theme}-${name}.png` })
    await page.getByTestId('hl-yellow').click()
    await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
    // The book's daily highlight, top of Annotations.
    await press(page, 'reader-annotations')
    await expect(page.getByTestId('book-daily-highlight')).toBeVisible()
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}/7i-daily-${theme}-${name}.png` })
    await page.keyboard.press('Escape')
    // Aa › More: Bar and screen, Reading aids.
    await aaMore(page)
    await page.screenshot({ path: `${OUT}/7i-aa-more-${theme}-${name}.png` })
    await page.getByTestId('aa-ruler-focus').click()
    await page.getByTestId('aa-close').click()
    await page.mouse.move(viewport.width / 2, viewport.height / 2)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/7i-focus-pdf-${theme}-${name}.png` })
    await aaMore(page)
    await page.getByTestId('aa-ruler-ruler').click()
    await page.getByTestId('aa-close').click()
    await page.mouse.move(viewport.width / 2, viewport.height / 2)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/7i-ruler-pdf-${theme}-${name}.png` })
    // Settings › Professional features › Reader: "Coming later".
    await page.goto('/?flags=settings.v3#/settings/pro')
    const later = page.locator('[data-pro-feature="reader.liquid"]')
    await later.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await page.screenshot({
      path: `${OUT}/7i-settings-later-${theme}-${name}.png`,
    })
    await context.close()
  })

  test(`shot 7i epub ${theme} ${name}`, async ({ browser }) => {
    const { context, page } = await start(
      browser,
      theme,
      viewport,
      name === 'phone',
    )
    await open(page, 'epub')
    await aaMore(page)
    await page.screenshot({
      path: `${OUT}/7i-aa-more-epub-${theme}-${name}.png`,
    })
    await page.getByTestId('aa-ruler-focus').click()
    await page.getByTestId('aa-close').click()
    await page.waitForTimeout(1500)
    await page.mouse.move(viewport.width / 2, viewport.height / 2)
    await page.waitForTimeout(300)
    await page.screenshot({ path: `${OUT}/7i-focus-epub-${theme}-${name}.png` })
    await context.close()
  })
}
