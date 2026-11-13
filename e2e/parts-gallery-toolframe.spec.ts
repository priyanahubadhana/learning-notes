import { expect, test, type Page } from '@playwright/test'

/**
 * Slice 0g step 3: Tool frame on the Parts gallery at #/design-tokens
 * (S3-01 to S3-12, docs/features/shared-parts.md). Touch screens on purpose.
 */
test.use({ hasTouch: true })

const PC = { width: 1366, height: 768 }
const IPAD_L = { width: 1180, height: 820 }
const IPAD_P = { width: 820, height: 1180 }
const PHONE = { width: 390, height: 844 }
type Size = { width: number; height: number }

/**
 * A stand-in for the browser's visual viewport (the real one shrinks when the
 * on-screen keyboard opens): same events, same fields. `__setKeyboard(px)`
 * is the "keyboard opens" button.
 */
async function stubVisualViewport(page: Page) {
  await page.addInitScript(() => {
    const vv = new EventTarget() as EventTarget & Record<string, unknown>
    let kb = 0
    Object.defineProperties(vv, {
      height: { get: () => window.innerHeight - kb },
      width: { get: () => window.innerWidth },
      offsetTop: { get: () => 0 },
      offsetLeft: { get: () => 0 },
      scale: { get: () => 1 },
    })
    Object.defineProperty(window, 'visualViewport', {
      value: vv,
      configurable: true,
    })
    ;(window as unknown as Record<string, unknown>).__setKeyboard = (
      px: number,
    ) => {
      kb = px
      vv.dispatchEvent(new Event('resize'))
    }
  })
}
const setKeyboard = (page: Page, px: number) =>
  page.evaluate(
    (n) =>
      (window as unknown as { __setKeyboard(n: number): void }).__setKeyboard(
        n,
      ),
    px,
  )

async function gallery(page: Page, size: Size) {
  await page.setViewportSize(size)
  await page.goto('about:blank')
  await page.goto('/#/design-tokens')
  await expect(page.getByTestId('gal-parts')).toHaveAttribute(
    'data-ready',
    'true',
  )
  const sec = page.getByTestId('gal-toolframe')
  await expect(sec).toBeAttached()
  await sec.scrollIntoViewIfNeeded()
}
async function openFrame(page: Page, variant: string, size = IPAD_L) {
  await gallery(page, size)
  await page.getByTestId(`tf-open-${variant}`).click()
  const f = page.getByTestId('tool-frame')
  await expect(f).toBeVisible()
  // the opening motion has finished: sizes are the real ones
  await f.evaluate((n) => Promise.all(n.getAnimations().map((a) => a.finished)))
  return f
}
const box = async (l: ReturnType<Page['getByTestId']>) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}
const last = (page: Page) => page.getByTestId('tf-last')

for (const size of [PC, IPAD_L, IPAD_P, PHONE]) {
  test(`S3-01 fills the screen at ${size.width} px: bar 52, footer 64, preview margin 16`, async ({
    page,
  }) => {
    const f = await openFrame(page, 'clean', size)
    const fb = await box(f)
    expect(fb).toMatchObject({ x: 0, y: 0, width: size.width })
    expect(Math.round(fb.height)).toBe(size.height)
    expect(Math.round((await box(f.locator('.tf-top'))).height)).toBe(52)
    expect(Math.round((await box(f.locator('.tf-foot'))).height)).toBe(64)
    const p = await box(f.getByTestId('tf-preview'))
    expect(Math.round(p.x)).toBe(16)
    expect(Math.round(p.y)).toBe(52 + 16)
    expect(Math.round(p.width)).toBe(size.width - 32)
    // it sits on the tool layer and covers what is under it
    expect(await f.evaluate((n) => getComputedStyle(n).zIndex)).toBe('43')
    const top = await page.evaluate(
      ([x, y]) =>
        !!document
          .elementFromPoint(x, y)
          ?.closest('[data-testid="tool-frame"]'),
      [size.width / 2, size.height / 2],
    )
    expect(top).toBe(true)
  })
}

for (const size of [IPAD_L, PHONE]) {
  test(`S3-02 ✕ left, ✓ right, 44 pt each at ${size.width} px`, async ({
    page,
  }) => {
    const f = await openFrame(page, 'clean', size)
    const x = await box(f.getByTestId('tf-cancel'))
    const ok = await box(f.getByTestId('tf-done'))
    expect(x.x).toBeLessThan(size.width / 2)
    expect(ok.x).toBeGreaterThan(size.width / 2)
    for (const b of [x, ok]) {
      expect(b.height).toBeGreaterThanOrEqual(44)
      expect(b.width).toBeGreaterThanOrEqual(44)
    }
    await expect(f.getByTestId('tf-cancel')).toHaveAttribute(
      'aria-label',
      'Cancel',
    )
    await expect(f.getByTestId('tf-done')).toHaveAttribute('aria-label', 'Done')
    const word = f.getByTestId('tf-done').locator('.tf-btn-word')
    if (size.width <= 640) await expect(word).toBeHidden()
    else await expect(word).toBeVisible()
  })
}

test('S3-03 ✕ or Esc with no change closes at once and focus goes back', async ({
  page,
}) => {
  const f = await openFrame(page, 'clean')
  await f.getByTestId('tf-cancel').click()
  await expect(f).toBeHidden()
  await expect(page.getByTestId('tf-open-clean')).toBeFocused()
  await expect(last(page)).toContainText('x')
  await page.getByTestId('tf-open-clean').click()
  await expect(f).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(f).toBeHidden()
  await expect(page.getByTestId('tf-open-clean')).toBeFocused()
  await expect(last(page)).toContainText('esc')
})

test('S3-04 ✕ or Esc after a change asks "Discard changes?"; Cancel keeps the work', async ({
  page,
}) => {
  const f = await openFrame(page, 'clean')
  await f.getByTestId('tf-tool-brighten').click()
  await f.getByTestId('tf-cancel').click()
  const dlg = page.getByTestId('fb-dialog')
  await expect(dlg).toContainText('Discard changes?')
  await dlg.getByTestId('fb-dialog-cancel').click()
  await expect(dlg).toBeHidden()
  await expect(f).toBeVisible()
  await expect(f.getByTestId('tf-undo')).toBeEnabled()
  // Esc asks too, and Esc in the dialog keeps the work
  await page.keyboard.press('Escape')
  await expect(dlg).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dlg).toBeHidden()
  await expect(f).toBeVisible()
  await f.getByTestId('tf-cancel').click()
  await page.getByTestId('fb-dialog').getByTestId('fb-dialog-main').click()
  await expect(f).toBeHidden()
  await expect(page.getByTestId('tf-page-steps')).toContainText(': 0')
})

test('S3-05 ✓ closes with one step on the page; one Undo removes it', async ({
  page,
}) => {
  const f = await openFrame(page, 'clean')
  await f.getByTestId('tf-tool-brighten').click()
  await f.getByTestId('tf-tool-contrast').click()
  await f.getByTestId('tf-done').click()
  await expect(f).toBeHidden()
  await expect(page.getByTestId('tf-page-steps')).toContainText(': 1')
  await page.getByTestId('tf-page-undo').click()
  await expect(page.getByTestId('tf-page-steps')).toContainText(': 0')
})

test('S3-06 Undo twice and Redo once (buttons and Ctrl+Z), the page behind is untouched', async ({
  page,
}) => {
  const f = await openFrame(page, 'clean')
  const pic = f.getByTestId('tfd-pic')
  await f.getByTestId('tf-tool-brighten').click()
  await f.getByTestId('tf-tool-brighten').click()
  await expect(pic).toHaveAttribute('data-look', '2')
  await f.getByTestId('tf-undo').click()
  await expect(pic).toHaveAttribute('data-look', '1')
  await f.getByTestId('tf-undo').click()
  await expect(pic).toHaveAttribute('data-look', '0')
  await f.getByTestId('tf-redo').click()
  await expect(pic).toHaveAttribute('data-look', '1')
  await f.focus()
  await page.keyboard.press('Control+z')
  await expect(pic).toHaveAttribute('data-look', '0')
  await page.keyboard.press('Control+y')
  await expect(pic).toHaveAttribute('data-look', '1')
  await expect(page.getByTestId('tf-page-steps')).toContainText(': 0')
})

test('S3-07 not ready: ✓ is off and the footer says why', async ({ page }) => {
  const f = await openFrame(page, 'notready')
  await expect(f.getByTestId('tf-done')).toBeDisabled()
  await expect(f.getByTestId('tf-hint')).toHaveText('Pick a picture first.')
})

test('S3-08 busy: label and progress, tools off, Stop ends it with no result', async ({
  page,
}) => {
  const f = await openFrame(page, 'busy')
  await expect(f.getByTestId('tf-mid')).toContainText('Reading the text… 40%')
  await expect(f.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '40',
  )
  await expect(f.getByTestId('tf-tool-brighten')).toBeDisabled()
  await expect(f.getByTestId('tf-done')).toBeDisabled()
  await expect(f.getByTestId('tf-cancel')).toHaveAttribute('aria-label', 'Stop')
  await f.getByTestId('tf-cancel').click()
  await expect(f).toBeHidden()
  await expect(last(page)).toContainText('stopped, nothing kept')
  await expect(page.getByTestId('tf-page-steps')).toContainText(': 0')
})

test('S3-09 more tools than fit fold into "…"; the row never scrolls; a ▾ tool opens above the row', async ({
  page,
}) => {
  const f = await openFrame(page, 'tools', { width: 660, height: 800 })
  const row = f.getByTestId('tf-tools')
  await expect(f.getByTestId('tf-more')).toBeVisible()
  const sc = await row.evaluate((n) => n.scrollWidth - n.clientWidth)
  expect(sc).toBeLessThanOrEqual(0)
  await f.getByTestId('tf-more').click()
  const card = page.getByTestId('tf-more-card')
  await expect(card).toBeVisible()
  expect((await box(card)).y + (await box(card)).height).toBeLessThanOrEqual(
    (await box(row)).y + 1,
  )
  await page.keyboard.press('Escape')
  await expect(card).toBeHidden()
  await expect(f).toBeVisible()
  // a ▾ tool opens its card above the row
  await f.getByTestId('tf-tool-shape').click()
  const c2 = page.getByTestId('tf-card')
  await expect(c2).toBeVisible()
  expect((await box(c2)).y + (await box(c2)).height).toBeLessThanOrEqual(
    (await box(row)).y + 1,
  )
})

test('S3-09 on a phone the row keeps at most 5 buttons before "…"', async ({
  page,
}) => {
  const f = await openFrame(page, 'tools', PHONE)
  const shown = await f
    .getByTestId('tf-tools')
    .locator(':scope > .tf-tool:not(.tf-more)')
    .count()
  expect(shown).toBeLessThanOrEqual(5)
  await expect(f.getByTestId('tf-more')).toBeVisible()
})

test('S3-10 finger and Pencil on the preview draw, type and select nothing; only handles move', async ({
  page,
}) => {
  const f = await openFrame(page, 'clean')
  const pic = f.getByTestId('tfd-pic')
  const handle = f.getByTestId('tfd-handle')
  const before = await box(handle)
  for (const pointerType of ['touch', 'pen']) {
    // drag across the picture (not the handle): nothing changes
    await pic.evaluate((el, pt) => {
      const r = el.getBoundingClientRect()
      const fire = (type: string, x: number, y: number) =>
        el.dispatchEvent(
          new PointerEvent(type, {
            bubbles: true,
            pointerId: 7,
            pointerType: pt,
            isPrimary: true,
            clientX: x,
            clientY: y,
          }),
        )
      fire('pointerdown', r.left + 20, r.top + 20)
      fire('pointermove', r.left + 80, r.top + 60)
      fire('pointerup', r.left + 80, r.top + 60)
    }, pointerType)
  }
  expect(await page.evaluate(() => String(window.getSelection()))).toBe('')
  await expect(f.getByTestId('tf-undo')).toBeDisabled()
  const pre = await f
    .getByTestId('tf-preview')
    .evaluate((n) => [
      getComputedStyle(n).userSelect,
      getComputedStyle(n).touchAction,
    ])
  expect(pre).toEqual(['none', 'none'])
  // a pen drag on the handle moves the handle (and only that)
  await handle.evaluate((el) => {
    const r = el.getBoundingClientRect()
    const fire = (type: string, x: number, y: number) =>
      el.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 9,
          pointerType: 'pen',
          isPrimary: true,
          clientX: x,
          clientY: y,
        }),
      )
    fire('pointerdown', r.left + 10, r.top + 10)
    fire('pointermove', r.left + 90, r.top + 50)
    fire('pointerup', r.left + 90, r.top + 50)
  })
  const after = await box(handle)
  expect(
    Math.abs(after.x - before.x) + Math.abs(after.y - before.y),
  ).toBeGreaterThan(20)
  await expect(f.getByTestId('tf-undo')).toBeEnabled()
})

test('S3-11 turning the iPad keeps the footer on screen and the work', async ({
  page,
}) => {
  const f = await openFrame(page, 'clean', IPAD_L)
  await f.getByTestId('tf-tool-brighten').click()
  await page.setViewportSize(IPAD_P)
  const foot = await box(f.locator('.tf-foot'))
  expect(Math.round(foot.y + foot.height)).toBe(IPAD_P.height)
  await expect(f.getByTestId('tfd-pic')).toHaveAttribute('data-look', '1')
  await page.setViewportSize({ width: 820, height: 500 }) // like a keyboard taking room
  const foot2 = await box(f.locator('.tf-foot'))
  expect(Math.round(foot2.y + foot2.height)).toBe(500)
  await expect(f.getByTestId('tf-undo')).toBeEnabled()
})

test('S3-11 the real visual viewport: the keyboard opens, the footer stays above it and the work is kept', async ({
  page,
}) => {
  await stubVisualViewport(page)
  const f = await openFrame(page, 'clean', PHONE)
  await f.getByTestId('tf-tool-brighten').click()
  await setKeyboard(page, 300)
  await expect
    .poll(async () => {
      const foot = await box(f.locator('.tf-foot'))
      return Math.round(foot.y + foot.height)
    })
    .toBe(PHONE.height - 300)
  await expect(f.getByTestId('tfd-pic')).toHaveAttribute('data-look', '1')
  await expect(f.getByTestId('tf-undo')).toBeEnabled()
  await setKeyboard(page, 0)
  await expect
    .poll(async () => {
      const foot = await box(f.locator('.tf-foot'))
      return Math.round(foot.y + foot.height)
    })
    .toBe(PHONE.height)
})

test('S3-12 Tab stays inside, in the order top bar, preview, tools, ✕, ✓', async ({
  page,
}) => {
  const f = await openFrame(page, 'clean')
  await f.getByTestId('tf-tool-brighten').click()
  const seen: string[] = []
  await f.getByTestId('tf-undo').focus()
  for (let i = 0; i < 12; i++) {
    const id = await page.evaluate(() => {
      const a = document.activeElement as HTMLElement | null
      return {
        inside: !!a?.closest('[data-testid="tool-frame"]'),
        id:
          a?.getAttribute('data-testid') ?? a?.getAttribute('aria-label') ?? '',
      }
    })
    expect(id.inside).toBe(true)
    seen.push(id.id)
    await page.keyboard.press('Tab')
  }
  const at = (s: string) => seen.indexOf(s)
  expect(at('tf-preview'), 'the preview is a tab stop').toBeGreaterThan(-1)
  expect(at('tf-undo')).toBeLessThan(at('tf-preview'))
  expect(at('tf-preview')).toBeLessThan(at('tf-tool-brighten'))
  expect(at('tf-tool-brighten')).toBeLessThan(at('tf-cancel'))
  expect(at('tf-cancel')).toBeLessThan(at('tf-done'))
  // after ✓ it wraps back to the top of the frame
  expect(seen.slice(at('tf-done') + 1)[0]).toBe('tf-undo')
})

test('S3-40 a Pro tool is added to the same frame only when unlocked; the level stays Beginner', async ({
  page,
}) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'learning-notes:level',
      JSON.stringify({ level: 'beginner', unlocked: [], off: [] }),
    ),
  )
  await gallery(page, IPAD_L)
  await expect(page.getByTestId('tf-level')).toHaveText('Level: beginner')
  const toolIds = async () => {
    await page.getByTestId('tf-open-clean').click()
    const f = page.getByTestId('tool-frame')
    await expect(f).toBeVisible()
    const ids = await f
      .locator('.tf-tools [data-testid^="tf-tool-"]')
      .evaluateAll((n) => n.map((x) => x.getAttribute('data-testid')))
    await f.getByTestId('tf-cancel').click()
    await expect(f).toBeHidden()
    return ids
  }
  const before = await toolIds()
  expect(before).not.toContain('tf-tool-curves')
  await page.getByTestId('tf-unlock').click()
  const after = await toolIds()
  expect(after).toEqual([...before, 'tf-tool-curves'])
  await expect(page.getByTestId('tf-level')).toHaveText('Level: beginner')
  await page.getByTestId('tf-unlock').click()
  expect(await toolIds()).toEqual(before)
})

test('S3-39 reduced motion: the frame shows with no animation', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const f = await openFrame(page, 'clean')
  expect(await f.evaluate((n) => getComputedStyle(n).animationName)).toBe(
    'none',
  )
})
