/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, startInTheme } from './helpers.ts'

/**
 * R12: the scroll-hint fade must never mask a whole surface (the page showed
 * through a card's edge). Any scrolling card, sheet, menu or pop-up that paints
 * a solid background keeps it: no mask on the surface, and where it can, a soft
 * edge drawn inside it in its own colour. Goes live with foundation.shell.
 * The surfaces are built here in every shape the app uses (a block, a column
 * of items, a grid, a see-through list) so one test covers each kind.
 */
test.use({ viewport: { width: 1000, height: 600 }, hasTouch: true })

async function open(page: Page, flags: string) {
  await startInMode(page, 'touch')
  await page.goto(`/?flags=${flags}`)
  await createNotebook(page, 'Biology', 'First')
}

const SHAPES = {
  block: 'display:block',
  column: 'display:flex;flex-direction:column',
  grid: 'display:grid;gap:4px',
  gap: 'display:flex;flex-direction:column;gap:6px',
  clear: 'display:block;background:transparent',
} as const

/** Adds a 200 px tall scrolling surface, touches it, and reads what the hints did. */
async function surface(page: Page, shape: keyof typeof SHAPES) {
  return page.evaluate(async (css) => {
    const el = document.createElement('div')
    el.id = 'probe-surface'
    el.style.cssText = `position:fixed;left:300px;top:100px;width:240px;height:200px;overflow-y:auto;background-color:rgb(255,255,255);z-index:900;${css}`
    for (let i = 0; i < 30; i++) {
      const row = document.createElement('div')
      row.textContent = 'Row ' + i
      row.style.minHeight = '44px'
      el.appendChild(row)
    }
    document.body.appendChild(el)
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await new Promise((ok) => setTimeout(ok, 300))
    const cs = getComputedStyle(el)
    const after = getComputedStyle(el, '::after')
    return {
      more: el.getAttribute('data-scroll-more'),
      solid: el.getAttribute('data-scroll-solid'),
      mask: cs.maskImage || cs.webkitMaskImage || 'none',
      bg: cs.backgroundColor,
      image: cs.backgroundImage,
      afterContent: after.content,
      afterHeight: after.height,
    }
  }, SHAPES[shape])
}

for (const theme of ['day', 'night'] as const)
  for (const shape of ['block', 'column', 'grid', 'gap'] as const)
    test(`R12: a solid ${shape} surface keeps its background (only its inside fades, ${theme})`, async ({
      page,
    }) => {
      await startInTheme(page, theme)
      await open(page, 'foundation.shell')
      const s = await surface(page, shape)
      // Scrolled a little, so both edges show: the picture for the first look.
      await page.evaluate(() => {
        const el = document.getElementById('probe-surface')!
        el.scrollTop = 100
        el.dispatchEvent(new Event('scroll'))
      })
      await page.waitForTimeout(300)
      await page.screenshot({
        path: `docs/mockups/r12-shots/shape-${shape}-${theme}.png`,
        clip: { x: 250, y: 60, width: 340, height: 280 },
      })
      expect(s.more).toBe('bottom')
      expect(s.mask === 'none' || s.mask === '').toBe(true)
      expect(s.bg).toBe('rgb(255, 255, 255)')
      if (shape === 'grid' || shape === 'gap') {
        // No ::before / ::after possible: a soft edge in its own background.
        expect(s.solid).toBe('edge')
        expect(s.image).toContain('linear-gradient')
        expect(s.afterContent).toBe('none')
      } else {
        expect(s.solid).toBe('fade')
        expect(s.afterContent).not.toBe('none')
        expect(s.afterHeight).toBe('28px')
      }
    })

test('R12: a see-through list still fades as before', async ({ page }) => {
  await open(page, 'foundation.shell')
  const s = await surface(page, 'clear')
  expect(s.solid).toBeNull()
  expect(s.mask).toContain('linear-gradient')
})

test('R12: with the switch OFF nothing changes (the old look stays)', async ({
  page,
}) => {
  await open(page, 'toolbar.menu')
  const s = await surface(page, 'block')
  expect(s.solid).toBeNull()
  expect(s.mask).toContain('linear-gradient')
})

test('R12: the fade edge never changes the surface height (no layout shift)', async ({
  page,
}) => {
  await open(page, 'foundation.shell')
  const h = await page.evaluate(async () => {
    const el = document.createElement('div')
    el.style.cssText =
      'position:fixed;left:300px;top:100px;width:240px;height:200px;overflow-y:auto;background-color:rgb(255,255,255);z-index:900'
    for (let i = 0; i < 30; i++) {
      const row = document.createElement('div')
      row.style.minHeight = '44px'
      el.appendChild(row)
    }
    document.body.appendChild(el)
    const before = el.scrollHeight
    el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
    await new Promise((ok) => setTimeout(ok, 300))
    return {
      before,
      after: el.scrollHeight,
      mark: el.getAttribute('data-scroll-solid'),
    }
  })
  expect(h.mark).toBe('fade')
  expect(h.after).toBe(h.before)
})
