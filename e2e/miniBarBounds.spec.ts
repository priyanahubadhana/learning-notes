import { expect, test, type Page } from '@playwright/test'
import { openNote } from './mainBarHelpers.ts'

/**
 * BUG-002: the floating format bar (the mini bar) never leaves the screen,
 * wherever the selected word is, at every iPad and phone size, after turning
 * the screen, with the Aa pop-up open and with the keyboard's short window.
 */

test.use({ hasTouch: true })

const SIZES = [
  { width: 1024, height: 768 },
  { width: 768, height: 1024 },
  { width: 1180, height: 820 },
  { width: 820, height: 1180 },
  { width: 390, height: 844 },
  { width: 844, height: 390 },
]

const mini = (page: Page) => page.locator('[data-mini-toolbar]')

async function tap(page: Page, at: { x: number; y: number }) {
  await page.evaluate((a) => {
    const make = (name: string) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 9,
        clientX: a.x,
        clientY: a.y,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        button: 0,
        buttons: name === 'pointerup' ? 0 : 1,
      })
    const el = document.elementFromPoint(a.x, a.y)!
    el.dispatchEvent(make('pointerdown'))
    el.dispatchEvent(make('pointerup'))
  }, at)
}

/** Selects the nth word of the page the way the pen does: a double tap. */
async function selectWordAt(page: Page, align: 'left' | 'right') {
  await page.evaluate((a) => {
    const p = document.querySelector<HTMLElement>(
      '.bn-editor [data-content-type="paragraph"]',
    )
    if (p) p.style.textAlign = a
  }, align)
  const at = await page.evaluate((a) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const text = n.textContent ?? ''
      const i = a === 'left' ? text.search(/\S/) : text.trimEnd().length - 3
      if (i < 0 || text.trim().length < 5) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + 2)
      const b = r.getBoundingClientRect()
      if (b.width === 0) continue
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('no word')
  }, align)
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, { x: at.x + 2, y: at.y + 1 })
  await expect(mini(page)).toBeVisible()
}

async function expectOnScreen(page: Page) {
  const m = (await mini(page).boundingBox())!
  const v = page.viewportSize()!
  expect(m.x).toBeGreaterThanOrEqual(-0.5)
  expect(m.y).toBeGreaterThanOrEqual(-0.5)
  expect(m.x + m.width).toBeLessThanOrEqual(v.width + 0.5)
  expect(m.y + m.height).toBeLessThanOrEqual(v.height + 0.5)
  // Never taller than the screen, never wider than the screen.
  expect(m.width).toBeLessThanOrEqual(v.width)
}

for (const size of SIZES) {
  for (const align of ['left', 'right'] as const) {
    test(`BUG-002: ${size.width}x${size.height}, word at the ${align} edge: the format bar stays on the screen`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await openNote(page)
      await page.keyboard.press('Escape')
      await page.waitForTimeout(650)
      await selectWordAt(page, align)
      await expectOnScreen(page)
      // The Aa pop-up and the ⋯ row open: still on the screen.
      const more = mini(page).getByRole('button', { name: /more/i }).last()
      if (await more.count()) {
        await more.click().catch(() => undefined)
        await expectOnScreen(page)
      }
    })
  }
}

test('BUG-002: turning the screen with the bar open keeps it on the screen', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1180, height: 820 })
  await openNote(page)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  await selectWordAt(page, 'right')
  await expectOnScreen(page)
  for (const s of [
    { width: 820, height: 1180 },
    { width: 1180, height: 820 },
    { width: 390, height: 844 },
    { width: 1024, height: 400 },
  ]) {
    await page.setViewportSize(s)
    await page.waitForTimeout(250)
    await expectOnScreen(page)
  }
})

for (const size of SIZES) {
  test(`BUG-002: ${size.width}x${size.height}, pinned bar and its pop-ups stay on the screen after turning`, async ({
    page,
  }) => {
    await page.setViewportSize(size)
    await openNote(page)
    await page.keyboard.press('Escape')
    await page.waitForTimeout(650)
    await selectWordAt(page, 'right')
    await mini(page).locator('[data-mini="pin"]').click()
    for (const id of ['textColor', 'size', 'style']) {
      const b = mini(page).locator(`[data-mini="${id}"]`)
      if (!(await b.count())) continue
      await b.click()
      const card = page.locator('[data-pill-card]').first()
      if (await card.count()) {
        const c = (await card.boundingBox())!
        const v = page.viewportSize()!
        expect(c.x).toBeGreaterThanOrEqual(-0.5)
        expect(c.y).toBeGreaterThanOrEqual(-0.5)
        expect(c.x + c.width).toBeLessThanOrEqual(v.width + 0.5)
        expect(c.y + c.height).toBeLessThanOrEqual(v.height + 0.5)
      }
      await expectOnScreen(page)
    }
    await page.setViewportSize({ width: size.height, height: size.width })
    await page.waitForTimeout(250)
    await expectOnScreen(page)
  })
}
