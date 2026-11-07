// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { makePdf } from './fixtures/books.ts'
import { png } from './fixtures/png.ts'
import { closeCorner, createNotebook } from './helpers.ts'

/**
 * Polish 1 · item 13: the Wave 3–4 screens (Home, Library, the reader, the
 * picture editor, Settings › Sync) have names on every control, a visible
 * focus ring, menus that give the focus back on Esc, and timers that speak.
 * No axe package is installed, so these are hand-written role and label
 * checks.
 */

test.use({ viewport: { width: 1200, height: 800 } })

/** Visible controls without an accessible name (their selectors). */
async function unlabelled(page: Page, scope = 'body') {
  return page.evaluate((root) => {
    const rootEl = document.querySelector(root)!
    const visible = (el: Element) => {
      const r = el.getBoundingClientRect()
      const s = getComputedStyle(el)
      return (
        r.width > 0 &&
        r.height > 0 &&
        s.visibility !== 'hidden' &&
        s.display !== 'none' &&
        !el.closest('[aria-hidden="true"], .bn-editor, .textLayer')
      )
    }
    const nameOf = (el: Element): string => {
      const aria = el.getAttribute('aria-label')
      if (aria?.trim()) return aria.trim()
      const by = el.getAttribute('aria-labelledby')
      if (by) {
        const text = by
          .split(' ')
          .map((id) => document.getElementById(id)?.textContent ?? '')
          .join(' ')
          .trim()
        if (text) return text
      }
      if (el instanceof HTMLInputElement && el.labels?.length) {
        return Array.from(el.labels)
          .map((l) => l.textContent ?? '')
          .join(' ')
          .trim()
      }
      const alt = el.querySelector('img[alt]')?.getAttribute('alt')
      if (alt?.trim()) return alt.trim()
      return (el.textContent ?? '').trim() || (el.getAttribute('title') ?? '')
    }
    const bad: string[] = []
    const controls = rootEl.querySelectorAll(
      'button, [role="button"], [role="tab"], [role="checkbox"], [role="radio"], [role="switch"], a[href], select, textarea, input:not([type="hidden"]):not([type="file"])',
    )
    for (const el of controls) {
      if (!visible(el)) continue
      if (!nameOf(el)) {
        bad.push(
          el.tagName.toLowerCase() +
            (el.getAttribute('data-testid')
              ? `[data-testid=${el.getAttribute('data-testid')}]`
              : '') +
            ` ${el.outerHTML.slice(0, 80)}`,
        )
      }
    }
    return bad
  }, scope)
}

/** Tabs through the page: every stop has a name and a visible ring. */
async function tabThrough(page: Page, steps = 25) {
  const stops: string[] = []
  for (let i = 0; i < steps; i++) {
    await page.keyboard.press('Tab')
    const stop = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement | null
      if (!el || el === document.body) return null
      const s = getComputedStyle(el)
      const ring =
        s.outlineStyle !== 'none' ||
        s.boxShadow !== 'none' ||
        // The sidebar's resize bar shows focus by turning accent-coloured.
        el.getAttribute('role') === 'separator' ||
        // Fields show focus with their border.
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT'
      const name =
        el.getAttribute('aria-label') ||
        el.textContent?.trim() ||
        el.getAttribute('title') ||
        (el as HTMLInputElement).placeholder ||
        ''
      return { tag: el.tagName, name, ring }
    })
    if (!stop) continue
    expect(stop.ring, `focus ring on ${stop.tag} "${stop.name}"`).toBe(true)
    stops.push(stop.name)
  }
  expect(stops.length).toBeGreaterThan(3)
}

async function openHome(page: Page, tab: string) {
  await page.goto('/')
  await closeCorner(page)
  await page.locator('[data-space="home"]').click()
  await page.getByRole('tab', { name: tab, exact: true }).click()
}

test('Home: every control has a name, Tab shows a ring, a task menu returns the focus on Esc', async ({
  page,
}) => {
  await openHome(page, 'Tasks')
  await page.getByTestId('quick-add').fill('Write essay')
  await page.getByTestId('quick-add').press('Enter')
  for (const tab of ['Today', 'Tasks', 'Plan', 'Routines', 'Reports']) {
    await page.getByRole('tab', { name: tab, exact: true }).click()
    expect(await unlabelled(page, '[data-testid="home-screen"]'), tab).toEqual(
      [],
    )
  }
  await page.getByRole('tab', { name: 'Tasks', exact: true }).click()
  await tabThrough(page)

  const menuButton = page.getByTestId('task-menu-button').first()
  await menuButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(menuButton).toBeFocused()
})

test('the timer says when it starts and stops', async ({ page }) => {
  await openHome(page, 'Today')
  await page.getByTestId('timer-toggle').click()
  await expect(page.getByTestId('timer-announce')).toHaveText('Timer started')
  await page.getByTestId('timer-toggle').click()
  await expect(page.getByTestId('timer-announce')).toHaveText('Timer stopped')
})

test('Library and the reader: names on every control, the card menu returns the focus on Esc', async ({
  page,
}) => {
  await page.goto('/')
  await closeCorner(page)
  await page.locator('[data-space="library"]').click()
  await page.getByTestId('library-file').setInputFiles({
    name: 'a.pdf',
    mimeType: 'application/pdf',
    buffer: makePdf(['Alpha page words here', 'Bravo page words'], {
      title: 'Access Book',
    }),
  })
  await expect(page.getByTestId('source-card')).toHaveCount(1)
  expect(await unlabelled(page, '[data-testid="library"]')).toEqual([])
  await tabThrough(page, 15)

  const menuButton = page.getByTestId('source-menu-button')
  await menuButton.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('menu')).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('menu')).toHaveCount(0)
  await expect(menuButton).toBeFocused()

  await page.getByRole('button', { name: '▶ Start reading' }).click()
  await expect(page.getByTestId('book-reader')).toBeVisible()
  expect(await unlabelled(page, '[data-testid="book-reader"]')).toEqual([])
})

test('Settings › Sync: names on every control and a visible ring', async ({
  page,
}) => {
  await page.goto('/#/settings/sync')
  await expect(page.getByTestId('sync-section')).toBeVisible()
  expect(await unlabelled(page, '[data-testid="sync-section"]')).toEqual([])
  await tabThrough(page, 8)
})

test('Picture editor: names on every control', async ({ page }) => {
  await page.goto('/')
  await createNotebook(page, 'Pics', 'First')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page
    .locator('input[type="file"]')
    .last()
    .setInputFiles({
      name: 'p.png',
      mimeType: 'image/png',
      buffer: png(400, 200),
    })
  await expect(page.locator('.bn-editor img').first()).toHaveAttribute(
    'src',
    /^blob:/,
  )
  await page.waitForTimeout(1000)
  await page
    .locator('.bn-block-content[data-content-type="image"]')
    .first()
    .hover()
  await page.waitForTimeout(500)
  await page.locator('.bn-side-menu [draggable="true"]').first().click()
  await page.getByRole('menuitem', { name: 'Edit picture' }).click()
  const sheet = page.getByRole('dialog', { name: 'Edit picture' })
  await expect(sheet).toBeVisible()
  expect(await unlabelled(page, 'dialog[open]')).toEqual([])
})
