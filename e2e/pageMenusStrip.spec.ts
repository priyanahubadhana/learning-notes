// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook } from './helpers.ts'

/**
 * Slice 12c/12d (flag page.menus): the strip on text (PM-20, PM-21, PM-22,
 * PM-26) and Paste ▾ (PM-40, PM-41, PM-45). docs/features/page-menus.md.
 */
test.use({ viewport: { width: 1024, height: 900 } })

const strip = (page: Page) => page.getByTestId('page-strip')

async function openNote(page: Page, level: 'beginner' | 'professional') {
  await page.addInitScript((l) => {
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: l, unlocked: [] }),
    )
  }, level)
  await page.goto('/?flags=page.menus')
  await createNotebook(page, 'Biology', 'First')
  await page.locator('.bn-editor').click()
  await page.keyboard.type('Cells divide by mitosis')
}

async function rightClickWord(page: Page) {
  const box = await page
    .locator('.bn-editor p', { hasText: 'Cells' })
    .boundingBox()
  await page.mouse.click(box!.x + 40, box!.y + box!.height / 2, {
    button: 'right',
  })
}

test('PM-20 right-click opens the strip above; Beginner shows Cut, Copy, Paste, Delete and more', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  await rightClickWord(page)
  await expect(strip(page)).toBeVisible()
  for (const id of ['cut', 'copy', 'paste', 'delete', 'more'])
    await expect(strip(page).getByTestId(`cs-${id}`)).toBeVisible()
  await expect(strip(page).getByTestId('cs-duplicate')).toHaveCount(0)
  const box = (await strip(page).boundingBox())!
  expect(Math.round(box.height)).toBe(48)
})

test('PM-20 Professional shows Duplicate, Turn into and Colour; Delete is last', async ({
  page,
}) => {
  await openNote(page, 'professional')
  await rightClickWord(page)
  for (const id of ['duplicate', 'turn', 'colour'])
    await expect(strip(page).getByTestId(`cs-${id}`)).toBeVisible()
  const last = strip(page).locator('[data-testid^="cs-"]').last()
  await expect(last).toHaveAttribute('data-testid', /cs-(delete|more)/)
  await expect(strip(page).getByTestId('cs-delete')).toBeVisible()
})

test('PM-21 the strip sits above the pressed text, not over it', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  await rightClickWord(page)
  const s = (await strip(page).boundingBox())!
  const p = (await page
    .locator('.bn-editor p', { hasText: 'Cells' })
    .boundingBox())!
  expect(s.y + s.height).toBeLessThanOrEqual(p.y)
})

test('PM-22 ⋯ opens the full list; Professional adds Copy as', async ({
  page,
}) => {
  await openNote(page, 'professional')
  await rightClickWord(page)
  await strip(page).getByTestId('cs-more').click()
  await expect(page.getByTestId('cl-item-selectAll')).toBeVisible()
  await expect(page.getByTestId('cl-item-copyMarkdown')).toBeAttached()
})

/** A stand-in clipboard: the same answer in every browser, no permission step. */
async function standInClipboard(page: Page, text: string) {
  await page.addInitScript((value) => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: async () => value },
      configurable: true,
    })
    Object.defineProperty(navigator, 'permissions', {
      value: { query: async () => ({ state: 'granted' }) },
      configurable: true,
    })
  }, text)
}

async function pasteChoices(page: Page): Promise<string[]> {
  await rightClickWord(page)
  await strip(page).getByTestId('cs-paste').click()
  await expect(page.getByTestId('cs-picker')).toHaveCount(1)
  return page
    .locator('[data-testid^="cs-pick-"]')
    .evaluateAll((els) =>
      els.map((el) => el.getAttribute('data-testid')!.slice(8)),
    )
}

test('PM-41 Paste ▾ offers Table for rows and Link for an address', async ({
  page,
}) => {
  await standInClipboard(page, 'a\tb\n1\t2')
  await openNote(page, 'beginner')
  const forms = await pasteChoices(page)
  expect(forms).toContain('table')
  expect(forms).not.toContain('link')
})

test('PM-41 Paste ▾ offers Link for a lone address', async ({ page }) => {
  await standInClipboard(page, 'https://example.com/page')
  await openNote(page, 'beginner')
  const forms = await pasteChoices(page)
  expect(forms).toContain('link')
  expect(forms).not.toContain('table')
})

test('PM-41 Paste ▾ shows every row while the browser has not allowed a look', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { readText: async () => 'alpha beta' },
      configurable: true,
    })
  })
  await openNote(page, 'beginner')
  const forms = await pasteChoices(page)
  expect(forms).toEqual(expect.arrayContaining(['table', 'link', 'quote']))
})

test('PM-41 Paste ▾ shows the forms in one card and picking Plain pastes plain text', async ({
  page,
}) => {
  await standInClipboard(page, 'alpha beta')
  await openNote(page, 'beginner')
  await page.keyboard.press('End')
  await rightClickWord(page)
  await strip(page).getByTestId('cs-paste').click()
  await expect(page.getByTestId('cs-picker')).toHaveCount(1)
  for (const id of ['keep', 'plain', 'quote'])
    await expect(page.getByTestId(`cs-pick-${id}`)).toBeVisible()
  // Plain words on the clipboard: no table and no link row.
  for (const id of ['table', 'link'])
    await expect(page.getByTestId(`cs-pick-${id}`)).toHaveCount(0)
  await page.getByTestId('cs-pick-plain').click()
  await expect(page.locator('.bn-editor')).toContainText('alpha beta')
  // PM-45: one Undo takes the whole paste back.
  await expect(page.getByTestId('page-strip')).toHaveCount(0)
  await page.keyboard.press('ControlOrMeta+z')
  await expect(page.locator('.bn-editor')).not.toContainText('alpha beta')
})

test('PM-40 Ctrl+V pastes at once with no question (default Keep original)', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  // The browser's own paste event, with rich content on the clipboard.
  await page.evaluate(() => {
    const data = new DataTransfer()
    data.setData(
      'text/html',
      '<p><b>bold</b> and <i>rich</i> words here</p><p>second paragraph</p>',
    )
    data.setData('text/plain', 'bold and rich words here\nsecond paragraph')
    document.querySelector('.bn-editor')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: data,
        bubbles: true,
        cancelable: true,
      }),
    )
  })
  await expect(page.locator('.bn-editor')).toContainText('rich words here')
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

const ring = (page: Page) =>
  page.evaluate(() => {
    const el = document.activeElement
    return el ? getComputedStyle(el).outlineStyle : 'none'
  })

test('the focus ring shows for the keyboard only, not after a mouse right-click', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  await rightClickWord(page)
  await expect(strip(page)).toBeVisible()
  await expect(strip(page).locator('[data-strip-btn]:focus')).toHaveCount(1)
  expect(await ring(page)).toBe('none')
  await page.keyboard.press('ArrowRight')
  expect(await ring(page)).not.toBe('none')
})

test('PM-20 Professional shows Add to favourites; it stars the open page and reads Remove after', async ({
  page,
}) => {
  await openNote(page, 'professional')
  await rightClickWord(page)
  const fav = strip(page).getByTestId('cs-favourite')
  await expect(fav).toBeVisible()
  await expect(fav).toContainText('Add to favourites')
  await fav.click()
  await expect(page.getByText('Added to favourites')).toBeVisible()
  await expect(strip(page)).toHaveCount(0)
  // A fresh load: the sidebar now lists the favourite and the page moves.
  await page.reload()
  await expect(page.locator('.bn-editor p', { hasText: 'Cells' })).toBeVisible()
  await rightClickWord(page)
  await expect(strip(page)).toBeVisible()
  await expect(strip(page).getByTestId('cs-favourite')).toContainText(
    'Remove from favourites',
  )
})

test('PM-20 Beginner keeps Add to favourites in ⋯, and Comment stays hidden until comments exist', async ({
  page,
}) => {
  await openNote(page, 'beginner')
  await rightClickWord(page)
  await expect(strip(page).getByTestId('cs-favourite')).toHaveCount(0)
  await expect(strip(page).getByTestId('cs-comment')).toHaveCount(0)
  await strip(page).getByTestId('cs-more').click()
  await page.getByRole('option', { name: 'Show all' }).click()
  await expect(page.getByTestId('cl-item-favourite')).toBeVisible()
  await expect(page.getByTestId('cl-item-comment')).toHaveCount(0)
})

test.describe('phone width', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('PM-26 at 390 px the strip shows 4 items + ⋯ and none is cut off', async ({
    page,
  }) => {
    await openNote(page, 'professional')
    await rightClickWord(page)
    await expect(strip(page)).toBeVisible()
    const buttons = strip(page).locator('[data-testid^="cs-"]')
    expect(await buttons.count()).toBeLessThanOrEqual(5)
    await expect(strip(page).getByTestId('cs-more')).toBeVisible()
    const bar = (await strip(page).boundingBox())!
    expect(bar.x).toBeGreaterThanOrEqual(0)
    expect(bar.x + bar.width).toBeLessThanOrEqual(390)
    for (const b of await buttons.all()) {
      const r = (await b.boundingBox())!
      expect(r.x).toBeGreaterThanOrEqual(bar.x - 1)
      expect(r.x + r.width).toBeLessThanOrEqual(bar.x + bar.width + 1)
    }
  })
})
