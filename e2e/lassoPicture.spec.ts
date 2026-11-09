// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { png } from './fixtures/png.ts'
import { line, stroke, type Pt } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'

/**
 * Lasso on a picture (iPad findings 3 and 4, 9 Nov): the very first loop after
 * the app opens picks the picture, and the outline hugs the picture itself,
 * not the whole box. Simulated pen events.
 */
test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

async function pictureNote(page: Page) {
  await openNote(page, 'pencil', {
    'ink.lasso': { text: false, pictures: true, ink: true },
  })
  // The Lasso's pad is over the text: a click on it places the caret.
  await page.locator('.bn-editor').click({ force: true })
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('/image')
  await page.keyboard.press('Enter')
  await page.getByTestId('picture-input-photos').setInputFiles({
    name: 'p.png',
    mimeType: 'image/png',
    buffer: png(240, 120),
  })
  await page.getByRole('button', { name: 'Place picture' }).click()
  const img = page.locator('.bn-editor img').first()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await page.waitForTimeout(900)
}

const loop = (
  b: { x: number; y: number; width: number; height: number },
  pad: { x: number },
) => {
  // Inside the page (the loop must start on the pad).
  const side = Math.min(12, b.x - pad.x - 1)
  const c: Pt[] = [
    [b.x - side, b.y + b.height + 12],
    [b.x - side, b.y - 12],
    [b.x + b.width + side, b.y - 12],
    [b.x + b.width + side, b.y + b.height + 12],
    [b.x - side + 2, b.y + b.height + 10],
  ]
  return c.slice(1).flatMap((p, i) => line(c[i], p, 10))
}

test('the first loop after opening picks the picture and the outline hugs it', async ({
  page,
}) => {
  await pictureNote(page)
  // A fresh start: reload, then use the Lasso for the first time.
  await page.reload()
  const img = page.locator('.bn-editor img').first()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  const b = (await img.boundingBox())!
  const pad = (await page.locator('[data-ink-pad]').boundingBox())!
  await stroke(page, loop(b, pad))
  const marked = page.locator(
    '.bn-editor .ln-sel-node img, [data-ln-selected] img',
  )
  await expect(marked.first()).toBeVisible()
  const outlined = await page.evaluate(() => {
    const el = document.querySelector(
      '.bn-editor .ln-sel-node img, [data-ln-selected] img',
    )!
    const cs = getComputedStyle(el)
    const block = el.closest('.bn-block-content')!
    return {
      style: cs.outlineStyle,
      width: (el as HTMLElement).getBoundingClientRect().width,
      boxStyle: getComputedStyle(block).outlineStyle,
    }
  })
  expect(outlined.style).toBe('dashed')
  expect(outlined.boxStyle).toBe('none')
})

test('a press on text whose lift was lost does not stop the next loop', async ({
  page,
}) => {
  await pictureNote(page)
  await page.reload()
  const img = page.locator('.bn-editor img').first()
  await expect(img).toHaveAttribute('src', /^blob:/)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  // A finger went down on the words and its lift never came.
  await page.evaluate(() => {
    const el = document.querySelector('.bn-inline-content')!
    const r = el.getBoundingClientRect()
    el.dispatchEvent(
      new PointerEvent('pointerdown', {
        pointerType: 'touch',
        pointerId: 3,
        clientX: r.x + 4,
        clientY: r.y + 4,
        bubbles: true,
        isPrimary: true,
        buttons: 1,
      }),
    )
  })
  const b = (await img.boundingBox())!
  const pad = (await page.locator('[data-ink-pad]').boundingBox())!
  await stroke(page, loop(b, pad))
  await expect(
    page.locator('.bn-editor .ln-sel-node img, [data-ln-selected] img').first(),
  ).toBeVisible()
})
