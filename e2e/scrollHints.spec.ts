/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { cornerAction } from './helpers.ts'

/** Adds a tall list to the page, as any long list in the app would be. */
async function addList(page: import('@playwright/test').Page) {
  await page.evaluate(() => {
    const box = document.createElement('div')
    box.id = 'hint-list'
    box.style.cssText =
      'position:fixed;left:40%;top:80px;width:200px;height:150px;overflow-y:auto;background:#fff;z-index:5'
    box.innerHTML = '<div style="height:900px">long</div>'
    document.body.appendChild(box)
  })
}

test('long lists fade at the hidden edge and show a slim bar while scrolling', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('aside').waitFor({ state: 'attached' })
  await addList(page)
  const list = page.locator('#hint-list')
  await expect(list).toHaveAttribute('data-scroll-more', 'bottom')

  await list.evaluate((el) => (el.scrollTop = 200))
  await expect(list).toHaveAttribute('data-scroll-more', 'both')
  // The ONE shared bar (design/parts/ScrollBar) shows on the list being scrolled.
  await expect(page.locator('[data-scrollbar-root]')).toBeVisible()

  await list.evaluate((el) => (el.scrollTop = 10000))
  await expect(list).toHaveAttribute('data-scroll-more', 'top')
})

test('the Settings switch is there, and off means no hints', async ({
  page,
}) => {
  await page.goto('/')
  await cornerAction(page, 'Settings')
  await expect(page.getByText('Scroll hints', { exact: true })).toBeVisible()
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:general.scrollHints', '"off"'),
  )
  await page.goto('/')
  await page.locator('aside').waitFor({ state: 'attached' })
  await addList(page)
  await page.locator('#hint-list').evaluate((el) => (el.scrollTop = 100))
  await page.waitForTimeout(700)
  await expect(page.locator('#hint-list')).not.toHaveAttribute(
    'data-scroll-more',
    /.+/,
  )
  await expect(page.locator('[data-scrollbar-root]')).toHaveCount(0)
})

test('the shared bar is thin (4 px, 6 dragged), has a 44 pt touch area, arrows at both ends, and drags 1:1', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('aside').waitFor({ state: 'attached' })
  await addList(page)
  const list = page.locator('#hint-list')
  const thumb = page.locator('[data-scrollbar-thumb]')
  await list.evaluate((el) => (el.scrollTop = 100))
  await expect(thumb).toBeVisible()
  await expect(page.locator('[data-scrollbar-arrow="up"]')).toBeVisible()
  await expect(page.locator('[data-scrollbar-arrow="down"]')).toBeVisible()
  const box = (await thumb.boundingBox())!
  expect(box.width).toBeLessThanOrEqual(4.5)
  // The touch area reaches 20 px to each side of the 4 px thumb (44 pt).
  const hit = await thumb.evaluate((el) => {
    const r = getComputedStyle(el, '::before')
    return parseFloat(r.left) < 0 && parseFloat(r.width) >= 40
  })
  expect(hit).toBe(true)

  // Drag 30 px: the content moves by 30 * range / travel, not to the end.
  const before = await list.evaluate((el) => el.scrollTop)
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x, y + 30, { steps: 6 })
  // 6 px while dragged, once the 150 ms grow has finished.
  await expect
    .poll(async () => (await thumb.boundingBox())!.width)
    .toBeGreaterThanOrEqual(5.9)
  await page.mouse.up()
  const after = await list.evaluate((el) => el.scrollTop)
  expect(after).toBeGreaterThan(before)
  expect(after).toBeLessThan(900 - 150)
  // The thumb followed the pointer by the same 30 px.
  const moved = (await thumb.boundingBox())!
  expect(moved.y - box.y).toBeCloseTo(30, 0)
})

test('pulling past the top gives a small stretch that springs back', async ({
  page,
}) => {
  await page.goto('/')
  await page.locator('aside').waitFor({ state: 'attached' })
  await addList(page)
  const list = page.locator('#hint-list')
  const child = list.locator('> div')
  const box = (await list.boundingBox())!
  // Record the biggest give the content shows while the wheel pulls.
  await child.evaluate((el) => {
    const w = window as unknown as { __give: number }
    w.__give = 0
    new MutationObserver(() => {
      const m = /translate3d\(0(?:px)?, ?(-?[\d.]+)px/.exec(el.style.transform)
      if (m) w.__give = Math.max(w.__give, Math.abs(parseFloat(m[1])))
    }).observe(el, { attributes: true, attributeFilter: ['style'] })
  })
  await page.mouse.move(box.x + 50, box.y + 50)
  await page.mouse.wheel(0, -120)
  const give = () =>
    page.evaluate(() => (window as unknown as { __give: number }).__give)
  await expect.poll(give).toBeGreaterThan(2)
  const px = await give()
  expect(px).toBeGreaterThan(2)
  expect(px).toBeLessThanOrEqual(16)
  // Springs back and leaves no transform behind.
  await expect
    .poll(() => child.evaluate((el) => el.style.transform), { timeout: 2000 })
    .toBe('')
})
