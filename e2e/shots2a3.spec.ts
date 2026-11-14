import { test, type Page } from '@playwright/test'
import { openNote } from './mainBarHelpers.ts'

/**
 * Pictures for the first look of task 2A.3 (the format bar and the more-tools
 * arrow). Runs only with SHOTS=1; SHOTS_DIR says where the files go.
 */
test.skip(!process.env.SHOTS, 'pictures only with SHOTS=1')
test.use({ hasTouch: true })

const DIR = process.env.SHOTS_DIR ?? 'screenshots/2a3'
const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  'ipad-sideways': { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
}
const THEMES = { light: 'day', dark: 'night' } as const
const LEVELS = ['beginner', 'professional'] as const

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

for (const level of LEVELS) {
  for (const [size, vp] of Object.entries(SIZES)) {
    test(`shots ${level} ${size}`, async ({ page }) => {
      await page.setViewportSize(vp)
      await page.addInitScript((lv) => {
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level: lv, unlocked: [] }),
        )
      }, level)
      await openNote(page, 'touch', {
        'toolbar.extras': [
          'bold',
          'italic',
          'underline',
          'code',
          'alignCenter',
          'indent',
          'outdent',
          'link',
        ],
      })
      await page.keyboard.press('Escape')
      await page.waitForTimeout(650)
      const at = await page.evaluate(() => {
        const w = document.createTreeWalker(
          document.querySelector('.bn-editor')!,
          NodeFilter.SHOW_TEXT,
        )
        for (let n = w.nextNode(); n; n = w.nextNode()) {
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
      await page.waitForTimeout(300)
      await page
        .locator('[data-mini-toolbar]')
        .getByRole('button', { name: 'Text colour' })
        .click()
        .catch(() => undefined)
      for (const [label, attr] of Object.entries(THEMES)) {
        await page.evaluate(
          (v) => document.documentElement.setAttribute('data-theme', v),
          attr,
        )
        await page.waitForTimeout(250)
        const now = await page.evaluate(() =>
          document.documentElement.getAttribute('data-theme'),
        )
        if (now !== attr) throw new Error(`theme is ${now}, wanted ${attr}`)
        await page.screenshot({
          path: `${DIR}/${level}-${size}-${label}.png`,
        })
      }
    })
  }
}
