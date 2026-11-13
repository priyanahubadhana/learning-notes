import { expect, test, type Page } from '@playwright/test'
import {
  dbTitles,
  openById,
  panel,
  row,
  seedNotebook,
  start,
} from './notebooksV2PanelHelpers.ts'

/**
 * Left panel v2 on touch screens (slice 4, flag notebooks.v2): an iPad in
 * landscape (docked panel), an iPad in portrait and a phone (a left drawer,
 * 86 vw, over a scrim). A finger held 0.5 s on a thumbnail opens the Context
 * strip; held 0.3 s and dragged it lifts the page; every floating bar stays
 * fully on screen; targets are at least 44 px.
 */
const SCREENS = {
  'iPad landscape': { width: 1180, height: 820 },
  'iPad portrait': { width: 834, height: 1194 },
  phone: { width: 390, height: 844 },
} as const

const BOOK = 'Touch book'
const FIRST = 'Page 01'

for (const [name, viewport] of Object.entries(SCREENS)) {
  test.describe(name, () => {
    test.use({ viewport, hasTouch: true })
    const drawer = viewport.width < 1024

    async function ready(page: Page, unlocked: string[] = []) {
      // The notebook is made on a wide screen (the helper's naming flow is
      // built for it), then the screen shrinks to the touch size.
      await page.setViewportSize({ width: 1336, height: 720 })
      await start(page, { unlocked })
      const ids = await seedNotebook(
        page,
        BOOK,
        FIRST,
        Array.from({ length: 5 }, (_, i) => ({
          title: `Page 0${i + 2}`,
          lines: ['one', 'two', 'three'],
        })),
      )
      await page.setViewportSize(viewport)
      await openById(page, ids[FIRST])
      await openPanelTouch(page)
      return ids
    }

    async function openPanelTouch(page: Page) {
      const toggle = page.getByTestId('panel-toggle')
      if ((await toggle.getAttribute('aria-pressed')) !== 'true')
        await toggle.tap()
      await expect(panel(page)).toBeVisible()
      await expect(page.getByTestId('lpv2-page').first()).toBeVisible()
    }

    /** A touch press on `selector`'s centre, held `ms`, then dragged `dy` px in small steps. */
    async function touch(page: Page, selector: string, ms: number, dy = 0) {
      await page.evaluate(
        async ([sel, hold, move]) => {
          const el = document.querySelector(sel as string)
          if (!el) throw new Error('no element')
          const r = el.getBoundingClientRect()
          const x = r.left + r.width / 2
          const y = r.top + r.height / 2
          const init = (py: number) => ({
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 11,
            pointerType: 'touch',
            isPrimary: true,
            clientX: x,
            clientY: py,
            button: 0,
            buttons: 1,
          })
          el.dispatchEvent(new PointerEvent('pointerdown', init(y)))
          await new Promise((res) => setTimeout(res, hold as number))
          const steps = 10
          for (let i = 1; i <= steps && (move as number) !== 0; i++) {
            el.dispatchEvent(
              new PointerEvent(
                'pointermove',
                init(y + ((move as number) * i) / steps),
              ),
            )
            await new Promise((res) => setTimeout(res, 25))
          }
          el.dispatchEvent(
            new PointerEvent('pointerup', {
              ...init(y + (move as number)),
              buttons: 0,
            }),
          )
        },
        [selector, ms, dy] as const,
      )
    }

    test('NB-B40 / NB-B52 the same tabs; a drawer (86 vw, with a scrim) on narrow screens, docked on wide ones', async ({
      page,
    }) => {
      await ready(page)
      await expect(panel(page).getByRole('tab')).toHaveText([
        'Pages',
        'Outline',
        'Resources',
      ])
      // The drawer finishes sliding in before it is measured.
      await panel(page).evaluate((el) =>
        Promise.all(el.getAnimations().map((a) => a.finished)),
      )
      const box = (await panel(page).boundingBox())!
      // Fully on screen.
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height + 1)
      if (drawer) {
        const expected = Math.min(viewport.width * 0.86, 340)
        expect(Math.abs(box.width - expected)).toBeLessThan(2)
        await expect(page.locator('.lpv2-scrim')).toBeVisible()
        // The first tap outside only closes it.
        await page.touchscreen.tap(viewport.width - 8, viewport.height / 2)
        await expect(panel(page)).toBeHidden()
      } else {
        expect(Math.round(box.width)).toBe(264)
      }
    })

    test('NB-B52 Esc closes the drawer (it keeps no other overlay open)', async ({
      page,
    }) => {
      test.skip(!drawer, 'the docked panel has no drawer')
      await ready(page)
      await page.keyboard.press('Escape')
      await expect(panel(page)).toBeHidden()
    })

    test('a tap on a thumbnail opens the page (the drawer closes after it)', async ({
      page,
    }) => {
      await ready(page)
      await row(page, 'Page 03').tap()
      await expect(
        page.getByRole('textbox', { name: 'Page title' }),
      ).toHaveValue('Page 03')
      if (drawer) await expect(panel(page)).toBeHidden()
      else await expect(panel(page)).toBeVisible()
    })

    test('a finger held 0.5 s on a thumbnail opens the Context strip, fully on screen', async ({
      page,
    }) => {
      await ready(page)
      await touch(
        page,
        '[data-testid="lpv2-page"][data-page-id="seed-page-0"]',
        650,
      )
      const strip = page.getByTestId('lpv2-strip')
      await expect(strip).toBeVisible()
      const box = (await strip.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      for (const b of await strip.getByRole('menuitem').all()) {
        const bb = (await b.boundingBox())!
        expect(bb.height).toBeGreaterThanOrEqual(43)
      }
      // The press that opened it is not a drag: nothing moved.
      expect(await dbTitles(page, BOOK)).toEqual([
        'Page 01',
        'Page 02',
        'Page 03',
        'Page 04',
        'Page 05',
        'Page 06',
      ])
    })

    test('a finger that moves before 0.3 s scrolls and opens nothing', async ({
      page,
    }) => {
      await ready(page)
      await touch(
        page,
        '[data-testid="lpv2-page"][data-page-id="seed-page-0"]',
        0,
        40,
      )
      await expect(page.getByTestId('lpv2-strip')).toHaveCount(0)
      await expect(page.getByTestId('drop-line')).toHaveCount(0)
    })

    test('NB-B43 held 0.3 s and dragged, a thumbnail lifts, a drop-line shows and the drop saves', async ({
      page,
    }) => {
      await ready(page)
      const h = (await row(page, 'Page 02').boundingBox())!
      await touch(
        page,
        '[data-testid="lpv2-page"][data-page-id="seed-page-0"]',
        380,
        h.height * 2.2,
      )
      await expect
        .poll(() => dbTitles(page, BOOK))
        .toEqual([
          'Page 01',
          'Page 03',
          'Page 04',
          'Page 02',
          'Page 05',
          'Page 06',
        ])
      await expect(page.locator('[data-toast]')).toContainText(
        'Page order changed',
      )
    })

    test('Organise: the Object bar and its buttons stay on screen with 44 px targets', async ({
      page,
    }) => {
      await ready(page)
      await panel(page).getByTestId('lpv2-organise').tap()
      const bar = page.getByTestId('object-bar')
      await expect(bar).toBeVisible()
      const box = (await bar.boundingBox())!
      expect(box.x).toBeGreaterThanOrEqual(0)
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width)
      expect(box.y).toBeGreaterThanOrEqual(0)
      expect(box.y + box.height).toBeLessThanOrEqual(viewport.height)
      for (const b of await bar.getByRole('button').all()) {
        const bb = (await b.boundingBox())!
        expect(bb.height).toBeGreaterThanOrEqual(43)
        expect(bb.width).toBeGreaterThanOrEqual(43)
      }
      await row(page, 'Page 03').tap()
      await expect(panel(page).getByText('1 page picked')).toBeVisible()
    })

    test('NB-P42 the grip (nb.dragGrip) drags with a finger at once', async ({
      page,
    }) => {
      await ready(page, ['nb.dragGrip'])
      const h = (await row(page, 'Page 02').boundingBox())!
      await touch(
        page,
        '[data-testid="lpv2-page"][data-page-id="seed-page-0"] [data-reorder-grip]',
        0,
        h.height * 1.6,
      )
      await expect
        .poll(() => dbTitles(page, BOOK))
        .toEqual([
          'Page 01',
          'Page 03',
          'Page 02',
          'Page 04',
          'Page 05',
          'Page 06',
        ])
    })
  })
}
