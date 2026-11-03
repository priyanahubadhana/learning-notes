// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'

/**
 * The Pencil test page (public/pencil-test.html) is a throwaway page for the
 * iPad check. It must load under the site's security rules (no inline script)
 * and draw only with a pen.
 */

type Kind = 'pen' | 'touch'

/** Sends one made-up pointer event to the drawing canvas. */
async function send(
  page: Page,
  kind: Kind,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  dx: number,
  dy: number,
  pressure = 0.7,
) {
  await page.evaluate(
    ([kind, type, dx, dy, pressure]) => {
      const canvas = document.getElementById('ink') as HTMLCanvasElement
      const r = canvas.getBoundingClientRect()
      canvas.dispatchEvent(
        new PointerEvent(type, {
          pointerId: kind === 'pen' ? 7 : 8,
          pointerType: kind,
          isPrimary: true,
          clientX: r.left + dx,
          clientY: r.top + dy,
          pressure,
          tiltX: 20,
          tiltY: 10,
          buttons: type === 'pointerup' ? 0 : 1,
          bubbles: true,
          cancelable: true,
        }),
      )
    },
    [kind, type, dx, dy, pressure] as const,
  )
}

/** A line of moves from (x0, y0) to (x1, y1) with the given pointer kind. */
async function line(page: Page, kind: Kind, y: number) {
  await send(page, kind, 'pointerdown', 40, y)
  for (let x = 60; x <= 240; x += 20)
    await send(page, kind, 'pointermove', x, y)
  await send(page, kind, 'pointerup', 240, y)
}

/** How many pixels of the drawing are not empty. */
const inked = (page: Page) =>
  page.evaluate(() => {
    const canvas = document.getElementById('ink') as HTMLCanvasElement
    const data = canvas
      .getContext('2d')!
      .getImageData(0, 0, canvas.width, canvas.height).data
    let n = 0
    for (let i = 3; i < data.length; i += 4) if (data[i] > 0) n++
    return n
  })

test('the Pencil test page loads, a finger does not draw, a pen does', async ({
  page,
}) => {
  const problems: string[] = []
  page.on('console', (m) => {
    if (m.type() === 'error') problems.push(m.text())
  })
  page.on('pageerror', (e) => problems.push(e.message))
  const response = await page.goto('/pencil-test.html')
  expect(response?.status()).toBe(200)
  await expect(
    page.getByText(/Write and draw with your Apple Pencil/),
  ).toBeVisible()
  await expect(page.locator('#ink')).toBeVisible()

  await line(page, 'touch', 60)
  expect(await inked(page)).toBe(0)
  await expect(page.locator('#rType')).toHaveText('touch')

  await line(page, 'pen', 60)
  expect(await inked(page)).toBeGreaterThan(100)
  await expect(page.locator('#rType')).toHaveText('pen')
  await expect(page.locator('#rPressure')).toHaveText('0.700')
  await expect(page.locator('#rTilt')).toHaveText('20 / 10')
  await expect(page.locator('#rCoalesced')).not.toHaveText('–')

  // Clear.
  await page.getByRole('button', { name: 'Clear' }).click()
  expect(await inked(page)).toBe(0)

  expect(problems).toEqual([])
})

test('highlighter, eraser, paper styles and Copy results', async ({
  page,
  context,
}) => {
  await context.grantPermissions(['clipboard-read', 'clipboard-write'])
  await page.goto('/pencil-test.html')

  // Highlighter: a wide stroke that is see-through.
  await page.getByRole('button', { name: 'Highlighter' }).click()
  await line(page, 'pen', 80)
  expect(await inked(page)).toBeGreaterThan(100)

  // Eraser: rubbing across a stroke removes it.
  await page.getByRole('button', { name: 'Eraser' }).click()
  await line(page, 'pen', 80)
  expect(await inked(page)).toBe(0)

  // Paper styles are shown behind the ink.
  for (const paper of ['lined', 'grid', 'dotted']) {
    await page.getByLabel('Paper').selectOption(paper)
    await expect(page.locator('#stage')).toHaveClass(paper)
  }
  await page.getByLabel('Paper').selectOption('blank')

  // Copy results: plain text with the measured numbers.
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
  await line(page, 'pen', 120)
  await page.getByRole('button', { name: 'Copy results' }).click()
  await expect(page.locator('#copyStatus')).toContainText(
    /Copied|Select the text/,
  )
  const text = await page.evaluate(async () => {
    try {
      return await navigator.clipboard.readText()
    } catch {
      return (document.getElementById('copyBox') as HTMLTextAreaElement).value
    }
  })
  expect(text).toContain('Pencil test results')
  expect(text).toContain('Pointer types seen: pen')
  expect(text).toContain('getCoalescedEvents:')
  expect(text).toContain('Frame rate:')
})

test('a tap with no movement draws a dot, with the pen and the highlighter', async ({
  page,
}) => {
  await page.goto('/pencil-test.html')
  await send(page, 'pen', 'pointerdown', 100, 100)
  await send(page, 'pen', 'pointerup', 100, 100)
  expect(await inked(page)).toBeGreaterThan(20)
  await page.getByRole('button', { name: 'Clear' }).click()

  await page.getByRole('button', { name: 'Highlighter' }).click()
  await send(page, 'pen', 'pointerdown', 100, 100)
  await send(page, 'pen', 'pointerup', 100, 100)
  expect(await inked(page)).toBeGreaterThan(100)

  // A pen that sends pressure 0 at the start still leaves a visible dot.
  await page.getByRole('button', { name: 'Clear' }).click()
  await page.getByRole('button', { name: 'Pen', exact: true }).click()
  await send(page, 'pen', 'pointerdown', 100, 100, 0)
  await send(page, 'pen', 'pointerup', 100, 100, 0)
  expect(await inked(page)).toBeGreaterThan(20)
})

test('the prediction line is on at the start', async ({ page }) => {
  await page.goto('/pencil-test.html')
  await expect(page.getByLabel('Show my own prediction line')).toBeChecked()
})

test('pressure is rescaled to the range the pen really sends', async ({
  page,
}) => {
  await page.goto('/pencil-test.html')
  // A pen that never goes above 0.3 draws as wide as one that reaches 0.9.
  const lineAt = async (pressure: number) => {
    await send(page, 'pen', 'pointerdown', 40, 60, pressure)
    for (let x = 60; x <= 240; x += 20)
      await send(page, 'pen', 'pointermove', x, 60, pressure)
    await send(page, 'pen', 'pointerup', 240, 60, pressure)
    const n = await inked(page)
    await page.getByRole('button', { name: 'Clear' }).click()
    return n
  }
  const weak = await lineAt(0.3)
  const strong = await lineAt(0.9)
  expect(weak).toBeGreaterThan(100)
  expect(Math.abs(weak - strong) / strong).toBeLessThan(0.15)
})

test('the Pencil touch is stopped before Safari scrolls or zooms', async ({
  page,
}) => {
  await page.goto('/pencil-test.html')
  const result = await page.evaluate(() => {
    const canvas = document.getElementById('ink')!
    // Chrome cannot make a stylus Touch, so the event carries the field.
    const run = (type: string, touchType: string) => {
      const event = new Event(type, { cancelable: true, bubbles: true })
      Object.defineProperty(event, 'changedTouches', {
        value: [{ touchType }],
      })
      canvas.dispatchEvent(event)
      return event.defaultPrevented
    }
    const dbl = new MouseEvent('dblclick', { cancelable: true, bubbles: true })
    canvas.dispatchEvent(dbl)
    return {
      stylusStart: run('touchstart', 'stylus'),
      stylusMove: run('touchmove', 'stylus'),
      stylusEnd: run('touchend', 'stylus'),
      fingerStart: run('touchstart', 'direct'),
      doubleTap: dbl.defaultPrevented,
    }
  })
  expect(result).toEqual({
    stylusStart: true,
    stylusMove: true,
    stylusEnd: true,
    fingerStart: false,
    doubleTap: true,
  })
  await expect(page.locator('#ink')).toHaveCSS('touch-action', 'none')
})

test('when the clipboard fails, the results are shown selected', async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: () => Promise.reject(new Error('blocked')) },
    })
  })
  await page.goto('/pencil-test.html')
  await line(page, 'pen', 120)
  await page.getByRole('button', { name: 'Copy results' }).click()
  const box = page.getByLabel('Results to copy')
  await expect(box).toBeVisible()
  await expect(box).toHaveValue(/Pencil test results/)
  const selected = await box.evaluate((el: HTMLTextAreaElement) => ({
    start: el.selectionStart,
    end: el.selectionEnd,
    length: el.value.length,
  }))
  expect(selected).toEqual({
    start: 0,
    end: selected.length,
    length: selected.length,
  })
  expect(selected.length).toBeGreaterThan(100)
})
