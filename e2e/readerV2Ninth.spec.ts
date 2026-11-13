/// <reference lib="dom" />
import type { Locator, Page } from '@playwright/test'
import { expect, test } from './fixtures/readerReady.ts'
import { makePdf } from './fixtures/books.ts'

/**
 * Slice 7 (reader v2), gate 3 ninth visit, fix list B: the book panel on
 * iPad (under the reader bar; a shell card when docked), the toast above an
 * open bottom card, the whole Aa › More card, (fix 5, the Settings Preview
 * pill, waits for a decision: it conflicts with SET-B02/B03), a 2-row pen bar with ringed swatches, the notes actions
 * on one row with Delete in danger red, and a padlock note naming only the
 * modes shown.
 */
type Size = { width: number; height: number }
const PHONE: Size = { width: 390, height: 844 }
const IPAD_PORT: Size = { width: 820, height: 1180 }
const IPAD_LAND: Size = { width: 1180, height: 820 }

async function openBook(page: Page, size: Size, unlocked: string[] = []) {
  await page.setViewportSize(size)
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.addInitScript((on) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: on }),
    )
  }, unlocked)
  await page.goto('/?flags=reader.v2')
  const menu = page.getByRole('button', { name: 'Open menu' })
  if (await menu.isVisible()) await menu.click()
  await page
    .getByRole('navigation', { name: 'Spaces' })
    .getByRole('button', { name: 'Space: Library' })
    .click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'fixture.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(
      Array.from({ length: 4 }, (_, i) => `Page ${i + 1} words here`),
      { title: 'Fixture Book' },
    ),
  })
  await page.getByRole('button', { name: 'Start reading' }).click()
  await expect(page.locator('[data-pdf-page="1"] canvas')).toBeVisible()
  await expect(page.locator('[data-bars-ready]')).toHaveCount(1)
  const hide = page.getByRole('button', { name: 'Hide menu' })
  // One retried step, not check-then-click: the sidebar slides, so a click can land mid-move on WebKit.
  await expect(async () => {
    if (await hide.isVisible()) await hide.click({ timeout: 2000 })
    await expect(hide).toBeHidden({ timeout: 1000 })
  }).toPass()
}

async function highlight(page: Page) {
  await expect(async () => {
    await page.evaluate(() => {
      const span = document.querySelector('.textLayer span')!
      const range = document.createRange()
      range.selectNodeContents(span)
      const sel = window.getSelection()!
      sel.removeAllRanges()
      sel.addRange(range)
    })
    await expect(page.getByTestId('selection-popup')).toBeVisible({
      timeout: 1000,
    })
  }).toPass()
  await page.getByTestId('hl-yellow').click()
  await expect(page.getByTestId('pdf-highlight').first()).toBeAttached()
}

/** Press a reader bar button, from the More card when it is folded there. */
async function press(page: Page, id: string) {
  const b = page.getByTestId(id)
  if (await b.isVisible()) return b.click()
  await page.getByTestId('reader-more').click()
  await page
    .getByTestId(id + '-card')
    .or(page.getByTestId('reader-more-card').getByTestId(id))
    .click()
}

const box = async (l: Locator) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

test('fix 1: iPad portrait book panel starts under the reader bar, top bar stays clear', async ({
  page,
}) => {
  await openBook(page, IPAD_PORT)
  await page.getByTestId('panel-toggle').click()
  const panel = page.getByTestId('left-panel')
  await expect(panel).toBeVisible()
  const bar = await box(page.getByTestId('rv2-stack'))
  const p = await box(panel)
  expect(p.y).toBeGreaterThanOrEqual(bar.y + bar.height - 1)
  // The shell top bar's buttons stay on top (not under the panel).
  const toggle = page.getByTestId('panel-toggle')
  const onTop = await toggle.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const hit = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)
    return !!hit && el.contains(hit)
  })
  expect(onTop).toBe(true)
  await expect(page.getByTestId('left-panel-dim')).toBeVisible()
})

test('fix 2: iPad landscape book panel is a shell card and its tab row starts at its first tab', async ({
  page,
}) => {
  await openBook(page, IPAD_LAND, ['reader.pagesTab'])
  await highlight(page)
  const panel = page.getByTestId('left-panel')
  if (!(await panel.isVisible())) await page.getByTestId('panel-toggle').click()
  await expect(panel).toBeVisible()
  await panel.getByRole('tab', { name: 'Notes' }).click()
  await expect(page.getByTestId('annotation-row').first()).toBeVisible()
  // A card: rounded corners (on the panel or its shell wrap) and a gap at the top.
  const radius = await panel.evaluate((el) => {
    const own = parseFloat(getComputedStyle(el).borderTopLeftRadius)
    const wrap = el.parentElement
      ? parseFloat(getComputedStyle(el.parentElement).borderTopLeftRadius)
      : 0
    return Math.max(own, wrap)
  })
  expect(radius).toBeGreaterThanOrEqual(8)
  const p = await box(panel)
  expect(p.y).toBeGreaterThanOrEqual(8)
  // Three tabs fit, the row is at rest at its start.
  const tabs = panel.getByRole('tab')
  const first = await box(tabs.first())
  expect(first.x).toBeGreaterThanOrEqual(p.x)
  for (const name of ['Pages', 'Outline', 'Notes']) {
    const tb = await box(panel.getByRole('tab', { name }))
    expect(tb.x).toBeGreaterThanOrEqual(p.x)
    expect(tb.x + tb.width).toBeLessThanOrEqual(p.x + p.width + 0.5)
  }
})

test('fix 3: a toast sits above an open bottom card (Aa on phone)', async ({
  page,
}) => {
  await openBook(page, PHONE)
  await highlight(page)
  await page.getByTestId('panel-toggle').click()
  await page
    .getByTestId('left-panel')
    .getByRole('tab', { name: 'Notes' })
    .click()
  await page
    .getByTestId('annotation-row')
    .first()
    .getByRole('button', { name: 'Delete', exact: true })
    .click()
  await page.getByRole('button', { name: 'Close panel' }).click()
  await press(page, 'reader-aa')
  await page.getByTestId('aa-tab-more').click()
  const toast = page.locator('[data-toast]', { hasText: 'Removed' })
  await expect(toast).toBeVisible()
  const sheet = await box(page.getByTestId('aa-sheet'))
  await expect(async () => {
    const tb = await box(toast)
    expect(tb.y + tb.height).toBeLessThanOrEqual(sheet.y + 0.5)
  }).toPass()
})

test('fix 4: Aa › More shows the whole card on phone', async ({ page }) => {
  await openBook(page, PHONE, ['reader.selMenu', 'reader.progressStyle'])
  await press(page, 'reader-aa')
  await page.getByTestId('aa-tab-more').click()
  const sheet = page.getByTestId('aa-sheet')
  const s = await box(sheet)
  const h = page.viewportSize()!.height
  expect(s.y + s.height).toBeLessThanOrEqual(h + 0.5)
  const switches = sheet.getByRole('switch')
  const n = await switches.count()
  expect(n).toBeGreaterThan(1)
  for (let i = 0; i < n; i++) {
    const b = await box(switches.nth(i))
    expect(b.y + b.height).toBeLessThanOrEqual(s.y + s.height + 0.5)
    // Not hidden under anything (tab bar, edge).
    const free = await switches.nth(i).evaluate((el) => {
      const r = el.getBoundingClientRect()
      const hit = document.elementFromPoint(
        r.x + r.width / 2,
        r.y + r.height / 2,
      )
      return !!hit && (el.contains(hit) || hit.contains(el))
    })
    expect(free).toBe(true)
  }
})

test('fix 6: phone pen bar is 2 rows; the custom swatch has the shared ring', async ({
  page,
}) => {
  await openBook(page, PHONE, ['reader.inkLook'])
  await press(page, 'reader-ink')
  const bar = page.getByTestId('reader-ink-bar')
  await expect(bar).toBeVisible()
  const rows = await bar.evaluate((el) => {
    const tops = new Set<number>()
    for (const c of Array.from(el.children)) {
      const r = c.getBoundingClientRect()
      if (r.height > 0) tops.add(Math.round(r.top / 8))
    }
    return tops.size
  })
  expect(rows).toBeLessThanOrEqual(2)
  // The custom colour sits in the one ▾ on a phone.
  await page.getByTestId('reader-ink-options').click()
  const ring = await page
    .getByTestId('reader-ink-custom')
    .locator('[aria-hidden]')
    .first()
    .evaluate((el) => {
      const cs = getComputedStyle(el)
      // Final-look fix 2: the ring is the selected-dot ring (an outline; 1.5 px rounds to 1 on Chromium).
      return parseFloat(cs.outlineWidth) >= 1 && cs.outlineStyle !== 'none'
    })
  expect(ring).toBe(true)
})

test('fix 7: notes actions on one row, Delete in danger red; padlock note names only shown modes', async ({
  page,
}) => {
  await openBook(page, IPAD_LAND)
  await highlight(page)
  const panel = page.getByTestId('left-panel')
  if (!(await panel.isVisible())) await page.getByTestId('panel-toggle').click()
  await panel.getByRole('tab', { name: 'Notes' }).click()
  const row = page.getByTestId('annotation-row').first()
  const edit = await box(row.getByRole('button', { name: 'Edit note' }))
  const del = row.getByRole('button', { name: 'Delete', exact: true })
  const d = await box(del)
  expect(Math.abs(d.y - edit.y)).toBeLessThan(2)
  const colours = await del.evaluate((el) => {
    const probe = document.createElement('span')
    probe.className = 'text-danger'
    document.body.appendChild(probe)
    const want = getComputedStyle(probe).color
    probe.remove()
    return [getComputedStyle(el).color, want]
  })
  expect(colours[0]).toBe(colours[1])
  await page.getByRole('button', { name: 'Close panel' }).click()
  await press(page, 'reader-lock')
  const menu = page.getByTestId('rv2-lock-menu')
  await expect(menu).toBeVisible()
  await expect(menu.getByTestId('rv2-lock-frozen')).toHaveCount(0)
  await expect(menu).toContainText('View only')
  await expect(menu.locator('.pcard-note')).not.toContainText('Frozen')
})
