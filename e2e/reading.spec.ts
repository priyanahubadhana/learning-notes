// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  addPage,
  createNotebook,
  openPage,
  pageAction,
  selectText,
  openRibbon,
  cornerAction,
  setTheme,
  waitForSaved,
} from './helpers.ts'
import {
  barTool,
  landings,
  controls,
  moreItem,
  pickMore,
  showReadTools,
  frame,
  markedWord,
  mockSpeech,
  openPanel,
  presetSetting,
  readSwitch,
  spoken,
  writeBook,
  writeSwitch,
} from './readingHelpers.ts'

/**
 * Batch 3: Reading mode. Two ways in (the page itself, or a full-screen
 * reader), themes, fonts, size, spacing, margin, width, scroll or pages,
 * line focus, progress, bookmarks and resume, highlight while reading, the
 * outline, read aloud (with a pretend voice), a sleep timer, and the blanks.
 */

test.use({ viewport: { width: 900, height: 600 } })

const LOOK = 'Look and reading'
const editor = (page: Page) => page.locator('.bn-editor')
const main = (page: Page) => page.getByRole('main')
/** Waits until a gliding jump has come to rest. */
const settled = (page: Page) =>
  expect
    .poll(async () => {
      const a = await main(page).evaluate((m) => m.scrollTop)
      await page.waitForTimeout(250)
      return a === (await main(page).evaluate((m) => m.scrollTop))
    })
    .toBe(true)

async function startBook(page: Page, chapters = 3) {
  await showReadTools(page)
  await page.goto('/')
  await createNotebook(page, 'Heart', 'Cardiology book')
  await writeBook(page, chapters)
}

// ---------------------------------------------------------------- two ways in

test('📖 Read turns the page into Reading mode in place, with the Read tools', async ({
  page,
}) => {
  await startBook(page)
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
  // The page may still be settling after the reload, so tap until it takes.
  await expect(async () => {
    if ((await frame(page).getAttribute('data-view')) === 'off')
      await readSwitch(page).click({ timeout: 1000 })
    await expect(frame(page)).toHaveAttribute('data-view', 'inPlace', {
      timeout: 1500,
    })
  }).toPass({ timeout: 10_000 })
  // The same page, the bar now shows the Read tools.
  await expect(editor(page)).toContainText('Chapter 1')
  for (const name of [
    'Reading look (Aa)',
    'Contents',
    'Bookmarks',
    'Listen',
    'Find',
    'Edit page',
    'More reading options',
    'Exit reading',
  ]) {
    await expect(barTool(page, name), name).toBeVisible()
  }
  await expect(page.getByTestId('reading-progress')).toContainText('%')
  // Exit reading goes back to Write.
  await barTool(page, 'Exit reading').click()
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
  await expect(writeSwitch(page)).toHaveAttribute('aria-pressed', 'true')
})

test('Settings › Reading › "The Read button opens" picks the full-screen reader', async ({
  page,
}) => {
  await presetSetting(page, 'reading.entry', 'reader')
  await startBook(page)
  await readSwitch(page).click()
  await expect(frame(page)).toHaveAttribute('data-view', 'reader')
  // It hides everything else: the sidebar and top bar are covered.
  const box = (await frame(page).boundingBox())!
  expect(box.width).toBeGreaterThanOrEqual(899)
  expect(box.height).toBeGreaterThanOrEqual(599)
  await expect(page.getByTestId('reader-controls')).toBeVisible()
  // The other way is still one tap away: the page menu has the reader too.
  await page.getByRole('button', { name: 'Exit reading' }).click()
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
  await pageAction(page, 'Full-screen reader')
  await expect(frame(page)).toHaveAttribute('data-view', 'reader')
})

test('the full-screen reader: a tap in the middle shows or hides the controls', async ({
  page,
}) => {
  await startBook(page)
  await pageAction(page, 'Full-screen reader')
  const top = page.getByTestId('reader-controls')
  await expect(top).toBeVisible()
  await page.mouse.click(450, 300)
  // Hidden, but still mounted (ready to show at once).
  await expect(top).toBeHidden()
  await expect(top).toHaveCount(1)
  await page.mouse.click(450, 300)
  await expect(top).toBeVisible()
  // Esc leaves.
  await page.keyboard.press('Escape')
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
})

test('the Settings screen has a Reading section with every choice', async ({
  page,
}) => {
  await page.goto('/')
  await createNotebook(page, 'Heart', 'Page')
  await cornerAction(page, 'Settings')
  await page.getByRole('button', { name: /^Reading, / }).click()
  for (const id of [
    'entry',
    'theme',
    'font',
    'size',
    'spacing',
    'margin',
    'width',
    'flow',
    'ruler',
    'blanks',
    'speed',
    'awake',
  ]) {
    await expect(
      page.locator(`[data-setting-id="reading.${id}"]`),
      id,
    ).toBeVisible()
  }
  // Found by search words.
  await page.getByRole('button', { name: /^All, / }).click()
  await page.getByRole('searchbox').fill('dyslexia')
  await expect(page.locator('[data-setting-id="reading.font"]')).toBeVisible()
})

// ----------------------------------------------------------------- the looks

test('theme, font, size, spacing, margin and width change the page and are remembered', async ({
  page,
}) => {
  // Room for the 920 px Wide page beside the sidebar.
  await page.setViewportSize({ width: 1400, height: 800 })
  await startBook(page)
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Text size', LOOK)
  const block = editor(page).locator('.bn-block-content').nth(1)
  const sizeBefore = parseFloat(
    await block.evaluate((e) => getComputedStyle(e).fontSize),
  )

  await panel.getByRole('button', { name: 'Bigger text' }).click()
  await panel.getByRole('button', { name: 'Bigger text' }).click()
  await expect(panel.getByTestId('reading-size')).toHaveText('130%')
  // The editor eases the size over 0.2 s, so wait for it to settle.
  await expect
    .poll(async () =>
      parseFloat(await block.evaluate((e) => getComputedStyle(e).fontSize)),
    )
    .toBeGreaterThan(sizeBefore * 1.25)

  await panel.getByRole('tab', { name: 'Themes' }).click()
  await panel.getByRole('radio', { name: 'Sepia' }).click()
  await expect(page.locator('[data-reading="inPlace"]')).toHaveCSS(
    'background-color',
    'rgb(244, 236, 216)',
  )
  await panel.getByRole('radio', { name: 'Dark contrast' }).click()
  await expect(page.locator('[data-reading="inPlace"]')).toHaveCSS(
    'background-color',
    'rgb(0, 0, 0)',
  )
  await panel.getByRole('radio', { name: 'Night' }).click()
  await panel.getByRole('radio', { name: 'Paper' }).click()

  await panel.getByRole('tab', { name: 'Font' }).click()
  await panel.getByRole('radio', { name: 'Literata' }).click()
  await expect(block).toHaveCSS('font-family', /Literata/)

  await panel.getByRole('tab', { name: 'Layout' }).click()
  const lineBefore = await block.evaluate((e) => getComputedStyle(e).lineHeight)
  await panel.getByRole('radio', { name: 'Loose' }).click()
  const lineAfter = await block.evaluate((e) => getComputedStyle(e).lineHeight)
  expect(parseFloat(lineAfter)).toBeGreaterThan(parseFloat(lineBefore))

  await panel.getByRole('radio', { name: 'Narrow' }).click()
  const root = page.locator('[data-reading="inPlace"]')
  const narrow = (await root.boundingBox())!.width
  await panel.getByRole('radio', { name: 'Wide' }).click()
  expect((await root.boundingBox())!.width).toBeGreaterThan(narrow)
  await panel.getByRole('radio', { name: 'Large' }).first().click() // margin

  // Everything is remembered on this device.
  await page.reload()
  await readSwitch(page).click()
  // Reading resumes deep in the page, so only the small ✕ shows: a little
  // scroll up brings the bar back.
  await page.waitForTimeout(500)
  await page.getByRole('main').evaluate((m) => m.scrollBy(0, -60))
  const again = await openPanel(page, 'Text size', LOOK)
  await expect(again.getByTestId('reading-size')).toHaveText('130%')
  await expect(again.getByRole('radio', { name: 'Literata' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await again.getByRole('tab', { name: 'Themes' }).click()
  await expect(again.getByRole('radio', { name: 'Paper' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await again.getByRole('tab', { name: 'Layout' }).click()
  await expect(again.getByRole('radio', { name: 'Wide' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
})

test('the dyslexia-friendly font (OpenDyslexic) loads when chosen', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Font', LOOK)
  await panel.getByRole('radio', { name: 'OpenDyslexic' }).click()
  const block = editor(page).locator('.bn-block-content').nth(1)
  await expect(block).toHaveCSS('font-family', /OpenDyslexic/)
  await expect
    .poll(() =>
      page.evaluate(() => document.fonts.check('16px "OpenDyslexic"')),
    )
    .toBe(true)
})

test('themes follow the app by default, and Night makes the reading area dark', async ({
  page,
}) => {
  await startBook(page)
  await setTheme(page, 'Night')
  await readSwitch(page).click()
  await expect(page.locator('[data-reading="inPlace"]')).toHaveCSS(
    'background-color',
    /rgb\(22, 22, 26\)|rgb\(22, 22, 24\)/,
  )
})

// ------------------------------------------------------------------- reading

test('scrolling shows progress and about how many minutes are left', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  const progress = page.getByTestId('reading-progress')
  await expect(progress).toContainText(/\d+% · about \d+ min left|finished/)
  const before = await progress.innerText()
  await page
    .getByRole('main')
    .evaluate((m) => m.scrollTo({ top: m.scrollHeight }))
  await expect(progress).toContainText('100%')
  await expect(progress).toContainText('finished')
  expect(await progress.innerText()).not.toBe(before)
})

test('Contents lists the headings and jumps to one; a bookmark can be added, used and removed', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  // Contents is the left panel's Outline tab, Bookmarks its own panel.
  await barTool(page, 'Contents').click()
  const pane = page.getByTestId('left-panel')
  await expect(pane.locator('[data-heading]')).toHaveCount(3)
  await pane.getByRole('button', { name: 'Chapter 3' }).click()
  // The arrival point glows.
  await expect.poll(() => landings(page)).toBeGreaterThan(0)
  await expect
    .poll(() => page.getByRole('main').evaluate((m) => m.scrollTop))
    .toBeGreaterThan(200)
  const heading = editor(page).getByText('Chapter 3', { exact: true })
  await expect(heading).toBeInViewport()

  // Bookmark here, scroll back to the top, then use the bookmark.
  await settled(page)
  await main(page).evaluate((m) => m.scrollBy(0, -40)) // the bar returns
  const panel2 = await openPanel(page, 'Bookmarks', 'Bookmarks')
  await panel2.getByRole('button', { name: 'Add a bookmark here' }).click()
  await expect(panel2.locator('[data-bookmark]')).toHaveCount(1)
  // A ribbon sits in the margin beside the bookmarked paragraph.
  await expect(page.locator('style#ln-bookmark-ribbons')).toHaveCount(1)
  await page.keyboard.press('Escape')
  await page.getByRole('main').evaluate((m) => m.scrollTo({ top: 0 }))
  const panel3 = await openPanel(page, 'Bookmarks', 'Bookmarks')
  await panel3.locator('[data-bookmark]').click()
  await expect
    .poll(() => page.getByRole('main').evaluate((m) => m.scrollTop))
    .toBeGreaterThan(200)
  // And a bookmark can be removed (with Undo).
  await settled(page)
  await main(page).evaluate((m) => m.scrollBy(0, -40))
  const panel4 = await openPanel(page, 'Bookmarks', 'Bookmarks')
  await panel4.getByRole('button', { name: /^Remove bookmark/ }).click()
  await expect(panel4.getByText('No bookmarks yet.')).toBeVisible()
  await expect(page.locator('style#ln-bookmark-ribbons')).toHaveCount(0)
})

test('it resumes where you stopped, per page, after leaving and after a reload', async ({
  page,
}) => {
  await startBook(page)
  await addPage(page, 'Heart', 'Other page')
  await openPage(page, 'Cardiology book')
  await readSwitch(page).click()
  await page
    .getByRole('main')
    .evaluate((m) => m.scrollTo({ top: m.scrollHeight / 2 }))
  await page.waitForTimeout(900) // the place is saved a moment after scrolling
  const stopped = await page.getByRole('main').evaluate((m) => m.scrollTop)
  expect(stopped).toBeGreaterThan(200)
  await openPage(page, 'Other page')
  await openPage(page, 'Cardiology book')
  await expect
    .poll(() => page.getByRole('main').evaluate((m) => m.scrollTop))
    .toBeGreaterThan(stopped - 150)
  await page.waitForTimeout(900)
  await page.reload()
  await readSwitch(page).click()
  await expect
    .poll(() => page.getByRole('main').evaluate((m) => m.scrollTop))
    .toBeGreaterThan(stopped - 250)
})

test('line focus dims all but a band that follows the pointer; the ruler marks one line', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await pickMore(page, 'Line focus')
  const ruler = page.getByTestId('reading-ruler')
  await expect(ruler).toHaveAttribute('data-mode', 'focus')
  await expect(await moreItem(page, 'Line focus')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.keyboard.press('Escape')
  const before = await ruler.locator('div').first().boundingBox()
  await page.mouse.move(450, 450)
  await expect
    .poll(
      async () => (await ruler.locator('div').first().boundingBox())!.height,
    )
    .toBeGreaterThan(before!.height + 100)
  // Pick the ruler in the look panel.
  const panel = await openPanel(page, 'Text size', LOOK)
  await panel.getByRole('tab', { name: 'More' }).click()
  await panel.getByRole('radio', { name: 'Ruler' }).click()
  await expect(ruler).toHaveAttribute('data-mode', 'ruler')
  await panel.getByRole('radio', { name: 'Off' }).first().click()
  await expect(ruler).toHaveCount(0)
})

test('Lock to reading stops editing and keeps the Read set', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await expect(editor(page)).toHaveAttribute('contenteditable', 'true')
  await pickMore(page, 'Lock to reading')
  await expect(editor(page)).toHaveAttribute('contenteditable', 'false')
  // Tapping Write explains, and Reading stays.
  await writeSwitch(page).click()
  await expect(
    page.getByRole('status').filter({ hasText: 'Reading is locked' }),
  ).toBeVisible()
  await expect(controls(page)).toBeVisible()
  await expect(frame(page)).toHaveAttribute('data-view', 'inPlace')
  await barTool(page, 'Exit reading').click()
  await expect(frame(page)).toHaveAttribute('data-view', 'inPlace')
  // Turn it off, and editing and exit work again.
  await pickMore(page, 'Lock to reading')
  await expect(editor(page)).toHaveAttribute('contenteditable', 'true')
  await barTool(page, 'Exit reading').click()
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
})

test('a page can be set to always open in Reading mode', async ({ page }) => {
  await startBook(page)
  await addPage(page, 'Heart', 'Plain page')
  await openPage(page, 'Cardiology book')
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Text size', LOOK)
  await panel.getByRole('tab', { name: 'More' }).click()
  await panel
    .getByRole('switch', { name: 'Always open this page in Reading mode' })
    .click()
  await page.keyboard.press('Escape')
  await barTool(page, 'Exit reading').click()
  await openPage(page, 'Plain page')
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
  await openPage(page, 'Cardiology book')
  await expect(frame(page)).toHaveAttribute('data-view', 'inPlace')
  // Leaving to a normal page turns it off again.
  await openPage(page, 'Plain page')
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
})

// ------------------------------------------------- highlight while reading

test('selecting while reading offers Highlight (saved as a normal mark, with Undo)', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await pickMore(page, 'Lock to reading') // not editing: the text is frozen
  await selectText(page, 'four chambers')
  const bar = page.getByTestId('reading-selection-bar')
  await expect(bar).toBeVisible()
  await bar.getByRole('button', { name: 'Highlight' }).click()
  await expect(editor(page)).toHaveAttribute('contenteditable', 'false')
  await expect(
    editor(page)
      .locator('[data-style-type="backgroundColor"][data-value="yellow"]')
      .first(),
  ).toContainText('four chambers')
  // It is saved in the page (wait for the write itself, not a fixed time).
  await expect
    .poll(() =>
      page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const open = indexedDB.open('learning-notes')
            open.onerror = () => resolve(false)
            open.onsuccess = () => {
              const all = open.result
                .transaction('blocks')
                .objectStore('blocks')
                .getAll()
              all.onsuccess = () => {
                open.result.close()
                resolve(
                  JSON.stringify(all.result).includes(
                    '"backgroundColor":"yellow"',
                  ),
                )
              }
              all.onerror = () => resolve(false)
            }
          }),
      ),
    )
    .toBe(true)
  await page.reload()
  await expect(
    editor(page)
      .locator('[data-style-type="backgroundColor"][data-value="yellow"]')
      .first(),
  ).toContainText('four chambers')
  // Undo takes it off. The reload ends reading: wait for the page, then switch it on.
  await expect(frame(page)).toHaveAttribute('data-view', 'off')
  await readSwitch(page).click()
  await expect(frame(page)).toHaveAttribute('data-view', 'inPlace')
  // The view is still settling after the switch: select again until the bar shows.
  const valves = page
    .getByTestId('reading-selection-bar')
    .getByRole('button', { name: 'Highlight' })
  await expect(async () => {
    await selectText(page, 'four valves')
    await expect(valves).toBeVisible({ timeout: 1000 })
  }).toPass({ timeout: 10_000 })
  await valves.click()
  const count = await editor(page)
    .locator('[data-style-type="backgroundColor"][data-value="yellow"]')
    .count()
  await page.getByRole('button', { name: 'Undo', exact: true }).last().click()
  await expect(
    editor(page).locator(
      '[data-style-type="backgroundColor"][data-value="yellow"]',
    ),
  ).toHaveCount(count - 1)
})

test('Look up opens the free dictionary page for the word, only on a tap', async ({
  page,
}) => {
  await startBook(page)
  await readSwitch(page).click()
  await page.evaluate(() => {
    const calls: unknown[][] = []
    ;(window as unknown as { __opened: unknown[][] }).__opened = calls
    window.open = ((...args: unknown[]) => {
      calls.push(args)
      return null
    }) as typeof window.open
  })
  await selectText(page, 'valves')
  expect(
    await page.evaluate(
      () => (window as unknown as { __opened: unknown[][] }).__opened.length,
    ),
  ).toBe(0)
  await page
    .getByTestId('reading-selection-bar')
    .getByRole('button', { name: 'Look up' })
    .click()
  const opened = await page.evaluate(
    () => (window as unknown as { __opened: string[][] }).__opened,
  )
  expect(opened).toHaveLength(1)
  expect(opened[0][0]).toBe('https://en.wiktionary.org/wiki/valves')
  expect(opened[0][2]).toContain('noopener')
})

// -------------------------------------------------------------- paged reader

test('paged mode: tap the edges or swipe to turn pages, with a page count', async ({
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 480 })
  await presetSetting(page, 'reading.flow', 'paged')
  await presetSetting(page, 'reading.entry', 'reader')
  await startBook(page, 5)
  await readSwitch(page).click()
  await expect(frame(page)).toHaveAttribute('data-flow', 'paged')
  const status = page.getByTestId('reader-progress')
  await expect(status).toContainText(/Page 1 of \d+/)
  // The pages are counted again while fonts and pictures settle (slow on
  // CI): wait until the count has stopped changing before using it.
  const pageCount = async () =>
    Number(/of (\d+)/.exec(await status.innerText())![1])
  let total = await pageCount()
  await expect(async () => {
    await page.waitForTimeout(400)
    const now = await pageCount()
    const same = now === total
    total = now
    expect(same).toBe(true)
  }).toPass({ timeout: 20_000 })
  expect(total).toBeGreaterThan(2)

  await page.mouse.click(880, 300) // right edge
  await expect(status).toContainText(`Page 2 of ${total}`)
  await page.mouse.click(10, 300) // left edge
  await expect(status).toContainText(`Page 1 of ${total}`)

  // A swipe left goes forward, a swipe right back.
  await page.mouse.move(600, 300)
  await page.mouse.down()
  await page.mouse.move(400, 305, { steps: 4 })
  await page.mouse.up()
  await expect(status).toContainText(`Page 2 of ${total}`)
  await page.mouse.move(300, 300)
  await page.mouse.down()
  await page.mouse.move(550, 302, { steps: 4 })
  await page.mouse.up()
  await expect(status).toContainText(`Page 1 of ${total}`)

  // The keys turn pages too, and the position is remembered.
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('ArrowRight')
  await expect(status).toContainText(`Page 3 of ${total}`)
  await page.waitForTimeout(900)
  await page.getByRole('button', { name: 'Exit reading' }).click()
  await pageAction(page, 'Full-screen reader')
  // Resumes at the block that was at the top, to within a page when a block
  // runs across a page break.
  await expect(page.getByTestId('reader-progress')).toContainText(
    /Page [345] of/,
  )
})

test('scrolling reader: edges scroll a screen and the slider seeks', async ({
  page,
}) => {
  await startBook(page)
  await pageAction(page, 'Full-screen reader')
  await expect(frame(page)).toHaveAttribute('data-flow', 'scroll')
  const top = () => frame(page).evaluate((e) => e.scrollTop)
  expect(await top()).toBe(0)
  await page.mouse.click(880, 300)
  await expect.poll(top).toBeGreaterThan(300)
  await page.getByRole('slider', { name: 'Move through the page' }).fill('100')
  await expect(page.getByTestId('reader-progress')).toContainText('100%')
})

// ----------------------------------------------------------------- read aloud

test('read aloud: words are marked as spoken; speed and voice can be chosen', async ({
  page,
}) => {
  await mockSpeech(page, 60)
  await startBook(page, 1)
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Read aloud', 'Read aloud')
  await panel.getByRole('button', { name: 'Read this page' }).click()
  await expect(panel.getByTestId('aloud-status')).toContainText('Reading aloud')
  // The first piece is the heading, then the paragraphs.
  await expect.poll(async () => (await spoken(page)).length).toBeGreaterThan(0)
  expect((await spoken(page))[0].text).toBe('Chapter 1')
  await expect.poll(() => markedWord(page)).not.toBe('')
  // Speed and voice restart the piece with the new choice.
  await panel.getByRole('radio', { name: '1.5×' }).click()
  await expect.poll(async () => (await spoken(page)).at(-1)!.rate).toBe(1.5)
  await panel.getByLabel('Voice').selectOption('v-samantha')
  await expect
    .poll(async () => (await spoken(page)).at(-1)!.voice)
    .toBe('v-samantha')
  // Pause and resume, then stop.
  await panel.getByRole('button', { name: 'Pause' }).click()
  await expect(panel.getByTestId('aloud-status')).toContainText('Paused')
  await panel.getByRole('button', { name: 'Resume' }).click()
  await expect(panel.getByTestId('aloud-status')).toContainText('Reading aloud')
  await panel.getByRole('button', { name: 'Stop' }).click()
  await expect(panel.getByTestId('aloud-status')).toContainText('Not reading')
  await expect.poll(() => markedWord(page)).toBe('')
})

test('read aloud from where you tap, and the voices of the device are listed', async ({
  page,
}) => {
  await mockSpeech(page, 40)
  await startBook(page, 1)
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Read aloud', 'Read aloud')
  await expect(panel.getByLabel('Voice').locator('option')).toHaveText([
    "This device's usual voice",
    'Daniel (en-GB)',
    'Samantha (en-US)',
  ])
  await panel.getByRole('button', { name: 'Read this page' }).click()
  await panel.getByRole('button', { name: 'Close', exact: true }).click()
  // Tap a word in the third paragraph: reading restarts there.
  const target = editor(page).getByText('Part 1.3', { exact: false })
  await target.click({ position: { x: 5, y: 8 } })
  await expect
    .poll(async () => (await spoken(page)).at(-1)!.text)
    .toMatch(/Part 1\.[34]|heart|valves|beat|chambers/)
  const last = (await spoken(page)).at(-1)!.text
  expect(last).not.toBe('Chapter 1')
})

test('read aloud goes on into the next page of the notebook, like an audiobook', async ({
  page,
}) => {
  await mockSpeech(page, 5)
  await page.goto('/')
  await createNotebook(page, 'Heart', 'First page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('Alpha ends here.')
  await waitForSaved(page)
  await addPage(page, 'Heart', 'Second page')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('Omega starts now.')
  await waitForSaved(page)
  await openPage(page, 'First page')
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Read aloud', 'Read aloud')
  await panel.getByRole('button', { name: 'Read this page' }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Second page',
  )
  await expect
    .poll(async () => (await spoken(page)).map((s) => s.text))
    .toEqual(['Alpha ends here.', 'Omega starts now.'])
})

test('the sleep timer stops reading after 10, 20, 30 or 60 minutes', async ({
  page,
}) => {
  await page.clock.install()
  await mockSpeech(page, 4000) // slow enough to still be reading after minutes
  await startBook(page, 1)
  await readSwitch(page).click()
  const panel = await openPanel(page, 'Read aloud', 'Read aloud')
  for (const minutes of [10, 20, 30, 60]) {
    await expect(
      panel.getByRole('radio', { name: `${minutes} min` }),
    ).toBeVisible()
  }
  await panel.getByRole('button', { name: 'Read this page' }).click()
  await panel.getByRole('radio', { name: '10 min' }).click()
  await expect(panel.getByTestId('sleep-left')).toContainText('Stops in 10:00')
  await page.clock.fastForward('09:00')
  await expect(panel.getByTestId('aloud-status')).toContainText('Reading aloud')
  await page.clock.fastForward('01:05')
  await expect(panel.getByTestId('aloud-status')).toContainText('Not reading')
  await expect(
    page.getByRole('status').filter({ hasText: 'sleep timer stopped' }),
  ).toBeVisible()
})

// --------------------------------------------------------------------- blanks

test('blanks are softly marked by default; Self-test hides them until tapped', async ({
  page,
  browserName,
}) => {
  // Selecting words in the editor by robot is unreliable in WebKit (a known
  // limit, see LIMITATIONS.md); Chromium runs this.
  test.skip(browserName === 'webkit', 'robot selection in the editor')
  await showReadTools(page)
  await page.goto('/')
  await createNotebook(page, 'Heart', 'Valves')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('S2 closes the aortic and pulmonary valves')
  await waitForSaved(page)
  await selectText(page, 'aortic and pulmonary')
  await page.getByRole('button', { name: 'Toolbar menu' }).click()
  await page
    .locator('[data-bar="tray"]')
    .getByRole('button', { name: 'Make blank (hide these words in review)' })
    .click()
  const blank = editor(page).locator('.recall-blank')
  await expect(blank).toHaveCount(1)
  await readSwitch(page).click()
  // Softly marked: the words stay readable.
  await expect(blank).toBeVisible()
  expect(await blank.evaluate((e) => getComputedStyle(e).color)).not.toBe(
    'rgba(0, 0, 0, 0)',
  )
  // Self-test (a tool of the Read set) hides them.
  await pickMore(page, 'Self-test')
  await expect(await moreItem(page, 'Self-test')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.keyboard.press('Escape')
  await expect(blank).toHaveCSS('color', 'rgba(0, 0, 0, 0)')
  // Tap to show one, tap again to hide it.
  await blank.click()
  await expect(blank).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)')
  await blank.click()
  await expect(blank).toHaveCSS('color', 'rgba(0, 0, 0, 0)')
  // The Look panel has the same switch.
  const panel = await openPanel(page, 'Text size', LOOK)
  await panel.getByRole('tab', { name: 'More' }).click()
  await expect(
    panel.getByRole('radio', { name: 'Hidden (self-test)' }),
  ).toHaveAttribute('aria-checked', 'true')
  await panel.getByRole('radio', { name: 'Softly marked' }).click()
  await expect(blank).not.toHaveCSS('color', 'rgba(0, 0, 0, 0)')
})

// -------------------------------------------------------------- tools + looks

test('the ribbon View tab tools are real, and the control panel lists them', async ({
  page,
}) => {
  await startBook(page)
  await openRibbon(page)
  await page.getByRole('tab', { name: 'View', exact: true }).click()
  const panel = page.getByRole('tabpanel')
  await panel.getByRole('button', { name: 'Reading mode', exact: true }).click()
  await expect(frame(page)).toHaveAttribute('data-view', 'inPlace')
  await page.keyboard.press('Control+Shift+K')
  const dialog = page.getByRole('dialog', { name: 'Search' })
  await dialog.getByRole('button', { name: 'Features', exact: true }).click()
  await dialog.getByRole('combobox').fill('read aloud')
  await expect(
    dialog.locator('[data-panel-row="tool:readAloud"]'),
  ).toBeVisible()
  await expect(
    dialog.locator('[data-panel-row="tool:readAloud"]'),
  ).not.toContainText('later update')
  await dialog.getByRole('combobox').fill('reading')
  await expect(
    dialog.locator('[data-panel-row^="setting:reading"]').first(),
  ).toBeVisible()
})

test('Reading mode fits a phone: no sideways scroll, 44 px controls, three themes', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await presetSetting(page, 'reading.entry', 'reader')
  await startBook(page)
  await readSwitch(page).click()
  for (const theme of ['night', 'sepia', 'day']) {
    await page.evaluate((t) => {
      document.documentElement.dataset.theme = t
    }, theme)
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      ),
      theme,
    ).toBe(false)
    for (const name of [
      'Exit reading',
      'Contents',
      'Bookmarks',
      'Listen',
      'Reading look (Aa)',
    ]) {
      const box = (await page
        .getByRole('button', { name, exact: true })
        .boundingBox())!
      expect(box.width, `${theme} ${name}`).toBeGreaterThanOrEqual(43.5)
      expect(box.height, `${theme} ${name}`).toBeGreaterThanOrEqual(43.5)
    }
    await page.screenshot({ path: `test-results/reader-${theme}.png` })
  }
})
