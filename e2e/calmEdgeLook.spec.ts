// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, setTheme, typeInEditor } from './helpers.ts'

/**
 * Paper look "B Calm edge" (switch look.calmEdge; owner's pick, 27 Nov 2026).
 * Spec lines proven here:
 * - switch on: <html data-look="calm-edge">; off: no attribute, look as before
 * - light / Night / Sepia: the page area and the paper take their own colours
 * - no shadow: the sheet and page shadow layers draw none; the sheet layer
 *   carries a 1 px hairline instead (on the still layer, not the sheet)
 * - phone: nothing changes (the paper fills the screen)
 */

const SHEET = '[data-paper-sheet="1"]'
const SHADOW = '[data-paper-shadow="1"]'
const MAIN = 'main[data-page-scroller]'
const PAGE_SHADOW = '[data-page-shadow]'

type Look = {
  main: string
  sheet: string
  shadow: string
  shadowBorder: string
  shadowBorderColor: string
  pageShadow: string
  attr: string | null
}

const read = (page: Page): Promise<Look> =>
  page.evaluate(
    ([m, s, sh, ps]) => {
      const cs = (sel: string) => {
        const el = document.querySelector(sel)
        return el ? getComputedStyle(el) : null
      }
      const main = cs(m)
      const sheet = cs(s)
      const shadow = cs(sh)
      const pageShadow = cs(ps)
      return {
        main: main?.backgroundColor ?? '',
        sheet: sheet?.backgroundColor ?? '',
        shadow: shadow?.boxShadow ?? '',
        shadowBorder: shadow
          ? `${shadow.borderTopWidth} ${shadow.borderTopStyle}`
          : '',
        shadowBorderColor: shadow?.borderTopColor ?? '',
        pageShadow: pageShadow?.boxShadow ?? '',
        attr: document.documentElement.getAttribute('data-look'),
      }
    },
    [MAIN, SHEET, SHADOW, PAGE_SHADOW],
  )

async function openPaper(
  page: Page,
  url: string,
  name: string,
  notebook = 'Paper',
) {
  await page.goto(url)
  await createNotebook(page, notebook, name)
  await typeInEditor(page, 'Calm edge text')
}

test.describe('wide screen', () => {
  test.skip(
    ({ viewport }) => (viewport?.width ?? 1336) < 640,
    'the sheets only show on a wide screen',
  )

  test('switch on: page area, paper and hairline in light, Night and Sepia; no shadow', async ({
    page,
  }) => {
    await openPaper(page, '/?flags=look.calmEdge', 'Calm on')
    await expect(page.locator(SHEET)).toBeVisible()
    await expect(page.locator(SHADOW)).toBeAttached()

    const themes: [string | null, string, string, string][] = [
      [
        null,
        'rgb(239, 238, 244)',
        'rgb(255, 255, 255)',
        'rgba(105, 65, 224, 0.2)',
      ],
      [
        'Night',
        'rgb(18, 18, 24)',
        'rgb(28, 28, 36)',
        'rgba(160, 140, 255, 0.26)',
      ],
      [
        'Sepia',
        'rgb(235, 224, 200)',
        'rgb(248, 241, 227)',
        'rgba(140, 100, 40, 0.28)',
      ],
    ]
    for (const [theme, main, sheet, edge] of themes) {
      if (theme) await setTheme(page, theme)
      await expect
        .poll(() => read(page), { message: theme ?? 'light' })
        .toMatchObject({
          attr: 'calm-edge',
          main,
          sheet,
          shadow: 'none',
          shadowBorder: '1px solid',
          shadowBorderColor: edge,
          pageShadow: 'none',
        })
    }
  })

  test('switch off: no attribute, and the look is as before (shadow kept, no grey page area)', async ({
    page,
  }) => {
    await openPaper(page, '/', 'Calm off')
    await expect(page.locator(SHEET)).toBeVisible()
    const look = await read(page)
    expect(look.attr).toBeNull()
    expect(look.shadow).not.toBe('none')
    expect(look.shadowBorder).not.toBe('1px solid')
    expect(look.main).not.toBe('rgb(239, 238, 244)')
  })
})

test.describe('phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('switch on, phone: the attribute is set but nothing on the page changes', async ({
    page,
  }) => {
    await openPaper(page, '/', 'Calm phone off')
    await expect(page.locator('[data-paper]')).toBeVisible()
    const before = await read(page)
    expect(before.attr).toBeNull()

    await openPaper(
      page,
      '/?flags=look.calmEdge',
      'Calm phone on',
      'Paper two', // a second notebook in the same storage needs its own name
    )
    await expect(page.locator('[data-paper]')).toBeVisible()
    const after = await read(page)
    expect(after.attr).toBe('calm-edge')
    expect(after.main).toBe(before.main)
    expect(after.pageShadow).toBe(before.pageShadow)
    await expect(page.locator(SHEET)).toHaveCount(0)
  })
})
