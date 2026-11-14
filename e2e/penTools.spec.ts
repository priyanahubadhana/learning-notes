// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { copiedText, spyClipboard } from './clipboardSpy.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * The Pencil depends on the active tool (owner, real iPad): free to write
 * under Text, selects under Lasso, never opens the keyboard or focuses the
 * page under the ink tools and Read. A double-tap selects a word, a
 * triple-tap the line, then the mini toolbar shows. Simulated pen events.
 */

test.use({
  viewport: { width: 1024, height: 900 },
  hasTouch: true,
})

test.beforeEach(async ({ context, browserName, page }) => {
  await spyClipboard(page)
  // WebKit has no clipboard permissions; the clipboard checks run in Chromium.
  if (browserName === 'chromium') {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  }
})

type Pt = { x: number; y: number }

/** Where a word of the page is. */
async function wordPoint(page: Page, word: string): Promise<Pt> {
  return page.evaluate((w) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const at = (n.textContent ?? '').indexOf(w)
      if (at < 0) continue
      const r = document.createRange()
      r.setStart(n, at)
      r.setEnd(n, at + w.length)
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('word not found')
  }, word)
}

/** One tap with a pen (or touch): returns whether pointerdown was cancelled. */
async function tap(page: Page, at: Pt, type: 'pen' | 'touch' = 'pen') {
  return page.evaluate(
    ({ at, type }) => {
      const make = (name: string) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: 9,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          isPrimary: true,
          button: 0,
          buttons: name === 'pointerup' ? 0 : 1,
        })
      const el = document.elementFromPoint(at.x, at.y)!
      const kept = el.dispatchEvent(make('pointerdown'))
      el.dispatchEvent(make('pointerup'))
      return !kept
    },
    { at, type },
  )
}

const inputmode = (page: Page) =>
  page.locator('.bn-editor').getAttribute('inputmode')
const focusedInEditor = (page: Page) =>
  page.evaluate(() =>
    document.querySelector('.bn-editor')!.contains(document.activeElement),
  )
const selection = (page: Page) =>
  page.evaluate(() => window.getSelection()?.toString() ?? '')

/** A pen touch in the page, then a beforeinput; was the input refused? */
async function refused(page: Page, inputType: string, at: Pt) {
  return page.evaluate(
    ({ inputType, at }) => {
      const el = document.elementFromPoint(at.x, at.y)!
      el.dispatchEvent(
        new PointerEvent('pointerdown', {
          pointerType: 'pen',
          pointerId: 3,
          clientX: at.x,
          clientY: at.y,
          bubbles: true,
          cancelable: true,
          button: 0,
          buttons: 1,
          isPrimary: true,
        }),
      )
      const editor = document.querySelector('.bn-editor')!
      const input = new InputEvent('beforeinput', {
        inputType,
        data: 'x',
        bubbles: true,
        cancelable: true,
      })
      editor.dispatchEvent(input)
      el.dispatchEvent(
        new PointerEvent('pointerup', {
          pointerType: 'pen',
          pointerId: 3,
          bubbles: true,
          cancelable: true,
          button: 0,
          isPrimary: true,
        }),
      )
      return input.defaultPrevented
    },
    { inputType, at },
  )
}

test('Text tool: Scribble handwriting and small deletes are not blocked', async ({
  page,
}) => {
  await openNote(page)
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  const at = await wordPoint(page, 'nucleus')
  expect(await refused(page, 'insertReplacementText', at)).toBe(false)
  expect(await refused(page, 'insertText', at)).toBe(false)
  expect(await refused(page, 'deleteContentBackward', at)).toBe(false)
})

test('under Lasso (and the ink tools) the Pencil never reaches the words', async ({
  page,
}) => {
  await openNote(page)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  const at = await wordPoint(page, 'nucleus')
  // Under the Lasso the pad owns the Pencil and the page is not editable
  // while it is down: iPadOS Scribble has nothing to write in.
  const ev = (type: string) =>
    page.evaluate(
      ({ type, at }) => {
        const el = document.elementFromPoint(at.x, at.y)!
        el.dispatchEvent(
          new PointerEvent(type, {
            pointerType: 'pen',
            pointerId: 17,
            clientX: at.x,
            clientY: at.y,
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: type === 'pointerup' ? 0 : 1,
            isPrimary: true,
          }),
        )
        return el.hasAttribute('data-ink-pad')
      },
      { type, at },
    )
  expect(await ev('pointerdown')).toBe(true)
  await expect(page.locator('.bn-editor')).toHaveAttribute(
    'contenteditable',
    'false',
  )
  await ev('pointerup')
  await expect(page.locator('.bn-editor')).toHaveAttribute(
    'contenteditable',
    'true',
  )
  // Under the ink tools a drawing pad covers the words: the Pencil draws, and
  // can never reach the text.
  await tool(page, 'Pen').click()
  const under = await wordPoint(page, 'nucleus')
  const top = await page.evaluate(
    ({ x, y }) => document.elementFromPoint(x, y)?.hasAttribute('data-ink-pad'),
    under,
  )
  expect(top).toBe(true)
})

test('Lasso with the Text filter on: a loop around a line selects it whole', async ({
  page,
}) => {
  await openNote(page, 'touch', { 'ink.lasso': { text: true } })
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  const b = (await page.locator('.bn-block-content').first().boundingBox())!
  const corners = [
    [b.x + 4, b.y + b.height + 6],
    [b.x + 4, b.y - 4],
    [b.x + b.width - 4, b.y - 4],
    [b.x + b.width - 4, b.y + b.height + 6],
    [b.x + 6, b.y + b.height + 4],
  ]
  await page.evaluate((corners) => {
    const make = (name: string, x: number, y: number) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 5,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        buttons: name === 'pointerup' ? 0 : 1,
        isPrimary: true,
      })
    const el = document.elementFromPoint(corners[0][0], corners[0][1])!
    el.dispatchEvent(make('pointerdown', corners[0][0], corners[0][1]))
    for (let i = 1; i < corners.length; i++) {
      const [px, py] = corners[i - 1]
      const [qx, qy] = corners[i]
      for (let k = 1; k <= 8; k++) {
        el.dispatchEvent(
          make(
            'pointermove',
            px + ((qx - px) * k) / 8,
            py + ((qy - py) * k) / 8,
          ),
        )
      }
    }
    const last = corners[corners.length - 1]
    el.dispatchEvent(make('pointerup', last[0], last[1]))
  }, corners)
  await expect(page.locator('.bn-editor .ln-sel-node')).toHaveCount(1)
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
})

test('typing mode: a Pencil double-tap selects the word, a triple-tap the line, with the mini toolbar', async ({
  page,
}) => {
  await openNote(page)
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  const at = await wordPoint(page, 'nucleus')
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, { x: at.x + 3, y: at.y + 2 }) // a little off: tolerance 12 px
  await expect.poll(() => selection(page)).toBe('nucleus')
  const mini = page.locator('[data-mini-toolbar]')
  await expect(mini).toBeVisible()
  // The Text tool stays: the Pencil acts like a finger here (owner, 7 Nov).
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
  const names = await mini
    .getByRole('button')
    .evaluateAll((els) => els.map((el) => el.getAttribute('aria-label')))
  expect(names).toEqual([
    'Move the selection tools',
    'Text colour',
    'Text size',
    'Text style',
    'Bold',
    'Italic',
    'Alignment',
    'List',
    'Highlight colour',
    'Link…',
    'Cut',
    'Copy',
    'Delete',
    'More',
    'Keep the selection tools here',
    'Deselect',
  ])
  await expect(page.locator('[data-sel-handle]')).toHaveCount(2)
  // Copy puts the words on the clipboard.
  await mini.getByRole('button', { name: 'Copy' }).click()
  if (test.info().project.name === 'chromium') {
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toBe('nucleus')
  } else {
    // WebKit cannot read the clipboard: check what the app copied.
    await expect.poll(() => copiedText(page)).toBe('nucleus')
  }
  // Bold from the mini toolbar.
  await mini.getByRole('button', { name: 'Bold' }).click()
  await expect(page.locator('.bn-editor strong')).toHaveText('nucleus')
  // More: paste, Make card, Add to Summary, key point, save to notes.
  await mini.getByRole('button', { name: 'More' }).click()
  await expect(
    mini.getByRole('group', { name: 'More' }).getByRole('button'),
  ).toHaveCount(5)
  // The triple-tap selects the whole line.
  await mini.getByRole('button', { name: 'More' }).click()
  await mini.getByRole('button', { name: 'Deselect' }).click()
  await page.waitForTimeout(400)
  const word = await wordPoint(page, 'holds')
  await tap(page, word)
  await page.waitForTimeout(60)
  await tap(page, word)
  await page.waitForTimeout(60)
  await tap(page, word)
  await expect.poll(() => selection(page)).toBe('The nucleus holds the DNA')
})

test('under Lasso a double-tap selects nothing: a tap is a loop (owner table)', async ({
  page,
}) => {
  await openNote(page)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(650)
  const at = await wordPoint(page, 'DNA')
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, at)
  await page.waitForTimeout(300)
  expect(await selection(page)).toBe('')
  await expect(page.locator('[data-mini-toolbar]')).toHaveCount(0)
})

test('Text tool: a Pencil tap places the cursor but asks for no keyboard; a finger asks for it', async ({
  page,
}) => {
  await openNote(page)
  const at = await wordPoint(page, 'holds')
  await tap(page, at, 'pen')
  expect(await inputmode(page)).toBe('none')
  await page.waitForTimeout(400) // not a double-tap
  await tap(page, at, 'touch')
  expect(await inputmode(page)).toBe('text')
  await page.waitForTimeout(400)
  await tap(page, at, 'pen')
  expect(await inputmode(page)).toBe('none')
  await page.keyboard.press('a') // a key press brings the keyboard back
  expect(await inputmode(page)).toBe('text')
})

for (const name of ['Pen', 'Highlighter', 'Eraser', 'Lasso', 'Read']) {
  test(`${name} tool: a Pencil tap neither focuses the page nor opens the keyboard`, async ({
    page,
  }) => {
    await openNote(page)
    await tool(page, name).click()
    await page.keyboard.press('Escape')
    await page.waitForTimeout(300) // the closed pill gives the page its room back
    // Choosing the tool dropped the page's focus.
    expect(await focusedInEditor(page)).toBe(false)
    const at = await wordPoint(page, 'holds')
    const cancelled = await tap(page, at, 'pen')
    expect(cancelled).toBe(true)
    expect(await inputmode(page)).toBe('none')
    expect(await focusedInEditor(page)).toBe(false)
  })
}

test('the keyboard button shows and hides the keyboard on demand', async ({
  page,
}) => {
  await openNote(page)
  await tool(page, 'Pen').click()
  await page.keyboard.press('Escape')
  const key = page.getByRole('button', { name: 'Keyboard', exact: true })
  await expect(key).toHaveAttribute('aria-pressed', 'false')
  await key.click()
  await expect(key).toHaveAttribute('aria-pressed', 'true')
  expect(await inputmode(page)).toBe('text')
  expect(await focusedInEditor(page)).toBe(true)
  await key.click()
  await expect(key).toHaveAttribute('aria-pressed', 'false')
  expect(await inputmode(page)).toBe('none')
  expect(await focusedInEditor(page)).toBe(false)
})

test('hold-to-select: a still Pencil on text selects; a quick stroke is left to Scribble', async ({
  page,
}) => {
  await openNote(page)
  const a = await wordPoint(page, 'nucleus')
  const b = await wordPoint(page, 'DNA')
  const ev = (name: string, p: Pt) =>
    page.evaluate(
      ({ name, p }) => {
        const el = document.elementFromPoint(p.x, p.y)!
        el.dispatchEvent(
          new PointerEvent(name, {
            pointerType: 'pen',
            pointerId: 11,
            clientX: p.x,
            clientY: p.y,
            bubbles: true,
            cancelable: true,
            button: 0,
            buttons: name === 'pointerup' ? 0 : 1,
            isPrimary: true,
          }),
        )
      },
      { name, p },
    )
  // A quick stroke (moves at once): no selection mode.
  await ev('pointerdown', a)
  await ev('pointermove', { x: a.x + 20, y: a.y })
  await page.waitForTimeout(700)
  await expect(page.locator('.bn-editor')).not.toHaveAttribute(
    'data-hold-select',
    '',
  )
  await ev('pointerup', { x: a.x + 20, y: a.y })
  // A still hold: selection mode (the caret cue), then dragging extends.
  await ev('pointerdown', a)
  await page.waitForTimeout(700)
  await expect(page.locator('.bn-editor')).toHaveAttribute(
    'data-hold-select',
    '',
  )
  await ev('pointermove', b)
  await ev('pointerup', b)
  await expect.poll(() => selection(page)).toContain('holds')
  await expect(page.locator('.bn-editor')).not.toHaveAttribute(
    'data-hold-select',
    '',
  )
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
})

test('under Text a Pencil double-tap selects the word and keeps the Text tool', async ({
  page,
}) => {
  await openNote(page)
  const at = await wordPoint(page, 'nucleus')
  await tap(page, at)
  await page.waitForTimeout(60)
  await tap(page, at)
  await expect.poll(() => selection(page)).toBe('nucleus')
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
  await expect(tool(page, 'Text')).toHaveAttribute('aria-pressed', 'true')
})

for (const name of ['Text']) {
  test(`${name}: hold the Pencil still 0.5 s and the caret is placed there; a short tap keeps the two-tap rule`, async ({
    page,
  }) => {
    await openNote(page)
    if (name === 'Lasso') {
      await tool(page, 'Lasso').click()
      await page.keyboard.press('Escape')
      await page.waitForTimeout(650)
    }
    const at = await wordPoint(page, 'holds')
    const ev = (type: string) =>
      page.evaluate(
        ({ type, at }) => {
          const el = document.elementFromPoint(at.x, at.y)!
          el.dispatchEvent(
            new PointerEvent(type, {
              pointerType: 'pen',
              pointerId: 31,
              clientX: at.x,
              clientY: at.y,
              bubbles: true,
              cancelable: true,
              button: 0,
              buttons: type === 'pointerup' ? 0 : 1,
              isPrimary: true,
            }),
          )
        },
        { type, at },
      )
    const before = await page.locator('.bn-editor').innerText()
    // A short press: no hold.
    await ev('pointerdown')
    await page.waitForTimeout(150)
    await expect(page.locator('.bn-editor')).not.toHaveAttribute(
      'data-hold-select',
      '',
    )
    await ev('pointerup')
    await page.waitForTimeout(400)
    // 0.5 s still: the caret is placed, the cue shows, nothing changes.
    await ev('pointerdown')
    await page.waitForTimeout(700)
    await expect(page.locator('.bn-editor')).toHaveAttribute(
      'data-hold-select',
      '',
    )
    await ev('pointerup')
    await expect.poll(() => focusedInEditor(page)).toBe(true)
    expect(await selection(page)).toBe('')
    expect(await inputmode(page)).toBe('none')
    expect(await page.locator('.bn-editor').innerText()).toBe(before)
    await expect(page.locator('[data-mini-toolbar]')).toHaveCount(0)
  })
}
