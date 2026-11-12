// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'
import { markedWord, mockSpeech, spoken } from './readingHelpers.ts'

/**
 * Slice 7b (docs/features/reader-v2.md): Listen. A tap reads aloud at once,
 * a hold opens settings only, only the device's own voices are listed.
 * Flag reader.v2 is switched on with ?flags=reader.v2.
 */

test.use({ viewport: { width: 1200, height: 800 } })

const VOICES = [
  {
    voiceURI: 'v-zoe',
    name: 'Zoe (Premium)',
    lang: 'en-US',
    localService: true,
  },
  {
    voiceURI: 'v-alex',
    name: 'Alex (Enhanced)',
    lang: 'en-US',
    localService: true,
  },
  { voiceURI: 'v-daniel', name: 'Daniel', lang: 'en-GB', localService: true },
  { voiceURI: 'v-sam', name: 'Samantha', lang: 'en-US', localService: true },
  { voiceURI: 'v-amelie', name: 'Amelie', lang: 'fr-FR', localService: true },
  {
    voiceURI: 'v-net',
    name: 'Network Voice',
    lang: 'en-US',
    localService: false,
  },
]

const space = (page: Page, name: string) =>
  page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: `Space: ${name}` })

async function openPdf(page: Page, voices = VOICES) {
  await mockSpeech(page, 40, voices)
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await space(page, 'Library').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from(
        { length: 6 },
        (_, i) => `Page ${i + 1} words here and some more words to read`,
      ),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

const listen = (page: Page) => page.getByTestId('reader-listen')
const card = (page: Page) => page.getByTestId('rv2-listen-card')

/** Presses and holds with the mouse until the card shows, then lets go. */
async function holdListen(page: Page) {
  const b = await listen(page).boundingBox()
  if (!b) throw new Error('Listen not visible')
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2)
  await page.mouse.down()
  await expect(card(page)).toBeVisible()
  await page.mouse.up()
  // The click that follows the lift has run once the next frame is drawn.
  await page.evaluate(
    () => new Promise((r) => requestAnimationFrame(() => r(null))),
  )
}

test('RD-B10 a tap on Listen reads at once; again pauses; again resumes', async ({
  page,
}) => {
  await openPdf(page)
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'false')
  await listen(page).click()
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
  await expect(card(page)).toHaveCount(0)
  await listen(page).click()
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'false')
  await listen(page).click()
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'true')
})

test('RD-B11 and RD-B12 a hold opens the card only; letting go starts nothing', async ({
  page,
}) => {
  await openPdf(page)
  await holdListen(page)
  await expect(card(page)).toBeVisible()
  expect(await spoken(page)).toHaveLength(0)
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'false')
  expect(
    await page.evaluate(() => window.getSelection()?.toString() ?? ''),
  ).toBe('')
  // Nothing starts until Play is pressed inside the card.
  await page.getByTestId('rv2-listen-play').click()
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
})

test('RD-B13 a tap on Listen while the card is open closes it and plays nothing', async ({
  page,
}) => {
  await openPdf(page)
  await holdListen(page)
  await listen(page).click()
  await expect(card(page)).toHaveCount(0)
  expect(await spoken(page)).toHaveLength(0)
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'false')
})

test('RD-B14 Stop stops the voice and clears the marked passage', async ({
  page,
}) => {
  await openPdf(page)
  await listen(page).click()
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'true')
  await holdListen(page)
  await page.getByTestId('rv2-listen-stop').click()
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'false')
  await expect(page.getByTestId('rv2-listen-play')).toHaveText('Read this page')
  expect(await markedWord(page)).toBe('')
})

test('RD-B44 voices come in groups, only on-device ones, and a pin keeps a voice on top for its language', async ({
  page,
}) => {
  await openPdf(page)
  await holdListen(page)
  const names = (id: string) =>
    page.getByTestId(`rv2-voices-${id}`).getByTestId('rv2-voice')
  await expect(names('premium')).toHaveText(['Zoe (Premium) (en-US)'])
  await expect(names('enhanced')).toHaveText(['Alex (Enhanced) (en-US)'])
  await expect(names('device')).toHaveText([
    'Daniel (en-GB)',
    'Samantha (en-US)',
  ])
  await expect(names('other')).toHaveText(['Amelie (fr-FR)'])
  // A network voice is never offered.
  await expect(page.getByText('Network Voice')).toHaveCount(0)
  // Pin Samantha: she moves above Daniel.
  await page
    .getByTestId('rv2-voices-device')
    .locator('[data-testid="rv2-voice-pin"][data-voice="v-sam"]')
    .click()
  await expect(names('device')).toHaveText([
    'Samantha (en-US)',
    'Daniel (en-GB)',
  ])
  // Choosing a voice reads with it.
  await names('device').first().click()
  await page.getByTestId('rv2-listen-play').click()
  await expect
    .poll(async () => (await spoken(page)).at(-1)?.voice)
    .toBe('v-sam')
  // The pin is remembered after a reload.
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await holdListen(page)
  await expect(names('device')).toHaveText([
    'Samantha (en-US)',
    'Daniel (en-GB)',
  ])
})

test('Beginner sees Play, Stop and voices; speed, skip and sleep need their switch', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [] }),
    ),
  )
  await openPdf(page)
  await holdListen(page)
  await expect(page.getByTestId('rv2-listen-play')).toBeVisible()
  await expect(page.getByTestId('rv2-voice').first()).toBeVisible()
  await expect(page.getByTestId('rv2-listen-speed')).toHaveCount(0)
  await expect(page.getByTestId('rv2-listen-sleep')).toHaveCount(0)
  await expect(page.getByTestId('rv2-listen-back')).toHaveCount(0)
})

test('Professional sees speed, skip and the sleep timer', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: [] }),
    ),
  )
  await openPdf(page)
  await holdListen(page)
  await expect(page.getByTestId('rv2-listen-speed')).toBeVisible()
  await expect(page.getByTestId('rv2-listen-sleep')).toBeVisible()
  await expect(page.getByTestId('rv2-listen-back')).toBeVisible()
})

test('a Pencil hold on Listen opens settings only: no playback, no drawing', async ({
  page,
}) => {
  await openPdf(page)
  await expect(listen(page)).toBeVisible()
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="reader-listen"]')!
    const r = el.getBoundingClientRect()
    const init = {
      pointerId: 7,
      pointerType: 'pen',
      isPrimary: true,
      bubbles: true,
      cancelable: true,
      clientX: r.x + r.width / 2,
      clientY: r.y + r.height / 2,
    }
    el.dispatchEvent(new PointerEvent('pointerdown', init))
    ;(window as unknown as { __pen: typeof init }).__pen = init
  })
  await expect(card(page)).toBeVisible()
  await page.evaluate(() => {
    const el = document.querySelector('[data-testid="reader-listen"]')!
    el.dispatchEvent(
      new PointerEvent(
        'pointerup',
        (window as unknown as { __pen: object }).__pen,
      ),
    )
  })
  expect(await spoken(page)).toHaveLength(0)
  await expect(page.getByTestId('rv2-draw-bar')).toHaveCount(0)
})

test.describe('iPad portrait, touch', () => {
  test.use({
    viewport: { width: 820, height: 1180 },
    hasTouch: true,
    isMobile: true,
  })

  test('a finger hold on Listen opens settings only: no playback, no selection', async ({
    page,
  }) => {
    await openPdf(page)
    const b = await listen(page).boundingBox()
    if (!b) throw new Error('Listen not visible')
    const cdp = await page.context().newCDPSession(page)
    const point = [{ x: b.x + b.width / 2, y: b.y + b.height / 2 }]
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: point,
    })
    await expect(card(page)).toBeVisible()
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchEnd',
      touchPoints: [],
    })
    await page.evaluate(
      () => new Promise((r) => requestAnimationFrame(() => r(null))),
    )
    await expect(card(page)).toBeVisible()
    expect(await spoken(page)).toHaveLength(0)
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? ''),
    ).toBe('')
    // The card sits fully on screen.
    const c = await card(page).boundingBox()
    expect(c!.x).toBeGreaterThanOrEqual(0)
    expect(c!.x + c!.width).toBeLessThanOrEqual(820.5)
    expect(c!.y + c!.height).toBeLessThanOrEqual(1180.5)
  })
})

test('RD-B44 with no on-device voice for the language Listen says so and never speaks', async ({
  page,
}) => {
  await openPdf(page, [
    {
      voiceURI: 'v-net',
      name: 'Network Voice',
      lang: 'en-US',
      localService: false,
    },
    { voiceURI: 'v-amelie', name: 'Amelie', lang: 'fr-FR', localService: true },
  ])
  await listen(page).click()
  await expect(
    page.getByText(/No voice on this device for this language/),
  ).toBeVisible()
  await expect(listen(page)).toHaveAttribute('aria-pressed', 'false')
  expect(await spoken(page)).toHaveLength(0)
})
