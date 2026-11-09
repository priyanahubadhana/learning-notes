// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { png } from './fixtures/png.ts'
import {
  expectStrokes,
  inkNote,
  line,
  stroke,
  wave,
  type Pt,
} from './inkHelpers.ts'
import { tool } from './mainBarHelpers.ts'
import { machineState, section } from './toolsHelpers.ts'

/**
 * Tools robustness, step 2: the Lasso on the input machine. Twenty loops in a
 * row (free and rectangle, ink, words, a picture, ink over words) all select,
 * whatever happened between them. A lift that is lost (swallowed here) never
 * blocks the next loop.
 */
test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

type Box = { x: number; y: number; width: number; height: number }

interface Scene {
  inkA: Box
  inkB: Box
  text: Box
  picture: Box
  mixed: Box
  empty: Pt
  pad: Box
}

async function scene(page: Page): Promise<Scene> {
  await inkNote(page, 'Pen', 'pencil', {
    'ink.lasso': { text: true, pictures: true, ink: true },
  })
  await tool(page, 'Text').click()
  await page.locator('.bn-editor').click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Second line of notes')
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
  await tool(page, 'Pen').click()
  await page.evaluate(() => {
    const s = document.querySelector('[data-page-scroller]')
    if (s) s.scrollTop = 0
  })
  await page.waitForTimeout(200)
  const blocks = page.locator('.bn-block-content')
  const l1 = (await blocks.nth(0).boundingBox())!
  const l2 = (await blocks.nth(1).boundingBox())!
  const pic = (await img.boundingBox())!
  // The first two words (a part of the line: the T filter picks just those).
  const words = await page.evaluate(() => {
    const w = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    const n = w.nextNode()!
    const r = document.createRange()
    r.setStart(n, 0)
    r.setEnd(n, 'The nucleus'.length)
    const b = r.getBoundingClientRect()
    return { x: b.x, y: b.y, width: b.width, height: b.height }
  })
  const pad = (await page.locator('[data-ink-pad]').boundingBox())!
  const yA = pic.y + pic.height + 70
  const yB = yA + 90
  await stroke(page, wave(l1.x + 20, l1.x + 200, yA))
  await stroke(page, wave(l1.x + 20, l1.x + 200, yB))
  await stroke(
    page,
    line([l2.x + 10, l2.y + l2.height / 2], [l2.x + 160, l2.y + l2.height / 2]),
  )
  await expectStrokes(page, 3)
  await tool(page, 'Lasso').click()
  await page.keyboard.press('Escape')
  await page.waitForTimeout(300)
  return {
    inkA: { x: l1.x + 20, y: yA - 16, width: 180, height: 32 },
    inkB: { x: l1.x + 20, y: yB - 16, width: 180, height: 32 },
    text: words,
    picture: pic,
    mixed: l2,
    empty: [l1.x + 400, yB + 60],
    pad,
  }
}

/** What is selected now, as a word and a fingerprint (changes with the target). */
const selected = (page: Page) =>
  page.evaluate(() => {
    const st = window.__lnTools!.toolState().ink
    const r = (el: Element | null) => {
      const b = el?.getBoundingClientRect()
      return b ? [b.x, b.y, b.width, b.height].map(Math.round).join(',') : ''
    }
    const strokes = Number(st.selection)
    const blocks = Number(st.blockSel)
    const handles = r(document.querySelector('[data-ink-handles]'))
    if (strokes > 0 && blocks > 0) return 'mixed:' + handles
    if (strokes > 0) return 'ink:' + handles
    const words = [...document.querySelectorAll('.bn-editor .ln-sel')]
      .map((e) => e.textContent)
      .join('')
    if (words) return 'text:' + words
    const node = document.querySelector('.ln-sel-node, [data-ln-selected]')
    if (node) return 'blocks:' + r(node)
    return ''
  })

type Target = 'inkA' | 'text' | 'picture' | 'inkB' | 'mixed'
const WANT: Record<Target, string> = {
  inkA: 'ink:',
  inkB: 'ink:',
  text: 'text:',
  picture: 'blocks:',
  mixed: 'mixed:',
}

/**
 * A loop (free) or a corner-to-corner drag (rectangle) around a box. It starts
 * at the top right corner, on the page (the selection tools of an earlier
 * selection may cover the bottom); the first line sits at the pad's top edge,
 * so that one starts at the bottom right.
 */
function path(b: Box, pad: Box, rect: boolean): Pt[] {
  const m = 6
  const xr = Math.min(b.x + b.width, pad.x + pad.width - 8)
  const top = b.y - m > pad.y + 2
  const [t, u] = top
    ? [b.y - m, b.y + b.height + m]
    : [b.y + b.height + m, b.y - m]
  const c: Pt[] = [
    [xr, t],
    [b.x - m, t],
    [b.x - m, u],
    [xr, u],
    [xr - 1, t + (top ? 2 : -2)],
  ]
  if (rect) return line(c[0], c[2], 14)
  return c.slice(1).flatMap((p, i) => line(c[i], p, 10))
}

async function loopOn(
  page: Page,
  s: Scene,
  target: Target,
  rect: boolean,
  id = 7,
) {
  await page.evaluate(
    (shape) => window.__lnTools!.setLasso({ shape }),
    rect ? 'rect' : 'free',
  )
  await stroke(page, path(s[target], s.pad, rect), { id })
}

test('20 Lasso loops in a row all select, with Esc, a tap or nothing between', async ({
  page,
}) => {
  const s = await scene(page)
  const order: Target[] = ['inkA', 'text', 'picture', 'inkB', 'mixed']
  const between = ['esc', 'tap', 'none'] as const
  let prev = ''
  for (let i = 0; i < 20; i++) {
    const target = order[i % order.length]
    const rect = i % 2 === 1
    await loopOn(page, s, target, rect)
    await expect
      .poll(() => selected(page), {
        message: `loop ${i + 1} (${target}, ${rect ? 'rect' : 'free'})`,
      })
      .toContain(WANT[target])
    const now = await selected(page)
    expect(now, `loop ${i + 1} selected the same as before`).not.toBe(prev)
    expect(await machineState(page)).toBe('idle')
    // Ink: Esc, a tap or nothing in turn. Words, pictures and ink over words
    // keep their marks after Esc, so they are cleared with a tap.
    const inkOnly = target === 'inkA' || target === 'inkB'
    // The mixed loop starts at the same top corner where an earlier ink
    // selection keeps its handles on a narrow (iPad) page, so before it the
    // old selection is always cleared with a tap.
    const nextIsMixed = order[(i + 1) % order.length] === 'mixed'
    const how = inkOnly && !nextIsMixed ? between[i % between.length] : 'tap'
    if (how === 'esc') await page.keyboard.press('Escape')
    else if (how === 'tap')
      await stroke(page, [s.empty, [s.empty[0], s.empty[1] + 1]])
    await page.waitForTimeout(80)
    prev = how === 'none' ? now : ''
  }
  expect((await section(page, 'ink')).gesture).toBe('none')
})

test('a loop whose lift is swallowed never blocks the next ones', async ({
  page,
}) => {
  const s = await scene(page)
  const swallow = () =>
    page.evaluate(() => {
      const h = (e: Event) => {
        e.stopImmediatePropagation()
        window.removeEventListener('pointerup', h, true)
      }
      window.addEventListener('pointerup', h, true)
    })
  // The lift is lost; the same pen goes down again.
  await swallow()
  await loopOn(page, s, 'inkA', false)
  await expect.poll(() => machineState(page)).toBe('selecting')
  expect((await section(page, 'ink')).gesture).toBe('lasso#7')
  for (let i = 0; i < 5; i++) {
    const target: Target = i % 2 ? 'inkA' : 'inkB'
    await loopOn(page, s, target, false)
    await expect
      .poll(() => selected(page), { message: `normal loop ${i + 1}` })
      .toContain('ink:')
    await page.keyboard.press('Escape')
  }
  // A lost lift of one touch, then a different touch (a new pointer id): it
  // works as soon as the machine has dropped the dead one (4 s), not later.
  await swallow()
  await loopOn(page, s, 'inkA', false, 9)
  await page.waitForTimeout(4800)
  await loopOn(page, s, 'inkB', false, 10)
  await expect.poll(() => selected(page)).toContain('ink:')
})
