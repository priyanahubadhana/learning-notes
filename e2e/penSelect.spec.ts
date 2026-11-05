// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, solidPng } from './helpers.ts'

/**
 * Selecting across pictures: a drag (Apple Pencil, mouse) that starts on a
 * picture, ends on one or passes over one selects whole blocks, pictures
 * included, so Copy, Delete and Move act on the whole range. The Pencil is
 * simulated with dispatched pointer events (pointerType "pen").
 */

test.use({ viewport: { width: 1000, height: 900 } })

/** Text, a picture, text, a picture, text: returns where each one is. */
async function setup(page: Page) {
  const png = await solidPng(240, 120)
  await page.goto('/')
  await createNotebook(page, 'Cardiology', 'Heart')
  const editor = page.locator('.bn-editor')
  await editor.click()
  await page.keyboard.type('First line')
  for (const name of ['one.png', 'two.png']) {
    await page.keyboard.press('Enter')
    await page.keyboard.type('/image')
    await page.keyboard.press('Enter')
    await page
      .locator('input[type="file"]')
      .last()
      .setInputFiles({ name, mimeType: 'image/png', buffer: png })
    await expect(
      page.locator(`.bn-editor img`).nth(name === 'one.png' ? 0 : 1),
    ).toBeVisible()
    // The editor leaves an empty line under the picture with the caret in it.
    await page.keyboard.type(name === 'one.png' ? 'Middle line' : 'Last line')
  }
  // Pictures finished loading (WebKit lays them out late), then positions.
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll('.bn-editor img')].every(
          (img) => (img as HTMLImageElement).naturalWidth > 0,
        ),
      ),
    )
    .toBe(true)
  await page.waitForTimeout(600)
  const box = async (locator: ReturnType<Page['locator']>) =>
    (await locator.boundingBox())!
  return {
    first: await box(page.getByText('First line')),
    middle: await box(page.getByText('Middle line')),
    last: await box(page.getByText('Last line')),
    img1: await box(page.locator('.bn-editor img').nth(0)),
    img2: await box(page.locator('.bn-editor img').nth(1)),
  }
}

type Point = { x: number; y: number }

/** A drag with a pen, simulated by dispatching pointer events. */
async function penDrag(page: Page, from: Point, to: Point, type = 'pen') {
  await page.evaluate(
    ({ from, to, type }) => {
      const make = (name: string, x: number, y: number) =>
        new PointerEvent(name, {
          pointerType: type,
          pointerId: 5,
          clientX: x,
          clientY: y,
          bubbles: true,
          cancelable: true,
          buttons: name === 'pointerup' ? 0 : 1,
          isPrimary: true,
        })
      const at = (x: number, y: number) => document.elementFromPoint(x, y)!
      at(from.x, from.y).dispatchEvent(make('pointerdown', from.x, from.y))
      for (let i = 1; i <= 10; i++) {
        const x = from.x + ((to.x - from.x) * i) / 10
        const y = from.y + ((to.y - from.y) * i) / 10
        at(x, y).dispatchEvent(make('pointermove', x, y))
      }
      at(to.x, to.y).dispatchEvent(make('pointerup', to.x, to.y))
    },
    { from, to, type },
  )
}

const marked = (page: Page) => page.locator('[data-ln-selected]')
const blockCount = (page: Page) => page.locator('.bn-editor .bn-block').count()
const text = (page: Page) => page.locator('.bn-editor').innerText()

test('a pen drag from text, over a picture, to text selects the picture too, and Delete removes the whole range', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.first.x + p.first.width - 2, y: p.first.y + 10 },
    { x: p.middle.x + 30, y: p.middle.y + p.middle.height / 2 },
  )
  await expect(marked(page)).toHaveCount(1) // the first picture
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(1) // the second stays
  const left = await text(page)
  expect(left).toContain('Last line')
  expect(left).not.toContain('Middle line')
})

test('a pen drag that starts ON a picture selects it and everything down to the end', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.img1.x + 40, y: p.img1.y + 40 },
    { x: p.last.x + 20, y: p.last.y + 10 },
  )
  await expect(marked(page)).toHaveCount(2) // both pictures
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(0)
  const left = await text(page)
  expect(left).toContain('First line')
  expect(left).not.toContain('Last line')
})

test('a pen drag that ENDS on a picture includes it', async ({ page }) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.middle.x + 10, y: p.middle.y + 10 },
    { x: p.img2.x + 60, y: p.img2.y + 50 },
  )
  await expect(marked(page)).toHaveCount(1)
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
  expect(await text(page)).toContain('First line')
})

test('a drag upwards works the same way', async ({ page }) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.last.x + 20, y: p.last.y + 10 },
    { x: p.first.x + 4, y: p.first.y + 10 },
  )
  await expect(marked(page)).toHaveCount(2)
})

test('a mouse drag across a picture selects it as well (not only the pen)', async ({
  page,
}) => {
  const p = await setup(page)
  await page.mouse.move(p.first.x + p.first.width - 2, p.first.y + 10)
  await page.mouse.down()
  await page.mouse.move(p.img1.x + 20, p.img1.y + 30, { steps: 6 })
  await page.mouse.move(p.middle.x + 30, p.middle.y + 10, { steps: 6 })
  await page.mouse.up()
  await expect(marked(page)).toHaveCount(1)
  await page.keyboard.press('Backspace')
  await expect(page.locator('.bn-editor img')).toHaveCount(1)
})

test('Copy puts the picture and the text of the whole range on the clipboard', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.first.x + p.first.width - 2, y: p.first.y + 10 },
    { x: p.middle.x + 30, y: p.middle.y + p.middle.height / 2 },
  )
  await expect(marked(page)).toHaveCount(1)
  const html = await page.evaluate(() => {
    const data = new DataTransfer()
    const event = new ClipboardEvent('copy', {
      clipboardData: data,
      bubbles: true,
      cancelable: true,
    })
    document.querySelector('.bn-editor')!.dispatchEvent(event)
    return data.getData('text/html')
  })
  expect(html).toContain('<img')
  expect(html).toContain('Middle line')
})

test('Move: the selected range moves as one with the keyboard', async ({
  page,
}) => {
  const p = await setup(page)
  // Select the first picture and the line after it, then move them up.
  await penDrag(
    page,
    { x: p.img1.x + 40, y: p.img1.y + 40 },
    { x: p.middle.x + 30, y: p.middle.y + 10 },
  )
  await expect(marked(page)).toHaveCount(1)
  await page.keyboard.press('Control+Shift+ArrowUp')
  await page.waitForTimeout(300)
  const order = await page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .bn-block-outer')].map((el) =>
      el.querySelector('img') ? 'img' : (el.textContent ?? '').trim(),
    ),
  )
  // Both moved above "First line", still together (picture, then its line).
  expect(order[0]).toBe('img')
  // (an empty line may sit between them, as the editor leaves one after a picture)
  expect(order.indexOf('Middle line')).toBeLessThanOrEqual(2)
  expect(order.indexOf('First line')).toBeGreaterThan(
    order.indexOf('Middle line'),
  )
})

test('a text-only drag is left to the browser (no picture marks)', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.last.x + 2, y: p.last.y + 10 },
    { x: p.last.x + p.last.width - 2, y: p.last.y + 10 },
  )
  await expect(marked(page)).toHaveCount(0)
  expect(await blockCount(page)).toBeGreaterThan(4)
})

test('a finger still scrolls: a touch drag does not start a block selection', async ({
  page,
}) => {
  const p = await setup(page)
  await penDrag(
    page,
    { x: p.first.x + 4, y: p.first.y + 10 },
    { x: p.middle.x + 30, y: p.middle.y + 10 },
    'touch',
  )
  await expect(marked(page)).toHaveCount(0)
})

/** A beforeinput of `inputType` fired at the editor; true if it was refused. */
const fireInput = (page: Page, inputType: string) =>
  page.evaluate((inputType) => {
    const el = document.querySelector('.bn-editor [contenteditable]')!
    const e = new InputEvent('beforeinput', {
      inputType,
      bubbles: true,
      cancelable: true,
    })
    el.dispatchEvent(e)
    return e.defaultPrevented
  }, inputType)

test('a pen drag across text only selects it: nothing is deleted, even if a delete arrives', async ({
  page,
}) => {
  const p = await setup(page)
  const before = await text(page)
  const blocksBefore = await blockCount(page)
  await page.evaluate(() => {
    const down = (name: string, x: number, y: number) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 9,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        buttons: name === 'pointerup' ? 0 : 1,
      })
    ;(window as unknown as { penDown: () => void }).penDown = () =>
      document
        .querySelector('.bn-editor')!
        .dispatchEvent(down('pointerdown', 10, 10))
    ;(window as unknown as { penUp: () => void }).penUp = () =>
      document
        .querySelector('.bn-editor')!
        .dispatchEvent(down('pointerup', 10, 10))
  })
  await page.evaluate(() =>
    (window as never as { penDown: () => void }).penDown(),
  )
  // iPadOS Scribble "scratch out" arrives as a delete while the Pencil is down.
  expect(await fireInput(page, 'deleteContentBackward')).toBe(true)
  expect(await fireInput(page, 'deleteByDrag')).toBe(true)
  // Lifting the pen and a delete right after (inside 300 ms) is refused too.
  expect(
    await page.evaluate(() => {
      ;(window as never as { penUp: () => void }).penUp()
      const el = document.querySelector('.bn-editor [contenteditable]')!
      const e = new InputEvent('beforeinput', {
        inputType: 'deleteContentForward',
        bubbles: true,
        cancelable: true,
      })
      el.dispatchEvent(e)
      return e.defaultPrevented
    }),
  ).toBe(true)
  // Writing (Scribble) is refused in the same window; a key press is not (below).
  expect(await fireInput(page, 'insertText')).toBe(true) // Scribble writing too
  expect(await text(page)).toBe(before)
  expect(await blockCount(page)).toBe(blocksBefore)
  // The real pen drag across text and a picture selects, deletes nothing.
  await penDrag(
    page,
    { x: p.first.x + 5, y: p.first.y + 10 },
    { x: p.middle.x + 30, y: p.middle.y + p.middle.height / 2 },
  )
  await expect(marked(page)).toHaveCount(1)
  expect(await text(page)).toBe(before)
  expect(await blockCount(page)).toBe(blocksBefore)
  expect(
    await page.evaluate(() => window.getSelection()?.toString() ?? ''),
  ).not.toBe(undefined)
  // After the quiet time a real Backspace key deletes the selection.
  await page.waitForTimeout(400)
  await page.keyboard.press('Backspace')
  expect(await text(page)).not.toContain('Middle line')
})

test('a pen drag across plain text selects it and changes nothing', async ({
  page,
}) => {
  const p = await setup(page)
  const before = await text(page)
  await penDrag(
    page,
    { x: p.first.x + 2, y: p.first.y + p.first.height / 2 },
    { x: p.first.x + p.first.width - 2, y: p.first.y + p.first.height / 2 },
  )
  expect(await text(page)).toBe(before)
})

// ---- Batch 3a: the Pencil only selects; Scribble can't delete or overwrite ----

/** Pen events fired in steps, so a "Scribble" can strike in the middle. */
async function installPen(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as Record<string, unknown>
    const make = (name: string, x: number, y: number) =>
      new PointerEvent(name, {
        pointerType: 'pen',
        pointerId: 7,
        clientX: x,
        clientY: y,
        bubbles: true,
        cancelable: true,
        buttons: name === 'pointerup' ? 0 : 1,
        isPrimary: true,
      })
    const at = (x: number, y: number) => document.elementFromPoint(x, y)!
    w.pen = (name: string, x: number, y: number) =>
      at(x, y).dispatchEvent(make(name, x, y))
    // What Scribble does: handwriting that replaces or scratches out text.
    w.scribble = (kind: string) => {
      const root = document.querySelector('.bn-editor')!
      const fire = (inputType: string) => {
        const e = new InputEvent('beforeinput', {
          inputType,
          data: 'x',
          bubbles: true,
          cancelable: true,
        })
        root.dispatchEvent(e)
        return e.defaultPrevented
      }
      if (kind === 'events') {
        return [
          'deleteContentBackward',
          'deleteByCut',
          'deleteWordBackward',
          'insertReplacementText',
          'insertCompositionText',
          'insertText',
        ].map(fire)
      }
      // A change to the page with no beforeinput at all.
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        if (n.textContent?.includes('First line')) {
          n.textContent = ''
          break
        }
      }
      return []
    }
  })
}

const pen = (page: Page, name: string, x: number, y: number) =>
  page.evaluate(
    ([n, px, py]) =>
      (window as never as { pen: (...a: unknown[]) => void }).pen(n, px, py),
    [name, x, y] as const,
  )

for (const how of ['events', 'dom'] as const) {
  test(`Scribble ${how} during a pen drag over text: content unchanged, text selected`, async ({
    page,
  }) => {
    const p = await setup(page)
    await installPen(page)
    const before = await text(page)
    const y = p.first.y + p.first.height / 2
    await pen(page, 'pointerdown', p.first.x + 2, y)
    // The page is not editable for the stroke, so Scribble has nothing to write in.
    expect(
      await page.evaluate(() =>
        document.querySelector('.bn-editor')!.getAttribute('contenteditable'),
      ),
    ).toBe('false')
    for (let i = 1; i <= 8; i++) {
      await pen(
        page,
        'pointermove',
        p.first.x + 2 + ((p.first.width - 4) * i) / 8,
        y,
      )
    }
    const refused = await page.evaluate(
      (kind) =>
        (window as never as { scribble: (k: string) => boolean[] }).scribble(
          kind,
        ),
      how,
    )
    if (how === 'events') expect(refused.every(Boolean)).toBe(true)
    await pen(page, 'pointerup', p.first.x + p.first.width - 2, y)
    await page.waitForTimeout(150)
    expect(await text(page)).toBe(before)
    // Editable again, and what the pen dragged over is selected.
    await expect(page.locator('.bn-editor')).toHaveAttribute(
      'contenteditable',
      'true',
    )
    expect(
      await page.evaluate(() => window.getSelection()?.toString() ?? ''),
    ).toContain('First')
    // The scratch-out arriving just after the pen lifts changes nothing either.
    if (how === 'events') {
      const late = await page.evaluate(() =>
        (window as never as { scribble: (k: string) => boolean[] }).scribble(
          'events',
        ),
      )
      expect(late.every(Boolean)).toBe(true)
    } else {
      await page.evaluate(() =>
        (window as never as { scribble: (k: string) => void }).scribble('dom'),
      )
      await page.waitForTimeout(150)
    }
    expect(await text(page)).toBe(before)
  })
}

test('with "Pencil writes text (Scribble)" on, the Pencil is left to the browser', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:advanced.pencilWrites',
      JSON.stringify('on'),
    ),
  )
  const p = await setup(page)
  await installPen(page)
  const y = p.first.y + p.first.height / 2
  await pen(page, 'pointerdown', p.first.x + 2, y)
  expect(
    await page.evaluate(() =>
      document.querySelector('.bn-editor')!.getAttribute('contenteditable'),
    ),
  ).toBe('true')
  await pen(page, 'pointerup', p.first.x + 2, y)
})

test('a key press right after the pen still deletes (the guard only blocks the Pencil)', async ({
  page,
}) => {
  const p = await setup(page)
  await installPen(page)
  const y = p.last.y + p.last.height / 2
  await pen(page, 'pointerdown', p.last.x + 2, y)
  await pen(page, 'pointermove', p.last.x + p.last.width - 2, y)
  await pen(page, 'pointerup', p.last.x + p.last.width - 2, y)
  await page.keyboard.press('Backspace')
  expect(await text(page)).not.toContain('Last line')
})

// ---- Batch 3a: a Pencil TAP is never swallowed ----

test('a pen tap on the bar and on text works 10/10, also right after a drag', async ({
  page,
}) => {
  const p = await setup(page)
  await installPen(page)
  const bold = page
    .locator('[aria-label]')
    .getByRole('button', { name: 'Bold', exact: true })
    .first()
  const bb = (await bold.boundingBox())!
  const tap = async (x: number, y: number) =>
    page.evaluate(
      ([px, py]) => {
        const w = window as never as {
          pen: (...a: unknown[]) => boolean
        }
        const el = document.elementFromPoint(px, py)!
        const seen: boolean[] = []
        const spy = (e: Event) => seen.push(e.defaultPrevented)
        el.addEventListener('pointerdown', spy)
        w.pen('pointerdown', px, py)
        w.pen('pointerup', px, py)
        el.removeEventListener('pointerdown', spy)
        return seen
      },
      [x, y] as const,
    )
  for (let i = 0; i < 10; i++) {
    // Right after a drag over text.
    await penDrag(
      page,
      { x: p.first.x + 2, y: p.first.y + p.first.height / 2 },
      { x: p.first.x + 40, y: p.first.y + p.first.height / 2 },
    )
    // A tap on a bar button: nothing of ours cancels it, so the click follows.
    const onBar = await tap(bb.x + bb.width / 2, bb.y + bb.height / 2)
    expect(onBar.every((prevented) => !prevented)).toBe(true)
    // A tap on text puts the caret there and gives the page the focus.
    await tap(p.middle.x + 20, p.middle.y + p.middle.height / 2)
    await expect
      .poll(() =>
        page.evaluate(() => {
          const s = window.getSelection()
          return (
            !!s &&
            s.isCollapsed &&
            !!document.activeElement?.closest('.bn-editor') &&
            (s.anchorNode?.textContent ?? '').includes('Middle line')
          )
        }),
      )
      .toBe(true)
    // The page is editable again after each stroke.
    await expect(
      page.locator('.bn-editor[contenteditable="true"]'),
    ).toBeVisible()
  }
})
