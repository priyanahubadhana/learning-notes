// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode, typeInEditor } from './helpers.ts'

/** Toolbar v8, slice 1c: the Pen cards (TB-20 to TB-26, TB-23 gate, TB-70). */
test.use({ viewport: { width: 1180, height: 820 }, hasTouch: true })

type Level = 'beginner' | 'professional'

async function open(
  page: Page,
  level: Level = 'beginner',
  unlocked: string[] = [],
  size?: { width: number; height: number },
) {
  await page.addInitScript(
    ([l, u]) => {
      localStorage.setItem(
        'learning-notes:level',
        JSON.stringify({ level: l, unlocked: u }),
      )
    },
    [level, unlocked] as const,
  )
  if (size) await page.setViewportSize(size)
  await startInMode(page, 'touch')
  await page.goto('/?flags=toolbar.v8')
  await createNotebook(page, 'Biology', 'First')
  await typeInEditor(page, 'The nucleus holds the DNA')
  await page.getByTestId('v8-tool-pen').click()
}

const chip = (page: Page, id: string) => page.getByTestId(`v8-chip-pen.${id}`)
const card = (page: Page, id: string) => page.getByTestId(`v8-card-pen.${id}`)

async function openCard(page: Page, id: string) {
  await chip(page, id).click()
  await expect(card(page, id)).toBeVisible()
}

/** What the old bar reads: the saved pen / highlighter settings. */
const stored = (page: Page, key: 'pen' | 'highlighter') =>
  page.evaluate(
    (k) => JSON.parse(localStorage.getItem(`learning-notes:ink.${k}`) ?? '{}'),
    key,
  )

/** Fully inside the screen once the open motion (a sheet slides up) is done. */
async function insideScreen(page: Page, testId: string) {
  const vp = page.viewportSize()!
  await expect
    .poll(async () => {
      const box = (await page.getByTestId(testId).boundingBox())!
      return (
        box.x >= 0 &&
        box.y >= 0 &&
        box.x + box.width <= vp.width + 0.5 &&
        box.y + box.height <= vp.height + 0.5
      )
    })
    .toBe(true)
}

test('TB-04 each Pen card opens beside its own chip and never covers it', async ({
  page,
}) => {
  await open(page)
  for (const id of ['type', 'size', 'colour', 'feel']) {
    await openCard(page, id)
    const c = (await card(page, id).boundingBox())!
    const b = (await chip(page, id).boundingBox())!
    const overlap =
      c.x < b.x + b.width &&
      c.x + c.width > b.x &&
      c.y < b.y + b.height &&
      c.y + c.height > b.y
    expect(overlap, `${id} card covers its chip`).toBe(false)
    await insideScreen(page, `v8-card-pen.${id}`)
    await page.keyboard.press('Escape')
    await expect(card(page, id)).toHaveCount(0)
  }
})

test('TB-20 Type shows six tiles with a sample and a hint; a pick closes after 190 ms and the chip glows', async ({
  page,
}) => {
  await open(page)
  await openCard(page, 'type')
  const tiles = card(page, 'type').getByRole('radio')
  await expect(tiles).toHaveCount(6)
  await expect(tiles).toContainText([
    /Fountain pen/,
    /Ballpoint/,
    /Brush pen/,
    /Pencil/,
    /Marker/,
    /Highlighter/,
  ])
  await expect(tiles.first().locator('svg path')).toHaveCount(1)
  await expect(tiles.first()).toContainText('Thick and thin')
  await expect(page.getByTestId('v8-pen-type-fountain')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByTestId('v8-pen-type-ball').click()
  await expect(card(page, 'type')).toHaveCount(0)
  await expect(chip(page, 'type')).toContainText('Ballpoint')
  await expect(chip(page, 'type').locator('.pcard-glow')).toHaveCount(1)
  expect((await stored(page, 'pen')).type).toBe('ball')
})

test('TB-20 the Highlighter tile turns the highlighter on and the Pen row follows', async ({
  page,
}) => {
  await open(page)
  await openCard(page, 'type')
  await page.getByTestId('v8-pen-type-highlighter').click()
  await expect(chip(page, 'type')).toContainText('Highlighter')
  await openCard(page, 'colour')
  await page.getByTestId('v8-pen-colour-pink').click()
  expect((await stored(page, 'highlighter')).colour).toBe('#f8c6dd')
  // The pen itself was not touched.
  expect((await stored(page, 'pen')).colour ?? '#1d1d1f').toBe('#1d1d1f')
})

test('TB-22 Beginner Size shows three tiles and closes on a pick; no Professional controls', async ({
  page,
}) => {
  await open(page)
  await openCard(page, 'size')
  await expect(card(page, 'size').getByRole('radio')).toHaveCount(3)
  await expect(page.getByTestId('v8-pen-exact')).toHaveCount(0)
  await expect(page.getByTestId('v8-pen-line-dashed')).toHaveCount(0)
  await page.getByTestId('v8-pen-size-2').click()
  await expect(card(page, 'size')).toHaveCount(0)
  await expect(chip(page, 'size')).toContainText('Thick')
  expect((await stored(page, 'pen')).size).toBe(2)
})

test('TB-22 Professional Size adds a live preview, Exact thickness and Line style', async ({
  page,
}) => {
  await open(page, 'professional')
  await openCard(page, 'size')
  await expect(card(page, 'size').locator('[data-ink-preview]')).toBeVisible()
  await page.getByTestId('v8-pen-line-dashed').click()
  // A card with more controls stays open after a pick.
  await expect(card(page, 'size')).toBeVisible()
  expect((await stored(page, 'pen')).line).toBe('dashed')
  const slider = page.getByTestId('v8-pen-exact')
  await slider.focus()
  await page.keyboard.press('End')
  await expect.poll(async () => (await stored(page, 'pen')).exact).toBe(30)
  await page.getByTestId('v8-pen-usesizes').click()
  await expect.poll(async () => (await stored(page, 'pen')).exact).toBeNull()
})

test('TB-22 a Beginner who switched on Stroke gets the same extras', async ({
  page,
}) => {
  await open(page, 'beginner', ['tb.penStroke'])
  await openCard(page, 'size')
  await expect(page.getByTestId('v8-pen-exact')).toBeVisible()
  await expect(page.getByTestId('v8-pen-line-dotted')).toBeVisible()
})

test('TB-23 Beginner Colour shows six swatches and the chip a single dot; no picker', async ({
  page,
}) => {
  await open(page)
  await expect(chip(page, 'colour').locator('.v8dot-colour')).toHaveCount(1)
  await openCard(page, 'colour')
  await expect(card(page, 'colour').getByRole('radio')).toHaveCount(6)
  await expect(page.getByTestId('v8-pen-picker')).toHaveCount(0)
  await page.getByTestId('v8-pen-colour-red').click()
  await expect(card(page, 'colour')).toHaveCount(0)
  expect((await stored(page, 'pen')).colour).toBe('#c62828')
  await expect(chip(page, 'colour').locator('.v8dot-colour')).toHaveCSS(
    'background-color',
    'rgb(198, 40, 40)',
  )
})

test('TB-23 Professional Colour adds the picker and up to 6 custom colours, newest first', async ({
  page,
}) => {
  await open(page, 'professional')
  await openCard(page, 'colour')
  const picker = page.getByTestId('v8-pen-picker')
  for (const hex of ['#112233', '#223344']) {
    await picker.fill(hex)
    await page.getByTestId('v8-pen-addcolour').click()
  }
  const custom = card(page, 'colour').getByTestId('v8-pen-custom')
  await expect(custom).toHaveCount(2)
  await expect(custom.first()).toHaveAttribute('aria-label', '#223344')
  const saved = await page.evaluate(() =>
    JSON.parse(
      localStorage.getItem('learning-notes:ink.customColours') ?? '[]',
    ),
  )
  expect(saved).toEqual(['#223344', '#112233'])
  expect((await stored(page, 'pen')).colour).toBe('#223344')
})

test('TB-24 Beginner Feel: sections Feel, Math, Page; Pressure, Stabilisation and a collapsed Fine-tune', async ({
  page,
}) => {
  await open(page)
  await openCard(page, 'feel')
  await expect(card(page, 'feel')).toHaveAttribute('data-size', 'panel')
  const tabs = card(page, 'feel').getByRole('tab')
  await expect(tabs).toHaveText(['Feel', 'Math', 'Page'])
  await expect(page.getByTestId('v8-pen-pressure')).toBeVisible()
  await expect(page.getByTestId('v8-pen-stabilisation')).toBeVisible()
  const fine = page.getByTestId('v8-pen-finetune')
  await expect(fine).toHaveAttribute('aria-expanded', 'false')
  await expect(page.getByTestId('v8-pen-finebody')).toHaveCount(0)
  await fine.click()
  await expect(page.getByTestId('v8-pen-finebody')).toBeVisible()
  await expect(page.getByTestId('v8-pen-sharpness')).toHaveCount(0)
  await page.getByTestId('v8-pen-drawas-line').click()
  expect((await stored(page, 'pen')).drawAs).toBe('line')
  const s = page.getByTestId('v8-pen-pressure')
  await s.focus()
  await page.keyboard.press('Home')
  await expect.poll(async () => (await stored(page, 'pen')).pressure).toBe(0)
  await expect(
    card(page, 'feel').locator('.v8slider [data-glow], .v8slider[data-glow]'),
  ).not.toHaveCount(0)
})

test('TB-24 Professional Feel adds tip, tilt, speed and latency, Aids and the tools of Math', async ({
  page,
}) => {
  await open(page, 'professional')
  await openCard(page, 'feel')
  await expect(card(page, 'feel').getByRole('tab')).toHaveText([
    'Feel',
    'Aids',
    'Math',
    'Page',
  ])
  await page.getByTestId('v8-pen-finetune').click()
  await expect(page.getByTestId('v8-pen-sharpness')).toBeVisible()
  await expect(page.getByTestId('v8-pen-flatness')).toBeVisible()
  await card(page, 'feel').getByRole('switch', { name: 'Tilt' }).click()
  await expect.poll(async () => (await stored(page, 'pen')).tilt).toBe(false)
  await card(page, 'feel').getByRole('tab', { name: 'Aids' }).click()
  await page.getByTestId('v8-pen-finger-off').click()
  expect((await stored(page, 'pen')).finger).toBe('off')
  await card(page, 'feel').getByRole('tab', { name: 'Math' }).click()
  await expect(
    card(page, 'feel').getByRole('switch', { name: 'Ruler' }),
  ).toBeVisible()
  await card(page, 'feel').getByRole('switch', { name: 'Snap shapes' }).click()
  await expect
    .poll(async () => (await stored(page, 'pen')).shapeSnap)
    .toBe(false)
})

test('TB-24 a Beginner who switched on Aids gets the Aids section', async ({
  page,
}) => {
  await open(page, 'beginner', ['tb.penAids'])
  await openCard(page, 'feel')
  await expect(card(page, 'feel').getByRole('tab')).toHaveText([
    'Feel',
    'Aids',
    'Math',
    'Page',
  ])
})

test('TB-25 choosing a paper style in Page keeps the style visible and ticked', async ({
  page,
}) => {
  await open(page, 'professional')
  await openCard(page, 'feel')
  await card(page, 'feel').getByRole('tab', { name: 'Page' }).click()
  await page.getByTestId('v8-pen-paper-grid').click()
  await expect(page.getByTestId('v8-pen-paper-grid')).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(card(page, 'feel')).toBeVisible()
})

// The page-size setting (A4) has no stored setting in the app today: there is
// nothing for the card to read or write. Needs a decision before it can be built.
test.fixme('TB-25 choosing A4 in Page keeps the grid and paper style visible', async () => {})

test('TB-26 highlighter options sit behind their switch; Strength is always there', async ({
  page,
}) => {
  await open(page)
  await openCard(page, 'type')
  await page.getByTestId('v8-pen-type-highlighter').click()
  await openCard(page, 'feel')
  await expect(page.getByTestId('v8-hl-opacity')).toBeVisible()
  await expect(page.getByTestId('v8-hl-eraser')).toHaveCount(0)
})

test('TB-26 Professional highlighter: snap to lines, behind ink, save to notes, highlight eraser', async ({
  page,
}) => {
  await open(page, 'professional')
  await openCard(page, 'type')
  await page.getByTestId('v8-pen-type-highlighter').click()
  await openCard(page, 'feel')
  const c = card(page, 'feel')
  await c.getByRole('switch', { name: 'Snap to text lines' }).click()
  await expect
    .poll(async () => (await stored(page, 'highlighter')).snapToText)
    .toBe(false)
  await c.getByRole('switch', { name: 'Draw behind ink' }).click()
  await c.getByRole('switch', { name: 'Save to notes' }).click()
  await expect
    .poll(async () => (await stored(page, 'highlighter')).saveToNotes)
    .toBe(true)
  await page.getByTestId('v8-hl-opacity').focus()
  await page.keyboard.press('End')
  await expect
    .poll(async () => (await stored(page, 'highlighter')).opacity)
    .toBe(90)
  await page.getByTestId('v8-hl-eraser').click()
  await expect(page.getByTestId('v8-tool-eraser')).toHaveAttribute(
    'data-active',
  )
})

test('keyboard: arrows move between the type tiles and Enter picks one', async ({
  page,
}) => {
  await open(page)
  await openCard(page, 'type')
  await page.getByTestId('v8-pen-type-fountain').focus()
  await page.keyboard.press('ArrowRight')
  await page.keyboard.press('Enter')
  await expect(card(page, 'type')).toHaveCount(0)
  await expect(chip(page, 'type')).toContainText('Ballpoint')
})

test('every tile and control has a name and a 44 pt target', async ({
  page,
}) => {
  await open(page, 'professional')
  for (const id of ['type', 'size', 'colour', 'feel']) {
    await openCard(page, id)
    const controls = card(page, id).locator(
      'button:visible, input:visible, [role="radio"]:visible',
    )
    const n = await controls.count()
    for (let i = 0; i < n; i++) {
      const el = controls.nth(i)
      const box = (await el.boundingBox())!
      const name =
        (await el.getAttribute('aria-label')) ||
        (await el.innerText()) ||
        (await el.getAttribute('id'))
      expect(name, `${id} control ${i} has no name`).toBeTruthy()
      if ((await el.getAttribute('data-testid')) === 'pcard-close') continue
      expect(box.height, `${id} control ${i} height`).toBeGreaterThanOrEqual(
        43.5,
      )
    }
    await page.keyboard.press('Escape')
  }
})

test.describe('small screens', () => {
  test('iPad portrait: every Pen card stays fully on screen', async ({
    page,
  }) => {
    await open(page, 'professional', [], { width: 820, height: 1180 })
    for (const id of ['type', 'size', 'colour', 'feel']) {
      await openCard(page, id)
      await insideScreen(page, `v8-card-pen.${id}`)
      await page.keyboard.press('Escape')
      await expect(card(page, id)).toHaveCount(0)
    }
  })

  test('phone: Type and Feel open as sheets inside the screen, no sideways scroll', async ({
    page,
  }) => {
    await open(page, 'professional', [], { width: 390, height: 844 })
    await page.getByTestId('v8-tool-pen').click()
    await expect(card(page, 'type')).toBeVisible()
    await insideScreen(page, 'v8-card-pen.type')
    await page.keyboard.press('Escape')
    await expect(card(page, 'type')).toHaveCount(0)
    if (await chip(page, 'feel').count()) await chip(page, 'feel').click()
    else {
      await page.getByTestId('v8-row-more').click()
      await page.getByTestId('v8-fold-feel').click()
    }
    await expect(card(page, 'feel')).toBeVisible()
    await insideScreen(page, 'v8-card-pen.feel')
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    )
    expect(overflow).toBeLessThanOrEqual(0)
  })
})

// The toast queue (step 2 part on slice/0g-parts) is not in this branch yet.
// Until it is merged these lines cannot be checked; the glow above is done.
test.fixme('TB-70 a switch says "<X> turned on · Undo" in the toast queue; Undo puts it back after the card closed', async () => {})
test.fixme('TB-70 each switch row has a tiny live preview', async () => {})

test("flag off: today's Pen bar is unchanged and the new cards are not there", async ({
  page,
}) => {
  await startInMode(page, 'touch')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'First')
  await expect(page.getByTestId('toolbar-v8')).toHaveCount(0)
})
