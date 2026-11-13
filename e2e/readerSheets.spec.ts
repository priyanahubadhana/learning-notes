/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

// Items 34, 37, 38, 41, 42: Aa sheet, reading lock, Dictionary, pen tool bar
// choice, read aloud, and the Contents / Notes buttons opening the left panel.

test.use({ viewport: { width: 1336, height: 800 } })

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openBook(
  page: Page,
  file: { name: string; mimeType: string; buffer: Buffer },
) {
  await page.goto('/')
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles(file)
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

const openPdf = (page: Page) =>
  openBook(page, {
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(['Alpha page words here', 'Bravo page words here'], {
      title: 'Fixture Book',
    }),
  })

async function selectAlpha(page: Page) {
  await expect(async () => {
    await page.evaluate(() => {
      const span = Array.from(
        document.querySelectorAll('.textLayer span'),
      ).find((e) => e.textContent?.includes('Alpha'))
      if (!span?.firstChild) throw new Error('no text')
      const range = document.createRange()
      range.setStart(span.firstChild, 0)
      range.setEnd(span.firstChild, 5)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await expect(page.getByTestId('popup-define')).toBeVisible({
      timeout: 1500,
    })
  }).toPass({ timeout: 15_000 })
}

test('Contents and Notes open the left panel, not a right-hand one', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-contents').click()
  await expect(page.getByTestId('left-panel')).toBeVisible()
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotations-panel')).toBeVisible()
  await expect(page.locator('aside.max-w-sm')).toHaveCount(0)
})

test('Aa sheet: page colour and dim apply and are remembered', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-aa').click()
  await expect(page.getByTestId('aa-sheet')).toBeVisible()
  await page.getByTestId('aa-page-sepia').click()
  await expect(page.locator('[data-read-page="sepia"]')).toBeVisible()
  await page.getByTestId('aa-dim').fill('30')
  await expect(page.getByTestId('reader-dim')).toBeVisible()
  await page.reload()
  await expect(page.locator('[data-read-page="sepia"]')).toBeVisible()
})

test('reading lock: taps do nothing and holding the lock icon unlocks', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-lock').click()
  await expect(page.getByTestId('reader-bar')).toBeHidden()
  await expect(page.getByTestId('reader-lock-layer')).toBeVisible()
  const unlock = page.getByTestId('reader-unlock')
  const box = (await unlock.boundingBox())!
  // A short press does not unlock.
  await page.mouse.move(box.x + 20, box.y + 20)
  await page.mouse.down()
  await page.waitForTimeout(400)
  await page.mouse.up()
  await expect(page.getByTestId('reader-lock-layer')).toBeVisible()
  // Holding 1.5 s does.
  await page.mouse.down()
  await page.waitForTimeout(1800)
  await page.mouse.up()
  await expect(page.getByTestId('reader-lock-layer')).toHaveCount(0)
  await expect(page.getByTestId('reader-bar')).toBeVisible()
})

test('Dictionary: shows meanings, and a clear message when offline', async ({
  page,
}) => {
  await page.route('https://api.dictionaryapi.dev/**', (route) =>
    route.fulfill({
      json: [
        {
          word: 'alpha',
          phonetic: '/ˈælfə/',
          meanings: [
            {
              partOfSpeech: 'noun',
              definitions: [{ definition: 'The first letter of Greek.' }],
            },
          ],
        },
      ],
    }),
  )
  await openPdf(page)
  const pick = () => selectAlpha(page)
  await pick()
  await page.getByTestId('popup-define').click()
  await expect(page.getByTestId('dictionary-sheet')).toContainText(
    'The first letter of Greek.',
  )
  await page.getByTestId('dict-close').click()

  await page.unroute('https://api.dictionaryapi.dev/**')
  await page.route('https://api.dictionaryapi.dev/**', (route) => route.abort())
  await pick()
  await page.getByTestId('popup-define').click()
  await expect(page.getByTestId('dict-offline')).toBeVisible()
})

test('Pen strip: Tool bar choice adds sizes and a colour picker', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-ink').click()
  await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
  await expect(page.getByTestId('reader-ink-size-1')).toHaveCount(0)
  await page.getByTestId('reader-more').click()
  await page.getByRole('menuitem', { name: /Tool bar/ }).click()
  await page.getByRole('menuitemradio', { name: 'Full' }).click()
  await expect(page.getByTestId('reader-ink-size-1')).toBeVisible()
  await expect(page.getByTestId('reader-ink-custom')).toBeVisible()
  await expect(page.getByTestId('reader-ink-type')).toBeVisible()
})

test('read aloud: the Audio tab speaks the chapter and marks nothing broken', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const spoken: string[] = []
    ;(window as unknown as { __spoken: string[] }).__spoken = spoken
    const synth = {
      speaking: false,
      paused: false,
      speak: (u: { text: string; onstart?: () => void }) => {
        spoken.push(u.text)
        u.onstart?.()
      },
      cancel: () => {},
      pause: () => {},
      resume: () => {},
      getVoices: () => [],
      addEventListener: () => {},
      removeEventListener: () => {},
    }
    Object.defineProperty(window, 'speechSynthesis', { value: synth })
    ;(
      window as unknown as { SpeechSynthesisUtterance: unknown }
    ).SpeechSynthesisUtterance = class {
      text: string
      constructor(t: string) {
        this.text = t
      }
    }
  })
  await openBook(page, {
    name: 'story.epub',
    mimeType: 'application/epub+zip',
    buffer: makeEpub('The Story'),
  })
  await page.getByTestId('reader-contents').click()
  await page.getByRole('tab', { name: 'Audio' }).click()
  await expect(page.getByTestId('book-aloud')).toBeVisible()
  await page.getByTestId('aloud-play').click()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __spoken: string[] }).__spoken.length,
      ),
    )
    .toBeGreaterThan(0)
})

test('gate 3 fix 4: pen type is the shared ▾ menu, the custom colour a swatch; no browser select', async ({
  page,
}) => {
  await openPdf(page)
  await page.getByTestId('reader-ink').click()
  await page.getByTestId('reader-more').click()
  await page.getByRole('menuitem', { name: /Tool bar/ }).click()
  await page.getByRole('menuitemradio', { name: 'Full' }).click()
  const bar = page.getByTestId('reader-ink-bar')
  await expect(bar.locator('select')).toHaveCount(0)
  await expect(
    page.getByTestId('reader-ink-custom').locator('.pcard-swatch'),
  ).toBeVisible()
  await page.getByTestId('reader-ink-type').click()
  await page.getByTestId('reader-ink-type-fountain').click()
  await expect(page.getByTestId('reader-ink-type')).toContainText('Fountain')
})
