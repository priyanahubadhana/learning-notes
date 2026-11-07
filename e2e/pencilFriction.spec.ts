// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Polish 1 · item 9: the mind map follows the Pencil rules. A Pencil tap
 * selects (no keyboard), a Pencil double-tap or a finger tap types, and a
 * palm touch is ignored while the Pencil is down. The Pencil is simulated
 * with dispatched pointer events (pointerType "pen"), like the other Pencil
 * specs.
 */

test.use({ hasTouch: true })

async function insertMap(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: 'Create notebook' }).click()
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/mind map')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('tree', { name: 'Mind map' })).toBeVisible()
  // Fake pointer ids cannot be captured; the app's own code is what we test.
  await page.evaluate(() => {
    Element.prototype.setPointerCapture = () => {}
  })
}

type Kind = 'pen' | 'touch'
async function send(
  target: Locator,
  type: 'pointerdown' | 'pointerup',
  kind: Kind,
  id: number,
) {
  await target.evaluate(
    (el, a) => {
      const r = el.getBoundingClientRect()
      el.dispatchEvent(
        new PointerEvent(a.type, {
          bubbles: true,
          composed: true,
          pointerType: a.kind,
          pointerId: a.id,
          isPrimary: a.kind === 'pen' || a.id === 1,
          clientX: r.left + r.width / 2,
          clientY: r.top + r.height / 2,
          button: 0,
        }),
      )
    },
    { type, kind, id },
  )
}
const tap = async (target: Locator, kind: Kind, id: number) => {
  await send(target, 'pointerdown', kind, id)
  await send(target, 'pointerup', kind, id)
}

const editing = (page: Page) => page.locator('input[aria-label="Branch text"]')

test('a Pencil tap selects and opens no keyboard; a Pencil double-tap types', async ({
  page,
}) => {
  await insertMap(page)
  const node = page.getByRole('treeitem').first()
  await tap(node, 'pen', 21)
  await expect(node).toHaveAttribute('aria-selected', 'true')
  await expect(editing(page)).toHaveCount(0)
  await page.waitForTimeout(600) // a slow second tap is not a double-tap
  await tap(node, 'pen', 22)
  await expect(editing(page)).toHaveCount(0)
  await tap(node, 'pen', 23) // quick second tap
  await expect(editing(page)).toBeVisible()
})

test('a finger tap types straight away', async ({ page }) => {
  await insertMap(page)
  await tap(page.getByRole('treeitem').first(), 'touch', 1)
  await expect(editing(page)).toBeVisible()
})

test('a touch while the Pencil is down is ignored (palm rest)', async ({
  page,
}) => {
  await insertMap(page)
  const node = page.getByRole('treeitem').first()
  await send(node, 'pointerdown', 'pen', 31)
  await tap(node, 'touch', 1) // the palm
  await expect(editing(page)).toHaveCount(0)
  await send(node, 'pointerup', 'pen', 31)
})

test('a branch has a 44 px touch area', async ({ page }) => {
  await insertMap(page)
  const hit = page.locator('[data-node-hit]').first()
  const box = (await hit.boundingBox())!
  expect(box.height).toBeGreaterThanOrEqual(44)
})
