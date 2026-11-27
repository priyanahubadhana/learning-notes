// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from './frameFixture.ts'
import {
  createNotebook,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * Task 2A.5 (toolbar v9): dark mode looks premium. The default ink is light at
 * night (resolved when drawn, nothing stored changes), controls sit in wells
 * with raised thumbs, switch knobs are white.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

async function open(page: Page, theme: 'day' | 'night') {
  await page.addInitScript(() => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'professional', unlocked: [] }),
    )
  })
  await startInTheme(page, theme)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
}

const dot = (page: Page) =>
  page.getByTestId('v8-chip-pen.colour').locator('.v8dot-colour')

test('2A.5 at night the default ink is light and the saved colour is untouched', async ({
  page,
}) => {
  await open(page, 'night')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'night')
  await expect(dot(page)).toHaveCSS('background-color', 'rgb(236, 236, 238)')
  // Pick the default on purpose: it is saved as the plain default, not as the light ink.
  // It is named "Auto ink" (as in v9), not "Black", since it shows light at night.
  await page.getByTestId('v8-chip-pen.colour').click()
  await expect(page.getByTestId('v8-pen-colour-black')).toHaveAccessibleName(
    'Auto ink',
  )
  await page.getByTestId('v8-pen-colour-black').click()
  const saved = await page.evaluate(
    () => localStorage.getItem('learning-notes:ink.pen') ?? '',
  )
  expect(saved.toLowerCase()).toContain('#1d1d1f')
  expect(saved.toLowerCase()).not.toContain('ececee')
  await expect(dot(page)).toHaveCSS('background-color', 'rgb(236, 236, 238)')
})

test('2A.5 by day the default ink is dark again, same saved colour', async ({
  page,
}) => {
  await open(page, 'day')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'day')
  await expect(dot(page)).toHaveCSS('background-color', 'rgb(29, 29, 31)')
})

test('2A.5 at night a switch knob is white, a tile sits in a well', async ({
  page,
}) => {
  await open(page, 'night')
  await page.getByTestId('v8-chip-pen.feel').click()
  const card = page.getByTestId('v8-card-pen.feel')
  await card.getByRole('tab', { name: 'Aids' }).click()
  const knob = await card
    .locator('.pcard-switch')
    .first()
    .evaluate((el) => getComputedStyle(el, '::after').backgroundColor)
  expect(knob).toBe('rgb(255, 255, 255)')
  await card.getByRole('tab', { name: 'Page' }).click()
  const tile = page.getByTestId('v8-pen-paper-grid')
  const bg = await tile.evaluate((el) => getComputedStyle(el).backgroundColor)
  expect(bg).not.toBe('rgba(0, 0, 0, 0)')
})

/** With toolbar.v8 OFF nothing of 2A.5 shows: old knob, no tile well, old ink. */
test('2A.5 with the switch OFF at night: old white-ish knob, no tile well, dark ink', async ({
  page,
}) => {
  await startInTheme(page, 'night')
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  const r = await page.evaluate(() => {
    const root = document.documentElement
    const sw = document.createElement('span')
    sw.className = 'pcard-switch'
    const tile = document.createElement('button')
    tile.className = 'pcard-tile'
    const opt = document.createElement('div')
    opt.className = 'onoff-choice'
    document.body.append(sw, tile, opt)
    return {
      v9: root.hasAttribute('data-v9'),
      ink: getComputedStyle(root).getPropertyValue('--ink-auto').trim(),
      knob: getComputedStyle(sw, '::after').backgroundColor,
      tile: getComputedStyle(tile).backgroundColor,
      choice: getComputedStyle(opt).backgroundColor,
      surface: getComputedStyle(root)
        .getPropertyValue('--color-surface-0')
        .trim(),
    }
  })
  expect(r.v9).toBe(false)
  expect(r.ink).toBe('#1d1d1f')
  expect(r.tile).toBe('rgba(0, 0, 0, 0)')
  expect(r.knob).not.toBe('rgb(255, 255, 255)')
  expect(r.choice).toBe('rgb(42, 41, 49)')
})

test('2A.5 with the switch ON the root says so (data-v9)', async ({ page }) => {
  await open(page, 'night')
  await expect(page.locator('html')).toHaveAttribute('data-v9', '')
})

test('2A.5 the flag sets data-v9 on every screen, bar mounted or not, and OFF removes it', async ({
  page,
}) => {
  await startInTheme(page, 'night')
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  // Before any notebook is open (no tool bar on screen): already set.
  await expect(page.locator('html')).toHaveAttribute('data-v9', '')
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await expect(page.locator('html')).not.toHaveAttribute('data-v9', '')
})

test('2A.5 at night: raised segmented thumb, 6 px filled slider track, light ink in pictures and preview', async ({
  page,
}) => {
  await open(page, 'night')
  // Raised segmented thumb (the shared choice control, in a well).
  const seg = await page.evaluate(() => {
    const c = document.createElement('div')
    c.className = 'onoff-choice'
    c.innerHTML =
      '<button class="onoff-opt" aria-checked="true">A</button><button class="onoff-opt" aria-checked="false">B</button>'
    document.body.append(c)
    const on = getComputedStyle(c.firstElementChild!)
    return {
      well: getComputedStyle(c).backgroundColor,
      thumb: on.backgroundColor,
      shadow: on.boxShadow,
    }
  })
  expect(seg.thumb).toBe('rgb(74, 73, 85)')
  expect(seg.shadow).not.toBe('none')
  expect(seg.well).not.toBe('rgba(0, 0, 0, 0)')
  // Type card: sample strokes are light.
  await page.getByTestId('v8-chip-pen.type').click()
  const sample = page.getByTestId('v8-pen-type-fountain').locator('svg path')
  await expect(sample).toHaveCSS('stroke', 'rgb(236, 236, 238)')
  await page.keyboard.press('Escape')
  // Size card: size pictures light, wedge slider keeps its own wedge.
  await page.getByTestId('v8-chip-pen.size').click()
  await expect(page.getByTestId('v8-pen-size-0').locator('svg line')).toHaveCSS(
    'stroke',
    'rgb(236, 236, 238)',
  )
  const wedge = page.getByTestId('v8-pen-exact')
  if (await wedge.count()) {
    const w = await wedge.evaluate((el) => ({
      own: getComputedStyle(el).backgroundImage,
    }))
    expect(w.own).toContain('gradient')
  }
  // The track pseudo-element is not reported by computed style: the wedge's clear-track rule
  // must exist on its own (in a list with -moz- the browser drops the whole rule).
  const wedgeTrack = await page.evaluate(() => {
    for (const sh of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try {
        rules = sh.cssRules
      } catch {
        continue
      }
      for (const r of Array.from(rules)) {
        if (
          r instanceof CSSStyleRule &&
          r.selectorText ===
            '.v8range[data-wedge]::-webkit-slider-runnable-track'
        )
          return r.style.backgroundColor + '|' + r.style.backgroundImage
      }
    }
    return 'missing'
  })
  // Clear colour and no image: the accent fill no longer draws over the wedge.
  expect(wedgeTrack).toMatch(
    // The build may shorten `background: transparent`, which reads back as `initial`.
    /^(transparent|rgba\(0, 0, 0, 0\)|initial)\|(none|initial)$/,
  )
  await page.keyboard.press('Escape')
  // Feel card: preview in a well, light line, a 6 px filled slider track.
  await page.getByTestId('v8-chip-pen.feel').click()
  const feel = page.getByTestId('v8-card-pen.feel')
  const prev = feel.locator('[data-ink-preview]')
  await expect(prev).toHaveCSS('background-color', 'rgba(255, 255, 255, 0.055)')
  await expect(prev.locator('path')).toHaveCSS('fill', 'rgb(236, 236, 238)')
  // The track pseudo-element is not reported by computed style, so read the shared rule itself.
  const rule = await page.evaluate(() => {
    for (const sh of Array.from(document.styleSheets)) {
      let rules: CSSRuleList
      try {
        rules = sh.cssRules
      } catch {
        continue
      }
      for (const r of Array.from(rules)) {
        if (
          r instanceof CSSStyleRule &&
          r.selectorText === '.v8range::-webkit-slider-runnable-track'
        )
          return r.style.height + '|' + r.style.background
      }
    }
    return ''
  })
  expect(rule).toContain('6px|')
  expect(rule).toContain('linear-gradient')
})
