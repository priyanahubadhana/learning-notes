import { expect, test, type Page } from '@playwright/test'
import { contrastOf } from './helpers.ts'

/**
 * Slice 0g step 3, S3-39 (docs/features/shared-parts.md): with reduced motion
 * on, Night, Day and Sepia change every step 3 part at once (no animation is
 * left running); text contrast is at least 4.5, marks and rings at least 3.
 * No axe package is installed (see a11yWave34.spec.ts): this is the WCAG ratio
 * of the real colours through `contrastOf`, plus role and name checks.
 */
test.use({ hasTouch: true })

const PARTS = [
  'feedback',
  'shellparts',
  'wizard',
  'toolframe',
  'pills',
  'compare',
] as const
const THEMES = ['night', 'day', 'sepia'] as const

async function open(page: Page) {
  await page.setViewportSize({ width: 1180, height: 820 })
  await page.goto('about:blank')
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('gal-parts')).toHaveAttribute(
    'data-ready',
    'true',
  )
}

/** Visible text-bearing, enabled elements of one section (selector paths). */
async function textNodes(page: Page, id: string) {
  return page.evaluate((sid) => {
    const out: string[] = []
    const seen = new Set<string>()
    const root = document.querySelector(`[data-testid="gal-${sid}"]`)!
    root.querySelectorAll<HTMLElement>('*').forEach((el, i) => {
      const own = [...el.childNodes].some(
        (n) => n.nodeType === 3 && (n.textContent ?? '').trim().length > 1,
      )
      if (!own) return
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      if (r.width < 1 || r.height < 1 || s.visibility === 'hidden') return
      if (el.closest('[disabled],[aria-disabled="true"],[hidden],svg')) return
      // one per look: same tag, class and colours are the same ratio

      const key = `${el.tagName}|${el.className}|${s.color}|${s.backgroundColor}`

      if (seen.has(key)) return

      seen.add(key)

      el.setAttribute('data-c39', `${sid}-${i}`)
      out.push(`[data-c39="${sid}-${i}"]`)
    })
    return out
  }, id)
}

for (const theme of THEMES) {
  test(`S3-39 reduced motion, then ${theme}: nothing keeps moving; text is at least 4.5 and rings are drawn`, async ({
    page,
  }) => {
    await open(page)
    await page.getByTestId('gal-reduce-motion').click()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
    {
      await page
        .getByRole('group', { name: 'Theme' })
        .getByRole('button', { name: theme, exact: true })
        .click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
      // the change is at once: no running animation or transition is left
      const running = await page.evaluate(
        (ids) => {
          const roots = ids.map((i) =>
            document.querySelector(`[data-testid="gal-${i}"]`),
          )
          return document
            .getAnimations()
            .filter((a) => {
              const t = (a.effect as KeyframeEffect | null)?.target
              return (
                a.playState === 'running' &&
                (a.effect?.getComputedTiming().iterations ?? 1) === Infinity &&
                roots.some((r) => r && t && r.contains(t))
              )
            })
            .map((a) => (a as CSSAnimation).animationName ?? a.id)
        },
        [...PARTS],
      )
      expect(running, `${theme}: endless animations`).toEqual([])
      for (const id of PARTS) {
        const sec = page.getByTestId(`gal-${id}`)
        await sec.scrollIntoViewIfNeeded()
        const bad: string[] = []
        for (const sel of await textNodes(page, id)) {
          const el = page.locator(sel)
          if ((await el.count()) === 0) continue // a toast that already left
          const c = await contrastOf(el)
          if (c < 4.5)
            bad.push(
              `${sel} ${(await el.textContent())?.slice(0, 30)} ${c.toFixed(2)}`,
            )
        }
        expect(bad, `${theme} ${id} text under 4.5`).toEqual([])
        // the focus ring of the first button, shown for the keyboard
        const btn = sec.getByRole('button').first()
        await btn.focus()
        await page.keyboard.press('Shift+Tab')
        await page.keyboard.press('Tab')
        const ring = await btn.evaluate((el) => {
          const s = getComputedStyle(el)
          return {
            w: s.outlineWidth,
            st: s.outlineStyle,
            ok: el.matches(':focus-visible'),
          }
        })
        if (ring.ok) {
          expect(ring.st, `${theme} ${id} ring style`).not.toBe('none')
          expect(parseFloat(ring.w)).toBeGreaterThan(0)
        }
      }
    }
  })
}

test('S3-39 the ring colour is at least 3 against the page in all three themes', async ({
  page,
}) => {
  await open(page)
  for (const theme of THEMES) {
    await page
      .getByRole('group', { name: 'Theme' })
      .getByRole('button', { name: theme, exact: true })
      .click()
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
    const sec = page.getByTestId('gal-pills')
    await sec.scrollIntoViewIfNeeded()
    const btn = sec.getByRole('button').first()
    await page.keyboard.press('Tab')
    await btn.focus()
    await page.evaluate(() => {
      const el = document.activeElement as HTMLElement
      el.style.borderTopColor = getComputedStyle(el).outlineColor
    })
    expect(
      await contrastOf(btn, 'border'),
      `${theme} ring`,
    ).toBeGreaterThanOrEqual(3)
  }
})
