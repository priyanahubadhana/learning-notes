import { expect, test, type Page } from '@playwright/test'
import { createNotebook, sidebar } from './helpers.ts'

/**
 * Notebooks home v2 on touch screens (slice 4): an iPad in portrait and a
 * phone. A finger held 0.5 s on a cover opens the strip (NB-B08); a finger
 * that moves away does not; the Pencil never does; targets are 44 px tall.
 */
const FLAG = '/?flags=notebooks.v2'
const SCREENS = {
  'iPad portrait': { width: 834, height: 1194 },
  phone: { width: 390, height: 844 },
} as const

for (const [name, viewport] of Object.entries(SCREENS)) {
  test.describe(name, () => {
    test.use({ viewport, hasTouch: true })

    async function openHome(page: Page) {
      // The notebook is made on a wide screen (the helper's naming flow is
      // built for it), then the screen shrinks to the touch size.
      await page.setViewportSize({ width: 1336, height: 720 })
      await page.goto(FLAG)
      await sidebar(page).waitFor({ state: 'attached' })
      await createNotebook(page, 'Alpha book', 'A page')
      await page.setViewportSize(viewport)
      await page.reload()
      await sidebar(page).waitFor({ state: 'attached' })
      const home = page.getByTestId('notebooks-home')
      const rail = page.locator('[data-space="notebooks"]')
      await rail.click()
      if (!(await home.isVisible())) {
        await page.keyboard.press('Escape')
        await rail.click()
      }
      await expect(home).toBeVisible()
      return home
    }

    /** A pointer sequence with the given pointer type, held for `ms`. */
    async function press(
      page: Page,
      selector: string,
      pointerType: 'touch' | 'pen',
      ms: number,
      moveBy = 0,
    ) {
      await page.evaluate(
        async ([sel, type, hold, move]) => {
          const el = document.querySelector(sel as string)
          if (!el) throw new Error('no element')
          const r = el.getBoundingClientRect()
          const x = r.left + r.width / 2
          const y = r.top + r.height / 3
          const init = (px: number) => ({
            bubbles: true,
            cancelable: true,
            composed: true,
            pointerId: 7,
            pointerType: type as string,
            isPrimary: true,
            clientX: px,
            clientY: y,
          })
          el.dispatchEvent(new PointerEvent('pointerdown', init(x)))
          if (move)
            el.dispatchEvent(
              new PointerEvent('pointermove', init(x + (move as number))),
            )
          await new Promise((res) => setTimeout(res, hold as number))
          el.dispatchEvent(new PointerEvent('pointerup', init(x)))
        },
        [selector, pointerType, ms, moveBy] as const,
      )
    }

    test('NB-B08 a finger held on a cover opens the strip; the tap that follows does not open the notebook', async ({
      page,
    }) => {
      const home = await openHome(page)
      await press(page, '[data-notebook-card] button', 'touch', 650)
      await expect(page.getByTestId('nbv2-strip')).toBeVisible()
      await expect(home).toBeVisible()
    })

    test('NB-B08 a finger that moves away does not open the strip', async ({
      page,
    }) => {
      const home = await openHome(page)
      await press(page, '[data-notebook-card] button', 'touch', 650, 40)
      await expect(page.getByTestId('nbv2-strip')).toHaveCount(0)
      await expect(home).toBeVisible()
    })

    test('the Pencil held on a cover does not open the strip (it draws and taps)', async ({
      page,
    }) => {
      const home = await openHome(page)
      await press(page, '[data-notebook-card] button', 'pen', 650)
      await expect(page.getByTestId('nbv2-strip')).toHaveCount(0)
      await expect(home).toBeVisible()
    })

    test('targets on the home are at least 44 px tall on touch', async ({
      page,
    }) => {
      const home = await openHome(page)
      for (const loc of [
        home.getByTestId('nbh-new'),
        home.locator('[data-layout="shelf"]'),
        home.getByRole('tab', { name: 'Starred' }),
        home.getByRole('button', { name: /^Pin Alpha book/ }),
        home.getByRole('button', { name: /^More actions for Alpha book/ }),
      ]) {
        const box = await loc.boundingBox()
        expect(box?.height ?? 0).toBeGreaterThanOrEqual(43.5)
      }
    })
  })
}
