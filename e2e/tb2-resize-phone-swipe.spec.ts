// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test } from '@playwright/test'
import { EXTRA, phoneBox } from './phoneResizeHelpers.ts'

/**
 * 2B.5b: a real touch swipe on the page, outside the dots, scrolls it. Chromium
 * only (the config keeps this file off the WebKit projects): Playwright's
 * WebKit cannot send a real swipe; that one is an owner device check.
 */
test.use({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  deviceScaleFactor: 3,
})

test('phone: a touch swipe outside the dots scrolls the page and leaves the box alone', async ({
  page,
}) => {
  const box = await phoneBox(page, 'P-swipe', ['Alpha beta'], { tall: true })
  const f = (await box.boundingBox())!
  const scroller = page.locator('[data-page-scroller]')
  await scroller.evaluate((el) => (el.scrollTop = 0))
  const cdp = await page.context().newCDPSession(page)
  // Why: a real touch sequence (start, moves 16 ms apart, end) as a finger
  // sends it. The one-call scroll gesture of the same driver scrolled nothing
  // on this build (19 Nov: pointermoves came, no scroll, with or without a box
  // selected), while this sequence scrolls the page by about 285 px: the
  // phone is fine, the one-call gesture was the driver's.
  const send = (type: 'touchStart' | 'touchMove' | 'touchEnd', y: number) =>
    cdp.send('Input.dispatchTouchEvent', {
      type,
      touchPoints: type === 'touchEnd' ? [] : [{ x: 380, y }],
    })
  await send('touchStart', 700)
  for (let y = 700; y >= 400; y -= 20) {
    await send('touchMove', y)
    await page.waitForTimeout(16)
  }
  await send('touchEnd', 400)
  await expect
    .poll(() => scroller.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0)
  const g = (await page.locator(EXTRA).first().boundingBox())!
  expect(Math.abs(g.width - f.width)).toBeLessThan(1.5)
})
