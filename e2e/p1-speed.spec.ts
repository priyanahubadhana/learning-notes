// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { createNotebook, startInMode } from './helpers.ts'

/**
 * Owner finding P1 (17 Nov 2026, iPad): "laggy and sluggish while switching
 * tabs". Measured causes (docs/metrics/p1-speed-2026-11-17.md): every tool
 * switch rebuilt every box's editor, and each box re-styled the whole page
 * when it measured itself. This spec guards the fixes:
 *
 * 1. Switching tools (Text ↔ Pen) keeps every box's editor (no rebuild), and
 *    the editor still stops and starts taking text.
 * 2. Big regressions only: tap-to-paint budgets for page tabs, tool switches
 *    and a page switch in a notebook of 20 pages with 10 boxes each. The
 *    budgets are several times the measured times (slow CI machines), so they
 *    catch a page that is seconds slow again, not small changes.
 */

const FLAGS = [
  'foundation.shell',
  'toolbar.v8',
  'toolbar.menu',
  'settings.v3',
  'notebooks.v2',
  'search.v2',
  'home.v2',
  'library.v2',
  'review.v2',
  'page.menus',
  'textbox.v2',
]
const PAGES = 20
const BOXES = 10
const EDITORS = BOXES + 1
/** GitHub's two-core runner is much slower than a dev machine. */
const SLOW = process.env.CI ? 2.5 : 1

test.use({ viewport: { width: 1180, height: 820 } })

/** 20 pages in the open notebook, each with 10 boxes of two lines and some main text. */
async function seed(page: Page) {
  const id = page.url().split('/page/')[1]
  await page.evaluate(
    async ({ id, pages, boxes }) => {
      const open = indexedDB.open('learning-notes')
      const db: IDBDatabase = await new Promise((res) => {
        open.onsuccess = () => res(open.result)
      })
      const src = await new Promise<Record<string, unknown>>((res) => {
        const r = db.transaction('pages').objectStore('pages').get(id)
        r.onsuccess = () => res(r.result)
      })
      const now = Date.now()
      const words =
        'the cell nucleus holds the genetic material and controls growth while mitochondria release energy'.split(
          ' ',
        )
      const line = (n: number) =>
        Array.from(
          { length: 12 },
          (_, i) => words[(n + i * 5) % words.length],
        ).join(' ')
      const para = (
        pageId: string,
        boxId: string | null,
        order: string,
        text: string,
      ) => ({
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
        parentId: null,
        type: 'paragraph',
        content: {
          backgroundColor: 'default',
          textColor: 'default',
          textAlignment: 'left',
          text: [{ type: 'text', text, styles: {} }],
        },
        order,
        ...(boxId ? { boxId } : {}),
        pageId,
      })
      const tx = db.transaction(['pages', 'blocks'], 'readwrite')
      for (let p = 0; p < pages; p++) {
        const pid = p === 0 ? id : crypto.randomUUID()
        const list = []
        const rows: unknown[] = [
          { id: `r${p}m`, y: 8, cols: [{ w: 1, boxIds: ['main'] }] },
        ]
        for (let b = 0; b < boxes; b++) {
          const bid = crypto.randomUUID()
          const y = 60 + b * 22
          list.push({ id: bid, x: 15, y, w: 180 })
          rows.push({
            id: `r${p}b${b}`,
            cols: [{ w: 1, boxIds: [bid] }],
            y,
            x: 15,
            wmm: 180,
          })
          tx.objectStore('blocks').put(
            para(pid, bid, 'a0', `Box ${b + 1}: ${line(b)}`),
          )
          tx.objectStore('blocks').put(para(pid, bid, 'a1', line(b + 3)))
        }
        for (let m = 0; m < 3; m++)
          tx.objectStore('blocks').put(
            para(pid, null, 'a' + m, `Main ${m + 1}: ${line(m + p)}`),
          )
        tx.objectStore('pages').put({
          ...src,
          id: pid,
          title: `Page ${p + 1}`,
          order: 'a' + String(p).padStart(2, '0'),
          boxes: list,
          rows,
          updatedAt: now,
        })
      }
      await new Promise((res) => (tx.oncomplete = res))
      db.close()
    },
    { id, pages: PAGES, boxes: BOXES },
  )
  await page.reload()
  await expect(page.getByRole('textbox', { name: 'Page title' })).toHaveValue(
    'Page 1',
  )
  await expect(page.locator('[data-paper-box] .bn-editor')).toHaveCount(
    EDITORS,
    {
      timeout: 20_000,
    },
  )
}

async function start(page: Page) {
  await page.addInitScript((f) => {
    localStorage.setItem('learning-notes:flags', JSON.stringify(f))
    localStorage.setItem(
      'learning-notes:advanced.autoSwitch',
      JSON.stringify('off'),
    )
  }, FLAGS)
  await startInMode(page, 'pencil')
  await page.goto('/')
  await createNotebook(page, 'Biology', 'Page 1')
  await seed(page)
}

/** Remembers the time of the next press (the start of a measured tap). */
async function arm(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __p1: { t0: number } }
    w.__p1 = { t0: 0 }
    const take = (e: Event) => {
      if (!w.__p1.t0) w.__p1.t0 = e.timeStamp
    }
    addEventListener('pointerdown', take, { capture: true, once: true })
    addEventListener('mousedown', take, { capture: true, once: true })
  })
}
/** Ms from that press to the frame drawn after `cond` holds. */
const readyAfter = (page: Page, cond: string) =>
  page.evaluate(
    (src) =>
      new Promise<number>((resolve) => {
        const check = new Function(`return (${src})`) as () => boolean
        const t0 = performance.now()
        const tick = () => {
          if (!check() && performance.now() - t0 < 15_000)
            return requestAnimationFrame(tick)
          requestAnimationFrame((tf) => {
            const w = window as unknown as { __p1: { t0: number } }
            resolve(Math.round(tf - (w.__p1.t0 || t0)))
          })
        }
        tick()
      }),
    cond,
  )

const tool = (page: Page, name: string) =>
  page.getByRole('button', { name, exact: true }).first()

test('switching tools keeps every box editor (no rebuild) and still turns typing off and on', async ({
  page,
}) => {
  await start(page)
  await tool(page, 'Text').click()
  // Mark every block of every box (a JS property the editor leaves alone). A
  // rebuilt editor draws its blocks again as new elements, without the mark;
  // before the fix every tool switch did that for all 23 blocks.
  const BLOCKS = '[data-paper-box] .bn-editor .bn-block-outer'
  const marked = await page.evaluate((sel) => {
    const all = [...document.querySelectorAll(sel)]
    for (const el of all) (el as unknown as { __p1: boolean }).__p1 = true
    return all.length
  }, BLOCKS)
  expect(marked).toBe(BOXES * 2 + 3)
  const redrawn = () =>
    page.evaluate(
      (sel) =>
        [...document.querySelectorAll(sel)].filter(
          (el) => !(el as unknown as { __p1?: boolean }).__p1,
        ).length,
      BLOCKS,
    )
  const editable = () =>
    page.evaluate(() =>
      [...document.querySelectorAll('[data-paper-box] .bn-editor')].map((e) =>
        e.getAttribute('contenteditable'),
      ),
    )
  await tool(page, 'Pen').click()
  await expect.poll(editable).toEqual(Array(EDITORS).fill('false'))
  await tool(page, 'Text').click()
  await expect.poll(editable).toEqual(Array(EDITORS).fill('true'))
  await tool(page, 'Eraser').click()
  await tool(page, 'Lasso').click()
  await tool(page, 'Text').click()
  await expect(page.locator(BLOCKS)).toHaveCount(BOXES * 2 + 3)
  expect(await redrawn()).toBe(0)
})

test('page tabs, tools and a page switch answer within generous budgets', async ({
  page,
}) => {
  await start(page)
  const times: Record<string, number[]> = {}
  const measure = async (
    name: string,
    act: () => Promise<void>,
    cond: string,
  ) => {
    await arm(page)
    await act()
    ;(times[name] ??= []).push(await readyAfter(page, cond))
  }
  for (const tab of ['summary', 'review', 'notes'])
    await measure(
      'tab',
      () => page.locator(`[data-page-tab="${tab}"]`).click(),
      `document.querySelector('[data-page-tab="${tab}"]')?.getAttribute('aria-pressed') === 'true'` +
        (tab === 'notes'
          ? ` && document.querySelectorAll('[data-paper-box] .bn-editor').length >= ${EDITORS}`
          : ''),
    )
  for (const name of ['Pen', 'Text', 'Pen', 'Text'])
    await measure(
      'tool',
      () => tool(page, name).click(),
      `[...document.querySelectorAll('[data-bar-tool]')].some((b) => b.getAttribute('aria-label') === '${name}' && (b.getAttribute('aria-pressed') === 'true' || b.hasAttribute('data-v8-picked')))`,
    )
  for (const target of ['Page 5', 'Page 1']) {
    const row = page
      .locator('aside')
      .getByRole('button', { name: target, exact: true })
    await row.scrollIntoViewIfNeeded()
    await measure(
      'page',
      () => row.click(),
      `document.querySelector('[aria-label="Page title"]')?.value === '${target}' && document.querySelectorAll('[data-paper-box] .bn-editor').length >= ${EDITORS}`,
    )
  }
  const worst = Object.fromEntries(
    Object.entries(times).map(([k, v]) => [k, Math.max(...v)]),
  )
  console.log(`P1SPEED ${JSON.stringify(times)}`)
  // Measured on a desktop (unthrottled, 17 Nov 2026): tab, tool about 50 ms,
  // a page switch about 400 ms. The budgets only catch a big step back.
  expect(worst.tab).toBeLessThan(1500 * SLOW)
  expect(worst.tool).toBeLessThan(1500 * SLOW)
  expect(worst.page).toBeLessThan(4000 * SLOW)
})
