// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import {
  contrastOf,
  createNotebook,
  dockedBar,
  startInMode,
  startInTheme,
  typeInEditor,
} from './helpers.ts'

/**
 * Batch 2d, step 1: the short bar. The Write · Draw · Read switch (by tap
 * and by itself), the pin that keeps a set, the tools of each set, the
 * Edit bar for each set, and the "Apple-like calm" look.
 */

test.use({ viewport: { width: 820, height: 1180 }, hasTouch: true })

const set = (page: Page, name: 'Write' | 'Draw' | 'Read') =>
  dockedBar(page).getByRole('radio', { name })
const tool = (page: Page, name: string | RegExp) =>
  dockedBar(page)
    .getByRole('toolbar')
    .getByRole(
      'button',
      typeof name === 'string' ? { name, exact: true } : { name },
    )
const tray = (page: Page) => page.locator('[data-bar="tray"]')

async function openPage(page: Page) {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
}

/** A pen touching the screen, the way the Pencil reports itself. */
async function penTouch(page: Page) {
  await page.evaluate(() => {
    window.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'pen',
        bubbles: true,
        pointerId: 7,
      }),
    )
    window.dispatchEvent(
      new PointerEvent('pointerup', {
        pointerType: 'pen',
        bubbles: true,
        pointerId: 7,
      }),
    )
  })
}

test('the switch has three parts and no label words, Write is first', async ({
  page,
}) => {
  await openPage(page)
  const group = dockedBar(page).getByRole('radiogroup', { name: 'Tool set' })
  await expect(group.getByRole('radio')).toHaveCount(3)
  await expect(set(page, 'Write')).toHaveAttribute('aria-checked', 'true')
  // Icon only: the name is for screen readers and the tooltip.
  await expect(set(page, 'Draw')).toHaveText('')
  for (const name of ['Write', 'Draw', 'Read'] as const) {
    const box = (await set(page, name).boundingBox())!
    expect(box.width).toBeGreaterThanOrEqual(43.5)
    expect(box.height).toBeGreaterThanOrEqual(43.5)
  }
})

test('Write set shows the planned tools, with real icons and a clear All tools button', async ({
  page,
}) => {
  await openPage(page)
  for (const name of [
    'Bold',
    'Italic',
    /^Colors\./,
    'Highlight',
    'Bulleted list',
    'Checklist',
    'Picture',
    'More',
  ]) {
    await expect(tool(page, name).first(), String(name)).toBeVisible()
  }
  // Tools are drawn as icons (SVG), not emoji or letters.
  await expect(tool(page, 'Bold').locator('svg')).toHaveCount(1)
  await expect(tool(page, 'Bulleted list').locator('svg')).toHaveCount(1)
  const all = tool(page, 'All tools')
  await expect(all).toBeVisible()
  await expect(all.locator('svg')).toHaveCount(1)
  await expect(all).toContainText('All tools')
  await expect(tool(page, 'Search all features')).toBeVisible()
})

test('Draw set: ink tools are "coming" with a reason, Undo works', async ({
  page,
}) => {
  await openPage(page)
  await set(page, 'Draw').click()
  await expect(set(page, 'Draw')).toHaveAttribute('aria-checked', 'true')
  for (const name of [
    'Pen',
    'Highlighter',
    'Eraser',
    'Lasso',
    'Shapes',
    'Ink color',
    'Thickness',
  ]) {
    const button = tool(page, name)
    await expect(button, name).toBeVisible()
    await expect(button, name).toHaveAttribute('aria-disabled', 'true')
    await expect(button, name).toHaveAttribute('title', /coming in a later/)
    await expect(button.locator('svg')).toHaveCount(1)
  }
  await tool(page, 'Eraser').click({ force: true }) // dimmed, but a tap still explains
  await expect(page.getByRole('status')).toContainText('later update')
  // Undo is not disabled and undoes typing.
  await expect(tool(page, 'Undo')).not.toHaveAttribute('aria-disabled', 'true')
  await tool(page, 'Undo').click()
  await expect(page.locator('.bn-editor')).not.toContainText(
    'The nucleus holds the DNA',
  )
})

test('Read set lists its tools; Theme works, the rest wait', async ({
  page,
}) => {
  await openPage(page)
  await set(page, 'Read').click()
  for (const name of [
    'Text size',
    'Font',
    'Theme',
    'Find',
    'Read aloud',
    'Lock',
    'Exit reading',
  ]) {
    await expect(tool(page, name), name).toBeVisible()
  }
  await expect(tool(page, 'Font')).toHaveAttribute('aria-disabled', 'true')
  const before = await page.locator('html').getAttribute('data-theme')
  await tool(page, 'Theme').click()
  await expect
    .poll(() => page.locator('html').getAttribute('data-theme'))
    .not.toBe(before)
})

test('the switch follows the arrow keys', async ({ page }) => {
  await openPage(page)
  await set(page, 'Write').focus()
  await page.keyboard.press('ArrowRight')
  await expect(set(page, 'Draw')).toHaveAttribute('aria-checked', 'true')
  await expect(set(page, 'Draw')).toBeFocused()
  await page.keyboard.press('ArrowRight')
  await expect(set(page, 'Read')).toHaveAttribute('aria-checked', 'true')
  await page.keyboard.press('ArrowRight')
  await expect(set(page, 'Write')).toHaveAttribute('aria-checked', 'true')
})

test('a pen switches to Draw, typing switches back to Write', async ({
  page,
}) => {
  await openPage(page)
  await penTouch(page)
  await expect(set(page, 'Draw')).toHaveAttribute('aria-checked', 'true')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('x')
  await expect(set(page, 'Write')).toHaveAttribute('aria-checked', 'true')
})

test('keep this set: nothing switches it by itself, a tap still does', async ({
  page,
}) => {
  await openPage(page)
  const keep = dockedBar(page).getByRole('button', { name: 'Keep this set' })
  await expect(keep).toHaveAttribute('aria-pressed', 'false')
  await keep.click()
  await expect(keep).toHaveAttribute('aria-pressed', 'true')
  await penTouch(page)
  await page.waitForTimeout(300)
  await expect(set(page, 'Write')).toHaveAttribute('aria-checked', 'true')
  await set(page, 'Read').click()
  await expect(set(page, 'Read')).toHaveAttribute('aria-checked', 'true')
  // Typing does not switch it back either.
  await page.locator('.bn-editor').click()
  await page.keyboard.type('y')
  await expect(set(page, 'Read')).toHaveAttribute('aria-checked', 'true')
  // The choice is remembered after a reload.
  await page.reload()
  await expect(
    dockedBar(page).getByRole('button', { name: 'Keep this set' }),
  ).toHaveAttribute('aria-pressed', 'true')
})

test('Edit bar changes each set on its own and Reset restores it', async ({
  page,
}) => {
  await openPage(page)
  await set(page, 'Draw').click()
  await tool(page, 'Toolbar menu').click()
  await tray(page)
    .getByRole('button', { name: /^Edit bar/ })
    .click()
  const edit = tray(page).getByRole('group', { name: 'Edit bar' })
  // Edit bar opens on the set that is showing.
  await expect(edit.getByRole('radio', { name: 'Draw' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  // Hide Lasso, move Shapes earlier.
  await edit.getByRole('checkbox', { name: 'Lasso' }).first().uncheck()
  await edit.getByRole('button', { name: 'Move Shapes earlier' }).click()
  await edit.getByRole('button', { name: 'Done' }).click()
  await expect(tool(page, 'Lasso')).toHaveCount(0)
  const names = await dockedBar(page)
    .locator('[data-slot="tools"] button')
    .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')))
  expect(names.indexOf('Shapes')).toBeLessThan(names.indexOf('Eraser'))
  // The Write set was not touched.
  await set(page, 'Write').click()
  await expect(tool(page, 'Bold')).toBeVisible()
  await expect(tool(page, 'Pen')).toHaveCount(0)
  // Saved on this device.
  await page.reload()
  await set(page, 'Draw').click()
  await expect(tool(page, 'Lasso')).toHaveCount(0)
  // Reset puts it back.
  await tool(page, 'Toolbar menu').click()
  await tray(page)
    .getByRole('button', { name: /^Edit bar/ })
    .click()
  await tray(page)
    .getByRole('group', { name: 'Edit bar' })
    .getByRole('button', { name: 'Reset' })
    .click()
  await expect(tool(page, 'Lasso')).toBeVisible()
})

test('Edit bar can add any tool to a set, also from another tab', async ({
  page,
}) => {
  await openPage(page)
  await set(page, 'Read').click()
  await tool(page, 'Toolbar menu').click()
  await tray(page)
    .getByRole('button', { name: /^Edit bar/ })
    .click()
  const edit = tray(page).getByRole('group', { name: 'Edit bar' })
  await edit.getByRole('radio', { name: 'Read' }).click()
  await edit.locator('summary', { hasText: 'Home' }).click()
  await edit.getByRole('checkbox', { name: 'Heading 1' }).check()
  await edit.getByRole('button', { name: 'Done' }).click()
  await expect(tool(page, 'Heading 1')).toBeVisible()
})

test('the Write tools work: highlight, list, checklist', async ({ page }) => {
  await openPage(page)
  await page.evaluate(() => {
    const node = document.querySelector('.bn-editor p')!.firstChild!
    const range = document.createRange()
    range.setStart(node, 4)
    range.setEnd(node, 11)
    const sel = window.getSelection()!
    sel.removeAllRanges()
    sel.addRange(range)
  })
  await tool(page, 'Highlight').click()
  await expect(tool(page, 'Highlight')).toHaveAttribute('aria-pressed', 'true')
  await tool(page, 'Bulleted list').click()
  await expect(
    page.locator('.bn-editor [data-content-type="bulletListItem"]'),
  ).toHaveCount(1)
  await tool(page, 'Checklist').click()
  await expect(
    page.locator('.bn-editor [data-content-type="checkListItem"]'),
  ).toHaveCount(1)
})

test('More still holds the text style menu and Edit bar', async ({ page }) => {
  await openPage(page)
  await tool(page, 'More').click()
  await expect(
    tray(page).getByRole('button', { name: /^Edit bar/ }),
  ).toBeVisible()
  await expect(tray(page).getByText('Strike').first()).toBeVisible()
})

for (const theme of ['day', 'night', 'sepia'] as const) {
  test(`${theme}: icons and the switch are readable, targets are 44 px`, async ({
    page,
  }) => {
    await startInTheme(page, theme)
    await openPage(page)
    for (const name of ['Bold', 'Italic', 'Highlight', 'Picture', 'More']) {
      const button = tool(page, name).first()
      expect(
        await contrastOf(button),
        `${theme} ${name}`,
      ).toBeGreaterThanOrEqual(4.5)
      const box = (await button.boundingBox())!
      expect(box.height).toBeGreaterThanOrEqual(43.5)
      expect(box.width).toBeGreaterThanOrEqual(43.5)
    }
    // The chosen part is drawn in the accent colour (an icon: 3:1 is enough).
    expect(await contrastOf(set(page, 'Write'))).toBeGreaterThanOrEqual(3)
    expect(await contrastOf(set(page, 'Draw'))).toBeGreaterThanOrEqual(4.5)
    expect(await contrastOf(tool(page, 'All tools'))).toBeGreaterThanOrEqual(
      4.5,
    )
    expect(await contrastOf(tool(page, 'Done'))).toBeGreaterThanOrEqual(4.5)
    await page.screenshot({
      path: `test-results/short-bar-${theme}.png`,
      clip: { x: 0, y: 0, width: 820, height: 520 },
    })
  })
}

test('reduced motion: the bar does not animate', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await openPage(page)
  const duration = await tool(page, 'Bold').evaluate(
    (el) => getComputedStyle(el).transitionDuration,
  )
  expect(duration).toMatch(/^0s(, 0s)*$/)
})

test('the bar is a soft rounded pill with a gentle shadow', async ({
  page,
}) => {
  await openPage(page)
  const look = await dockedBar(page)
    .getByRole('toolbar')
    .evaluate((el) => {
      const s = getComputedStyle(el)
      return {
        radius: parseFloat(s.borderTopLeftRadius),
        shadow: s.boxShadow,
        blur: s.backdropFilter || s.getPropertyValue('-webkit-backdrop-filter'),
      }
    })
  expect(look.radius).toBeGreaterThanOrEqual(12)
  expect(look.shadow).not.toBe('none')
  expect(look.blur).toContain('blur')
})

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true })

  test('two rows, nothing wider than the screen, every target 44 px', async ({
    page,
  }) => {
    await openPage(page)
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
    const bar = dockedBar(page).getByRole('toolbar')
    const box = (await bar.boundingBox())!
    expect(box.x + box.width).toBeLessThanOrEqual(390)
    for (const b of await bar.getByRole('button').all()) {
      if (!(await b.isVisible())) continue
      const r = (await b.boundingBox())!
      if (r.x + r.width > 390 || r.x < 0) continue // scrolled out of view
      expect(
        r.height,
        (await b.getAttribute('aria-label')) ?? '',
      ).toBeGreaterThanOrEqual(43.5)
    }
    await expect(tool(page, 'All tools')).toBeVisible()
    await expect(tool(page, 'Toolbar menu')).toBeVisible()
    await expect(tool(page, 'Done')).toBeVisible()
    await page.screenshot({
      path: 'test-results/short-bar-phone.png',
      clip: { x: 0, y: 0, width: 390, height: 520 },
    })
  })
})
