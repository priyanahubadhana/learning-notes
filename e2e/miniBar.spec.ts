import { expect, test, type Page } from '@playwright/test'
import { card, openNote, pref } from './mainBarHelpers.ts'

/**
 * The selection mini bar (round 5): its colour button opens the colour panel,
 * menus open above it, formatting does not move it, and it can be dragged and
 * pinned (the place is remembered). Simulated pen taps under Lasso.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

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

async function selectWord(page: Page) {
  await openNote(page)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  const at = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = (n.textContent ?? '').indexOf('nucleus')
      if (i < 0) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + 7)
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('no word')
  })
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, { x: at.x + 2, y: at.y + 1 })
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
}

const mini = (page: Page) => page.locator('[data-mini-toolbar]')

test('the colour button opens the colour panel, above the mini bar', async ({
  page,
}) => {
  await selectWord(page)
  await mini(page).getByRole('button', { name: 'Text colour' }).click()
  await expect(card(page)).toBeVisible()
  await expect(
    card(page).locator('[data-card-colours="textColor"]'),
  ).toBeVisible()
  // Every menu and card sits above the mini bar.
  const z = await page.evaluate(() => {
    const zi = (sel: string) =>
      Number(getComputedStyle(document.querySelector(sel)!).zIndex)
    return {
      mini: zi('[data-mini-toolbar]'),
      card: zi('[data-pill-card]'),
      pill: zi('[data-options-pill]'),
    }
  })
  expect(z.card).toBeGreaterThan(z.mini)
  expect(z.pill).toBeGreaterThan(z.mini)
})

test('formatting does not move the mini bar', async ({ page }) => {
  await selectWord(page)
  const before = (await mini(page).boundingBox())!
  await mini(page).getByRole('button', { name: 'Bold' }).click()
  await page.waitForTimeout(150)
  await mini(page).getByRole('button', { name: 'Alignment' }).click()
  await mini(page).getByRole('button', { name: 'List' }).click()
  await page.waitForTimeout(300)
  const after = (await mini(page).boundingBox())!
  expect(Math.abs(after.x - before.x)).toBeLessThan(1)
  expect(Math.abs(after.y - before.y)).toBeLessThan(1)
})

test('drag the mini bar by its grip, pin it, and the place is remembered', async ({
  page,
}) => {
  await selectWord(page)
  const before = (await mini(page).boundingBox())!
  const grip = (await mini(page).locator('[data-mini="grip"]').boundingBox())!
  const gx = grip.x + grip.width / 2
  const gy = grip.y + grip.height / 2
  await page.mouse.move(gx, gy)
  await page.mouse.down()
  await page.mouse.move(gx + 80, gy + 220, { steps: 6 })
  await page.mouse.up()
  const moved = (await mini(page).boundingBox())!
  expect(moved.y - before.y).toBeGreaterThan(150)
  await mini(page)
    .getByRole('button', { name: 'Keep the selection tools here' })
    .click()
  await expect(mini(page)).toHaveAttribute('data-pinned', 'true')
  expect(await pref<boolean>(page, 'toolbar.miniPinned')).toBe(true)
  const saved = await pref<{ left: number; top: number }>(
    page,
    'toolbar.miniPos',
  )
  expect(saved?.top).toBeGreaterThan(before.y + 100)
})

test('R7-7: the mini bar stays fully inside the page area, on all four edges', async ({
  page,
}) => {
  await selectWord(page)
  const inside = async () => {
    const m = (await mini(page).boundingBox())!
    const p = (await page.locator('main').boundingBox())!
    expect(m.x).toBeGreaterThanOrEqual(p.x - 0.5)
    expect(m.y).toBeGreaterThanOrEqual(p.y - 0.5)
    expect(m.x + m.width).toBeLessThanOrEqual(p.x + p.width + 0.5)
    expect(m.y + m.height).toBeLessThanOrEqual(p.y + p.height + 0.5)
  }
  await inside()
  const grip = mini(page).locator('[data-mini="grip"]')
  for (const to of [
    { x: 2, y: 2 },
    { x: 1022, y: 898 },
    { x: 1022, y: 2 },
    { x: 2, y: 898 },
  ]) {
    const g = (await grip.boundingBox())!
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
    await page.mouse.down()
    await page.mouse.move(to.x, to.y, { steps: 6 })
    await page.mouse.up()
    await inside()
  }
})
