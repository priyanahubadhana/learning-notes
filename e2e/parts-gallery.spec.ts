import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Slice 0g step 3: the "Parts" gallery at #/design-tokens. One test per line
 * of the SP test table (docs/features/shared-parts.md) that can be seen on the
 * gallery. Shell lines are not here.
 */

const SECTIONS = [
  'tokens',
  'card',
  'tabs',
  'clear',
  'tags',
  'drag',
  'arrange',
  'empty',
  'objbar',
  'range',
  'menus',
] as const

async function open(page: Page, size?: { width: number; height: number }) {
  if (size) await page.setViewportSize(size)
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('gal-range')).toBeAttached()
  await expect(page.getByTestId('demo-phone-wrap')).toBeAttached()
}

const cell = (page: Page, section: string, state: string) =>
  page.getByTestId(`gal-${section}`).getByTestId(`demo-${state}`)

const box = async (l: Locator) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

/** Waits until an element stops moving (a list slides its rows into place for 160 ms). */
async function still(l: Locator) {
  let last = ''
  await expect
    .poll(async () => {
      const b = await l.boundingBox()
      const now = JSON.stringify(b)
      const same = now === last
      last = now
      return same
    })
    .toBe(true)
}

/** Real mouse drag by the grip (immediate mode). */
async function dragGrip(
  page: Page,
  grip: Locator,
  to: { x: number; y: number },
) {
  const g = await box(grip)
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
  await page.mouse.down()
  await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2 + 6, { steps: 2 })
  await page.mouse.move(to.x, to.y, { steps: 12 })
  await page.mouse.up()
}

const order = (list: Locator) =>
  list
    .locator('> li[data-reorder-id]')
    .evaluateAll((els) => els.map((e) => (e as HTMLElement).dataset.reorderId))

/** A touch pointer event on an element (the page has no real touch here). */
async function touch(
  target: Locator,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  x: number,
  y: number,
) {
  await target.dispatchEvent(type, {
    pointerId: 7,
    pointerType: 'touch',
    isPrimary: true,
    clientX: x,
    clientY: y,
    button: 0,
    buttons: type === 'pointerup' ? 0 : 1,
    bubbles: true,
  })
}

test.describe('Parts gallery', () => {
  test('SP-34 every section renders with every state cell on every width', async ({
    page,
  }) => {
    await open(page)
    const states: Record<string, string[]> = {
      tokens: ['card-fills', 'layers', 'shell-sizes', 'motion'],
      card: [
        'live',
        'pick-open',
        'panel-open',
        'scroll-fade',
        'phone-sheet',
        'loading',
      ],
      tabs: ['three', 'twelve', 'pill', 'pro'],
      clear: ['empty', 'with-text', 'focus', 'disabled', 'textarea', 'opt-out'],
      tags: [
        'live',
        'filter-before',
        'filter-results',
        'filter-dimmed',
        'assign',
        'create-duplicate',
        'empty-library',
        'phone-sheet',
      ],
      drag: ['idle', 'hold-pending', 'lifted', 'invalid', 'grid', 'ends'],
      arrange: [
        'default',
        'lifted',
        'removed',
        'empty',
        'max',
        'phone',
        'floating',
      ],
      empty: ['page', 'inline', 'offline', 'error', 'second-action'],
      objbar: [
        'box',
        'text',
        'picture',
        'table',
        'multi',
        'overflow',
        'danger',
      ],
      range: ['presets', 'custom', 'editing', 'phone-wrap'],
      feedback: [
        'sheet',
        'dialogs',
        'toasts',
        'banner',
        'sheet-inline',
        'confirm-inline',
        'prompt-inline',
        'toasts-inline',
      ],
      menus: [
        'strip',
        'strip-phone',
        'strip-picker',
        'list',
        'list-filtered',
        'list-empty',
        'live',
      ],
    }
    // The sections come in the order of the spec.
    const ids = await page
      .locator('[data-testid^="gal-"]')
      .evaluateAll((els) =>
        els
          .map((e) => (e as HTMLElement).dataset.testid ?? '')
          .filter((t) => /^gal-[a-z]+$/.test(t)),
      )
    const wanted = SECTIONS.map((s) => `gal-${s}`)
    expect(ids.filter((i) => wanted.includes(i))).toEqual(wanted)

    for (const width of [390, 820, 1180, 1366]) {
      await page.getByTestId(`gal-width-${width}`).click()
      await expect(page.getByTestId('gal-frame')).toHaveAttribute(
        'data-width',
        String(width),
      )
      for (const s of SECTIONS) {
        const sec = page.getByTestId(`gal-${s}`)
        await expect(sec).toBeAttached()
        for (const st of states[s]) {
          const c = sec.locator(`[data-state="${st}"]`).first()
          await expect(c, `${s}/${st} at ${width}`).toBeAttached()
        }
      }
      // No sideways scroll of the page itself.
      const over = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(over, `page overflow at ${width}`).toBeLessThanOrEqual(1)
    }
  })

  test('the top controls: theme, reduce glass, reduce motion, widths', async ({
    page,
  }) => {
    await open(page)
    for (const t of ['night', 'day', 'sepia']) {
      await page.getByRole('button', { name: t, exact: true }).click()
      await expect(page.locator('html')).toHaveAttribute('data-theme', t)
    }
    await page.getByRole('button', { name: 'Reduce glass' }).click()
    await expect(page.locator('html')).toHaveAttribute('data-glass', 'lite')
    await page.getByTestId('gal-reduce-motion').click()
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce')
    await page.getByTestId('gal-reduce-motion').click()
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.*/)
    await page.getByTestId('gal-width-390').click()
    expect(
      (await box(page.getByTestId('gal-frame'))).width,
    ).toBeLessThanOrEqual(390)
  })

  test('SP-01 tokens read in Night, Day and Sepia', async ({ page }) => {
    await open(page)
    for (const t of ['night', 'day', 'sepia']) {
      await page.getByRole('button', { name: t, exact: true }).click()
      const r = await page.evaluate(() => {
        const rgba = (css: string): number[] => {
          const c = document.createElement('canvas')
          c.width = c.height = 1
          const x = c.getContext('2d')!
          x.clearRect(0, 0, 1, 1)
          x.fillStyle = css
          x.fillRect(0, 0, 1, 1)
          return Array.from(x.getImageData(0, 0, 1, 1).data)
        }
        const v = (n: string) =>
          getComputedStyle(document.documentElement).getPropertyValue(n).trim()
        const lum = ([r, g, b]: number[]) => {
          const f = (u: number) => {
            const s = u / 255
            return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
          }
          return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
        }
        const ratio = (a: string, b: string) => {
          const [l1, l2] = [lum(rgba(v(a))), lum(rgba(v(b)))].sort(
            (p, q) => q - p,
          )
          return (l1 + 0.05) / (l2 + 0.05)
        }
        const canvas = rgba(v('--color-canvas'))
        const fill = rgba(v('--card-fill'))
        const a = fill[3] / 255
        const over = canvas
          .slice(0, 3)
          .map((c, i) => Math.round(fill[i] * a + c * (1 - a)))
        return {
          ink: ratio('--color-ink', '--color-canvas'),
          soft: ratio('--color-ink-soft', '--color-canvas'),
          onAccent: ratio('--color-on-accent', '--color-accent'),
          accent: ratio('--color-accent', '--color-canvas'),
          cardDelta: over.reduce((s, c, i) => s + Math.abs(c - canvas[i]), 0),
          layers: document.querySelectorAll('[data-testid="layer-list"] li')
            .length,
        }
      })
      expect(r.ink, `${t} ink`).toBeGreaterThanOrEqual(4.5)
      expect(r.soft, `${t} ink-soft`).toBeGreaterThanOrEqual(4.5)
      expect(r.onAccent, `${t} on-accent`).toBeGreaterThanOrEqual(4.5)
      expect(r.accent, `${t} accent as UI`).toBeGreaterThanOrEqual(3)
      expect(r.cardDelta, `${t} card fill reads over the page`).toBeGreaterThan(
        6,
      )
      expect(r.layers).toBe(7)
    }
    // The part tokens exist with their spec values.
    const sizes = await page.evaluate(() => {
      const s = getComputedStyle(document.documentElement)
      return ['--card-w-pick', '--card-w-panel', '--sh-rail', '--sh-hit'].map(
        (n) => s.getPropertyValue(n).trim(),
      )
    })
    expect(sizes).toEqual(['304px', '376px', '56px', '44px'])
  })

  test.describe('Card', () => {
    test('SP-02 a ▾ opens its card 8 px below with the arrow on it', async ({
      page,
    }) => {
      await open(page)
      const trig = page.getByTestId('live-left-trigger')
      await trig.scrollIntoViewIfNeeded()
      await trig.click()
      const card = page.getByTestId('live-left-card')
      await expect(card).toBeVisible()
      await expect(trig).toHaveAttribute('aria-expanded', 'true')
      await expect(trig).toHaveAttribute('data-pressed', 'true')
      // Settled position (after the 200 ms open motion).
      await expect(card).toHaveCSS('animation-duration', '0.2s')
      await page.waitForTimeout(300)
      const t = await box(trig)
      const c = await box(card)
      expect(Math.abs(c.y - (t.y + t.height + 8))).toBeLessThanOrEqual(2)
      expect(Math.abs(c.x - t.x)).toBeLessThanOrEqual(2)
      const arrow = await box(card.locator('.pcard-arrow'))
      expect(
        Math.abs(arrow.x + arrow.width / 2 - (t.x + t.width / 2)),
      ).toBeLessThanOrEqual(t.width / 2)
    })

    test('SP-03 outside tap, Esc or another card closes it; one at a time; focus returns', async ({
      page,
    }) => {
      await open(page)
      const trig = page.getByTestId('live-left-trigger')
      await trig.scrollIntoViewIfNeeded()
      const live = page.locator('body > .pcard')
      await trig.click()
      await expect(live).toHaveCount(1)
      await page.keyboard.press('Escape')
      await expect(live).toHaveCount(0)
      await expect(trig).toBeFocused()
      await trig.click()
      await expect(live).toHaveCount(1)
      await page.mouse.click(2, 2)
      await expect(live).toHaveCount(0)
      // Another card closes the first: never two open.
      await trig.click()
      await expect(live).toHaveCount(1)
      await page.getByTestId('live-tall-trigger').click()
      await expect(page.getByTestId('live-tall-card')).toBeVisible()
      await expect(live).toHaveCount(1)
      await expect(page.getByTestId('live-left-card')).toHaveCount(0)
    })

    test('SP-04 a simple pick shows, the card closes, the ▾ glows once', async ({
      page,
    }) => {
      await open(page)
      const trig = page.getByTestId('live-left-trigger')
      await trig.scrollIntoViewIfNeeded()
      await trig.click()
      const card = page.getByTestId('live-left-card')
      await page.getByTestId('live-left-swatch').nth(1).click()
      await expect(card).toHaveAttribute('data-picked', 'true')
      await expect(card).toHaveCount(0)
      await expect(trig.locator('.pcard-glow')).toHaveCount(1)
    })

    test('SP-05 near the right edge the card stays 12 px inside and the arrow follows', async ({
      page,
    }) => {
      await open(page)
      const trig = page.getByTestId('live-right-trigger')
      await trig.scrollIntoViewIfNeeded()
      await trig.click()
      const card = page.getByTestId('live-right-card')
      await expect(card).toBeVisible()
      await page.waitForTimeout(300)
      const vw = page.viewportSize()!.width
      const c = await box(card)
      const t = await box(trig)
      expect(c.x + c.width).toBeLessThanOrEqual(vw - 12 + 1)
      const a = await box(card.locator('.pcard-arrow'))
      const ax = a.x + a.width / 2
      expect(ax).toBeGreaterThanOrEqual(t.x - 2)
      expect(ax).toBeLessThanOrEqual(t.x + t.width + 2)
    })

    test('SP-06 on a phone the card is a bottom sheet with a grab bar and scrim', async ({
      page,
    }) => {
      await open(page, { width: 390, height: 800 })
      const trig = page.getByTestId('live-left-trigger')
      await trig.scrollIntoViewIfNeeded()
      await trig.click()
      const card = page.getByTestId('live-left-card')
      await expect(card).toHaveAttribute('data-phone', 'true')
      await expect(card.locator('.pcard-grab')).toBeVisible()
      await expect(page.locator('body > .pcard-scrim')).toHaveCount(1)
      await page.waitForTimeout(300)
      const c = await box(card)
      expect(Math.abs(c.y + c.height - 800)).toBeLessThanOrEqual(1)
      expect(c.width).toBeLessThanOrEqual(390)
    })

    test('SP-07 a tall card scrolls and its bottom edge fades', async ({
      page,
    }) => {
      await open(page)
      await page.getByTestId('live-tall-trigger').click()
      const card = page.getByTestId('live-tall-card')
      await expect(card).toBeVisible()
      const body = card.getByTestId('pcard-body')
      const m = await body.evaluate((e) => ({
        s: e.scrollHeight,
        c: e.clientHeight,
      }))
      expect(m.s).toBeGreaterThan(m.c)
      await expect(card).toHaveAttribute('data-fade', 'true')
      await body.evaluate((e) => {
        e.scrollTop = e.scrollHeight
      })
      await expect(card).not.toHaveAttribute('data-fade', 'true')
      // And the static cell shows the same thing.
      await expect(
        cell(page, 'card', 'scroll-fade').getByTestId('gal-scroll-card'),
      ).toHaveAttribute('data-fade', 'true')
    })
  })

  test.describe('Tab row', () => {
    test('SP-08 a 13th tab: one line, scrolls sideways, track shows, new tab in view', async ({
      page,
    }) => {
      await open(page)
      const row = page.getByTestId('tabs-twelve')
      await row.scrollIntoViewIfNeeded()
      const tabs = row.getByRole('tab')
      await expect(tabs).toHaveCount(12)
      const scroller = row.getByRole('tablist')
      const m = await scroller.evaluate((e) => ({
        s: e.scrollWidth,
        c: e.clientWidth,
      }))
      expect(m.s).toBeGreaterThan(m.c)
      await expect(row.getByTestId('tabrow-track')).toBeVisible()
      await row.getByTestId('tabrow-plus').click()
      await page.getByTestId('tabrow-add').first().click()
      await expect(tabs).toHaveCount(13)
      const tops = await tabs.evaluateAll((els) =>
        els.map((e) => Math.round(e.getBoundingClientRect().top)),
      )
      expect(new Set(tops).size).toBe(1) // one line
      const s = await box(scroller)
      // The row scrolls the new tab into view (smooth), so wait for it to land.
      await expect
        .poll(async () => {
          const last = await box(tabs.last())
          return last.x >= s.x - 1 && last.x + last.width <= s.x + s.width + 1
        })
        .toBe(true)
      await expect(row.getByTestId('tabrow-track')).toBeVisible()
    })

    test('SP-09 "+" offers add, create your own and edit; nothing overlaps a tab', async ({
      page,
    }) => {
      await open(page)
      const row = page.getByTestId('tabs-three')
      await row.scrollIntoViewIfNeeded()
      await row.getByTestId('tabrow-plus').click()
      const menu = page.getByRole('menu')
      await expect(menu).toBeVisible()
      await expect(page.getByTestId('tabrow-add').first()).toBeVisible()
      await expect(page.getByTestId('tabrow-create')).toBeVisible()
      await expect(page.getByTestId('tabrow-edit')).toBeVisible()
      const m = await box(menu)
      for (const tab of await row.getByRole('tab').all()) {
        const t = await box(tab)
        const apart =
          m.x >= t.x + t.width ||
          m.x + m.width <= t.x ||
          m.y >= t.y + t.height ||
          m.y + m.height <= t.y
        expect(apart, 'menu overlaps a tab').toBe(true)
      }
    })

    test('SP-10 edit tabs: rename, drag a row, ▲, remove; Undo restores each step', async ({
      page,
    }) => {
      await open(page)
      const row = page.getByTestId('tabs-three')
      await row.scrollIntoViewIfNeeded()
      const names = () =>
        row.getByRole('tab').evaluateAll((els) => els.map((e) => e.textContent))
      await row.getByTestId('tabrow-plus').click()
      await page.getByTestId('tabrow-edit').click()
      const dlg = page.getByTestId('tab-editor')
      await expect(dlg).toBeVisible()
      // Rename.
      const first = dlg.getByRole('textbox').first()
      await first.fill('Home')
      await first.press('Enter')
      await expect.poll(names).toEqual(['Home', 'Notes', 'Cards'])
      // ▲ on the second row.
      await dlg.getByTestId('move-up').nth(1).click()
      await expect.poll(names).toEqual(['Notes', 'Home', 'Cards'])
      // Drag the last row to the top.
      const rows = dlg.getByTestId('tabed-row')
      await still(rows.first())
      await still(rows.nth(2))
      const top = await box(rows.first())
      await dragGrip(page, rows.nth(2).locator('.rord-grip'), {
        x: top.x + 40,
        y: top.y - 6,
      })
      await expect.poll(async () => (await names())[0]).toBe('Cards')
      // Remove one.
      await dlg.getByTestId('tabed-remove').first().click()
      await expect(row.getByRole('tab')).toHaveCount(2)
      // The mini preview matches the row.
      await expect(dlg.getByTestId('tabed-preview')).toContainText(
        (await names())[0] ?? '',
      )
      // Undo walks back each step.
      await dlg.getByTestId('tabed-undo').click()
      await expect(row.getByRole('tab')).toHaveCount(3)
      await dlg.getByTestId('tabed-undo').click()
      await expect.poll(names).toEqual(['Notes', 'Home', 'Cards'])
      await dlg.getByTestId('tabed-undo').click()
      await expect.poll(names).toEqual(['Home', 'Notes', 'Cards'])
      await dlg.getByTestId('tabed-undo').click()
      await expect.poll(names).toEqual(['Overview', 'Notes', 'Cards'])
    })

    test('SP-11 Left/Right move focus, Enter picks, the picked tab is in view', async ({
      page,
    }) => {
      await open(page)
      const row = page.getByTestId('tabs-twelve')
      await row.scrollIntoViewIfNeeded()
      const tabs = row.getByRole('tab')
      await tabs.first().focus()
      await page.keyboard.press('ArrowRight')
      await expect(tabs.nth(1)).toBeFocused()
      await page.keyboard.press('ArrowLeft')
      await expect(tabs.first()).toBeFocused()
      await page.keyboard.press('End')
      await expect(tabs.last()).toBeFocused()
      await page.keyboard.press('Enter')
      await expect(tabs.last()).toHaveAttribute('aria-selected', 'true')
      const s = await box(row.getByRole('tablist'))
      const t = await box(tabs.last())
      expect(t.x + t.width).toBeLessThanOrEqual(s.x + s.width + 1)
      expect(t.x).toBeGreaterThanOrEqual(s.x - 1)
    })

    test('a Professional tab shows only when unlocked', async ({ page }) => {
      await open(page)
      const row = page.getByTestId('tabs-pro')
      await row.scrollIntoViewIfNeeded()
      await expect(row.getByRole('tab', { name: 'Advanced' })).toHaveCount(0)
      await page.getByTestId('tabs-pro-switch').click()
      await expect(row.getByRole('tab', { name: 'Advanced' })).toHaveCount(1)
    })
  })

  test.describe('✕ field', () => {
    test('SP-12 a ✕ appears with text, clears it, keeps focus; Esc clears first', async ({
      page,
    }) => {
      await open(page)
      const empty = cell(page, 'clear', 'empty')
      await empty.scrollIntoViewIfNeeded()
      const input = empty.getByRole('textbox')
      const x = empty.getByTestId('clr-btn')
      await expect(x).toHaveCSS('opacity', '0')
      await input.fill('hello')
      await expect(x).toHaveCSS('opacity', '1')
      await x.click()
      await expect(input).toHaveValue('')
      await expect(input).toBeFocused()
      await expect(x).toHaveCSS('opacity', '0')
      await input.fill('again')
      await page.keyboard.press('Escape')
      await expect(input).toHaveValue('')
      await expect(input).toBeFocused()
      // Textarea and disabled cells.
      const area = cell(page, 'clear', 'textarea')
      await expect(area.getByTestId('clr-btn')).toBeVisible()
      await area.getByTestId('clr-btn').click()
      await expect(area.getByRole('textbox')).toHaveValue('')
      await expect(
        cell(page, 'clear', 'disabled').getByTestId('clr-btn'),
      ).toHaveCount(0)
    })

    test('SP-13 a note text box has no ✕', async ({ page }) => {
      await open(page)
      const c = cell(page, 'clear', 'opt-out')
      await c.scrollIntoViewIfNeeded()
      await expect(c.getByRole('textbox')).toHaveValue('Some note text')
      await expect(c.getByTestId('clr-btn')).toHaveCount(0)
    })
  })

  test.describe('Tag picker', () => {
    test('SP-14 the picker opens with the search box focused and Pinned / Recent / Browse', async ({
      page,
    }) => {
      await open(page)
      const trig = page.getByTestId('tags-live-trigger')
      await trig.scrollIntoViewIfNeeded()
      await trig.click()
      const picker = page.locator('body > [data-testid="tag-picker"]')
      await expect(picker).toBeVisible()
      await expect(picker.getByTestId('tp-search')).toBeFocused()
      const list = picker.getByTestId('tp-list')
      await expect(list).toContainText('Pinned')
      await expect(list).toContainText('Recent')
      await expect(list).toContainText('Browse by category')
    })

    test('SP-15 typing "hab" matches fuzzily and shows paths', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'tags', 'filter-before')
      await c.scrollIntoViewIfNeeded()
      await c.getByTestId('tp-search').fill('hab')
      const row = c.getByTestId('tag-row-habits')
      await expect(row).toBeVisible()
      await expect(row.locator('.pm-row__name')).toHaveText('#Habits')
      // The muted path line: the spec writes it `Life › Habits`.
      await expect(row.locator('.pm-row__path')).toHaveText('Life › Habits')
      await expect(c.getByTestId('tag-row-habit')).toBeVisible()
      // Fuzzy: a skipped letter still finds it.
      await c.getByTestId('tp-search').fill('hbts')
      await expect(c.getByTestId('tag-row-habits')).toBeVisible()
    })

    test('SP-16 a new name close to an existing one offers Create and warns', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'tags', 'create-duplicate')
      await c.scrollIntoViewIfNeeded()
      await c.getByTestId('tp-search').fill('')
      await c.getByTestId('tp-search').fill('habbit')
      await expect(c.getByTestId('tp-create-row')).toContainText(
        'Create #habbit',
      )
      await expect(c.getByTestId('tp-duplicate')).toContainText('#habit')
      await expect(c.getByTestId('tp-use-existing')).toBeVisible()
      await c.getByTestId('tp-create-row').click()
      await expect(c.getByTestId('created-name')).toHaveText('Created #habbit')
    })

    test('SP-17 ticking two tags filters the list, says "2 ticked" and dims the rest', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'tags', 'filter-before')
      await c.scrollIntoViewIfNeeded()
      await expect(c.getByTestId('tp-count')).toHaveText('0 ticked')
      await c.getByTestId('tag-row-habits').first().click()
      await c.getByTestId('tag-row-reading').first().click()
      await expect(c.getByTestId('tp-count')).toHaveText('2 ticked')
      // The dimmed cell: tags that are not in the results.
      const d = cell(page, 'tags', 'filter-dimmed')
      await expect(d.getByTestId('tp-count')).toHaveText('2 ticked')
      await expect(d.getByTestId('tag-row-habit')).toHaveAttribute(
        'data-dim',
        'true',
      )
      await expect(d.getByTestId('tag-row-habits')).not.toHaveAttribute(
        'data-dim',
        'true',
      )
      // Match any / all and include sub-tags are there in filter mode.
      await expect(d.getByTestId('tp-match-all')).toBeVisible()
      await expect(d.getByTestId('tp-include-sub')).toBeVisible()
    })

    test('SP-18 three items: tri-state rows; a "some" tag adds to all; Undo reverts', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'tags', 'assign')
      await c.scrollIntoViewIfNeeded()
      const habits = c.getByTestId('tag-row-habits').first()
      const reading = c.getByTestId('tag-row-reading').first()
      const sleep = c.getByTestId('tag-row-sleep').first()
      await expect(habits).toHaveAttribute('data-state', 'some')
      await expect(reading).toHaveAttribute('data-state', 'some')
      await expect(sleep).toHaveAttribute('data-state', 'some')
      await habits.click()
      await expect(habits).toHaveAttribute('data-state', 'all')
      await c.getByTestId('assign-undo').click()
      await expect(habits).toHaveAttribute('data-state', 'some')
      await expect(c.getByTestId('assign-steps')).toHaveText('0 change(s)')
    })

    test('SP-19 # on a list opens the picker as a popover (wide) or a sheet (phone)', async ({
      page,
    }) => {
      await open(page)
      const list = page.getByTestId('tag-hash-list')
      await list.scrollIntoViewIfNeeded()
      await list.focus()
      await page.keyboard.press('#')
      const picker = page.locator('body > [data-testid="tag-picker"]')
      await expect(picker).toBeVisible()
      await expect(picker).not.toHaveAttribute('data-phone', 'true')
      await page.keyboard.press('Escape')
      await expect(picker).toHaveCount(0)
      await page.setViewportSize({ width: 390, height: 800 })
      await list.scrollIntoViewIfNeeded()
      await list.focus()
      await page.keyboard.press('#')
      await expect(picker).toHaveAttribute('data-phone', 'true')
      await expect(picker.locator('.pcard-grab')).toBeVisible()
    })
  })

  test.describe('Drag', () => {
    test('SP-20 hold a row 0.3 s and drag: it lifts, others slide, a drop-line shows, drop reorders, toast', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'drag', 'idle')
      await c.scrollIntoViewIfNeeded()
      const list = c.getByTestId('drag-list')
      const row = list.locator('li[data-reorder-id="bravo"]')
      const label = row.locator('span.flex-1')
      const r = await box(row)
      const x = r.x + 60
      const y = r.y + r.height / 2
      await touch(label, 'pointerdown', x, y)
      await expect(row).toHaveAttribute('data-state', 'hold-pending')
      await page.waitForTimeout(450)
      await expect(row).toHaveAttribute('data-state', 'lifted')
      // Drag below the 4th row.
      const d = await box(list.locator('li[data-reorder-id="delta"]'))
      await touch(label, 'pointermove', x, d.y + d.height * 0.8)
      await expect(page.getByTestId('drop-line')).toBeVisible()
      expect(await order(list)).toEqual([
        'alpha',
        'charlie',
        'delta',
        'bravo',
        'echo',
      ])
      await touch(label, 'pointerup', x, d.y + d.height * 0.8)
      await expect(list.locator('li[data-state="lifted"]')).toHaveCount(0)
      expect(await order(list)).toEqual([
        'alpha',
        'charlie',
        'delta',
        'bravo',
        'echo',
      ])
      const toast = c.getByTestId('drag-toast')
      await expect(toast).toContainText('Moved Bravo')
      await c.getByTestId('drag-toast-undo').click()
      expect(await order(list)).toEqual([
        'alpha',
        'bravo',
        'charlie',
        'delta',
        'echo',
      ])
    })

    test('SP-20 the grip drags with the mouse straight away', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'drag', 'idle')
      await c.scrollIntoViewIfNeeded()
      const list = c.getByTestId('drag-list')
      const last = await box(list.locator('li[data-reorder-id="echo"]'))
      await dragGrip(
        page,
        list.locator('li[data-reorder-id="alpha"] .rord-grip'),
        { x: last.x + 80, y: last.y + last.height - 3 },
      )
      expect((await order(list))[4]).toBe('alpha')
    })

    test('SP-21 a 10 px move in 0.2 s starts no drag', async ({ page }) => {
      await open(page)
      const c = cell(page, 'drag', 'idle')
      await c.scrollIntoViewIfNeeded()
      const list = c.getByTestId('drag-list')
      const row = list.locator('li[data-reorder-id="bravo"]')
      const label = row.locator('span.flex-1')
      const r = await box(row)
      const x = r.x + 60
      const y = r.y + r.height / 2
      await touch(label, 'pointerdown', x, y)
      await page.waitForTimeout(200)
      await touch(label, 'pointermove', x, y + 10)
      await page.waitForTimeout(450)
      await expect(row).not.toHaveAttribute('data-state', 'lifted')
      await touch(label, 'pointerup', x, y + 10)
      await expect(page.getByTestId('drop-line')).toHaveCount(0)
      expect(await order(list)).toEqual([
        'alpha',
        'bravo',
        'charlie',
        'delta',
        'echo',
      ])
    })

    test('SP-22 dragging over text selects no text', async ({ page }) => {
      await open(page)
      const c = cell(page, 'drag', 'idle')
      await c.scrollIntoViewIfNeeded()
      const list = c.getByTestId('drag-list')
      const g = await box(
        list.locator('li[data-reorder-id="alpha"] .rord-grip'),
      )
      const end = await box(list.locator('li[data-reorder-id="delta"]'))
      await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
      await page.mouse.down()
      await page.mouse.move(g.x + 100, g.y + 20, { steps: 4 })
      await page.mouse.move(end.x + 120, end.y + 10, { steps: 10 })
      await expect(list).toHaveAttribute('data-dragging', '')
      const sel = await page.evaluate(() => window.getSelection()?.toString())
      expect(sel).toBe('')
      await page.mouse.up()
    })

    test('SP-23 a wide widget lands between two small ones and never vanishes', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'drag', 'grid')
      await c.scrollIntoViewIfNeeded()
      const grid = c.getByTestId('drag-grid')
      const ids = () => order(grid)
      expect(await ids()).toEqual(['g1', 'g2', 'g3', 'g4', 'g5', 'g6'])
      const g1 = await box(grid.locator('li[data-reorder-id="g1"]'))
      // Wide item between g1 and g2: its centre ends up between their centres.
      await dragGrip(
        page,
        grid.locator('li[data-reorder-id="g3"] .rord-grip'),
        {
          x: g1.x + 6,
          y: g1.y + g1.height / 2,
        },
      )
      const after = await ids()
      expect(after).toHaveLength(6)
      expect(after.indexOf('g3')).toBe(1)
      const gb = await box(grid)
      const wb = await box(grid.locator('li[data-reorder-id="g3"]'))
      expect(wb.x + wb.width).toBeLessThanOrEqual(gb.x + gb.width + 1)
      // An impossible spot (wide at the last column) snaps to one that fits.
      const g6 = await box(grid.locator('li[data-reorder-id="g6"]'))
      await dragGrip(
        page,
        grid.locator('li[data-reorder-id="g3"] .rord-grip'),
        {
          x: g6.x + g6.width - 4,
          y: g6.y + g6.height / 2,
        },
      )
      expect(await ids()).toHaveLength(6)
      const gb2 = await box(grid)
      const wb2 = await box(grid.locator('li[data-reorder-id="g3"]'))
      expect(wb2.x + wb2.width).toBeLessThanOrEqual(gb2.x + gb2.width + 1)
      await expect(grid.locator('li[data-reorder-id="g3"]')).toBeVisible()
    })

    test('SP-24 ▲ then Alt+↓ move one place each, focus stays, each is one Undo step', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'drag', 'idle')
      await c.scrollIntoViewIfNeeded()
      const list = c.getByTestId('drag-list')
      const steps = c.getByTestId('drag-steps')
      await list
        .locator('li[data-reorder-id="bravo"]')
        .getByTestId('move-up')
        .click()
      expect((await order(list)).slice(0, 3)).toEqual([
        'bravo',
        'alpha',
        'charlie',
      ])
      await expect(steps).toHaveAttribute('data-steps', '1')
      await list.locator('li[data-reorder-id="bravo"]').focus()
      await page.keyboard.press('Alt+ArrowDown')
      expect((await order(list)).slice(0, 3)).toEqual([
        'alpha',
        'bravo',
        'charlie',
      ])
      await expect(steps).toHaveAttribute('data-steps', '2')
      await expect(list.locator('li[data-reorder-id="bravo"]')).toBeFocused()
      await c.getByTestId('drag-undo').click()
      await expect(steps).toHaveAttribute('data-steps', '1')
      expect((await order(list)).slice(0, 2)).toEqual(['bravo', 'alpha'])
    })

    test('the frozen drag states and the ▲▼ ends', async ({ page }) => {
      await open(page)
      const s = page.getByTestId('gal-drag')
      await s.scrollIntoViewIfNeeded()
      await expect(
        s.locator(
          '[data-testid="frozen-hold-pending"] [data-state="hold-pending"]',
        ),
      ).toBeVisible()
      await expect(s.getByTestId('frozen-line')).toBeVisible()
      await expect(
        s.locator('[data-testid="frozen-invalid"] [data-state="invalid"]'),
      ).toBeVisible()
      const ends = s.getByTestId('drag-ends')
      await expect(
        ends.locator('li').first().getByTestId('move-up'),
      ).toBeDisabled()
      await expect(
        ends.locator('li').last().getByTestId('move-down'),
      ).toBeDisabled()
      await expect(
        ends.locator('li').nth(1).getByTestId('move-up'),
      ).toBeEnabled()
    })
  })

  test.describe('Arrange sheet', () => {
    const labels = (sheet: Locator) =>
      sheet
        .getByTestId('arrange-row')
        .locator('.arr-name > span')
        .allTextContents()

    test('SP-25 big rows with a grip, ▲▼ and a menu; the preview matches the row', async ({
      page,
    }) => {
      await open(page)
      const sheet = page.getByTestId('arr-default')
      await sheet.scrollIntoViewIfNeeded()
      const rows = sheet.getByTestId('arrange-row')
      await expect(rows).toHaveCount(6)
      const first = rows.first()
      await expect(first.locator('.rord-grip')).toBeVisible()
      await expect(first.getByTestId('move-down')).toBeVisible()
      await expect(first.getByTestId('row-menu')).toBeVisible()
      expect((await box(first)).height).toBeGreaterThanOrEqual(44)
      const chips = await sheet
        .locator('.arr-chip:not(.arr-chip-more)')
        .allTextContents()
      const l = await labels(sheet)
      expect(chips.slice(0, 4)).toEqual(l.slice(0, 4))
      await rows.nth(1).getByTestId('move-up').click()
      const l2 = await labels(sheet)
      expect(l2[0]).toBe(l[1])
      const chips2 = await sheet
        .locator('.arr-chip:not(.arr-chip-more)')
        .allTextContents()
      expect(chips2.slice(0, 4)).toEqual(l2.slice(0, 4))
    })

    test('SP-26 remove a row, Undo: it returns to the same place', async ({
      page,
    }) => {
      await open(page)
      const sheet = page.getByTestId('arr-removed')
      await sheet.scrollIntoViewIfNeeded()
      const before = await labels(sheet)
      await sheet
        .getByTestId('arrange-row')
        .nth(2)
        .getByTestId('row-menu')
        .click()
      await page.getByTestId('menu-remove').click()
      await expect(sheet.getByTestId('arrange-undo')).toBeVisible()
      expect(await labels(sheet)).toEqual(before.filter((_, i) => i !== 2))
      await sheet.getByTestId('arrange-undo-btn').click()
      expect(await labels(sheet)).toEqual(before)
    })

    test('SP-27 Reset puts the row back to default and says so', async ({
      page,
    }) => {
      await open(page)
      const sheet = page.getByTestId('arr-default')
      await sheet.scrollIntoViewIfNeeded()
      const before = await labels(sheet)
      await expect(sheet.getByTestId('arrange-reset')).toBeDisabled()
      await sheet
        .getByTestId('arrange-row')
        .nth(3)
        .getByTestId('move-up')
        .click()
      expect(await labels(sheet)).not.toEqual(before)
      await sheet.getByTestId('arrange-reset').click()
      expect(await labels(sheet)).toEqual(before)
      await expect(sheet.getByTestId('arr-default-said')).toHaveText(
        'Back to the default',
      )
    })

    test('SP-28 on a phone the sheet fills the screen height', async ({
      page,
    }) => {
      await open(page, { width: 390, height: 800 })
      const btn = page.getByTestId('arrange-open')
      await btn.scrollIntoViewIfNeeded()
      await btn.click()
      const phoneSheet = page
        .locator('[role="dialog"]:has([data-testid="arrange-done"])')
        .last()
      await expect(phoneSheet).toBeVisible()
      await page.waitForTimeout(400)
      const b = await box(phoneSheet)
      expect(b.height).toBeGreaterThanOrEqual(800 * 0.9)
      expect(b.width).toBeLessThanOrEqual(390)
    })

    test('the states: lifted, empty, at the most', async ({ page }) => {
      await open(page)
      const lifted = cell(page, 'arrange', 'lifted')
      await lifted.scrollIntoViewIfNeeded()
      await expect(lifted.locator('.arr-frozen')).toHaveCount(1)
      const empty = cell(page, 'arrange', 'empty')
      await expect(empty.getByTestId('arrange-empty')).toBeVisible()
      const max = cell(page, 'arrange', 'max')
      await expect(max.getByTestId('arrange-add')).toBeDisabled()
      await expect(max.getByTestId('arrange-max')).toBeVisible()
    })
  })

  test.describe('Empty state', () => {
    test('SP-29 icon, one line and one button naming the next step', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'empty', 'page')
      await c.scrollIntoViewIfNeeded()
      const es = c.getByTestId('es-page')
      await expect(es.locator('svg')).toHaveCount(1)
      await expect(es.getByRole('heading')).toHaveText('No notebooks yet')
      await expect(es.getByRole('button')).toHaveCount(1)
      await es.getByRole('button', { name: 'New notebook' }).click()
      await expect(page.getByTestId('empty-said')).toHaveText('page action')
      // Offline and error fill in plain words; error offers Try again.
      await expect(
        cell(page, 'empty', 'offline').getByTestId('es-offline'),
      ).toContainText('You are offline')
      await expect(
        cell(page, 'empty', 'error').getByRole('button', { name: 'Try again' }),
      ).toBeVisible()
      await expect(
        cell(page, 'empty', 'second-action').getByRole('button'),
      ).toHaveCount(2)
    })
  })

  test.describe('Object bar', () => {
    test('SP-30 one Object bar per kind, 44 pt buttons, roving focus', async ({
      page,
    }) => {
      await open(page)
      for (const k of ['box', 'text', 'picture', 'table']) {
        const bar = cell(page, 'objbar', k).getByTestId('object-bar')
        await bar.scrollIntoViewIfNeeded()
        await expect(bar).toHaveAttribute('data-kind', k)
        await expect(bar).toHaveAttribute('role', 'toolbar')
      }
      const bar = cell(page, 'objbar', 'box').getByTestId('object-bar')
      const btns = bar.locator('[data-bar-btn]')
      for (const b of await btns.all())
        expect((await box(b)).height).toBeGreaterThanOrEqual(44)
      await btns.first().focus()
      await page.keyboard.press('ArrowRight')
      await expect(btns.nth(1)).toBeFocused()
      // Too narrow: the rest goes to the … menu.
      const ov = cell(page, 'objbar', 'overflow').getByTestId('object-bar')
      await ov.getByTestId('ob-more').click()
      await expect(page.getByTestId('ob-menu')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('ob-menu')).toHaveCount(0)
    })

    test('SP-31 three selected: the bar says so and Delete acts', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'objbar', 'multi')
      await c.scrollIntoViewIfNeeded()
      await expect(c.getByTestId('object-bar-count')).toHaveText('3 selected')
      await c.getByTestId('ob-delete').click()
      await expect(page.getByTestId('objbar-did')).toHaveText('delete')
    })
  })

  test.describe('Time range bar', () => {
    test('SP-32 "This month" makes every widget show this month and the line reads the dates', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'range', 'presets')
      await c.scrollIntoViewIfNeeded()
      await c.getByTestId('range-month').click()
      await expect(c.getByTestId('range-month')).toHaveAttribute(
        'aria-checked',
        'true',
      )
      const widgets = c.getByTestId('range-widget')
      await expect(widgets).toHaveCount(3)
      for (const w of await widgets.all())
        await expect(w).toHaveAttribute('data-range', '2026-11-01..2026-11-30')
      await expect(c.getByTestId('range-line')).toContainText('2026')
      await expect(c.getByTestId('range-line')).not.toHaveText('')
    })

    test('SP-33 an end before the start disables ✓ and says why', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'range', 'editing')
      await c.scrollIntoViewIfNeeded()
      await expect(c.getByTestId('range-picker')).toBeVisible()
      await expect(c.getByTestId('range-apply')).toBeEnabled()
      await c.getByTestId('range-from').fill('2026-11-10')
      await c.getByTestId('range-to').fill('2026-11-05')
      await expect(c.getByTestId('range-apply')).toBeDisabled()
      await expect(c.getByTestId('range-invalid')).toBeVisible()
      await expect(c.getByTestId('time-range-bar')).toHaveAttribute(
        'data-state',
        'invalid',
      )
      await c.getByTestId('range-to').fill('2026-11-20')
      await expect(c.getByTestId('range-apply')).toBeEnabled()
    })

    test('SP-B06b Edit time range opens name, presets and ✓ ✕ Reset', async ({
      page,
    }) => {
      await open(page)
      const c = cell(page, 'range', 'presets')
      await c.scrollIntoViewIfNeeded()
      await c.getByTestId('range-edit').click()
      const b = page.getByTestId('range-builder')
      await expect(b).toBeVisible()
      await expect(page.getByTestId('range-builder-name')).toBeVisible()
      await expect(page.getByTestId('range-builder-reset')).toBeVisible()
      await expect(page.getByTestId('range-builder-done')).toBeVisible()
      await expect(page.getByTestId('range-builder-close')).toBeVisible()
    })
  })
})

test.describe('Parts gallery fits the screen', () => {
  for (const width of [320, 360, 430, 820]) {
    test(`SP-35 nothing is clipped or scrolls sideways at ${width} px`, async ({
      page,
    }) => {
      await open(page, { width, height: 900 })
      for (const s of SECTIONS) {
        await page.getByTestId(`gal-${s}`).scrollIntoViewIfNeeded()
      }
      const bad = await page.evaluate(
        (ids) => {
          const vw = window.innerWidth
          const scrolls = (el: Element) => {
            const o = getComputedStyle(el).overflowX
            return o === 'auto' || o === 'scroll' || o === 'hidden'
          }
          const out: string[] = []
          for (const id of ids) {
            const root = document.querySelector(`[data-testid="gal-${id}"]`)
            if (!root) {
              out.push(`gal-${id} missing`)
              continue
            }
            for (const el of root.querySelectorAll('*')) {
              // Skip anything inside a scrolling box (the box itself is checked).
              let inside = false
              for (
                let p = el.parentElement;
                p && p !== root;
                p = p.parentElement
              )
                if (scrolls(p)) inside = true
              if (inside) continue
              const r = el.getBoundingClientRect()
              if (r.width === 0 && r.height === 0) continue
              if (r.right > vw + 0.5 || r.left < -0.5)
                out.push(
                  `${id}: <${el.tagName.toLowerCase()} ${
                    (el as HTMLElement).dataset.testid ?? el.className
                  }> ${Math.round(r.left)}..${Math.round(r.right)}`,
                )
            }
          }
          return out
        },
        [...SECTIONS],
      )
      expect(bad).toEqual([])
      const wide = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      )
      expect(wide).toBeLessThanOrEqual(0)
    })
  }

  test('SP-36 the custom range editor stays on a 320 px screen', async ({
    page,
  }) => {
    await open(page, { width: 320, height: 700 })
    const c = cell(page, 'range', 'editing')
    await c.scrollIntoViewIfNeeded()
    const picker = c.getByTestId('range-picker')
    await expect(picker).toBeVisible()
    const b = await box(picker)
    expect(b.x).toBeGreaterThanOrEqual(0)
    expect(b.x + b.width).toBeLessThanOrEqual(320)
    expect(b.width).toBeLessThanOrEqual(320 - 32)
    for (const t of ['range-from', 'range-to']) {
      const i = await box(c.getByTestId(t))
      expect(i.x + i.width).toBeLessThanOrEqual(b.x + b.width + 0.5)
    }
  })
})
