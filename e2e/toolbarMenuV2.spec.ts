import { expect, test, type Page } from '@playwright/test'
import { barMenu, mainBar, openNote, openPill, pill } from './mainBarHelpers.ts'

/**
 * 2A.2: the ⋯ toolbar menu redesigned (flag `toolbar.menu`): four tiles on
 * top, then folded groups (▾); what the bar already shows is left out and
 * comes back when the bar changes; no key names on touch screens; Indent and
 * Outdent named plainly.
 */

test.use({ viewport: { width: 1024, height: 900 }, hasTouch: true })

const tray = (page: Page) => page.locator('[data-bar="tray"]')

async function flagOn(page: Page, on: boolean, extra: string[] = []) {
  await page.addInitScript(
    ([value, more]) => {
      localStorage.setItem(
        'learning-notes:flags',
        JSON.stringify(value ? ['toolbar.menu', ...more] : []),
      )
    },
    [on, extra] as const,
  )
}

/** Opens every folded group (names of the items are then all on screen). */
async function unfold(page: Page) {
  const heads = tray(page).locator('.fgroup-head[aria-expanded="false"]')
  while ((await heads.count()) > 0) await heads.first().click()
}

const names = (page: Page) =>
  tray(page)
    .locator('button:not([data-popup-close]):not(.fgroup-head)')
    .evaluateAll((els) =>
      els
        .map(
          (e) =>
            e.getAttribute('aria-label') ??
            (e as HTMLElement).innerText.split('\n')[0].trim(),
        )
        .filter(Boolean),
    )

test('switch OFF: the old flat menu stays', async ({ page }) => {
  await flagOn(page, false)
  await openNote(page)
  await barMenu(page).click()
  await expect(tray(page).locator('[data-menu-v2]')).toHaveCount(0)
  await expect(
    tray(page).getByRole('button', { name: 'Edit toolbar…' }),
  ).toBeVisible()
})

test('2: four tiles on top, then five folded groups with a ▾', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  const top = tray(page).getByRole('group', { name: 'Toolbar' })
  await expect(top.getByRole('button')).toHaveText([
    'Edit toolbar…',
    'All tools',
    'Search all features',
    'Done',
  ])
  await expect(top.locator('svg')).toHaveCount(4)
  const heads = tray(page).locator('.fgroup-head')
  await expect(heads).toHaveText([
    'Text style',
    'Arrange',
    'Mark for review',
    'Copy and paste',
    'Toolbar settings',
  ])
  for (let i = 0; i < 5; i++)
    await expect(heads.nth(i)).toHaveAttribute('aria-expanded', 'false')
  // Folded: the items inside are not on screen, and the list is short.
  await expect(
    tray(page).getByRole('button', { name: 'Copy as plain text' }),
  ).toHaveCount(0)
  const box = (await tray(page).boundingBox())!
  expect(box.height).toBeLessThan(420)
  await expect(tray(page).locator('button[data-popup-close]')).toBeVisible()
})

test('1: what the bar already shows is not in the menu; the rest is', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await unfold(page)
  // On the default bar: New line (a bar tool) and Bold, Italic, Underline,
  // Colours, Align (options of the Text tool).
  for (const name of ['Bold', 'Italic', 'Underline']) {
    await expect(
      tray(page).getByRole('checkbox', { name, exact: true }),
    ).toHaveCount(0)
  }
  await expect(
    tray(page).getByRole('button', { name: 'New line', exact: true }),
  ).toHaveCount(0)
  // Still here.
  for (const name of ['Strike', 'Code']) {
    await expect(
      tray(page).getByRole('checkbox', { name, exact: true }),
    ).toBeVisible()
  }
  for (const name of [
    'Indent',
    'Outdent',
    'Copy as plain text',
    'Copy as Markdown',
    'Paste as plain text',
    'Copy page with pictures',
    'Bar settings…',
  ]) {
    await expect(
      tray(page).getByRole('button', { name, exact: true }),
    ).toBeVisible()
  }
})

test('1: it updates live when the bar changes (New line and Italic come back)', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await unfold(page)
  await tray(page).getByRole('button', { name: 'Bar settings…' }).click()
  const panel = page.getByRole('group', { name: 'Edit bar' })
  await panel
    .locator('[data-edit-list="main"]')
    .getByRole('checkbox', { name: 'New line' })
    .uncheck()
  await panel
    .locator('[data-edit-list="pill-text"]')
    .getByRole('checkbox', { name: 'Italic' })
    .uncheck()
  await page.keyboard.press('Escape')
  await barMenu(page).click()
  await unfold(page)
  await expect(
    tray(page).getByRole('button', { name: 'New line', exact: true }),
  ).toBeVisible()
  await expect(
    tray(page).getByRole('checkbox', { name: 'Italic', exact: true }),
  ).toBeVisible()
})

test('1: nothing is dropped: every old item is on the bar, in the menu or in All tools', async ({
  page,
}) => {
  await page.addInitScript(() => {
    if (sessionStorage.getItem('menu-on') === null)
      localStorage.setItem('learning-notes:flags', '[]')
  })
  await openNote(page)
  await barMenu(page).click()
  const old = (await names(page)).map((n) => n.toLowerCase())
  expect(old.length).toBeGreaterThan(15)
  await page.evaluate(() => {
    sessionStorage.setItem('menu-on', '1')
    localStorage.setItem(
      'learning-notes:flags',
      JSON.stringify(['toolbar.menu']),
    )
  })
  await page.reload()
  await barMenu(page).click()
  await unfold(page)
  const inMenu = new Set((await names(page)).map((n) => n.toLowerCase()))
  const missing = old.filter((n) => !inMenu.has(n))
  expect(missing.length).toBeGreaterThan(0)
  // The rest is on the bar (the Text tool's options) or in All tools.
  await tray(page).getByRole('button', { name: 'Done', exact: true }).click()
  await openPill(page, 'Text', 'text')
  const onBar = await pill(page, 'text')
    .locator('button')
    .evaluateAll((els) =>
      els.map((e) =>
        (
          e.getAttribute('aria-label') ?? (e as HTMLElement).innerText
        ).toLowerCase(),
      ),
    )
  await barMenu(page).click()
  await tray(page).getByRole('button', { name: 'All tools' }).click()
  const ribbon = page.getByRole('tablist', { name: 'Tool tabs' })
  await expect(ribbon).toBeVisible()
  const found = new Set<string>(onBar)
  const tabs = ribbon.getByRole('tab')
  for (let i = 0; i < (await tabs.count()); i++) {
    await tabs.nth(i).click()
    const labels = await page
      .locator('[data-pill="ribbon"] button')
      .evaluateAll((els) =>
        els.map((e) =>
          (
            e.getAttribute('aria-label') ??
            (e as HTMLElement).innerText ??
            ''
          ).toLowerCase(),
        ),
      )
    for (const l of labels) found.add(l)
  }
  const loose = (n: string) => n.replace(/ text| block/g, '')
  const all = [...found].join('|')
  const lost = missing.filter(
    (n) => !all.includes(n) && !all.includes(loose(n)),
  )
  expect(lost).toEqual([])
})

test('3: Indent and Outdent are named plainly, with their icons', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await unfold(page)
  for (const name of ['Indent', 'Outdent']) {
    const row = tray(page).getByRole('button', { name, exact: true })
    await expect(row.locator('svg')).toBeVisible()
  }
  expect(await tray(page).innerText()).not.toMatch(/Nest|Unnest/)
})

test('no key names on a touch screen', async ({ page }) => {
  await flagOn(page, true)
  await openNote(page, 'touch', { 'advanced.shortcutHints': 'on' })
  await barMenu(page).click()
  await unfold(page)
  expect(await tray(page).innerText()).not.toMatch(/⌘|Ctrl\+|Shift\+|Tab/)
})

test('every item is at least 44 px and the menu fits the screen', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await unfold(page)
  const boxes = await tray(page)
    .locator('button')
    .evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect()
        return { h: r.height, w: r.width }
      }),
    )
  for (const b of boxes) expect(Math.min(b.h, b.w)).toBeGreaterThanOrEqual(43.5)
  const t = await tray(page).boundingBox()
  expect(t!.y + t!.height).toBeLessThanOrEqual(900)
})

test('a text style tile works and shows it is on', async ({ page }) => {
  await flagOn(page, true)
  await openNote(page)
  await page.keyboard.press('Control+A')
  await barMenu(page).click()
  await unfold(page)
  const strike = tray(page).getByRole('checkbox', { name: 'Strike' })
  await strike.click()
  await expect(strike).toHaveAttribute('aria-checked', 'true')
})

test('Done and the ✕ close the menu', async ({ page }) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await tray(page).getByRole('button', { name: 'Done', exact: true }).click()
  await expect(tray(page)).toHaveCount(0)
  await barMenu(page).click()
  await tray(page).locator('button[data-popup-close]').click()
  await expect(tray(page)).toHaveCount(0)
})

test('a tap opens the menu with no focus ring; an arrow key shows the ring on the first tile', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await expect(tray(page)).toBeVisible()
  const ringed = () =>
    page.evaluate(() => {
      const el = document.activeElement
      if (!el) return false
      const css = getComputedStyle(el)
      return css.outlineStyle !== 'none' && parseFloat(css.outlineWidth) > 0
    })
  expect(await ringed()).toBe(false)
  await page.keyboard.press('ArrowDown')
  await expect(
    tray(page).getByRole('button', { name: 'Edit toolbar…' }),
  ).toBeFocused()
  expect(await ringed()).toBe(true)
})

test('every row in the groups has an icon', async ({ page }) => {
  await flagOn(page, true)
  await openNote(page)
  await barMenu(page).click()
  await unfold(page)
  const rows = tray(page).locator('.fgroup-body > *:not([role="group"])')
  const n = await rows.count()
  expect(n).toBeGreaterThan(8)
  for (let i = 0; i < n; i++) {
    await expect(rows.nth(i).locator('svg').first()).toBeVisible()
  }
})

test('with the new shell on, the long list has the shared scroll bar', async ({
  page,
}) => {
  await flagOn(page, true, ['foundation.shell'])
  await openNote(page)
  await barMenu(page).click()
  await unfold(page)
  await expect(page.locator('.sbar[data-layer="tray"]')).toHaveCount(1)
})

test.describe('mouse and keyboard', () => {
  test.use({ hasTouch: false })
  test('TM-04 the style tiles show their shortcut hints', async ({ page }) => {
    await flagOn(page, true)
    await openNote(page, 'computer', { 'advanced.shortcutHints': 'on' })
    await barMenu(page).click()
    await unfold(page)
    await expect(
      tray(page).getByRole('checkbox', { name: 'Strike', exact: true }),
    ).toContainText('Ctrl+Shift+S')
  })
})

test('the bar still shows its tools (the menu does not take them away)', async ({
  page,
}) => {
  await flagOn(page, true)
  await openNote(page)
  await expect(mainBar(page)).toBeVisible()
})
