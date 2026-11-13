// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import { makeEpub, makePdf } from './fixtures/books.ts'

/**
 * Slice 7h (reader v2): the Professional switches RD-P02 to RD-P16, RD-P19,
 * RD-P20, RD-P33, RD-P34, plus the select pop-up (RD-B24, B25, B26), edge taps
 * (RD-B42), Find (RD-B45), Page Flip (RD-B46) and rotating the iPad (RD-B50).
 * Flag reader.v2 via ?flags=reader.v2.
 */
test.use({ viewport: { width: 1200, height: 900 } })

const BEGINNER = (on: string[]) =>
  JSON.stringify({ level: 'beginner', unlocked: on })

async function openBook(
  page: Page,
  kind: 'pdf' | 'epub',
  on: string[] | 'professional' = [],
) {
  const seed =
    on === 'professional'
      ? JSON.stringify({ level: 'professional', unlocked: [] })
      : BEGINNER(on)
  await page.addInitScript((v) => {
    if (localStorage.getItem('e2e.seeded')) return
    localStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('learning-notes:level', v)
  }, seed)
  await page.goto('/?flags=reader.v2')
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
            Array.from({ length: 5 }, (_, i) => `Page ${i + 1} words here`),
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
}

/** Sets which Reader switches are on (Beginner) and reloads the open book. */
async function setOn(page: Page, on: string[]) {
  await page.evaluate(
    (v) => localStorage.setItem('learning-notes:level', v),
    BEGINNER(on),
  )
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

/** off (Beginner) -> on (switch) -> off again: the part comes and goes. */
async function cycle(
  page: Page,
  id: string,
  probe: () => Locator,
  prepare: () => Promise<void> = async () => {},
) {
  await prepare()
  await expect(probe()).toHaveCount(0)
  await setOn(page, [id])
  await prepare()
  await expect(probe()).not.toHaveCount(0)
  await setOn(page, [])
  await prepare()
  await expect(probe()).toHaveCount(0)
}

const more = async (page: Page) => {
  await page.getByTestId('reader-more').click()
}
/** Page Flip lives in the ⋯ card. */
const openFlip = async (page: Page) => {
  await page.getByTestId('reader-more').click()
  await page.getByTestId('reader-flip').click()
  await expect(page.getByTestId('page-flip-slider')).toBeVisible()
}
const aa = async (page: Page, tab?: string) => {
  await page.getByTestId('reader-aa').click()
  await expect(page.getByTestId('aa-sheet')).toBeVisible()
  if (tab) await page.getByTestId(`aa-tab-${tab}`).click()
}

test('RD-P02 reader.historyBtns: Undo and Redo start the reader bar only with the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  // The pair sits in the bar, or in the ⋯ card when the bar is full.
  await cycle(
    page,
    'reader.historyBtns',
    () => page.getByRole('button', { name: 'Undo', exact: true }),
    async () => {
      await page.keyboard.press('Escape')
      await more(page)
    },
  )
})

test('RD-P03 reader.fullScreen: the Full screen row waits for its switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await cycle(
    page,
    'reader.fullScreen',
    () => page.getByTestId('reader-fullscreen'),
    async () => {
      await page.keyboard.press('Escape')
      await more(page)
    },
  )
})

test('RD-P04 reader.flipBack: "Back to p. N" shows after scrubbing only with the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await openFlip(page)
  await page.getByTestId('page-flip-slider').fill('4')
  await expect(page.getByTestId('reader-page')).toContainText('Page 4 of 5')
  await expect(page.getByTestId('page-flip-back')).toHaveCount(0)
  await setOn(page, ['reader.flipBack'])
  await openFlip(page)
  await page.getByTestId('page-flip-slider').fill('2')
  await expect(page.getByTestId('page-flip-back')).toContainText('Back to p.')
})

test('RD-P06 reader.penBarStyle and RD-P07 reader.syncFurthest: the ⋯ card lists them only with their switches', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  const item = (name: RegExp) =>
    page.getByTestId('reader-more-card').getByRole('button', { name })
  await more(page)
  await expect(item(/Pen bar:/)).toHaveCount(0)
  await expect(item(/Sync to furthest/)).toHaveCount(0)
  await setOn(page, ['reader.penBarStyle'])
  await more(page)
  await expect(item(/Pen bar:/)).toHaveCount(3)
  await expect(item(/Sync to furthest/)).toHaveCount(0)
  await setOn(page, ['reader.syncFurthest'])
  await more(page)
  await expect(item(/Pen bar:/)).toHaveCount(0)
  await expect(item(/Sync to furthest/)).toHaveCount(1)
})

test('RD-P08 reader.progressStyle: progress choices and the clock wait for the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await cycle(
    page,
    'reader.progressStyle',
    () => page.getByTestId('aa-clock'),
    async () => {
      await aa(page, 'more')
    },
  )
})

test('RD-P09 reader.dim and RD-P33: Dim waits for its switch; off hides the layer, the amount stays', async ({
  page,
}) => {
  await openBook(page, 'pdf', ['reader.dim'])
  await aa(page, 'layout')
  await page.getByTestId('aa-dim').fill('30')
  await expect(page.getByTestId('reader-dim')).toBeAttached()
  await setOn(page, [])
  await expect(page.getByTestId('reader-dim')).toHaveCount(0)
  await aa(page, 'layout')
  await expect(page.getByTestId('aa-dim')).toHaveCount(0)
  await setOn(page, ['reader.dim'])
  await expect(page.getByTestId('reader-dim')).toBeAttached()
  await aa(page, 'layout')
  await expect(page.getByTestId('aa-dim')).toHaveValue('30')
})

test('RD-P10 reader.layout: spacing, alignment and margins wait for the switch (EPUB)', async ({
  page,
}) => {
  await openBook(page, 'epub')
  await cycle(
    page,
    'reader.layout',
    () => page.getByTestId('aa-spacing'),
    async () => {
      await aa(page, 'font')
    },
  )
})

test('RD-P11 reader.presets: the Themes tab waits for the switch', async ({
  page,
}) => {
  await openBook(page, 'epub')
  await cycle(
    page,
    'reader.presets',
    () => page.getByTestId('aa-tab-themes'),
    async () => {
      await aa(page)
    },
  )
})

test('RD-P12 reader.selMenu: the select pop-up on/off row waits for the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await cycle(
    page,
    'reader.selMenu',
    () => page.getByTestId('aa-menu'),
    async () => {
      await aa(page, 'more')
    },
  )
})

/** Selects the first line of text and waits for the pop-up. */
async function selectText(page: Page) {
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
}

test('RD-B24 selecting text in Everything works shows the pop-up with its actions', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await selectText(page)
  const pop = page.getByTestId('selection-popup')
  await expect(pop.locator('[data-testid^="hl-"]')).toHaveCount(5)
  for (const n of [
    'Note',
    'Copy',
    'Define',
    'Look up',
    'Pin',
    'Save to…',
    'Make card',
  ])
    await expect(
      pop
        .getByRole('button', { name: n, exact: n === 'Pin' ? false : true })
        .first(),
    ).toBeVisible()
  await pop.getByRole('button', { name: 'Look up' }).click()
  await expect(pop.getByTestId('popup-vocab')).toBeVisible()
})

test('RD-B25 a colour marks the text itself (a real highlight in the text layer)', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await selectText(page)
  await page.getByTestId('hl-yellow').dispatchEvent('click')
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
})

/** Opens Annotations from wherever it is now: the open panel, the bar, or the ⋯ card. */
async function openAnnotations(page: Page) {
  const panel = page.getByTestId('annotations-panel')
  await expect(page.getByTestId('reader-close')).toBeVisible()
  await page.waitForTimeout(400)
  if (await panel.isVisible()) return
  const tab = page
    .getByTestId('left-panel')
    .getByRole('tab', { name: 'Annotations' })
  const btn = page.getByTestId('reader-annotations')
  if (await tab.isVisible()) await tab.click()
  else if (await btn.isVisible()) await btn.click()
  else {
    await page.getByTestId('reader-more').click()
    await page.getByTestId('reader-annotations-card').click()
  }
  await expect(panel).toBeVisible()
}

/** One highlight, then the Annotations panel is open. */
async function withHighlight(page: Page) {
  await selectText(page)
  await page.getByTestId('hl-yellow').dispatchEvent('click')
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
  await page.getByTestId('reader-annotations').click()
  await expect(page.getByTestId('annotations-panel')).toBeVisible()
}

test('RD-B26 a tap on an Annotations row jumps to it', async ({ page }) => {
  await openBook(page, 'pdf')
  await withHighlight(page)
  await page
    .getByTestId('annotation-row')
    .first()
    .getByRole('button')
    .first()
    .click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 5')
})

test('RD-P14 reader.noteFilters, RD-P15 reader.exportMd, RD-P16 reader.bulkCards: each waits for its own switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await withHighlight(page)
  const check = async (filters: number, exp: number, bulk: number) => {
    await expect(page.getByRole('group', { name: 'Type' })).toHaveCount(filters)
    await expect(page.getByTestId('export-copy')).toHaveCount(exp)
    await expect(page.getByTestId('make-cards-all')).toHaveCount(bulk)
  }
  await check(0, 0, 0)
  for (const [id, want] of [
    ['reader.noteFilters', [1, 0, 0]],
    ['reader.exportMd', [0, 1, 0]],
    ['reader.bulkCards', [0, 0, 1]],
  ] as const) {
    await setOn(page, [id])
    await openAnnotations(page)
    await expect(page.getByTestId('annotations-panel')).toBeVisible()
    await check(want[0], want[1], want[2])
  }
})

test('RD-P19 reader.inkLook: pen type, opacity and custom colour wait for the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await cycle(
    page,
    'reader.inkLook',
    () => page.getByTestId('reader-ink-type'),
    async () => {
      await page.getByTestId('reader-ink').click()
      await expect(page.getByTestId('reader-ink-bar')).toBeVisible()
    },
  )
})

test('RD-P20 reader.pagesTab: Pages joins the left panel row only with the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  const tabs = page.getByTestId('left-panel')
  const open = async () => {
    if (!(await tabs.isVisible()))
      await page.getByTestId('reader-contents').click()
    await expect(tabs).toBeVisible()
  }
  await open()
  await expect(tabs.getByRole('tab', { name: 'Pages' })).toHaveCount(0)
  await setOn(page, ['reader.pagesTab'])
  await open()
  await expect(tabs.getByRole('tab', { name: 'Pages' })).toBeVisible()
})

test('RD-B42 edge taps turn a paged PDF with a short slide; the middle shows or hides the bars', async ({
  page,
}) => {
  await openBook(page, 'pdf', 'professional')
  await more(page)
  await page.getByTestId('pdf-flow').click()
  await expect(page.getByTestId('pdf-scroller')).toHaveAttribute(
    'data-flow',
    'paged',
  )
  const box = (await page.getByTestId('pdf-scroller').boundingBox())!
  const y = box.y + box.height / 2
  await page.mouse.click(box.x + box.width - 20, y)
  await expect(page.getByTestId('reader-page')).toContainText('Page 2 of 5')
  await expect(page.locator('[data-slide]')).toHaveCount(0, { timeout: 2000 })
  await page.mouse.click(box.x + 20, y)
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 5')
  await page.mouse.click(box.x + box.width / 2, y)
  await expect(page.locator('.rv2-stack')).toHaveClass(/rv2-stack--away/)
  await page.mouse.click(box.x + box.width / 2, y)
  await expect(page.locator('.rv2-stack')).not.toHaveClass(/rv2-stack--away/)
})

test('RD-B45 Find: the ✕ in the field clears it, focus stays, hits clear; Esc closes Find', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await page.getByTestId('reader-find').click()
  const input = page.getByTestId('pdf-find-input')
  await input.fill('page')
  await expect(page.getByTestId('pdf-find-hit').first()).toBeVisible()
  await page.getByRole('button', { name: /clear/i }).first().click()
  await expect(input).toHaveValue('')
  await expect(input).toBeFocused()
  await expect(page.getByTestId('pdf-find-hit')).toHaveCount(0)
  await page.keyboard.press('Escape')
  await expect(input).toHaveCount(0)
})

test('RD-B46 Page Flip: scrub and release changes the page; Back to p. N only with the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf', 'professional')
  await openFlip(page)
  await page.getByTestId('page-flip-slider').fill('3')
  await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 5')
  await expect(page.getByTestId('page-flip-back')).toContainText('Back to p. 1')
})

test('RD-B50 rotating the iPad: bars reflow, nothing is covered, the page is kept', async ({
  page,
}) => {
  await openBook(page, 'pdf', 'professional')
  await openFlip(page)
  await page.getByTestId('page-flip-slider').fill('3')
  for (const vp of [
    { width: 834, height: 1194 },
    { width: 1194, height: 834 },
  ]) {
    await page.setViewportSize(vp)
    await expect(page.getByTestId('reader-page')).toContainText('Page 3 of 5')
    const b = (await page.getByTestId('rv2-reader-bar').boundingBox())!
    expect(b.x).toBeGreaterThanOrEqual(-1)
    expect(b.x + b.width).toBeLessThanOrEqual(vp.width + 1)
    await expect(page.getByTestId('reader-close')).toBeInViewport()
  }
})

test('RD-P34 Settings › Professional features › Reader lists all 32 switches', async ({
  page,
}) => {
  await page.addInitScript((v) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('learning-notes:level', v)
      sessionStorage.setItem('seeded', '1')
    }
  }, BEGINNER([]))
  await page.goto('/?flags=settings.v3#/settings/pro')
  await expect(page.locator('[data-settings-v3]')).toBeVisible()
  await expect(
    page.locator('[data-pro-group="reader"] [data-pro-feature]'),
  ).toHaveCount(32)
})
