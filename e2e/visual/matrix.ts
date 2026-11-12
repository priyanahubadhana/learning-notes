import { expect, type Page } from '@playwright/test'

/**
 * The screenshot matrix: level x colour x screen size. Every screen is
 * photographed in each combination, with all feature switches off.
 */
export const LEVELS = ['beginner', 'professional'] as const
export const SCHEMES = ['light', 'dark'] as const
export const SIZES = {
  'ipad-landscape': { width: 1194, height: 834 },
  'ipad-portrait': { width: 834, height: 1194 },
  phone: { width: 390, height: 844 },
  pc: { width: 1336, height: 720 },
} as const

export type Level = (typeof LEVELS)[number]
export type Scheme = (typeof SCHEMES)[number]
export type SizeName = keyof typeof SIZES

export interface Combo {
  level: Level
  scheme: Scheme
  size: SizeName
  /** Short name used in the picture file name. */
  name: string
}

export const combos: Combo[] = LEVELS.flatMap((level) =>
  SCHEMES.flatMap((scheme) =>
    (Object.keys(SIZES) as SizeName[]).map((size) => ({
      level,
      scheme,
      size,
      name: `${level}-${scheme}-${size}`,
    })),
  ),
)

/** A fixed moment, so dates and clocks look the same in every run. */
export const FIXED_TIME = new Date('2026-01-15T10:00:00Z')

/**
 * Puts the page in a combination before it loads: size, level, theme
 * (Day or Night) and a fixed clock. The feature switches stay off.
 */
export async function prepare(page: Page, combo: Combo): Promise<void> {
  await page.setViewportSize(SIZES[combo.size])
  await page.clock.setFixedTime(FIXED_TIME)
  await page.addInitScript(
    ([level, theme]) => {
      try {
        localStorage.setItem(
          'learning-notes:level',
          JSON.stringify({ level, unlocked: [] }),
        )
        localStorage.setItem('learning-notes:theme', JSON.stringify(theme))
        localStorage.removeItem('learning-notes:flags')
      } catch {
        // Storage blocked: the picture is still taken.
      }
    },
    [combo.level, combo.scheme === 'dark' ? 'night' : 'day'],
  )
}

/**
 * Waits until the screen has drawn: the main area has text, every font and
 * picture has loaded, and the text, the layout and the style sheets stopped
 * changing (lazy screens arrive a moment late, and their CSS chunk can land
 * after their text; on a loaded machine that left the old "text only" check
 * passing while the layout was still moving).
 */
export async function settle(page: Page): Promise<void> {
  // A click on a space leaves the mouse over the strip, and a hover tip opens
  // there a moment later and closes 3 s after that: whether the picture caught
  // it depended on how busy the machine was. Park the mouse on a corner (no
  // control there) and wait until no tip is showing.
  await page.mouse.move(1, 1)
  await expect(page.getByRole('tooltip')).toHaveCount(0)
  const state = () =>
    page.evaluate(async () => {
      // Two frames so style and layout from the last task are applied.
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      )
      const main = document.querySelector('main')
      const text = main?.textContent?.trim() ?? ''
      const imgs = [...document.images]
      const ready =
        document.fonts.status === 'loaded' &&
        imgs.every((i) => i.complete) &&
        document
          .getAnimations()
          .every(
            (a) =>
              a.playState !== 'running' ||
              a.effect?.getTiming().iterations === Infinity,
          )
      const box = main?.getBoundingClientRect()
      return {
        has: text.length > 0,
        ready,
        sig: [
          text,
          document.styleSheets.length,
          main?.scrollHeight,
          box?.width,
          box?.height,
          document.body.scrollHeight,
        ].join('|'),
      }
    })
  await expect.poll(async () => (await state()).has).toBe(true)
  await page.evaluate(() => document.fonts.ready)
  let last = ''
  await expect
    .poll(async () => {
      const now = await state()
      const same = now.ready && now.sig === last
      last = now.sig
      return same
    })
    .toBe(true)
}
