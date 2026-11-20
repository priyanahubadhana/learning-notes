// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  cardRecordCount,
  createNotebook,
  startInMode,
  typeInEditor,
  waitForSaved,
} from './helpers.ts'
import {
  expectStrokes,
  inkClientBox,
  line,
  savedInk,
  stroke,
  type Pt,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { png } from './fixtures/png.ts'

/**
 * B1 (phase-2-finish.md, Appendix C; docs/features/selection-bar.md): the
 * list of every button of the old selection bars, and a test that fails if
 * one is lost. The list is docs/features/selection-bar-buttons.md; each test
 * here is named after its ids (SB-B01 ...). Every bar is opened as the
 * owner meets it, every button is found, and where the list says "works" one
 * small check shows it does its job. A button the list marks "no" is a
 * `test.fail` with its id: the day it starts to work the test goes green and
 * says so (then the list is updated, never the test weakened).
 *
 * No timers: every wait is a condition. No app file is touched.
 */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'
const PRO = ['tb.pictureEdit', 'tb.selectionMenu', 'tb.lassoOptions']
const TEXT = 'The nucleus holds the DNA'

/** A clipboard the page can read and write (Playwright cannot grant it in WebKit). */
async function stubClipboard(page: Page) {
  await page.addInitScript(() => {
    const w = window as unknown as { __clipOut: string[] }
    w.__clipOut = []
    let held = 'pasted words'
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        read: async () => [
          {
            types: ['text/plain'],
            getType: async () => new Blob([held], { type: 'text/plain' }),
          },
        ],
        readText: async () => held,
        writeText: async (s: string) => {
          held = s
          w.__clipOut.push(s)
        },
        write: async (items: ClipboardItem[]) => {
          for (const it of items) {
            const type = it.types.includes('text/plain')
              ? 'text/plain'
              : it.types[0]
            const blob = await it.getType(type)
            if (type === 'text/plain') held = await blob.text()
          }
          w.__clipOut.push(held)
        },
      },
    })
    // The old box menu copies with the browser's own copy command.
    document.addEventListener('copy', () => w.__clipOut.push('copy'), true)
    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: { query: async () => ({ state: 'granted' }) },
    })
  })
}

/** A page with the given level, in touch mode, switches as given. */
async function open(
  page: Page,
  o: { level?: Level; flags?: string[]; text?: string } = {},
) {
  const level = o.level ?? 'professional'
  await stubClipboard(page)
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
      localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"')
    },
    [level, level === 'professional' ? PRO : []] as const,
  )
  await startInMode(page, 'touch')
  const flags = o.flags ?? []
  await page.goto(flags.length ? `/?flags=${flags.join(',')}` : '/')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, o.text ?? TEXT)
}

/** How many times the page wrote to the (stand-in) clipboard. */
const copied = (page: Page) =>
  page.evaluate(
    () => (window as unknown as { __clipOut: string[] }).__clipOut.length,
  )
/** The titles of every page in the open database. */
const pageTitles = (page: Page) =>
  page.evaluate(
    () =>
      new Promise<string[]>((resolve, reject) => {
        const open = indexedDB.open('learning-notes')
        open.onerror = () => reject(open.error)
        open.onsuccess = () => {
          const db = open.result
          const all = db.transaction('pages').objectStore('pages').getAll()
          all.onsuccess = () => {
            db.close()
            resolve((all.result as { title: string }[]).map((r) => r.title))
          }
        }
      }),
  )
const toast = (page: Page) => page.locator('[data-toast]')

/** The whole first line selected by the keyboard (the Lasso tool must be on). */
async function lineSelected(page: Page) {
  await page.getByText(TEXT).first().click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Shift+Home')
}

/** The editor's text, as the page shows it. */
const words = (page: Page) => page.locator('.bn-editor').first()

/* ------------------------------------------------------------------ */
/* The text mini bar (words picked by a double tap; MiniToolbar.tsx).  */
/* ------------------------------------------------------------------ */

const mini = (page: Page) => page.locator('[data-mini-toolbar]')
const mb = (page: Page, id: string) => mini(page).locator(`[data-mini="${id}"]`)

/** A pen tap at a point, as a trusted-looking pointer event. */
async function penTap(page: Page, at: { x: number; y: number }) {
  await page.evaluate((a) => {
    const make = (name: string) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 9,
        clientX: a.x,
        clientY: a.y,
        bubbles: true,
        cancelable: true,
        isPrimary: true,
        button: 0,
        buttons: name === 'pointerup' ? 0 : 1,
      })
    const el = document.elementFromPoint(a.x, a.y)!
    el.dispatchEvent(make('pointerdown'))
    el.dispatchEvent(make('pointerup'))
  }, at)
}

/** The word "nucleus" picked by a double pen tap: the mini bar shows. */
async function miniOpen(page: Page, o: { level?: Level } = {}) {
  await open(page, { level: o.level })
  await expect(async () => {
    if (await mini(page).isVisible()) return
    const at = await page.evaluate(() => {
      const walker = document.createTreeWalker(
        document.querySelector('.bn-editor')!,
        NodeFilter.SHOW_TEXT,
      )
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const i = (n.textContent ?? '').indexOf('nucleus')
        if (i < 0) continue
        const r = document.createRange()
        r.setStart(n, i)
        r.setEnd(n, i + 7)
        const b = r.getBoundingClientRect()
        return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
      }
      throw new Error('no word')
    })
    await penTap(page, at)
    await penTap(page, { x: at.x + 2, y: at.y + 1 })
    await expect(mini(page)).toBeVisible({ timeout: 1500 })
  }).toPass()
}

const pillCard = (page: Page) => page.locator('[data-pill-card]')
const moreRow = async (page: Page, id: string) => {
  await mb(page, 'more').click()
  return mb(page, id)
}

test.describe('the text mini bar', () => {
  test('SB-B01 Move grip: dragging it moves the bar', async ({ page }) => {
    await miniOpen(page)
    const before = (await mini(page).boundingBox())!
    const g = (await mb(page, 'grip').boundingBox())!
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
    await page.mouse.down()
    await page.mouse.move(g.x + 80, g.y + 220, { steps: 6 })
    await page.mouse.up()
    await expect
      .poll(async () => (await mini(page).boundingBox())!.y - before.y)
      .toBeGreaterThan(150)
  })

  test('SB-B02 Text colour opens the colour card', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'colour').click()
    await expect(
      pillCard(page).locator('[data-card-colours="textColor"]'),
    ).toBeVisible()
  })

  test('SB-B03 Text size steps the size', async ({ page }) => {
    await miniOpen(page)
    const size = () =>
      page.evaluate(() =>
        document.documentElement.style.getPropertyValue('--note-size'),
      )
    const before = await size()
    await mb(page, 'size').click()
    await expect.poll(size).not.toBe(before)
  })

  test('SB-B04 Text style (Aa) opens the style card', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'style').click()
    await expect(pillCard(page)).toBeVisible()
  })

  for (const [id, no] of [
    ['bold', 'SB-B05'],
    ['italic', 'SB-B06'],
    ['highlight', 'SB-B09'],
  ] as const)
    test(`${no} ${id} turns on for the picked words`, async ({ page }) => {
      await miniOpen(page)
      await expect(mb(page, id)).toHaveAttribute('aria-pressed', 'false')
      await mb(page, id).click()
      await expect(mb(page, id)).toHaveAttribute('aria-pressed', 'true')
    })

  test('SB-B07 Alignment turns the line', async ({ page }) => {
    await miniOpen(page)
    const align = () =>
      page
        .locator('.bn-block-content')
        .first()
        .getAttribute('data-text-alignment')
    const before = await align()
    await mb(page, 'align').click()
    await expect.poll(align).not.toBe(before)
  })

  test('SB-B08 List makes a bullet list', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'list').click()
    await expect(
      page.locator('.bn-block-content[data-content-type="bulletListItem"]'),
    ).toHaveCount(1)
  })

  test('SB-B10 Link opens the link box', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'link').click()
    await expect(
      page.getByRole('button', { name: 'Create link' }),
    ).toBeVisible()
  })

  test('SB-B11 Cut takes the words out and copies them', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'cut').click()
    await expect(words(page)).not.toContainText('nucleus')
    await expect(toast(page)).toContainText('Copied')
  })

  test('SB-B12 Copy copies the words', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'copy').click()
    await expect(toast(page)).toContainText('Copied')
    await expect(words(page)).toContainText('nucleus')
  })

  test('SB-B13 Delete removes the words and closes the bar', async ({
    page,
  }) => {
    await miniOpen(page)
    await mb(page, 'delete').click()
    await expect(words(page)).not.toContainText('nucleus')
    await expect(mini(page)).toBeHidden()
  })

  test('SB-B14 More opens the rest', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'more').click()
    await expect(mini(page).locator('[role="group"]')).toBeVisible()
  })

  test('SB-B15 Pin keeps the bar', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'pin').click()
    await expect(mini(page)).toHaveAttribute('data-pinned', 'true')
  })

  test('SB-B16 Close puts the selection away', async ({ page }) => {
    await miniOpen(page)
    await mb(page, 'close').click()
    await expect(mini(page)).toBeHidden()
  })

  test('SB-B17 More: Paste puts plain words in', async ({ page }) => {
    await miniOpen(page)
    await (await moreRow(page, 'paste')).click()
    await expect(words(page)).toContainText('pasted words')
  })

  test('SB-B18 More: Make card', async ({ page }) => {
    await miniOpen(page)
    await (await moreRow(page, 'makeCard')).click()
    await expect.poll(() => cardRecordCount(page)).toBe(1)
  })

  test('SB-B19 More: Add to Summary', async ({ page }) => {
    await miniOpen(page)
    await (await moreRow(page, 'summary')).click()
    await expect(toast(page)).toBeVisible()
  })

  test('SB-B20 More: Key point marks the words', async ({ page }) => {
    await miniOpen(page)
    await (await moreRow(page, 'keyPoint')).click()
    await expect(page.locator('.recall-mark[data-mark="key"]')).toBeVisible()
  })

  test('SB-B21 More: Save to notes says "coming later"', async ({ page }) => {
    await miniOpen(page)
    await (await moreRow(page, 'saveToNotes')).click()
    await expect(toast(page)).toContainText('later update')
  })
})

/* ------------------------------------------------------------------ */
/* Things to select: words, a picture, a drawing, drawing + page.      */
/* ------------------------------------------------------------------ */

const V8 = ['toolbar.v8']

/** A tool of the v8 row (folded into More on a narrow screen). */
async function pickV8(page: Page, name: string) {
  const direct = page.getByTestId(`v8-tool-${name}`)
  if (await direct.isVisible()) return direct.click()
  await page.getByTestId('v8-more').click()
  await page.getByTestId(`v8-fold-${name}`).click()
}

/** A tool of the classic main bar. */
const pickClassic = (page: Page, name: string) =>
  tool(page, name[0]!.toUpperCase() + name.slice(1)).click()

type Kind = 'words' | 'picture' | 'drawing'

/** A picture in the page, picked with a tap. */
async function picturePicked(page: Page) {
  await page.locator('.bn-editor').click({ force: true })
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page.getByTestId('picture-input-photos').setInputFiles({
    name: 'p.png',
    mimeType: 'image/png',
    buffer: png(400, 200),
  })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img').first()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await img.click({ force: true })
  return img
}

/** A loop of small steps round a box (a hand does not jump). */
function loopAround(b: {
  x0: number
  y0: number
  x1: number
  y1: number
}): Pt[] {
  const c: Pt[] = [
    [b.x0 - 16, b.y1 + 14],
    [b.x0 - 16, b.y0 - 14],
    [b.x1 + 16, b.y0 - 14],
    [b.x1 + 16, b.y1 + 14],
    [b.x0 - 12, b.y1 + 12],
  ]
  return c.slice(1).flatMap((p, i) => line(c[i]!, p, 10))
}

/**
 * One line drawn with the Pen and looped with the Lasso. `pick` chooses a
 * tool (the v8 row or the classic bar). The first strokes of a freshly chosen
 * tool can be lost, so each is drawn again until it shows.
 */
async function drawingPicked(
  page: Page,
  pick: (name: 'pen' | 'lasso') => Promise<void>,
  below = 60,
) {
  await pick('pen')
  await expect(page.locator('[data-ink-pad]')).toBeAttached()
  const box = (await page.locator('.bn-block-content').first().boundingBox())!
  await expect(async () => {
    if ((await savedInk(page)).strokes.length === 0)
      await stroke(
        page,
        line([box.x + 20, box.y + below], [box.x + 220, box.y + below]),
      )
    await expectStrokes(page, 1)
  }).toPass()
  await pick('lasso')
  await expect(async () => {
    if (await page.locator('[data-ink-box]').isVisible()) return
    const b = await inkClientBox(page)
    expect(b).not.toBeNull()
    await stroke(page, loopAround(b!))
    await expect(page.locator('[data-ink-box]')).toBeVisible({ timeout: 2000 })
  }).toPass()
}

const selbar = (page: Page) => page.getByTestId('v8-selbar')
const selCard = (page: Page, id: string) => page.getByTestId(`v8-card-${id}`)
const selButton = (page: Page, id: string) => page.getByTestId(`v8-sel-${id}`)
const strokesNow = async (page: Page) => (await savedInk(page)).strokes.length

/** The v8 bar, as the owner meets it: words, a picture, or a drawing picked. */
async function v8Open(page: Page, kind: Kind, level: Level = 'professional') {
  await open(page, { level, flags: V8 })
  if (kind === 'words') {
    await pickV8(page, 'lasso')
    await expect(async () => {
      await lineSelected(page)
      await expect(selbar(page)).toBeVisible({ timeout: 1500 })
    }).toPass()
  } else if (kind === 'picture') await picturePicked(page)
  else await drawingPicked(page, (n) => pickV8(page, n))
  await expect(selbar(page)).toBeVisible()
}

/** Opens the bar's ⋯ list. */
async function v8More(page: Page) {
  await selButton(page, 'more').click()
  const list = selCard(page, 'sel.more').locator('.v8sel-more')
  await expect(list).toBeVisible()
  return list
}
const moreItem = (list: Locator, id: string) =>
  list.locator(`[data-sel="${id}"]`)

test.describe('the v8 selection bar, top row', () => {
  const TOP = [
    ['SB-B22', 'cut', 'Cut'],
    ['SB-B23', 'copy', 'Copy'],
    ['SB-B24', 'paste', 'Paste'],
    ['SB-B25', 'duplicate', 'Duplicate'],
    ['SB-B26', 'colour', 'Colour'],
    ['SB-B27', 'resize', 'Resize'],
    ['SB-B28', 'delete', 'Delete'],
  ] as const
  for (const kind of ['words', 'picture', 'drawing'] as const)
    for (const [no, id, name] of TOP)
      test(`${no} ${name} (${kind})`, async ({ page }) => {
        await v8Open(page, kind)
        const b = selButton(page, id)
        await expect(b).toBeVisible()
        await b.click()
        const imgs = page.locator('.bn-editor img')
        const colours = page.getByText('Highlight color', { exact: true })
        if (kind === 'words') {
          if (id === 'cut' || id === 'delete')
            await expect(words(page)).not.toContainText('nucleus')
          if (id === 'copy') await expect(toast(page)).toContainText('Copied')
          if (id === 'paste')
            await expect(words(page)).toContainText('pasted words')
          if (id === 'duplicate')
            await expect(
              page.locator('.bn-block-content', { hasText: TEXT }),
            ).toHaveCount(2)
          if (id === 'resize')
            await expect(selCard(page, 'sel.size')).toBeVisible()
          if (id === 'colour') await expect(colours).toBeVisible()
        } else if (kind === 'picture') {
          if (id === 'cut' || id === 'delete') await expect(imgs).toHaveCount(0)
          if (id === 'duplicate') await expect(imgs).toHaveCount(2)
          if (id === 'copy')
            await expect.poll(() => copied(page)).toBeGreaterThan(0)
          if (id === 'resize')
            await expect(selCard(page, 'sel.resize')).toBeVisible()
          if (id === 'paste')
            await expect(words(page)).toContainText('pasted words')
          if (id === 'colour') await expect(colours).toBeVisible()
        } else {
          if (id === 'cut' || id === 'delete')
            await expect.poll(() => strokesNow(page)).toBe(0)
          if (id === 'duplicate')
            await expect.poll(() => strokesNow(page)).toBe(2)
          if (id === 'copy')
            await expect(toast(page)).toContainText('Picture copied')
          if (id === 'resize')
            await expect(selCard(page, 'sel.resize')).toBeVisible()
          if (id === 'colour')
            await expect(selCard(page, 'sel.colour')).toBeVisible()
          if (id === 'paste') {
            // Paste puts back a drawing that was copied first.
            await selButton(page, 'copy').click()
            await expect(toast(page)).toContainText('Picture copied')
            await b.click()
            await expect.poll(() => strokesNow(page)).toBe(2)
          }
        }
      })
})

test.describe('the v8 selection bar, Edit picture and ⋯', () => {
  test('SB-B29 Edit picture (Professional, picture) opens the picture list', async ({
    page,
  }) => {
    await v8Open(page, 'picture')
    await selButton(page, 'picture').click()
    await expect(selCard(page, 'sel.picture')).toBeVisible()
    await expect(page.getByTestId('v8-sel-picture-list')).toContainText(
      'Border',
    )
  })

  test('SB-B29 Edit picture is not on the Beginner bar', async ({ page }) => {
    await v8Open(page, 'picture', 'beginner')
    await expect(selButton(page, 'picture')).toHaveCount(0)
  })

  test('SB-B30 ⋯ opens the list (words)', async ({ page }) => {
    await v8Open(page, 'words')
    const list = await v8More(page)
    for (const id of [
      'convert',
      'screenshot',
      'keyPoint',
      'makeCard',
      'summary',
      'saveToNotes',
      'move',
      'scale',
      'rotate',
      'deselect',
    ])
      await expect(moreItem(list, id)).toBeVisible()
  })

  test('SB-B30 ⋯ on the Beginner bar lists only Deselect', async ({ page }) => {
    await v8Open(page, 'words', 'beginner')
    const list = await v8More(page)
    await expect(list.locator('[data-sel]')).toHaveCount(1)
    await expect(moreItem(list, 'deselect')).toBeVisible()
  })

  test('SB-B31 ⋯ Deselect puts the selection away (words)', async ({
    page,
  }) => {
    await v8Open(page, 'words', 'beginner')
    await moreItem(await v8More(page), 'deselect').click()
    await expect(selbar(page)).toBeHidden()
    await expect(words(page)).toContainText('nucleus')
  })

  test('SB-B31 ⋯ Deselect puts the selection away (drawing)', async ({
    page,
  }) => {
    await v8Open(page, 'drawing')
    await moreItem(await v8More(page), 'deselect').click()
    await expect(page.locator('[data-ink-box]')).toBeHidden()
  })

  test('SB-B32 ⋯ Border (picture) cycles the border', async ({ page }) => {
    await v8Open(page, 'picture', 'beginner')
    const img = page.locator('.bn-editor img').first()
    await page.getByTestId('v8-sel-more').click()
    await selCard(page, 'sel.more')
      .locator('.v8sel-more')
      .getByRole('button', { name: 'Border' })
      .click()
    await expect
      .poll(() => img.evaluate((el) => getComputedStyle(el).borderTopWidth))
      .not.toBe('0px')
  })
})

/** ⋯ rows: what each does on words and on a drawing. */
const MORE_ROWS = [
  ['SB-B33', 'convert', 'Convert to text'],
  ['SB-B34', 'screenshot', 'Screenshot'],
  ['SB-B35', 'keyPoint', 'Key point'],
  ['SB-B36', 'makeCard', 'Make card'],
  ['SB-B37', 'summary', 'Add to Summary'],
  ['SB-B38', 'saveToNotes', 'Save to notes'],
  ['SB-B39', 'move', 'Move'],
  ['SB-B40', 'scale', 'Scale'],
  ['SB-B41', 'rotate', 'Rotate'],
] as const

test.describe('the v8 selection bar, ⋯ rows on words', () => {
  for (const [no, id, name] of MORE_ROWS)
    test(`${no} ⋯ ${name} (words)`, async ({ page }) => {
      await v8Open(page, 'words')
      await moreItem(await v8More(page), id).click()
      if (id === 'keyPoint')
        await expect(
          page.locator('.recall-mark[data-mark="key"]'),
        ).toBeVisible()
      else if (id === 'makeCard')
        await expect.poll(() => cardRecordCount(page)).toBe(1)
      else if (id === 'summary') await expect(toast(page)).toBeVisible()
      else if (id === 'saveToNotes')
        await expect.poll(() => pageTitles(page)).toContain('Highlights')
      else {
        // Convert, Screenshot, Move, Scale and Rotate are for drawings.
        await expect(toast(page)).toContainText('works on drawings')
      }
    })
})

test.describe('the v8 selection bar, ⋯ rows on a drawing', () => {
  for (const [no, id, name] of MORE_ROWS)
    test(`${no} ⋯ ${name} (drawing)`, async ({ page }) => {
      await v8Open(page, 'drawing')
      const list = await v8More(page)
      if (id === 'screenshot') {
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          moreItem(list, id).click(),
        ])
        expect(download.suggestedFilename()).toContain('.png')
        return
      }
      if (id === 'rotate') {
        const before = (await page.locator('[data-ink-box]').boundingBox())!
        await moreItem(list, id).click()
        await expect
          .poll(
            async () =>
              (await page.locator('[data-ink-box]').boundingBox())!.height,
          )
          .toBeGreaterThan(before.height + 20)
        return
      }
      await moreItem(list, id).click()
      if (id === 'convert')
        await expect(page.getByRole('dialog').first()).toBeVisible()
      else if (id === 'makeCard')
        await expect(page.getByRole('dialog').first()).toBeVisible()
      else if (id === 'summary')
        await expect(toast(page)).toContainText('Name this drawing first')
      else if (id === 'scale')
        await expect(selCard(page, 'sel.resize')).toBeVisible()
      else if (id === 'move')
        await expect(selCard(page, 'sel.move')).toBeVisible()
      else await expect(toast(page)).toContainText('works on words')
    })
})

/* ------------------------------------------------------------------ */
/* Boxes: the old box bar (switch off) and the one bar (textbox.v2).   */
/* ------------------------------------------------------------------ */

const EXTRA = '[data-paper-box]:not([data-paper-box="main"])'

/**
 * A page with one extra box ("Box one", picked: not typing). `v2` turns the
 * one bar on; off, the old box bar shows. Computer mode, as the box specs.
 */
async function boxOpen(page: Page, v2: boolean, o: { second?: boolean } = {}) {
  await stubClipboard(page)
  await page.addInitScript(() =>
    localStorage.setItem('learning-notes:advanced.autoSwitch', '"off"'),
  )
  await startInMode(page, 'computer')
  await page.goto(v2 ? '/?flags=textbox.v2' : '/')
  await createNotebook(page, 'Paper', 'Boxes')
  await typeInEditor(page, 'Main text')
  const box = await addBoxAt(page, 'Box one', 0.2, 60)
  if (o.second) await addBoxAt(page, 'Box two', 0.2, 170)
  await pickBox(page, box)
  return box
}

/** A new box `down` px under the first box's text, with a line typed in it. */
async function addBoxAt(page: Page, text: string, fx: number, down: number) {
  const sheet = (await page.locator('[data-paper-sheet="1"]').boundingBox())!
  const main = (await page.locator('[data-paper-box="main"]').boundingBox())!
  const n = await page.locator(EXTRA).count()
  await page.mouse.click(
    sheet.x + sheet.width * fx,
    main.y + main.height + down,
  )
  const box = page.locator(EXTRA).nth(n)
  await expect(page.locator(EXTRA)).toHaveCount(n + 1)
  await expect(box.locator('.bn-editor')).toBeFocused()
  await page.keyboard.type(text)
  await waitForSaved(page)
  await page.evaluate(() => (document.activeElement as HTMLElement).blur())
  return box
}

/** One tap on the edge of the box until it is picked and not typed in. */
async function pickBox(page: Page, box: Locator) {
  await expect(async () => {
    const r = (await box.boundingBox())!
    await page.mouse.click(r.x - 5, r.y + r.height / 2)
    await expect(box).toHaveAttribute('data-picked', '', { timeout: 1500 })
    await expect(box).not.toHaveAttribute('data-typing', '')
  }).toPass()
}

const boxBar = (page: Page) => page.locator('[data-box-bar]').first()
const boxCount = (page: Page) => page.locator(EXTRA)

test.describe('the old box bar (one bar switch off)', () => {
  test.use({ viewport: { width: 1336, height: 1100 } })
  const old = (page: Page, id: string) =>
    boxBar(page).locator(`[data-box-bar-action="${id}"]`)

  test('SB-B42 old box bar: Box style opens the style card', async ({
    page,
  }) => {
    await boxOpen(page, false)
    await old(page, 'style').click()
    await expect(page.locator('[data-box-style-panel]')).toBeVisible()
  })

  test('SB-B43 old box bar: Duplicate box makes a second box', async ({
    page,
  }) => {
    await boxOpen(page, false)
    await old(page, 'duplicate').click()
    await expect(boxCount(page)).toHaveCount(2)
  })

  test('SB-B44 old box bar: Cut takes the box away and copies it', async ({
    page,
  }) => {
    await boxOpen(page, false)
    await old(page, 'cut').click()
    await expect(boxCount(page)).toHaveCount(0)
    await expect.poll(() => copied(page)).toBeGreaterThan(0)
  })

  test('SB-B45 old box bar: Copy copies the words', async ({ page }) => {
    await boxOpen(page, false)
    await old(page, 'copy').click()
    await expect.poll(() => copied(page)).toBeGreaterThan(0)
    await expect(boxCount(page)).toHaveCount(1)
  })

  test('SB-B46 old box bar: Delete box removes it', async ({ page }) => {
    await boxOpen(page, false)
    await old(page, 'delete').click()
    await expect(boxCount(page)).toHaveCount(0)
  })

  test('SB-B47 old box bar: ⋯ opens the box menu', async ({ page }) => {
    await boxOpen(page, false)
    await old(page, 'more').click()
    await expect(page.getByRole('menu')).toBeVisible()
    for (const name of [
      'Box style',
      'Copy',
      'Cut',
      'Duplicate',
      'Colour',
      'Layout',
      'Delete box',
    ])
      await expect(
        page.getByRole('menuitem', { name: new RegExp(`^${name}`) }),
      ).toBeVisible()
  })
})

test.describe('the old box ⋯ menu (one bar switch off)', () => {
  test.use({ viewport: { width: 1336, height: 1100 } })
  const ROWS = [
    ['SB-B48', 'Box style'],
    ['SB-B49', 'Copy'],
    ['SB-B50', 'Cut'],
    ['SB-B51', 'Duplicate'],
    ['SB-B52', 'Colour'],
    ['SB-B53', 'Layout'],
    ['SB-B54', 'Delete box'],
  ] as const
  for (const [no, name] of ROWS)
    test(`${no} old ⋯ menu: ${name}`, async ({ page }) => {
      await boxOpen(page, false)
      await boxBar(page).locator('[data-box-bar-action="more"]').click()
      await page.getByRole('menuitem', { name: new RegExp(`^${name}`) }).click()
      if (name === 'Box style')
        await expect(page.locator('[data-box-style-panel]')).toBeVisible()
      if (name === 'Copy')
        await expect.poll(() => copied(page)).toBeGreaterThan(0)
      if (name === 'Cut') await expect(boxCount(page)).toHaveCount(0)
      if (name === 'Duplicate') await expect(boxCount(page)).toHaveCount(2)
      if (name === 'Colour')
        await expect(page.getByRole('menuitemradio').first()).toBeVisible()
      if (name === 'Layout')
        await expect(page.getByRole('dialog')).toBeVisible()
      if (name === 'Delete box') await expect(boxCount(page)).toHaveCount(0)
    })
})

const one = (page: Page, id: string) => page.getByTestId(`ob-${id}`)
const pop = (page: Page, id: string) =>
  page.locator(`[data-onebar-pop="${id}"]`)
const more = (page: Page, id: string) => page.locator(`[data-box-more="${id}"]`)

test.describe('the one bar of a box (textbox.v2)', () => {
  test.use({ viewport: { width: 1336, height: 1100 } })

  test('SB-B60 one bar: Move bar grip drags the bar, then Pin shows', async ({
    page,
  }) => {
    await boxOpen(page, true)
    await expect(one(page, 'grip')).toBeVisible()
    const before = (await page.getByTestId('object-bar').boundingBox())!
    const g = (await one(page, 'grip').boundingBox())!
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
    await page.mouse.down()
    await page.mouse.move(g.x + 60, g.y + 200, { steps: 8 })
    await page.mouse.up()
    await expect(one(page, 'pin')).toBeVisible()
    const after = (await page.getByTestId('object-bar').boundingBox())!
    expect(
      Math.abs(after.y - before.y) + Math.abs(after.x - before.x),
    ).toBeGreaterThan(40)
  })

  test('SB-B61 one bar: Pin bar here pins it', async ({ page }) => {
    await boxOpen(page, true)
    const g = (await one(page, 'grip').boundingBox())!
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2)
    await page.mouse.down()
    await page.mouse.move(g.x + 60, g.y + 200, { steps: 8 })
    await page.mouse.up()
    await one(page, 'pin').click()
    await expect(one(page, 'pin')).toHaveAttribute('aria-pressed', 'true')
  })

  test('SB-B62 one bar: Text colour opens colours and a pick colours the words', async ({
    page,
  }) => {
    const box = await boxOpen(page, true)
    await one(page, 'colour').click()
    await expect(pop(page, 'colour')).toBeVisible()
    await pop(page, 'colour').getByRole('button', { name: /^Red/ }).click()
    await expect(
      box.locator('[data-style-type="textColor"][data-value="red"]').first(),
    ).toBeVisible()
  })

  test('SB-B63 one bar: Size opens sizes and a pick sets it', async ({
    page,
  }) => {
    await boxOpen(page, true)
    const before = await one(page, 'size').innerText()
    await one(page, 'size').click()
    await expect(pop(page, 'size')).toBeVisible()
    await pop(page, 'size').getByRole('button', { name: 'Larger' }).click()
    await expect.poll(() => one(page, 'size').innerText()).not.toBe(before)
  })

  test('SB-B64 one bar: Font opens fonts and a pick sets one', async ({
    page,
  }) => {
    const box = await boxOpen(page, true)
    await one(page, 'font').click()
    await expect(pop(page, 'font')).toBeVisible()
    await pop(page, 'font').getByRole('button').nth(1).click()
    await expect(box.locator('[data-look-face]').first()).toBeVisible()
  })

  test('SB-B65 one bar: Bold and italic strip has Bold, Italic, Underline, Strike, Highlight', async ({
    page,
  }) => {
    const box = await boxOpen(page, true)
    await one(page, 'bi').click()
    const p = pop(page, 'bi')
    for (const name of ['Bold', 'Italic', 'Underline', 'Strike', 'Highlight'])
      await expect(p.getByRole('button', { name })).toBeVisible()
    await p.getByRole('button', { name: 'Bold' }).click()
    await expect(box.locator('strong, b').first()).toBeVisible()
  })

  test('SB-B66 one bar: Align strip aligns the box and sets line spacing', async ({
    page,
  }) => {
    const box = await boxOpen(page, true)
    await one(page, 'align').click()
    const p = pop(page, 'align')
    await expect(p.getByRole('button', { name: 'Line spacing' })).toBeVisible()
    await p.getByRole('button', { name: 'Align right' }).click()
    await expect(
      box.locator('[data-text-alignment="right"]').first(),
    ).toBeVisible()
  })

  test('SB-B67 one bar: List strip makes a list', async ({ page }) => {
    const box = await boxOpen(page, true)
    await one(page, 'list').click()
    await expect(pop(page, 'list')).toBeVisible()
    await pop(page, 'list').getByRole('button').first().click()
    await expect(
      box
        .locator('.bn-block-content:not([data-content-type="paragraph"])')
        .first(),
    ).toBeVisible()
  })

  test('SB-B68 one bar: Box style (fill) opens the Box card', async ({
    page,
  }) => {
    await boxOpen(page, true)
    await one(page, 'style').click()
    await expect(page.getByTestId('bc-tab-box')).toBeVisible()
  })

  test('SB-B69 one bar: Cut takes the box away and copies it', async ({
    page,
  }) => {
    await boxOpen(page, true)
    await one(page, 'cut').click()
    await expect(boxCount(page)).toHaveCount(0)
    await expect.poll(() => copied(page)).toBeGreaterThan(0)
  })

  test('SB-B70 one bar: Paste puts the clipboard in the box', async ({
    page,
  }) => {
    const box = await boxOpen(page, true)
    await one(page, 'pastenow').click()
    await expect(box).toContainText('pasted words')
  })

  test('SB-B71 one bar: Paste options (▾) opens Keep look, Plain text, More', async ({
    page,
  }) => {
    await boxOpen(page, true)
    await one(page, 'paste').click()
    await expect(pop(page, 'paste')).toBeVisible()
    await expect(pop(page, 'paste').getByRole('button')).not.toHaveCount(0)
  })

  test('SB-B72 one bar: Delete box removes it', async ({ page }) => {
    await boxOpen(page, true)
    await one(page, 'delete').click()
    await expect(boxCount(page)).toHaveCount(0)
  })

  test('SB-B73 one bar: ⋯ opens the Box actions list', async ({ page }) => {
    await boxOpen(page, true)
    await one(page, 'boxmore').click()
    for (const id of [
      'copy',
      'duplicate',
      'lock',
      'style',
      'layout',
      'text',
      'up',
      'down',
      'group',
      'delete',
    ])
      await expect(more(page, id)).toBeVisible()
  })
})

test.describe('the one bar ⋯ list rows', () => {
  test.use({ viewport: { width: 1336, height: 1100 } })
  const open2 = async (page: Page) => {
    const box = await boxOpen(page, true, { second: true })
    await one(page, 'boxmore').click()
    await expect(more(page, 'copy')).toBeVisible()
    return box
  }
  test('SB-B74 ⋯ list: Copy', async ({ page }) => {
    await open2(page)
    await more(page, 'copy').click()
    await expect.poll(() => copied(page)).toBeGreaterThan(0)
  })
  test('SB-B75 ⋯ list: Duplicate box', async ({ page }) => {
    await open2(page)
    await more(page, 'duplicate').click()
    await expect(boxCount(page)).toHaveCount(3)
  })
  test('SB-B76 ⋯ list: Lock in place', async ({ page }) => {
    const box = await open2(page)
    await more(page, 'lock').click()
    await one(page, 'boxmore').click()
    await expect(more(page, 'lock')).toContainText('Unlock')
    await expect(box).toBeVisible()
  })
  test('SB-B77 ⋯ list: Box style…', async ({ page }) => {
    await open2(page)
    await more(page, 'style').click()
    await expect(page.getByTestId('bc-tab-box')).toBeVisible()
  })
  test('SB-B78 ⋯ list: Layout…', async ({ page }) => {
    await open2(page)
    await more(page, 'layout').click()
    await expect(page.getByTestId('bc-tab-box')).toBeVisible()
  })
  test('SB-B79 ⋯ list: Text options…', async ({ page }) => {
    await open2(page)
    await more(page, 'text').click()
    await expect(
      page.locator('[data-pill-card], [data-text-options]').first(),
    ).toBeVisible()
  })
  test('SB-B80 ⋯ list: Move up / Move down reorder boxes', async ({ page }) => {
    await open2(page)
    await expect(more(page, 'down')).toBeEnabled()
    await more(page, 'down').click()
    await expect(boxCount(page).first()).toContainText('Box two')
  })
  test('SB-B81 ⋯ list: Group waits for two boxes (tip)', async ({ page }) => {
    await open2(page)
    await more(page, 'group').click({ force: true })
    await expect(toast(page)).toBeVisible()
  })
  test('SB-B82 ⋯ list: Delete box', async ({ page }) => {
    await open2(page)
    await more(page, 'delete').click()
    await expect(boxCount(page)).toHaveCount(1)
  })
})
