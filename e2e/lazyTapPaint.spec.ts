/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/**
 * R13: React 19 holds a suspended lazy part back for up to 300 ms, so a bar,
 * menu or card that comes from a lazy part showed late after a tap. Each case
 * opens the app fresh, waits a moment (the page is open, as a person's is),
 * taps once and measures tap to first paint of the part's content.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

const LIMIT_MS = 150
/**
 * The iPad stand-in (headless WebKit on a PC) needs about 160 to 190 ms for
 * even a part that is not lazy (the Text card), so it gets 250 ms. The held
 * back version measured 330 to 370 ms there, so the test still tells them apart.
 */
const LIMIT_WEBKIT_MS = 250

/** Taps `tap` and returns the ms until `appear` (a selector) has `min` visible buttons-or-itself. */
async function tapToPaint(page: Page, tap: string, appear: string, min = 1) {
  const timing = page.evaluate(
    ([sel, want, n]) =>
      new Promise<number>((done) => {
        let t0 = 0
        document.addEventListener(
          'pointerdown',
          () => {
            t0 = performance.now()
            const look = () => {
              const el = document.querySelector(want)
              const count = el
                ? el.querySelectorAll('button:not([data-popup-close])').length
                : 0
              const shown = el && el.getBoundingClientRect().height > 0
              if (shown && (count >= n || (n === 0 && shown)))
                done(performance.now() - t0)
              else requestAnimationFrame(look)
            }
            look()
          },
          { once: true, capture: true },
        )
        void sel
      }),
    [tap, appear, min] as const,
  )
  await page.locator(tap).click()
  return timing
}

async function open(page: Page) {
  await startInMode(page, 'touch')
  await page.goto('/?flags=foundation.shell,toolbar.v8,toolbar.menu,page.menus')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.waitForTimeout(2500) // the page has been open a while
}

const cases: {
  name: string
  select?: boolean
  before?: string
  tap: string
  appear: string
  min?: number
}[] = [
  {
    name: 'the Text format card',
    before: 'v8-tool-text',
    tap: '[data-testid="v8-chip-text.format"]',
    appear: '[data-testid="v8-card-text.format"]',
    min: 2,
  },
  {
    name: 'the Eraser card',
    before: 'v8-tool-eraser',
    tap: '[data-testid="v8-chip-eraser.mode"]',
    appear: '[data-testid="v8-card-eraser.mode"]',
    min: 2,
  },
  {
    name: 'the Shapes card',
    before: 'v8-tool-shapes',
    tap: '[data-testid="v8-chip-shapes.shape"]',
    appear: '[data-testid="v8-card-shapes.shape"]',
    min: 2,
  },
  {
    name: 'the Lasso selection bar',
    select: true,
    tap: '[data-testid="v8-tool-lasso"]',
    appear: '[data-testid="v8-selbar"]',
    min: 1,
  },
  {
    name: 'the Insert card',
    tap: '[data-testid="v8-tool-insert"]',
    appear: '[data-testid="v8-insert"]',
    min: 2,
  },
  {
    name: 'the page More options sheet',
    tap: '[aria-label="More options"]',
    appear: '[data-testid="page-sheet"]',
    min: 2,
  },
  {
    name: 'the Name it sheet',
    tap: '[aria-label="New notebook"]',
    appear: '[data-testid="name-sheet"]',
    min: 0,
  },
  {
    name: 'the More list',
    tap: '[data-testid="v8-more"]',
    appear: '[data-testid="v8-card-fold.bar"]',
    min: 2,
  },
]

for (const c of cases)
  test(`R13: ${c.name} paints within ${LIMIT_MS} ms of the tap`, async ({
    browser,
    page,
  }, testInfo) => {
    const limit = testInfo.project.name.includes('webkit')
      ? LIMIT_WEBKIT_MS
      : LIMIT_MS
    // One fresh open of the whole app, the case's tap, and the ms to paint (the chunk is
    // fetched on the first tap only, so each try needs its own browser context).
    const once = async (p: Page) => {
      await open(p)
      if (c.select) await p.keyboard.press('ControlOrMeta+a')
      if (c.before) {
        await p.getByTestId(c.before).click()
        await p.waitForTimeout(1500)
      }
      return tapToPaint(p, c.tap, c.appear, c.min)
    }
    // Three fresh opens, the median against the limit. A busy machine can stall one open by a
    // few frames; a slowdown that comes back one time in three still moves the median, a real
    // one fails it.
    const tries = [await once(page)]
    for (let attempt = 1; attempt < 3; attempt++) {
      // The same options as this file's test.use (a new context gets the project's otherwise).
      const ctx = await browser.newContext({
        ...testInfo.project.use,
        viewport: { width: 1180, height: 820 },
        hasTouch: true,
      })
      try {
        tries.push(await once(await ctx.newPage()))
      } finally {
        await ctx.close()
      }
    }
    const ms = [...tries].sort((x, y) => x - y)[1]
    test.info().annotations.push({
      type: 'tap to paint (ms)',
      description: tries.map(Math.round).join(', '),
    })
    expect(ms).toBeLessThan(limit)
  })

// With foundation.shell OFF the live app loads as before: nothing is fetched ahead.
for (const [flags, ahead] of [
  ['toolbar.v8,toolbar.menu,page.menus', false],
  ['foundation.shell,toolbar.v8,toolbar.menu,page.menus', true],
] as const)
  test(`R13: the cards are fetched ahead only with foundation.shell (${ahead ? 'on' : 'off'})`, async ({
    page,
  }) => {
    const asked: string[] = []
    page.on('request', (r) => {
      if (/EraserCards|ShapesCards|InsertCards|PageSheet/.test(r.url()))
        asked.push(r.url())
    })
    await startInMode(page, 'touch')
    await page.goto(`/?flags=${flags}`)
    await createNotebook(page, 'Biology', 'First')
    await typeInEditor(page, 'The nucleus holds the DNA')
    await page.waitForTimeout(3000)
    expect(asked.length > 0).toBe(ahead)
  })
