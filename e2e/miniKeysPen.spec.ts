// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { openNote, pref } from './mainBarHelpers.ts'
import { installRealPen, realPen } from './realPen.ts'

/**
 * C17: every button of the mini keyboard strip works with a Pencil and with a
 * finger; the strip has a close button; the mic types as you speak, restarts
 * when Safari ends early, says what is wrong (always "use the keyboard's mic")
 * and glows only while it is really listening.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const strip = (page: Page) => page.locator('[data-mini-keys]')
const key = (page: Page, k: string) =>
  k === 'backspace'
    ? strip(page).getByRole('button', { name: 'Backspace' })
    : strip(page).locator(`[data-keys="${k}"]`)

type Fake = {
  onstart: (() => void) | null
  onresult: ((e: unknown) => void) | null
  onerror: ((e: unknown) => void) | null
  onend: (() => void) | null
}
declare global {
  interface Window {
    __fakes: Fake[]
  }
}

/** A recognizer the test drives by hand: nothing happens until it says so. */
async function fakeSpeech(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as Record<string, unknown>
    w.__fakes = []
    class FakeRec {
      lang = ''
      continuous = false
      interimResults = false
      onstart: (() => void) | null = null
      onresult: ((e: unknown) => void) | null = null
      onerror: ((e: unknown) => void) | null = null
      onend: (() => void) | null = null
      constructor() {
        ;(w.__fakes as unknown[]).push(this)
      }
      start() {}
      stop() {
        this.onend?.()
      }
    }
    w.SpeechRecognition = FakeRec
    w.webkitSpeechRecognition = FakeRec
  })
}
const last = (page: Page, run: string) =>
  page.evaluate((code) => {
    const f = window.__fakes[window.__fakes.length - 1]
    return new Function('f', code)(f)
  }, run)

async function ready(page: Page) {
  await installRealPen(page)
  await fakeSpeech(page)
  await openNote(page)
  await page.locator('[data-action="miniKeys"]').click()
  await expect(strip(page)).toBeVisible()
  await page.waitForTimeout(300)
  await page.locator('.bn-block-content').first().click()
  await page.keyboard.press('End')
}
const center = async (page: Page, k: string) => {
  const b = (await key(page, k).boundingBox())!
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
}

for (const via of ['pencil', 'finger'] as const) {
  test(`Enter and Backspace work with a ${via}`, async ({ page }) => {
    await ready(page)
    const blocks = page.locator('.bn-block-content')
    const before = await blocks.count()
    const press = async (k: string) => {
      const p = await center(page, k)
      if (via === 'pencil') await realPen(page, [p])
      else await page.touchscreen.tap(p.x, p.y)
    }
    await press('enter')
    await expect(blocks).toHaveCount(before + 1)
    await page.keyboard.type('ab')
    await press('backspace')
    await expect(blocks.nth(1)).toHaveText('a')
  })

  test(`the close button closes the strip with a ${via}`, async ({ page }) => {
    await ready(page)
    const p = await center(page, 'close')
    if (via === 'pencil') await realPen(page, [p])
    else await page.touchscreen.tap(p.x, p.y)
    await expect(strip(page)).toHaveCount(0)
    expect(await pref<boolean>(page, 'toolbar.miniKeys')).toBe(false)
  })

  test(`the mic button starts listening with a ${via}`, async ({ page }) => {
    await ready(page)
    const p = await center(page, 'mic')
    if (via === 'pencil') await realPen(page, [p])
    else await page.touchscreen.tap(p.x, p.y)
    await expect.poll(() => page.evaluate(() => window.__fakes.length)).toBe(1)
  })
}

test('glow only while really listening; words are typed as you speak', async ({
  page,
}) => {
  await ready(page)
  await key(page, 'mic').click()
  await expect.poll(() => page.evaluate(() => window.__fakes.length)).toBe(1)
  // Asked but not started yet: no glow.
  await expect(key(page, 'mic')).toHaveAttribute('aria-pressed', 'false')
  await last(page, 'f.onstart()')
  await expect(key(page, 'mic')).toHaveAttribute('aria-pressed', 'true')
  await last(
    page,
    `f.onresult({resultIndex:0,results:[{isFinal:false,0:{transcript:'hel'}}]})`,
  )
  await expect(strip(page).locator('[data-keys="heard"]')).toHaveText('hel')
  await last(
    page,
    `f.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'hello'}}]})`,
  )
  await expect(page.locator('.bn-editor')).toContainText('hello')
  // Safari ends the session early: it restarts and keeps typing.
  await last(page, 'f.onend()')
  await expect(key(page, 'mic')).toHaveAttribute('aria-pressed', 'false')
  await expect.poll(() => page.evaluate(() => window.__fakes.length)).toBe(2)
  await last(page, 'f.onstart()')
  await last(
    page,
    `f.onresult({resultIndex:0,results:[{isFinal:true,0:{transcript:'again'}}]})`,
  )
  await expect(page.locator('.bn-editor')).toContainText('again')
  // Stop: glow off, no restart.
  await key(page, 'mic').click()
  await expect(key(page, 'mic')).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => window.__fakes.length)).toBe(2)
})

for (const code of [
  'not-allowed',
  'network',
  'audio-capture',
  'language-not-supported',
  'bad-thing',
]) {
  test(`error ${code} tells the way out and stops the glow`, async ({
    page,
  }) => {
    await ready(page)
    await key(page, 'mic').click()
    await expect.poll(() => page.evaluate(() => window.__fakes.length)).toBe(1)
    await last(page, 'f.onstart()')
    await last(page, `f.onerror({error:'${code}'}); f.onend()`)
    await expect(page.getByText(/keyboard/i).first()).toBeVisible()
    await expect(key(page, 'mic')).toHaveAttribute('aria-pressed', 'false')
  })
}

test('mic on, mic off: the second tap stops the recording', async ({
  page,
}) => {
  await ready(page)
  const tap = async () => realPen(page, [await center(page, 'mic')])
  await tap()
  await expect.poll(() => page.evaluate(() => window.__fakes.length)).toBe(1)
  await last(page, 'f.onstart()')
  await expect(key(page, 'mic')).toHaveAttribute('aria-pressed', 'true')
  await tap()
  await expect(key(page, 'mic')).toHaveAttribute('aria-pressed', 'false')
  expect(await page.evaluate(() => window.__fakes.length)).toBe(1)
})

for (const via of ['pencil', 'finger'] as const) {
  test(`drag the strip with a ${via}: it moves, snaps and stays after a reload`, async ({
    page,
  }) => {
    await ready(page)
    const from = await center(page, 'grip')
    const path = [from, { x: 400, y: 300 }, { x: 60, y: 400 }]
    if (via === 'pencil') await realPen(page, path)
    else {
      const cdp = await page.context().newCDPSession(page)
      const pt = (p: { x: number; y: number }) => [{ x: p.x, y: p.y, id: 1 }]
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchStart',
        touchPoints: pt(path[0]),
      })
      for (const p of path.slice(1))
        await cdp.send('Input.dispatchTouchEvent', {
          type: 'touchMove',
          touchPoints: pt(p),
        })
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchEnd',
        touchPoints: [],
      })
    }
    await expect(strip(page)).toHaveAttribute('data-edge', 'left')
    expect(
      (await pref<{ edge: string }>(page, 'toolbar.miniKeysPlace'))?.edge,
    ).toBe('left')
    await page.reload()
    await expect(strip(page)).toHaveAttribute('data-edge', 'left')
  })
}
