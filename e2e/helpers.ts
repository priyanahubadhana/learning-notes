// Browser types for helpers that run code inside the page.
/// <reference lib="dom" />
import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Shared steps for end-to-end tests, written the way a user works:
 * by visible names and button titles, not internal ids.
 */

export const sidebar = (page: Page) => page.locator('aside')

/** On a phone the sidebar is a drawer: opens it (nothing to do on a computer). */
export async function showSidebar(page: Page) {
  const open = page.getByRole('button', { name: 'Open menu' })
  await sidebar(page).waitFor({ state: 'attached' }) // the app has loaded
  await closeCorner(page)
  // Most steps look for notebooks and pages: go to the Notebooks space.
  const notebooks = page.locator('[data-space="notebooks"]')
  if ((await notebooks.getAttribute('aria-current')) !== 'page') {
    await notebooks.click()
    await page.waitForTimeout(250) // on a phone this opens the drawer
  }
  // The dim backdrop exists exactly while the drawer is meant to be open.
  const meantOpen = await page
    .getByRole('button', { name: 'Close menu' })
    .isVisible()
  if ((await open.isVisible()) && !meantOpen) {
    await open.click()
    await expect(sidebar(page)).toBeVisible()
  }
}

/** The sidebar, opened first if it is a phone drawer. */
export async function openSidebar(page: Page) {
  await showSidebar(page)
  return sidebar(page)
}

/** Closes the phone drawer again (Esc), if it is open. */
export async function hideSidebar(page: Page) {
  if (await page.getByRole('button', { name: 'Close menu' }).isVisible()) {
    await page.keyboard.press('Escape')
    await expect(sidebar(page)).toBeHidden()
  }
}

/** The sidebar row (notebook or page) whose name button is `name`. */
export function row(page: Page, name: string): Locator {
  return sidebar(page)
    .locator('div.group')
    .filter({ has: page.getByRole('button', { name, exact: true }) })
    .first()
}

/**
 * If the "Name it" sheet is open, types `name` and presses Enter (Done).
 * Returns false when no sheet is open (a mouse names in the row).
 */
export async function sheetFill(page: Page, name: string): Promise<boolean> {
  const touch = await page.evaluate(
    () => window.matchMedia('(any-pointer: coarse)').matches,
  )
  if (!touch) return false
  const sheet = page.getByTestId('name-sheet')
  try {
    await sheet.waitFor({ state: 'visible', timeout: 1500 })
  } catch {
    return false
  }
  const field = sheet.getByRole('textbox', { name: 'Name' })
  await field.fill(name)
  await field.press('Enter')
  await expect(sheet).toBeHidden()
  return true
}

/**
 * Clicks a row action (by its title). A mouse uses the hover icons; touch
 * and Pencil devices open the row's ⋯ menu and choose the item.
 */
export async function rowAction(page: Page, name: string, action: string) {
  await showSidebar(page)
  const r = row(page, name)
  const more = r.getByRole('button', { name: /^More for/ })
  if (await more.isVisible()) {
    await more.click()
    await page.getByRole('menuitem', { name: action, exact: true }).click()
    return
  }
  await r.hover()
  await r.getByLabel(action, { exact: true }).click()
}

/** Chooses an item in the open page's ⋯ menu. */
export async function pageAction(page: Page, name: string) {
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: new RegExp(name) }).click()
}

/** Types a page title into the open page's title field. */
export async function setTitle(page: Page, title: string) {
  await hideSidebar(page)
  const field = page.getByRole('textbox', { name: 'Page title' })
  await field.click()
  await field.fill(title)
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: title, exact: true }),
  ).toBeVisible()
  await hideSidebar(page)
}

/**
 * Creates a notebook named `name`. The app also creates and opens a first
 * page, which is titled `firstPage`.
 */
export async function createNotebook(
  page: Page,
  name: string,
  firstPage: string,
) {
  const empty = page.getByRole('button', { name: 'Create notebook' })
  if (await empty.isVisible()) await empty.click()
  else {
    await showSidebar(page)
    await sidebar(page).getByLabel('New notebook').click()
  }

  const nameField = sidebar(page).getByRole('textbox', { name: 'Name' })
  const named = sidebar(page).getByRole('button', { name, exact: true })
  // On a phone the drawer can close while naming, which ends the name field,
  // so repeat the whole step until the notebook shows its name, reopening
  // the field with Rename like a user would.
  await expect(async () => {
    // Touch and Pencil devices name it in the "Name it" sheet instead.
    if (await sheetFill(page, name)) {
      await showSidebar(page)
      await expect(named).toBeVisible({ timeout: 3000 })
      return
    }
    await showSidebar(page)
    if (await named.isVisible()) return
    if (!(await nameField.isVisible())) {
      await rowAction(page, 'New notebook', 'Rename')
    }
    await nameField.fill(name, { timeout: 3000 })
    await nameField.press('Enter', { timeout: 3000 }).catch(() => {})
    await showSidebar(page)
    await expect(named).toBeVisible({ timeout: 3000 })
  }).toPass()
  await setTitle(page, firstPage)
}

/** Adds a page to a notebook (or a sub-page to a page) and titles it. */
export async function addPage(
  page: Page,
  parentName: string,
  title: string,
  kind: 'page' | 'sub-page' = 'page',
) {
  const before = page.url()
  await rowAction(
    page,
    parentName,
    kind === 'page' ? 'Add page' : 'Add sub-page',
  )
  await page.getByRole('menuitem', { name: 'Blank page' }).click()
  await page.waitForURL((url) => url.toString() !== before) // the new page is open
  if (!(await sheetFill(page, title))) {
    // New pages open with the cursor in the top box; a tap on the title
    // edits the title.
    await expect(page.locator('.bn-editor').first()).toBeFocused()
    const field = page.getByRole('textbox', { name: 'Page title' })
    await field.click()
    await page.keyboard.type(title)
  }
  await showSidebar(page)
  await expect(
    sidebar(page).getByRole('button', { name: title, exact: true }),
  ).toBeVisible()
  await hideSidebar(page)
}

/** Opens a page from the sidebar. */
export async function openPage(page: Page, title: string) {
  await closeCorner(page)
  await showSidebar(page)
  await sidebar(page).getByRole('button', { name: title, exact: true }).click()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    title,
  )
}

/** Types text into the open page's editor and waits for autosave. */
export async function typeInEditor(page: Page, text: string) {
  // In Pencil mode the Lasso's pad lies over the page; the app places the
  // caret on the click, but Playwright would wait for the pad to move.
  const editor = page.locator('.bn-editor')
  try {
    await editor.click({ timeout: 1500 })
  } catch {
    await editor.click({ force: true })
  }
  await page.keyboard.type(text)
  await page.waitForTimeout(800) // autosave runs ~0.5 s after typing stops
}

/** The Templates section's template names, in order. */
export async function templateNames(page: Page): Promise<string[]> {
  await openGroup(page, 'Templates')
  const rows = sidebar(page)
    .locator('div.group')
    .filter({ has: page.locator('span', { hasText: /^(📋|☀)$/ }) })
  return (await rows.allInnerTexts()).map((t) =>
    t.replace(/[📋☀×▸▾]/gu, '').trim(),
  )
}

/** Types a "/" command in the editor and picks the first match. */
export async function slashCommand(page: Page, query: string) {
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type(`/${query}`)
  await page.keyboard.press('Enter')
}

/** Clicks a button in the open confirm dialog. */
export async function confirmDialog(page: Page, button: string) {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: button, exact: true })
    .click()
  await expect(page.getByRole('dialog')).toBeHidden()
}

/** The quiet corner (⚙ at the bottom of the strip of spaces). */
export const corner = (page: Page) => page.getByTestId('corner-panel')

/** Opens the quiet corner (if closed) and returns it. */
export async function openCorner(page: Page): Promise<Locator> {
  const panel = corner(page)
  if (!(await panel.isVisible())) {
    await page.getByTestId('corner-button').click()
    await expect(panel).toBeVisible()
  }
  return panel
}

/** Closes the quiet corner if it is open (it sits over the sidebar). */
export async function closeCorner(page: Page) {
  if (await corner(page).isVisible()) {
    await page.keyboard.press('Escape')
    await expect(corner(page)).toBeHidden()
  }
}

/** Chooses an item of the quiet corner (Settings, Save & restore, Help). */
export async function cornerAction(page: Page, name: string) {
  const panel = await openCorner(page)
  await panel.getByRole('button', { name, exact: true }).click()
}

/** Chooses Day, Night or Sepia in the quiet corner, then closes it. */
export async function setTheme(page: Page, theme: string) {
  const panel = await openCorner(page)
  await panel
    .getByRole('group', { name: 'Theme' })
    .getByRole('button', { name: theme, exact: true })
    .click()
  await page.keyboard.press('Escape')
  await expect(panel).toBeHidden()
}

/** Opens the Trash list in the quiet corner (if closed) and returns it. */
export async function openTrash(page: Page): Promise<Locator> {
  const panel = await openCorner(page)
  const toggle = panel.getByRole('button', { name: /^Trash/ })
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click()
  }
  await expect(
    panel
      .getByText('Trash is empty')
      .or(panel.getByLabel('Restore', { exact: true }))
      .first(),
  ).toBeVisible()
  return panel
}

/** Trash entries, as "title — detail" strings. */
export async function trashEntries(page: Page): Promise<string[]> {
  const entries = corner(page)
    .locator('div.group')
    .filter({ has: page.getByLabel('Restore', { exact: true }) })
  const texts = await entries.allInnerTexts()
  return texts.map((t) =>
    t
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s && !['📓', '📄', '↺', '×'].includes(s))
      .join(' — '),
  )
}

/** Clicks Restore or Delete forever on a Trash entry. */
export async function trashAction(
  page: Page,
  title: string,
  action: 'Restore' | 'Delete forever',
) {
  const entry = corner(page)
    .locator('div.group')
    .filter({ has: page.getByLabel('Restore', { exact: true }) })
    .filter({ hasText: title })
    .first()
  await entry.hover()
  await entry.getByLabel(action, { exact: true }).click()
}

/** Selects `text` (within one line) in the editor, like dragging the mouse. */
export async function selectText(page: Page, text: string) {
  await page.evaluate((wanted) => {
    const root = document.querySelector('.bn-editor')!
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const at = node.textContent!.indexOf(wanted)
      if (at < 0) continue
      const range = document.createRange()
      range.setStart(node, at)
      range.setEnd(node, at + wanted.length)
      const selection = window.getSelection()!
      selection.removeAllRanges()
      selection.addRange(range)
      return
    }
    throw new Error('Text not found: ' + wanted)
  }, text)
}

/** Number of review records in the app database. */
export const cardRecordCount = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open('learning-notes')
        open.onsuccess = () => {
          const count = open.result
            .transaction('cards')
            .objectStore('cards')
            .count()
          count.onsuccess = () => {
            resolve(count.result)
            open.result.close()
          }
        }
      }),
  )

/** Text of the blocks being highlighted after a jump ('' if none). */
export const highlighted = (page: Page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.id === 'reveal' && a.playState === 'running')
      .map((a) => (a.effect as KeyframeEffect | null)?.target?.textContent)
      .join(' | '),
  )

/** Opens the search popup with Ctrl+K and returns it. */
export async function openSearchPopup(page: Page): Promise<Locator> {
  await sidebar(page).waitFor({ state: 'attached' }) // the app has loaded
  await page.keyboard.press('Control+K')
  const popup = page.getByRole('dialog', { name: 'Search' })
  await expect(popup).toBeVisible()
  return popup
}

/** The result list of the Search screen. */
export const searchResults = (page: Page) =>
  page.getByRole('main').getByRole('list', { name: 'Results' })

/** Writes a question and turns it into a card (`total` cards afterwards). */
export async function makeCard(page: Page, question: string, total: number) {
  await typeInEditor(page, question)
  await page.locator('.bn-block-content', { hasText: question }).first().hover()
  await page.locator('.bn-side-menu [draggable="true"]').click()
  await page.getByRole('menuitem', { name: 'Make card' }).click()
  await page.keyboard.type('An answer')
  await expect.poll(() => cardRecordCount(page), { timeout: 3000 }).toBe(total)
}

/** On Save & restore: opens the "More" part (Anki, sample notebook) if closed. */
export async function openMore(page: Page) {
  const more = page.locator('main details').filter({ hasText: 'More' }).first()
  if ((await more.getAttribute('open')) === null) {
    await more.locator('summary').click()
  }
  await expect(more).toHaveAttribute('open', '')
}

/** In the restore dialog: "Add as copies". */
export async function addAsCopies(page: Page) {
  await page
    .getByRole('dialog')
    .getByRole('button', { name: /^Add as copies/ })
    .click()
}

/**
 * Starts the app in a device mode (before the first load), as if it had been
 * picked already: the mode and the five bar settings of its preset. Does
 * nothing once the app has saved a mode, so a reload keeps later changes.
 */
export async function startInMode(
  page: Page,
  mode: 'computer' | 'touch' | 'pencil',
) {
  await page.addInitScript((m) => {
    const key = 'learning-notes:general.deviceMode'
    if (localStorage.getItem(key)) return
    const presets = {
      computer: ['top', 'compact', 'on', 'on'],
      touch: ['top', 'normal', 'off', 'off'],
      pencil: ['top', 'large', 'off', 'off'],
    }[m]
    const set = (k: string, v: string) =>
      localStorage.setItem('learning-notes:' + k, JSON.stringify(v))
    set('general.deviceMode', m)
    set('advanced.barPlacement', presets[0])
    set('advanced.barSize', presets[1])
    set('advanced.hoverTips', presets[2])
    set('advanced.shortcutHints', presets[3])
    set('advanced.barAutoHide', 'off')
  }, mode)
}

/** The docked formatting bar (Touch and Pencil). */
export const dockedBar = (page: Page) => page.locator('[data-bar="docked"]')

/**
 * WCAG contrast of an element: its text colour against what is behind it
 * (the backgrounds behind it, mixed from the page down). With `border`, the
 * border colour is measured against what is outside the element instead.
 */
export function contrastOf(
  locator: Locator,
  what: 'text' | 'border' = 'text',
): Promise<number> {
  return locator.evaluate((el, kind) => {
    type Rgba = [number, number, number, number]
    // Any CSS colour (rgb, color-mix, oklab …) read through a canvas pixel.
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const paint = canvas.getContext('2d', { willReadFrequently: true })!
    const parse = (value: string): Rgba => {
      paint.clearRect(0, 0, 1, 1)
      paint.fillStyle = '#000'
      paint.fillStyle = value
      paint.fillRect(0, 0, 1, 1)
      const d = paint.getImageData(0, 0, 1, 1).data
      return [d[0], d[1], d[2], d[3] / 255]
    }
    const over = (top: Rgba, base: Rgba): Rgba => {
      const a = top[3]
      return [
        top[0] * a + base[0] * (1 - a),
        top[1] * a + base[1] * (1 - a),
        top[2] * a + base[2] * (1 - a),
        1,
      ]
    }
    const chain: Element[] = []
    for (let n: Element | null = el; n; n = n.parentElement) chain.push(n)
    let bg: Rgba = [255, 255, 255, 1]
    // A border sits against what is outside the element, not its own fill.
    for (const n of chain.reverse()) {
      if (kind === 'border' && n === el) continue
      const c = parse(getComputedStyle(n).backgroundColor)
      if (c[3] > 0) bg = over(c, bg)
    }
    const style = getComputedStyle(el)
    const fg = over(
      parse(kind === 'text' ? style.color : style.borderTopColor),
      bg,
    )
    const lum = ([r, g, b]: Rgba) => {
      const f = (v: number) => {
        const s = v / 255
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4
      }
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
    }
    const [hi, lo] = [lum(fg), lum(bg)].sort((a, b) => b - a)
    return (hi + 0.05) / (lo + 0.05)
  }, what)
}

/** Starts the app with a theme chosen (before the first load). */
export async function startInTheme(
  page: Page,
  theme: 'day' | 'night' | 'sepia',
) {
  await page.addInitScript((th) => {
    localStorage.setItem('learning-notes:theme', JSON.stringify(th))
  }, theme)
}

/** A plain red PNG of the given size (a picture big enough to point at). */
export async function solidPng(width: number, height: number): Promise<Buffer> {
  const { deflateSync } = await import('node:zlib')
  const crc = (buf: Buffer) => {
    let c = ~0
    for (const byte of buf) {
      c ^= byte
      for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xedb88320 : c >>> 1
    }
    return ~c >>> 0
  }
  const chunk = (type: string, data: Buffer) => {
    const head = Buffer.alloc(4)
    head.writeUInt32BE(data.length)
    const body = Buffer.concat([Buffer.from(type), data])
    const tail = Buffer.alloc(4)
    tail.writeUInt32BE(crc(body))
    return Buffer.concat([head, body, tail])
  }
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8 // bit depth
  header[9] = 2 // RGB
  const row = Buffer.concat([
    Buffer.from([0]),
    Buffer.from(Array.from({ length: width }, () => [200, 30, 30]).flat()),
  ])
  const raw = Buffer.concat(Array.from({ length: height }, () => row))
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

/** Opens a sidebar group (Tags, Templates …) if it is folded. */
export async function openGroup(page: Page, name: string) {
  const heading = sidebar(page).getByRole('button', { name, exact: true })
  await showSidebar(page)
  if ((await heading.getAttribute('aria-expanded')) !== 'true') {
    await heading.click()
  }
  await expect(heading).toHaveAttribute('aria-expanded', 'true')
}

/** Chooses `child` in the submenu `parent` of the open page's ⋯ menu. */
export async function pageSubAction(
  page: Page,
  parent: string,
  child: string | RegExp,
) {
  await page.getByRole('button', { name: 'More options' }).click()
  await page.getByRole('menuitem', { name: new RegExp(parent) }).click()
  await page
    .getByRole('menu', { name: parent })
    .locator('[role=menuitem],[role=menuitemradio]')
    .filter({ hasText: child })
    .click()
}

/** Opens the full ribbon: the main bar's ⋯ menu, then All tools. */
export async function openRibbon(page: Page) {
  await page.getByRole('button', { name: 'Toolbar menu' }).click()
  await page.getByRole('button', { name: 'All tools', exact: true }).click()
}

/** Touch devices: closes the "Name it" sheet of a new notebook (keeps the default name). */
export async function skipNameSheet(page: Page) {
  const sheet = page.getByTestId('name-sheet')
  try {
    await sheet.waitFor({ state: 'visible', timeout: 2000 })
  } catch {
    return
  }
  await sheet.getByRole('button', { name: 'Cancel' }).click()
  await expect(sheet).toBeHidden()
}
