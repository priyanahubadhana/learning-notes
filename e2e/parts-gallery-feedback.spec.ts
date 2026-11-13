import { expect, test, type Locator, type Page } from '@playwright/test'

/**
 * Slice 0g step 2: Sheet, Dialog set, Toast queue and Banner on the Parts
 * gallery at #/design-tokens (SP-50 to SP-56, docs/features/shared-parts.md).
 * Touch screens on purpose: iPad both ways and two phone widths.
 */
test.use({ hasTouch: true })

const IPAD_L = { width: 1180, height: 820 }
const IPAD_P = { width: 820, height: 1180 }
const PHONE = { width: 390, height: 844 }
const SMALL = { width: 320, height: 640 }
const ALL = [IPAD_L, IPAD_P, PHONE, SMALL]
type Size = { width: number; height: number }

async function open(page: Page, size: Size) {
  await page.setViewportSize(size)
  // a fresh document each time: the same address twice is a hash jump, not a load
  await page.goto('about:blank')
  await page.goto('/#/design-tokens')
  // every section has arrived: nothing above can still push the page down
  await expect(page.getByTestId('gal-parts')).toHaveAttribute(
    'data-ready',
    'true',
  )
  const sec = page.getByTestId('gal-feedback')
  await expect(sec).toBeAttached()
  await sec.scrollIntoViewIfNeeded()
  await expect(page.getByTestId('fb-open-sheet')).toBeVisible()
}

/** Stops toast time (gallery only): a toast ends when the test says, not when the machine is slow. */
type Hook = { pause(): void; advance(ms: number): void }
const freezeToasts = (page: Page) =>
  page.evaluate(() =>
    (window as unknown as { __partsClock: Hook }).__partsClock.pause(),
  )
const toastTime = (page: Page, ms: number) =>
  page.evaluate(
    (n) =>
      (window as unknown as { __partsClock: Hook }).__partsClock.advance(n),
    ms,
  )

const box = async (l: Locator) => {
  const b = await l.boundingBox()
  expect(b).not.toBeNull()
  return b!
}

/** Nothing of `l` is outside the screen. Why-note: the page can still shift as
 * lazy parts arrive between a check and a later measure (CI webkit saw the
 * banner at y 3278 after a passing poll), so every edge is checked in the same
 * poll that scrolls the target back into view. */
async function onScreen(page: Page, l: Locator, what: string) {
  await expect
    .poll(
      async () => {
        await l.scrollIntoViewIfNeeded()
        const b = await l.boundingBox()
        const v = page.viewportSize()!
        if (!b) return `${what} has no box`
        if (b.x < -0.5) return `${what} left ${b.x}`
        if (b.y < -0.5) return `${what} top ${b.y}`
        if (b.x + b.width > v.width + 0.5) return `${what} right`
        if (b.y + b.height > v.height + 0.5)
          return `${what} bottom ${b.y + b.height}`
        return 'ok'
      },
      { message: what },
    )
    .toBe('ok')
}

const noSideScroll = async (page: Page, what: string) => {
  const over = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth,
  )
  expect(over, `${what}: page scrolls sideways`).toBeLessThanOrEqual(1)
}

/** Waits until an element stops moving (the parts slide or grow in for ~200 ms). */
async function settled(l: Locator) {
  let last = ''
  await expect
    .poll(async () => {
      const now = JSON.stringify(await l.boundingBox())
      const same = now === last
      last = now
      return same
    })
    .toBe(true)
}

const said = (page: Page) => page.getByTestId('fb-said')
const activeIn = (page: Page, sel: string) =>
  page.evaluate(
    (s) => !!document.querySelector(s)?.contains(document.activeElement),
    sel,
  )
const intersects = (
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
) =>
  a.x < b.x + b.width &&
  a.x + a.width > b.x &&
  a.y < b.y + b.height &&
  a.y + a.height > b.y

test.describe('Feedback parts (SP-50 to SP-56)', () => {
  test('0g follow-up: the Sheet footer buttons sit at the right', async ({
    page,
  }) => {
    await open(page, IPAD_L)
    await page.getByTestId('fb-open-sheet').click()
    const sheet = page.getByTestId('fb-sheet')
    await expect(sheet).toBeVisible()
    await settled(sheet)
    const sb = await box(sheet)
    const btns = page.getByTestId('fb-sheet-foot').locator('button')
    const last = await box(btns.last())
    const first = await box(btns.first())
    expect(sb.x + sb.width - (last.x + last.width)).toBeLessThan(24)
    expect(first.x - sb.x).toBeGreaterThan(sb.width / 2)
  })

  test('SP-50 a Sheet docks right at full height on iPad; the page beside still works', async ({
    page,
  }) => {
    await open(page, IPAD_L)
    const opener = page.getByTestId('fb-open-sheet')
    await opener.click()
    const sheet = page.getByTestId('fb-sheet')
    await expect(sheet).toBeVisible()
    await expect(sheet).toHaveAttribute('role', 'dialog')
    await expect
      .poll(async () => (await box(sheet)).x + (await box(sheet)).width)
      .toBeCloseTo(IPAD_L.width, 0)
    const b = await box(sheet)
    expect(b.width).toBeCloseTo(376, 0)
    expect(b.y).toBeCloseTo(0, 0)
    expect(b.height).toBeCloseTo(IPAD_L.height, 0)
    await onScreen(page, sheet, 'sheet')
    // the body scrolls, the footer stays
    const foot = await box(page.getByTestId('fb-sheet-foot'))
    await page
      .getByTestId('fb-sheet-body')
      .evaluate((e) => (e.scrollTop = 9999))
    expect((await box(page.getByTestId('fb-sheet-foot'))).y).toBeCloseTo(
      foot.y,
      0,
    )
    // the page beside it still works: a tap on a page button does not close it
    // (the first column; where the other demos sit depends on the font width)
    const beside = page.getByTestId('fb-banner-add')
    await beside.scrollIntoViewIfNeeded()
    await expect
      .poll(async () => (await box(beside)).x + (await box(beside)).width)
      .toBeLessThan(IPAD_L.width - 376)
    await beside.tap()
    await expect(page.getByTestId('fb-banner-more')).toHaveText('+1')
    await expect(sheet).toBeVisible()
    // Esc closes and focus returns to the button that opened it
    await page.keyboard.press('Escape')
    await expect(sheet).toHaveCount(0)
    await expect(opener).toBeFocused()
    // a swipe right on the sheet closes it
    await opener.click()
    await expect(sheet).toBeVisible()
    await settled(sheet)
    const h = await box(page.getByTestId('fb-sheet').locator('header'))
    await page.mouse.move(h.x + 40, h.y + 28)
    await page.mouse.down()
    await page.mouse.move(h.x + 200, h.y + 30, { steps: 6 })
    await page.mouse.up()
    await expect(sheet).toHaveCount(0)
  })

  test('SP-50 the Sheet fills the screen on iPad upright (under 1024 px)', async ({
    page,
  }) => {
    await open(page, IPAD_P)
    await page.getByTestId('fb-open-sheet').click()
    const sheet = page.getByTestId('fb-sheet')
    await expect(sheet).toBeVisible()
    await expect.poll(async () => Math.round((await box(sheet)).x)).toBe(0)
    const b = await box(sheet)
    expect(b.width).toBeCloseTo(IPAD_P.width, 0)
    expect(b.height).toBeCloseTo(IPAD_P.height, 0)
    await onScreen(page, sheet, 'sheet')
    await noSideScroll(page, 'sheet open')
  })

  for (const size of [PHONE, SMALL]) {
    test(`SP-51 a Sheet fills a ${size.width} px phone; the close button closes it`, async ({
      page,
    }) => {
      await open(page, size)
      const opener = page.getByTestId('fb-open-sheet')
      await opener.tap()
      const sheet = page.getByTestId('fb-sheet')
      await expect(sheet).toBeVisible()
      await expect.poll(async () => Math.round((await box(sheet)).y)).toBe(0)
      const b = await box(sheet)
      expect(b.x).toBeCloseTo(0, 0)
      expect(b.width).toBeCloseTo(size.width, 0)
      expect(b.height).toBeCloseTo(size.height, 0)
      await onScreen(page, sheet, 'sheet')
      await noSideScroll(page, 'sheet open')
      // header and footer are on screen and the buttons are 44 px
      for (const id of ['fb-sheet-close']) {
        const c = await box(page.getByTestId(id))
        expect(c.width).toBeGreaterThanOrEqual(44)
        expect(c.height).toBeGreaterThanOrEqual(44)
        await onScreen(page, page.getByTestId(id), id)
      }
      await onScreen(page, page.getByTestId('fb-sheet-foot'), 'footer')
      // focus stays inside
      for (let i = 0; i < 6; i++) {
        await page.keyboard.press('Tab')
        expect(await activeIn(page, '[data-testid="fb-sheet"]')).toBe(true)
      }
      await page.getByTestId('fb-sheet-close').tap()
      await expect(sheet).toHaveCount(0)
      await expect(opener).toBeFocused()
    })
  }

  for (const size of ALL) {
    test(`SP-52 a Confirm dialog keeps focus, Esc cancels, Enter confirms at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await open(page, size)
      const opener = page.getByTestId('fb-open-confirm')
      await opener.click()
      const dlg = page.getByTestId('fb-dialog')
      await expect(dlg).toBeVisible()
      await settled(dlg)
      await expect(dlg).toHaveAttribute('aria-modal', 'true')
      await expect(dlg).toHaveAttribute('role', /dialog|alertdialog/)
      await onScreen(page, dlg, 'dialog')
      const b = await box(dlg)
      expect(b.width).toBeLessThanOrEqual(360.5)
      if (size.width >= 392) expect(b.width).toBeCloseTo(360, 0)
      else expect(b.width).toBeCloseTo(size.width - 32, 0)
      for (const id of [
        'fb-dialog-close',
        'fb-dialog-cancel',
        'fb-dialog-main',
      ])
        expect((await box(page.getByTestId(id))).height).toBeGreaterThanOrEqual(
          44,
        )
      const bg = await page
        .getByTestId('fb-dialog-layer')
        .evaluate((e) => getComputedStyle(e).backgroundColor)
      expect(bg).toBe('rgba(0, 0, 0, 0.3)')
      // focus starts inside and never leaves, both ways
      expect(await activeIn(page, '[data-testid="fb-dialog"]')).toBe(true)
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab')
        expect(await activeIn(page, '[data-testid="fb-dialog"]')).toBe(true)
      }
      await page.keyboard.press('Shift+Tab')
      expect(await activeIn(page, '[data-testid="fb-dialog"]')).toBe(true)
      // Esc cancels and focus returns to the pressed button
      await page.keyboard.press('Escape')
      await expect(dlg).toHaveCount(0)
      await expect(said(page)).toHaveText('Cancelled')
      await expect(opener).toBeFocused()
      // Enter confirms
      await opener.click()
      await expect(dlg).toBeVisible()
      await page.keyboard.press('Enter')
      await expect(dlg).toHaveCount(0)
      await expect(said(page)).toHaveText('Confirmed')
      await expect(opener).toBeFocused()
      // the close button cancels
      await opener.click()
      await page.getByTestId('fb-dialog-close').tap()
      await expect(said(page)).toHaveText('Cancelled')
    })
  }

  test('SP-52 red only for danger; an Alert has one button', async ({
    page,
  }) => {
    await open(page, IPAD_L)
    await page.getByTestId('fb-open-confirm').click()
    const normal = await page
      .getByTestId('fb-dialog-main')
      .evaluate((e) => getComputedStyle(e).backgroundColor)
    await page.keyboard.press('Escape')
    await page.getByTestId('fb-open-danger').click()
    const danger = await page
      .getByTestId('fb-dialog-main')
      .evaluate((e) => getComputedStyle(e).backgroundColor)
    expect(danger).not.toBe(normal)
    await page.keyboard.press('Escape')
    await page.getByTestId('fb-open-alert').click()
    await expect(page.getByTestId('fb-dialog-cancel')).toHaveCount(0)
    await expect(page.getByTestId('fb-dialog')).toHaveAttribute(
      'role',
      'alertdialog',
    )
    await page.keyboard.press('Enter')
    await expect(said(page)).toHaveText('Alert closed')
  })

  for (const size of ALL) {
    test(`SP-53 a name of 32+ characters shows the count; 40 is the limit; the clear button clears at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await open(page, size)
      await page.getByTestId('fb-open-prompt').click()
      const dlg = page.getByTestId('fb-dialog')
      const input = page.getByTestId('fb-prompt-input')
      const count = page.getByTestId('fb-prompt-count')
      await expect(input).toBeFocused()
      // the dialog scales in; sizes are final once it says so
      await expect(dlg).toHaveAttribute('data-settled', 'true')
      await input.fill('a'.repeat(31))
      await expect(count).toBeHidden()
      await input.fill('a'.repeat(32))
      await expect(count).toBeVisible()
      await expect(count).toHaveText('32 of 40')
      await input.fill('b'.repeat(45))
      await expect(input).toHaveValue('b'.repeat(40))
      await expect(count).toHaveText('40 of 40')
      await onScreen(page, dlg, 'dialog')
      await onScreen(page, count, 'count')
      // the clear button
      const clear = page.getByTestId('fb-dialog-layer').getByTestId('clr-btn')
      expect((await box(clear)).width).toBeGreaterThanOrEqual(44)
      await clear.click()
      await expect(input).toHaveValue('')
      await expect(input).toBeFocused()
      await expect(count).toBeHidden()
      await expect(page.getByTestId('fb-dialog-main')).toBeDisabled()
      // Enter saves
      await input.fill('Maths')
      await page.keyboard.press('Enter')
      await expect(said(page)).toHaveText('Named Maths')
      await expect(page.getByTestId('fb-open-prompt')).toBeFocused()
    })
  }

  for (const size of ALL) {
    test(`SP-54 at most 3 toasts stack; an Undo is never pushed out; Undo works at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await open(page, size)
      const toasts = page.getByTestId('fb-toast')
      await freezeToasts(page)
      const done = page.getByTestId('fb-toast-done')
      const undo = page.getByTestId('fb-toast-undo-btn')
      // 4 things: done, undo, done, done
      await done.click()
      await undo.click()
      await done.click()
      await done.click()
      await expect(toasts).toHaveCount(3)
      for (let i = 0; i < 3; i++) await settled(toasts.nth(i))
      await expect(page.getByTestId('fb-toast-undo')).toHaveCount(1)
      // the stack sits at the bottom centre, 44 px tall, 8 px apart, on screen
      const bs: { x: number; y: number; width: number; height: number }[] = []
      for (let i = 0; i < 3; i++) bs.push(await box(toasts.nth(i)))
      const v = page.viewportSize()!
      for (const b of bs) {
        expect(b.height).toBeGreaterThanOrEqual(44)
        expect(b.width).toBeLessThanOrEqual(420.5)
        expect(b.x + b.width / 2).toBeCloseTo(v.width / 2, 0)
      }
      for (let i = 0; i < 3; i++)
        await onScreen(page, toasts.nth(i), `toast ${i}`)
      const sorted = [...bs].sort((a, b) => b.y - a.y)
      expect(
        v.height - (sorted[0].y + sorted[0].height),
      ).toBeGreaterThanOrEqual(15.5)
      for (let i = 1; i < sorted.length; i++)
        expect(
          sorted[i - 1].y - (sorted[i].y + sorted[i].height),
        ).toBeGreaterThanOrEqual(7.5)
      await noSideScroll(page, 'toasts')
      // Undo works
      await page.getByTestId('fb-toast-undo').tap()
      await expect(said(page)).toHaveText('Undo pressed')
      await expect(page.getByTestId('fb-toast-undo')).toHaveCount(0)
    })
  }

  test('SP-54 a problem toast stays until its close button is used', async ({
    page,
  }) => {
    await open(page, IPAD_L)
    await freezeToasts(page)
    await page.getByTestId('fb-toast-problem').click()
    const t = page.getByTestId('fb-toast')
    await expect(t).toHaveCount(1)
    await toastTime(page, 2900)
    await expect(t).toHaveCount(1)
    await toastTime(page, 60_000)
    await expect(t).toHaveCount(1)
    await page.getByTestId('fb-toast-x').tap()
    await expect(t).toHaveCount(0)
  })

  test('SP-54 a done toast goes after 2.5 s and an Undo toast after 6 s', async ({
    page,
  }) => {
    await open(page, IPAD_L)
    await freezeToasts(page)
    await page.getByTestId('fb-toast-done').click()
    await page.getByTestId('fb-toast-undo-btn').click()
    const toasts = page.getByTestId('fb-toast')
    await expect(toasts).toHaveCount(2)
    await toastTime(page, 2499)
    await expect(toasts).toHaveCount(2)
    await toastTime(page, 1)
    await expect(toasts).toHaveCount(1)
    await expect(page.getByTestId('fb-toast-undo')).toHaveCount(1)
    await toastTime(page, 3499)
    await expect(toasts).toHaveCount(1)
    await toastTime(page, 1)
    await expect(toasts).toHaveCount(0)
  })

  for (const size of ALL) {
    test(`SP-55 a toast is read politely and never covers a title or a sheet footer at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await open(page, size)
      await freezeToasts(page)
      const region = page.getByTestId('fb-toasts')
      await expect(region).toHaveAttribute('role', 'status')
      await expect(region).toHaveAttribute('aria-live', 'polite')
      // with the sheet open, its footer and title stay clear
      await page.getByTestId('fb-open-sheet').click()
      const sheet = page.getByTestId('fb-sheet')
      await expect(sheet).toBeVisible()
      // (the open sheet covers the page buttons, so these two are pressed in the page)
      await page.evaluate(() => {
        for (const id of ['fb-toast-done', 'fb-toast-undo-btn'])
          (
            document.querySelector(`[data-testid="${id}"]`) as HTMLElement
          ).click()
      })
      const toasts = page.getByTestId('fb-toast')
      await expect(toasts).toHaveCount(2)
      // once the sheet has slid in and the stack has settled, nothing is covered
      await settled(page.getByTestId('fb-sheet-foot'))
      await expect
        .poll(async () => {
          const foot = await box(page.getByTestId('fb-sheet-foot'))
          const title = await box(sheet.locator('h2'))
          const hits: string[] = []
          for (let i = 0; i < 2; i++) {
            const b = await box(toasts.nth(i))
            if (intersects(b, foot)) hits.push('footer ' + i)
            if (intersects(b, title)) hits.push('title ' + i)
          }
          return hits
        })
        .toEqual([])
      for (let i = 0; i < 2; i++)
        await onScreen(page, toasts.nth(i), 'toast ' + i)
      // the Undo toast can be reached and pressed
      await page.getByTestId('fb-toast-undo').click()
      await expect(said(page)).toHaveText('Undo pressed')
    })
  }

  for (const size of [IPAD_L, PHONE, SMALL]) {
    test(`SP-56 one Banner shows at a time; the close button shows the next at ${size.width}x${size.height}`, async ({
      page,
    }) => {
      await open(page, size)
      const host = page.getByTestId('fb-banner-host')
      await host.scrollIntoViewIfNeeded()
      const banner = page.getByTestId('fb-banner')
      await expect(banner).toHaveCount(1)
      await expect(banner).toContainText('This is a template')
      await page.getByTestId('fb-banner-add').click()
      await page.getByTestId('fb-banner-add').click()
      await expect(banner).toHaveCount(1)
      await expect(page.getByTestId('fb-banner-more')).toHaveText('+2')
      const b = await box(banner)
      expect(b.height).toBeGreaterThanOrEqual(44)
      await banner.scrollIntoViewIfNeeded()
      await onScreen(page, banner, 'banner')
      await onScreen(page, page.getByTestId('fb-banner-x'), 'banner close')
      expect(
        (await box(page.getByTestId('fb-banner-x'))).width,
      ).toBeGreaterThanOrEqual(44)
      await noSideScroll(page, 'banner')
      await page.getByTestId('fb-banner-x').tap()
      await expect(banner).toHaveCount(1)
      await expect(banner).toContainText('Notice 1')
      await expect(page.getByTestId('fb-banner-more')).toHaveText('+1')
      await page.getByTestId('fb-banner-x').tap()
      await expect(banner).toContainText('Notice 2')
      await expect(page.getByTestId('fb-banner-more')).toHaveCount(0)
      await page.getByTestId('fb-banner-action').tap()
      await expect(said(page)).toHaveText('Banner action')
      await page.getByTestId('fb-banner-x').tap()
      await expect(banner).toHaveCount(0)
    })
  }

  test('the section fits every width without scrolling sideways', async ({
    page,
  }) => {
    for (const size of ALL) {
      await open(page, size)
      await noSideScroll(page, `section at ${size.width}`)
      const bad = await page.evaluate(() => {
        const vw = window.innerWidth
        const root = document.querySelector('[data-testid="gal-feedback"]')!
        const out: string[] = []
        for (const el of root.querySelectorAll('*')) {
          const r = el.getBoundingClientRect()
          if (r.width === 0 && r.height === 0) continue
          if (r.right > vw + 0.5 || r.left < -0.5)
            out.push(
              `${el.tagName.toLowerCase()} ${(el as HTMLElement).dataset.testid ?? el.className}`,
            )
        }
        return out
      })
      expect(bad, `clipped at ${size.width}`).toEqual([])
    }
  })
})

// Pictures for the review folder; run with FB_SHOTS=1.
const SHOTS = process.env.FB_SHOTS === '1'
test.describe('Feedback pictures', () => {
  test.skip(!SHOTS, 'set FB_SHOTS=1 to take the pictures')
  const devices = [
    ['ipad', IPAD_L],
    ['phone', PHONE],
  ] as const
  for (const [theme, button] of [
    ['day', 'day'],
    ['night', 'night'],
  ] as const) {
    for (const [name, size] of devices) {
      test(`picture ${theme} ${name}`, async ({ page }) => {
        await open(page, size)
        await page.getByRole('button', { name: button, exact: true }).click()
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme)
        const dir = 'docs/mockups/parts-gallery'
        const toast = () =>
          page.evaluate(() => {
            for (const id of [
              'fb-toast-done',
              'fb-toast-undo-btn',
              'fb-toast-problem',
            ])
              (
                document.querySelector(
                  '[data-testid=' + id + ']',
                ) as HTMLElement
              ).click()
          })
        const NAME = 'A notebook name that is quite long'
        if (name === 'ipad') {
          await page.getByTestId('fb-open-sheet').click()
          await expect(page.getByTestId('fb-sheet')).toBeVisible()
        }
        await page.getByTestId('fb-open-prompt').click()
        await page.getByTestId('fb-prompt-input').fill(NAME)
        await toast()
        await page.waitForTimeout(400)
        await page.screenshot({ path: `${dir}/feedback-${theme}-${name}.png` })
        if (name === 'phone') {
          await page.keyboard.press('Escape')
          await page.keyboard.press('Escape')
          await expect(page.getByTestId('fb-dialog-layer')).toHaveCount(0)
          await page.evaluate(() =>
            (
              document.querySelector(
                '[data-testid=fb-open-sheet]',
              ) as HTMLElement
            ).click(),
          )
          await page.waitForTimeout(400)
          await page.screenshot({
            path: `${dir}/feedback-sheet-${theme}-${name}.png`,
          })
        }
      })
    }
  }
})
