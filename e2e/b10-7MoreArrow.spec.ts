// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { mkdirSync, writeFileSync } from 'node:fs'
import { expect, test, type Page } from './frameFixture.ts'
import { openNote } from './mainBarHelpers.ts'

/**
 * B10-7 (TA): the "More tools" arrow never sits over Backspace, with the Text
 * tool and the cursor-only row (Pencil mode: Mic, Backspace, Enter, Paste ▾),
 * on an iPad upright, sideways and a phone, Beginner and Professional.
 */
test.use({ hasTouch: true })

const SIZES = {
  'ipad-upright': { width: 820, height: 1180 },
  'ipad-sideways': { width: 1180, height: 820 },
  phone: { width: 390, height: 844 },
  narrow: { width: 480, height: 800 },
} as const

const open = (page: Page, level: 'beginner' | 'professional') =>
  openNote(page, 'pencil', {
    flags: ['page.menus', 'toolbar.v8', 'foundation.shell'],
    level: { level, unlocked: [] },
    'toolbar.v9.tools': [
      'text',
      'pen',
      'eraser',
      'shapes',
      'lasso',
      'insert',
      'mic',
    ],
  })

type R = { x: number; y: number; width: number; height: number }
const hit = (a: R, b: R) =>
  a.x < b.x + b.width &&
  b.x < a.x + a.width &&
  a.y < b.y + b.height &&
  b.y < a.y + a.height

for (const level of ['beginner', 'professional'] as const)
  for (const [name, size] of Object.entries(SIZES))
    test(`B10-7 the More arrow never sits over Backspace (${level}, ${name})`, async ({
      page,
    }) => {
      await page.setViewportSize(size)
      await open(page, level)
      await page.waitForTimeout(800)
      const back = page.getByTestId('v8-backspace')
      await expect(back).toBeVisible()
      const b = (await back.boundingBox())!
      const arrows = page.locator(
        '[data-scroll-cue], [data-testid="v8-more"], [data-testid="v8-bar"] [aria-label*="More"]',
      )
      for (let i = 0; i < (await arrows.count()); i++) {
        const el = arrows.nth(i)
        if (!(await el.isVisible())) continue
        const r = (await el.boundingBox())!
        expect(hit(r, b), `arrow ${i} overlaps Backspace`).toBe(false)
      }
      // Whatever sits on top, the finger on Backspace reaches Backspace.
      const top = await page.evaluate(
        ({ x, y }) => {
          const el = document.elementFromPoint(x, y)
          return el?.closest('[data-testid="v8-backspace"]')
            ? 'self'
            : String(el?.className ?? el?.tagName)
        },
        { x: b.x + b.width / 2, y: b.y + b.height / 2 },
      )
      expect(top, 'something covers Backspace').toBe('self')
      // Backspace is a real, whole target: not clipped by the screen.
      expect(b.x).toBeGreaterThanOrEqual(0)
      expect(b.x + b.width).toBeLessThanOrEqual(size.width)
    })

const taken: string[] = []
for (const [name, size] of Object.entries(SIZES))
  for (const [tname, theme] of [
    ['light', 'day'],
    ['dark', 'night'],
  ] as const)
    test(`B10-7 pictures: ${name} ${tname}`, async ({ page }, info) => {
      await page.setViewportSize(size)
      await open(page, 'professional')
      await page.evaluate(
        (t) => document.documentElement.setAttribute('data-theme', t),
        theme,
      )
      await page.waitForTimeout(600)
      const out = `screenshots/b10-7/${info.project.name}`
      mkdirSync(out, { recursive: true })
      const file = `${name}-${tname}.png`
      await page.screenshot({ path: `${out}/${file}` })
      taken.push(file)
      writeFileSync(
        `${out}/index.md`,
        `# B10-7 More arrow and Backspace\n\n${[...new Set(taken)].map((f) => `- ${f}`).join('\n')}\n`,
      )
    })
