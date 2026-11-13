// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import type { Page } from '@playwright/test'
import { expect, test } from './fixtures/readerReady.ts'
import { makeEpub, makePdf } from './fixtures/books.ts'

/**
 * Slice 7i (reader v2): RD-P17, RD-P21, RD-P25 to RD-P29, RD-P31 and the
 * "Coming later" lines of RD-P34. Real clicks and taps only. Flag reader.v2.
 */
test.use({ viewport: { width: 1200, height: 900 } })

const BEGINNER = (on: string[]) =>
  JSON.stringify({ level: 'beginner', unlocked: on })

async function openBook(
  page: Page,
  kind: 'pdf' | 'epub',
  on: string[] = [],
  pages = 5,
) {
  await page.addInitScript((v) => {
    if (localStorage.getItem('e2e.seeded')) return
    localStorage.setItem('e2e.seeded', '1')
    localStorage.setItem('learning-notes:level', v)
  }, BEGINNER(on))
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
            Array.from({ length: pages }, (_, i) => `Page ${i + 1} words here`),
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

async function setOn(page: Page, on: string[]) {
  await page.evaluate(
    (v) => localStorage.setItem('learning-notes:level', v),
    BEGINNER(on),
  )
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
}

const aaMore = async (page: Page) => {
  await page.getByTestId('reader-aa').click()
  await expect(page.getByTestId('aa-sheet')).toBeVisible()
  await page.getByTestId('aa-tab-more').click()
}

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

async function openAnnotations(page: Page) {
  const panel = page.getByTestId('annotations-panel')
  if (await panel.isVisible()) return
  const btn = page.getByTestId('reader-annotations')
  if (await btn.isVisible()) await btn.click()
  else {
    await page.getByTestId('reader-more').click()
    await page.getByTestId('reader-annotations-card').click()
  }
  await expect(panel).toBeVisible()
}

test('RD-P17 reader.dailyHighlight: an old highlight of this book tops Annotations; a tap jumps', async ({
  page,
}) => {
  await openBook(page, 'pdf', ['reader.dailyHighlight'])
  await selectText(page)
  await page.getByTestId('hl-yellow').click()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
  await page.getByTestId('pdf-scroller').evaluate((el) => {
    el.scrollTop = el.scrollHeight
  })
  await expect(page.getByTestId('reader-page')).not.toContainText('Page 1 of')
  // A short scroll up brings the bar back.
  await page.getByTestId('pdf-scroller').evaluate((el) => {
    el.scrollTop -= 60
  })
  await openAnnotations(page)
  const panel = page.getByTestId('annotations-panel')
  const daily = panel.getByTestId('book-daily-highlight')
  await expect(daily).toBeVisible()
  // At the top of the tab.
  const first = panel.locator(':scope > *').first()
  await expect(first).toHaveAttribute('data-testid', 'book-daily-highlight')
  await daily.getByTestId('daily-item').getByRole('button').first().click()
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 5')
  // Switch off: gone.
  await setOn(page, [])
  await openAnnotations(page)
  await expect(page.getByTestId('book-daily-highlight')).toHaveCount(0)
})

test('RD-P21 reader.resourcesTab: the Audio tab can be added only with the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  const openPanel = async () => {
    const hide = page.getByRole('button', { name: 'Hide menu' })
    if (await hide.isVisible()) await hide.click()
    if (!(await page.getByTestId('left-panel').isVisible()))
      await page.getByTestId('panel-toggle').click()
    await expect(page.getByTestId('left-panel')).toBeVisible()
  }
  await openPanel()
  await page.getByTestId('tabrow-plus').click()
  await expect(
    page.getByRole('menuitem', { name: 'Add a tab: Audio' }),
  ).toHaveCount(0)
  await page.keyboard.press('Escape')
  await setOn(page, ['reader.resourcesTab'])
  await openPanel()
  await page.getByTestId('tabrow-plus').click()
  await page.getByRole('menuitem', { name: 'Add a tab: Audio' }).click()
  const tab = page.getByTestId('left-panel').getByRole('tab', { name: 'Audio' })
  await tab.click()
  await expect(tab).toHaveAttribute('aria-selected', 'true')
})

async function doubleTap(page: Page) {
  const box = (await page.getByTestId('pdf-scroller').boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.click(x, y)
  await page.mouse.click(x, y)
}

test('RD-P25 reader.gestures: double-tap zoom only with the switch', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 5')
  await doubleTap(page)
  await page.waitForTimeout(500)
  await expect(page.getByTestId('zoom-preview')).toHaveCount(0)
  await setOn(page, ['reader.gestures'])
  await expect(page.getByTestId('reader-page')).toContainText('of 5')
  await doubleTap(page)
  await expect(page.getByTestId('zoom-preview')).toBeVisible()
  await doubleTap(page)
  await expect(page.getByTestId('zoom-preview')).toHaveCount(0)
})

test('RD-P26 reader.barScroll: "Keep the bar visible" stops the hide on scroll; the choice is kept', async ({
  page,
}) => {
  await openBook(page, 'pdf', [], 12)
  const stack = page.getByTestId('rv2-stack')
  const scroller = page.getByTestId('pdf-scroller')
  await expect(page.getByTestId('reader-page')).toContainText('Page 1 of 12')
  await expect(page.locator('[data-bars-ready]')).toHaveCount(1)
  const scrollTo = (y: number) =>
    scroller.evaluate((el, top) => {
      el.scrollTop = top
    }, y)
  // No switch: no row.
  await aaMore(page)
  await expect(page.getByTestId('aa-keep-bar')).toHaveCount(0)
  await page.getByTestId('aa-close').click()
  await setOn(page, ['reader.barScroll'])
  await expect(page.locator('[data-bars-ready]')).toHaveCount(1)
  await aaMore(page)
  await expect(page.getByTestId('aa-bar-screen')).toBeVisible()
  await page.getByTestId('aa-keep-bar').check()
  await page.getByTestId('aa-close').click()
  await scrollTo(5)
  await scrollTo(400)
  await page.waitForTimeout(300)
  await expect(stack).not.toHaveClass(/rv2-stack--away/)
  // Switch off: the bar hides again; the choice is kept for later.
  await setOn(page, [])
  await expect(page.locator('[data-bars-ready]')).toHaveCount(1)
  await scrollTo(5)
  await scrollTo(400)
  await expect(stack).toHaveClass(/rv2-stack--away/)
  await setOn(page, ['reader.barScroll'])
  await aaMore(page)
  await expect(page.getByTestId('aa-keep-bar')).toBeChecked()
})

test('RD-P27 reader.lockDirection: Portrait or Landscape in Aa; a toast helps when refused', async ({
  page,
}) => {
  // A browser that refuses the lock (as the iPad does).
  await page.addInitScript(() => {
    const w = window as unknown as { lockAsks: string[] }
    w.lockAsks = []
    // The whole orientation object is replaced: WebKit hands out a new one
    // on every read and has no lock, so patching it would be lost.
    Object.defineProperty(screen, 'orientation', {
      configurable: true,
      value: {
        lock: async (o: string) => {
          w.lockAsks.push(o)
          throw new DOMException('refused', 'NotSupportedError')
        },
        unlock: () => {},
      },
    })
  })
  await openBook(page, 'pdf')
  await aaMore(page)
  await expect(page.getByTestId('aa-dir-portrait')).toHaveCount(0)
  await page.getByTestId('aa-close').click()
  await setOn(page, ['reader.lockDirection'])
  await aaMore(page)
  await page.getByTestId('aa-dir-portrait').click()
  await expect(page.getByTestId('aa-dir-portrait')).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { lockAsks: string[] }).lockAsks,
      ),
    )
    .toContain('portrait')
  await expect(page.getByText(/rotation lock/)).toBeVisible()
  await setOn(page, [])
  await aaMore(page)
  await expect(page.getByTestId('aa-dir-portrait')).toHaveCount(0)
})

test('RD-P28 reader.liquid: a greyed "Liquid mode (beta)" row, Coming later, PDF only', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await aaMore(page)
  await expect(page.getByTestId('aa-liquid')).toHaveCount(0)
  await page.getByTestId('aa-close').click()
  await setOn(page, ['reader.liquid'])
  await aaMore(page)
  const row = page.getByTestId('aa-liquid')
  await expect(row).toBeVisible()
  await expect(row).toHaveAttribute('aria-disabled', 'true')
  await expect(row).toContainText('Liquid mode (beta)')
  await expect(row).toContainText('Coming later')
  await expect(row.locator('button, input')).toHaveCount(0)
})

test('RD-P28 reader.liquid: no Liquid row for an EPUB', async ({ page }) => {
  await openBook(page, 'epub', ['reader.liquid'])
  await aaMore(page)
  await expect(page.getByTestId('aa-tab-more')).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(page.getByTestId('aa-liquid')).toHaveCount(0)
})

test('RD-P29 reader.lineFocus: Line focus or Ruler in Aa › Reading aids; follows the mouse and Alt+↓ (PDF)', async ({
  page,
}) => {
  await openBook(page, 'pdf')
  await aaMore(page)
  await expect(page.getByTestId('aa-ruler-focus')).toHaveCount(0)
  await page.getByTestId('aa-close').click()
  await setOn(page, ['reader.lineFocus'])
  await aaMore(page)
  await expect(page.getByTestId('aa-aids')).toBeVisible()
  await page.getByTestId('aa-ruler-ruler').click()
  await page.getByTestId('aa-close').click()
  const ruler = page.getByTestId('reading-ruler')
  await expect(ruler).toHaveAttribute('data-mode', 'ruler')
  await page.mouse.move(600, 500)
  const at = async () => (await ruler.boundingBox())!.y
  const y1 = await at()
  await page.keyboard.press('Alt+ArrowDown')
  await expect.poll(at).toBeGreaterThan(y1)
  // It never takes a tap.
  await expect(ruler).toHaveCSS('pointer-events', 'none')
  await setOn(page, [])
  await expect(page.getByTestId('reading-ruler')).toHaveCount(0)
})

test('RD-P29 reader.lineFocus: in an EPUB, a tap inside the book frame moves the band', async ({
  page,
  browserName,
}) => {
  test.skip(
    browserName === 'webkit',
    'WebKit refuses the EPUB blob frame under the app CSP (frame-ancestors), so the frame stays empty and there is no book text to tap; runs on Chromium. Logged as a possible Safari EPUB bug.',
  )
  await openBook(page, 'epub', ['reader.lineFocus'])
  await aaMore(page)
  await page.getByTestId('aa-ruler-ruler').click()
  await page.getByTestId('aa-close').click()
  const ruler = page.getByTestId('reading-ruler')
  await expect(ruler).toHaveAttribute('data-mode', 'ruler')
  // The book's frame (foliate keeps it in a shadow root).
  let fb: { x: number; y: number; width: number; height: number } | null = null
  await expect
    .poll(
      async () => {
        for (const f of page.frames()) {
          if (f === page.mainFrame()) continue
          const box = await f
            .evaluate(() => {
              if (!document.body?.innerText.includes('quick brown fox'))
                return null
              const r = window.frameElement!.getBoundingClientRect()
              return { x: r.x, y: r.y, width: r.width, height: r.height }
            })
            .catch(() => null)
          if (box) fb = box
        }
        return !!fb
      },
      { timeout: 15_000 },
    )
    .toBe(true)
  const at = fb!
  const mid = async () => {
    const b = (await ruler.boundingBox())!
    return b.y + b.height / 2
  }
  const vh = page.viewportSize()!.height
  const y1 = Math.max(at.y + 20, 200)
  const y2 = Math.min(at.y + at.height - 20, vh - 120)
  await page.mouse.click(at.x + at.width / 2, y1)
  await expect.poll(mid).toBeLessThan(y1 + 10)
  await page.mouse.click(at.x + at.width / 2, y2)
  await expect.poll(mid).toBeGreaterThan(y2 - 10)
  // A tap is passed through: the band never takes it.
  await expect(ruler).toHaveCSS('pointer-events', 'none')
})

test('RD-P31 reader.keepAwake: "Keep the screen awake" asks for the wake lock only with the switch', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const w = window as unknown as { wakeCalls: number }
    w.wakeCalls = 0
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: {
        request: async () => {
          w.wakeCalls++
          return {
            released: false,
            release: async () => {},
            addEventListener() {},
          }
        },
      },
    })
  })
  const calls = () =>
    page.evaluate(() => (window as unknown as { wakeCalls: number }).wakeCalls)
  await openBook(page, 'pdf')
  await page.waitForTimeout(500)
  expect(await calls()).toBe(0)
  await aaMore(page)
  await expect(page.getByTestId('aa-awake')).toHaveCount(0)
  await page.getByTestId('aa-close').click()
  await setOn(page, ['reader.keepAwake'])
  await expect.poll(calls).toBeGreaterThan(0)
  await aaMore(page)
  await expect(page.getByTestId('aa-awake')).toBeChecked()
  await page.getByTestId('aa-awake').uncheck()
  await page.reload()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  await page.waitForTimeout(500)
  expect(await calls()).toBe(0)
})

test('RD-P34 reader.liquid and reader.tapCounts carry "Coming later" in Settings', async ({
  page,
}) => {
  await page.addInitScript((v) => {
    if (!sessionStorage.getItem('seeded')) {
      localStorage.setItem('learning-notes:level', v)
      sessionStorage.setItem('seeded', '1')
    }
  }, BEGINNER([]))
  await page.goto('/?flags=settings.v3#/settings/pro')
  const later = page.locator(
    '[data-pro-group="reader"] [data-pro-feature]:has([data-coming-later])',
  )
  await expect(later).toHaveCount(2)
  for (const id of ['reader.liquid', 'reader.tapCounts'])
    await expect(
      page.locator(`[data-pro-feature="${id}"] [data-coming-later]`),
    ).toHaveText('Coming later')
})

test('RD-P34 gate 3 fix 8: Coming later switches stay off and disabled, even when unlocked', async ({
  page,
}) => {
  await page.addInitScript(
    (v) => {
      if (!sessionStorage.getItem('seeded')) {
        localStorage.setItem('learning-notes:level', v)
        sessionStorage.setItem('seeded', '1')
      }
    },
    BEGINNER(['reader.liquid', 'reader.tapCounts']),
  )
  await page.goto('/?flags=settings.v3#/settings/pro')
  for (const id of ['reader.liquid', 'reader.tapCounts']) {
    const sw = page.locator(`[data-pro-feature="${id}"] [role="switch"]`)
    await expect(sw).toHaveAttribute('aria-checked', 'false')
    await expect(sw).toBeDisabled()
  }
})

test('gate 3 fix 1: the Aa More tab uses the shared switch, no browser checkbox', async ({
  page,
}) => {
  await openBook(page, 'pdf', ['reader.barScroll', 'reader.keepAwake'])
  await aaMore(page)
  await expect(page.getByTestId('aa-keep-bar')).toHaveAttribute(
    'role',
    'switch',
  )
  await expect(page.getByTestId('aa-awake')).toHaveAttribute('role', 'switch')
  await expect(page.locator('input[type="checkbox"]')).toHaveCount(0)
})
