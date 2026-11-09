// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { inkNote, line, stroke, type Pt } from './inkHelpers.ts'

/**
 * R6-17 (owner's iPad): the Lasso with the T (text) filter, looped around
 * some words INSIDE a paragraph, selects just those words (first to last
 * word whose centre is inside), freeform or rectangle, and the text menu
 * shows. A whole line taken in still selects as a block.
 */

test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

const LONG =
  'Learning works best when the notes are short, the summary is shorter and the recall cards ask one thing at a time, so that each review session stays quick and the memory of the page grows stronger every single day of the week.'

type Box = { x: number; y: number; width: number; height: number }

/**
 * Three words in the middle of the second screen row of the long paragraph
 * (never the row's first word, so a loop starting left of them is still on
 * the page), with their box.
 */
async function rowPhrase(page: Page): Promise<{ phrase: string; box: Box }> {
  return page.evaluate((long) => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    let node: Text | null = null
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (n.textContent === long) node = n as Text
    }
    if (!node) throw new Error('paragraph not found')
    const words: { word: string; at: number; r: DOMRect }[] = []
    for (const m of long.matchAll(/\S+/g)) {
      const r = document.createRange()
      r.setStart(node, m.index)
      r.setEnd(node, m.index + m[0].length)
      words.push({ word: m[0], at: m.index, r: r.getBoundingClientRect() })
    }
    const rows = [...new Set(words.map((w) => Math.round(w.r.top)))].sort(
      (a, b) => a - b,
    )
    const row = words.filter((w) => Math.round(w.r.top) === rows[1])
    const pick = row.slice(2, 5)
    const x = Math.min(...pick.map((w) => w.r.left))
    const right = Math.max(...pick.map((w) => w.r.right))
    const y = Math.min(...pick.map((w) => w.r.top))
    const bottom = Math.max(...pick.map((w) => w.r.bottom))
    return {
      phrase: long.slice(pick[0].at, pick[2].at + pick[2].word.length),
      box: { x, y, width: right - x, height: bottom - y },
    }
  }, LONG)
}

/** The screen box of a phrase (inside one text node). */
async function phraseBox(page: Page, phrase: string): Promise<Box> {
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
      return { x: b.x, y: b.y, width: b.width, height: b.height }
    }
    throw new Error('phrase not found: ' + w)
  }, phrase)
}

/**
 * A small hand-drawn loop just around a box (many small steps), starting at
 * its bottom right corner (on the page, where the Lasso's pad is: the first
 * line sits at the page's top edge).
 */
const loopAround = (b: Box, pad = 5): Pt[] => {
  const corners: Pt[] = [
    [b.x + b.width + pad, b.y + b.height + pad],
    [b.x - pad, b.y + b.height + pad],
    [b.x - pad, b.y - pad],
    [b.x + b.width + pad, b.y - pad],
    [b.x + b.width + pad - 1, b.y + b.height + pad - 2],
  ]
  return corners.slice(1).flatMap((c, i) => line(corners[i], c, 10))
}

const marked = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join(''),
  )

async function setup(page: Page, shape: 'free' | 'rect' = 'free') {
  await inkNote(page, 'Lasso', 'pencil', {
    'ink.lasso': { text: true, ink: true, pictures: false, shape },
  })
  await page.keyboard.press('Escape')
  await page.locator('.bn-editor').click({ force: true })
  await page.keyboard.press('End')
  await page.keyboard.press('Enter')
  await page.keyboard.type(LONG)
  await page.waitForTimeout(800)
  await page.evaluate(() => (document.activeElement as HTMLElement)?.blur())
  await page.keyboard.press('Escape') // the pill would cover the text
  await page.waitForTimeout(500) // the closed pill gives the page its room back
}

test('a freeform loop around words inside a paragraph selects just those words', async ({
  page,
}) => {
  await setup(page)
  const { phrase, box } = await rowPhrase(page)
  await stroke(page, loopAround(box))
  await expect.poll(() => marked(page)).toBe(phrase)
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
  await expect(page.locator('[data-ink-menu]')).toHaveCount(0)
})

test('a rectangle around words inside a paragraph selects just those words', async ({
  page,
}) => {
  await setup(page, 'rect')
  const { phrase, box } = await rowPhrase(page)
  // Dragged from the bottom right (on the page) to the top left.
  const from: Pt = [box.x + box.width + 5, box.y + box.height + 5]
  const to: Pt = [box.x - 5, box.y - 5]
  await stroke(page, line(from, to, 12), { id: 52 })
  await expect.poll(() => marked(page)).toBe(phrase)
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
})

test('a loop around a whole line still selects it as a block', async ({
  page,
}) => {
  await setup(page)
  const box = await phraseBox(page, 'The nucleus holds the DNA')
  await stroke(page, loopAround(box, 8))
  await expect(page.locator('.bn-editor .ln-sel-node')).toHaveCount(1)
  await expect(page.locator('[data-mini-toolbar]')).toBeVisible()
})

test('after a Lasso word selection no native selection remains (iPadOS shows only our pill)', async ({
  page,
}) => {
  await setup(page)
  const { phrase, box } = await rowPhrase(page)
  await stroke(page, loopAround(box))
  await expect.poll(() => marked(page)).toBe(phrase)
  const native = () =>
    page.evaluate(() => ({
      text: window.getSelection()?.toString() ?? '',
      focused: !!document.activeElement?.closest('.bn-editor'),
    }))
  expect(await native()).toEqual({ text: '', focused: false })
  // A tap on empty paper lets go of both ours and the browser's.
  await page.keyboard.press('Escape')
  await expect.poll(() => marked(page)).toBe('')
  expect((await native()).text).toBe('')
})
