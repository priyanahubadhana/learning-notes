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
  await page.goto('/?flags=toolbar.v8,toolbar.menu,page.menus')
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
    name: 'the More list',
    tap: '[data-testid="v8-more"]',
    appear: '[data-testid="v8-card-fold.bar"]',
    min: 2,
  },
]

for (const c of cases)
  test(`R13: ${c.name} paints within ${LIMIT_MS} ms of the tap`, async ({
    page,
  }) => {
    await open(page)
    if (c.select) await page.keyboard.press('ControlOrMeta+a')
    if (c.before) {
      await page.getByTestId(c.before).click()
      await page.waitForTimeout(1500)
    }
    const ms = await tapToPaint(page, c.tap, c.appear, c.min)
    expect(ms).toBeLessThan(LIMIT_MS)
  })
