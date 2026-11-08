// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type CDPSession, type Page } from '@playwright/test'
import { openNote } from './mainBarHelpers.ts'

/**
 * Perf pass of 9 Nov 2026: a big page (2,000 blocks, tables, many A4 sheets)
 * scrolls and types smoothly. Medians and counts (as for the ink and paper
 * budgets) so a two-core CI machine does not make it flaky. The numbers are
 * printed as `BIGPAGE {...}` for docs/research/perf-big-pages-2026-11.md.
 */

test.use({ viewport: { width: 1024, height: 900 } })
// Chromium only: it has the CDP metrics (the code under test is the same).
test.skip(({ browserName }) => browserName !== 'chromium')

const BLOCKS = 2000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = Record<string, any>

async function seed(page: Page) {
  await page.evaluate(async (count) => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res) => {
      open.onsuccess = () => res(open.result)
    })
    const read = (store: string) =>
      new Promise<Row[]>((res) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => res(r.result)
      })
    const [notePage] = (await read('pages')).filter((p) => p.title === 'First')
    const block = (await read('blocks')).find((b) => b.pageId === notePage.id)!
    const words =
      'the cell nucleus holds the genetic material and controls growth while mitochondria release energy for every part of the living cell'.split(
        ' ',
      )
    const text = (n: number) =>
      Array.from(
        { length: 24 },
        (_, i) => words[(n + i * 7) % words.length],
      ).join(' ')
    const cell = (s: string) => [{ type: 'text', text: s, styles: {} }]
    const blocks: Row[] = []
    for (let i = 0; i < count; i++) {
      const base = {
        ...block,
        id: 'bigblock-' + i,
        parentId: null,
        order: 'a' + String(i + 1).padStart(4, '1'),
      }
      if (i % 100 === 50) {
        blocks.push({
          ...base,
          type: 'table',
          content: {
            text: {
              type: 'tableContent',
              rows: [0, 1, 2, 3].map((r) => ({
                cells: [0, 1, 2].map((c) => cell(`row ${r} col ${c}`)),
              })),
            },
          },
        })
      } else if (i % 25 === 0) {
        blocks.push({
          ...base,
          type: 'heading',
          content: { ...block.content, level: 2, text: cell('Heading ' + i) },
        })
      } else {
        blocks.push({
          ...base,
          content: { ...block.content, text: cell(`${i}. ${text(i)}`) },
        })
      }
    }
    await new Promise<void>((res) => {
      const tx = db.transaction(['pages', 'blocks'], 'readwrite')
      tx.objectStore('pages').put({ ...notePage })
      for (const b of blocks) tx.objectStore('blocks').put(b)
      tx.oncomplete = () => res()
    })
    db.close()
  }, BLOCKS)
}

const metrics = async (cdp: CDPSession): Promise<Row> =>
  Object.fromEntries(
    (await cdp.send('Performance.getMetrics')).metrics.map((m) => [
      m.name,
      m.value,
    ]),
  )

const percentile = (a: number[], q: number) =>
  [...a].sort((x, y) => x - y)[Math.floor(a.length * q)] ?? 0

const median = (a: number[]) =>
  [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] ?? 0

/** Starts a long-task and frame recorder in the page. */
async function record(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as Row
    w.__long = [] as number[]
    w.__frames = [] as number[]
    w.__po = new PerformanceObserver((l) => {
      for (const e of l.getEntries()) w.__long.push(e.duration)
    })
    w.__po.observe({ entryTypes: ['longtask'] })
    w.__rec = true
    let last = performance.now()
    const tick = (t: number) => {
      w.__frames.push(t - last)
      last = t
      if (w.__rec) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
}

async function stop(page: Page) {
  return page.evaluate(() => {
    const w = window as unknown as Row
    w.__rec = false
    w.__po.disconnect()
    return { long: w.__long as number[], frames: w.__frames as number[] }
  })
}

async function dumpProfile(cdp: CDPSession, label: string) {
  const { profile } = await cdp.send('Profiler.stop')
  const self = new Map<string, number>()
  const dt = profile.timeDeltas ?? []
  const byId = new Map(profile.nodes.map((n) => [n.id, n]))
  profile.samples?.forEach((id, i) => {
    const n = byId.get(id)!
    const k = `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop()}:${n.callFrame.lineNumber}`
    self.set(k, (self.get(k) ?? 0) + (dt[i] ?? 0))
  })
  const top = [...self.entries()].sort((a, b) => b[1] - a[1]).slice(0, 14)
  // Inclusive time per function (children included), to find the callers.
  const parent = new Map<number, number>()
  profile.nodes.forEach((n) => n.children?.forEach((c) => parent.set(c, n.id)))
  const incl = new Map<string, number>()
  const name = (id: number) => {
    const n = byId.get(id)!
    return (
      (n.callFrame.functionName || '(anon)') +
      ' ' +
      n.callFrame.url.split('/').pop() +
      ':' +
      n.callFrame.lineNumber
    )
  }
  profile.samples?.forEach((id, i) => {
    const seen = new Set<string>()
    for (let x: number | undefined = id; x !== undefined; x = parent.get(x)) {
      const k = name(x)
      if (!seen.has(k)) {
        seen.add(k)
        incl.set(k, (incl.get(k) ?? 0) + (dt[i] ?? 0))
      }
    }
  })
  const want = process.env.BIGPAGE_CHAIN
  if (want) {
    const chains = new Map<string, number>()
    profile.samples?.forEach((id, i) => {
      const chain: string[] = []
      for (let x: number | undefined = id; x !== undefined; x = parent.get(x))
        chain.push(name(x))
      if (!chain.some((c) => c.startsWith(want))) return
      const k = chain.slice(0, 14).join(' < ')
      chains.set(k, (chains.get(k) ?? 0) + (dt[i] ?? 0))
    })
    const top3 = [...chains.entries()].sort((x, y) => y[1] - x[1]).slice(0, 3)
    console.log(
      'CHAINS ' +
        label +
        '|' +
        top3.map(([k, v]) => (v / 1000).toFixed(0) + 'ms ' + k).join('|'),
    )
  }
  const topIncl = [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40)
  console.log(
    'INCLUSIVE ' +
      label +
      '\n' +
      topIncl.map(([k, v]) => (v / 1000).toFixed(0) + 'ms ' + k).join('\n'),
  )
  console.log(
    'PROFILE ' +
      label +
      '\n' +
      top.map(([k, v]) => `${(v / 1000).toFixed(0)}ms ${k}`).join('\n'),
  )
}

test('a big page scrolls and types within the budget', async ({ page }) => {
  test.setTimeout(120_000)
  await openNote(page, 'computer')
  await page.waitForTimeout(800)
  await seed(page)
  await page.reload()
  await expect(page.locator('.bn-editor').first()).toBeVisible({
    timeout: 20000,
  })
  await expect(page.locator('.bn-block-outer').nth(30)).toBeAttached({
    timeout: 20000,
  })
  await page.waitForTimeout(1500)
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Performance.enable')
  const slow = Number(process.env.BIGPAGE_THROTTLE ?? 1)
  if (slow > 1) await cdp.send('Emulation.setCPUThrottlingRate', { rate: slow })

  const info = await page.evaluate(() => ({
    blocks: document.querySelectorAll('.bn-block-outer').length,
    sheets: document.querySelectorAll('[data-paper-sheet]').length,
    scrollH: document.querySelector('[data-page-scroller]')?.scrollHeight ?? 0,
  }))

  const prof = process.env.BIGPAGE_PROFILE
  if (prof) {
    await cdp.send('Profiler.enable')
    await cdp.send('Profiler.start')
  }
  // ---- Scroll top -> bottom -> top, 400 px per frame ----
  const m0 = await metrics(cdp)
  await record(page)
  await page.evaluate(
    () =>
      new Promise<void>((done) => {
        const s = document.querySelector('[data-page-scroller]')!
        const max = s.scrollHeight - s.clientHeight
        let dir = 1
        let steps = 0
        const step = () => {
          s.scrollTop += dir * 400
          steps++
          if (dir === 1 && s.scrollTop >= max - 1) dir = -1
          else if (dir === -1 && s.scrollTop <= 0) return done()
          if (steps > 6000) return done()
          requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }),
  )
  const scroll = await stop(page)
  if (prof) await dumpProfile(cdp, 'scroll')
  const m1 = await metrics(cdp)

  // ---- Type 58 characters in a block near the top ----
  await page.locator('.bn-block-content').nth(3).click()
  if (prof) await cdp.send('Profiler.start')
  await record(page)
  const t0 = await metrics(cdp)
  await page.keyboard.type(
    'typing speed check on a big page 0123456789 abcdefghij',
    { delay: 20 },
  )
  await page.waitForTimeout(300)
  const typed = await stop(page)
  if (prof) await dumpProfile(cdp, 'type')
  const t1 = await metrics(cdp)

  // ---- Paste a 400-paragraph document (HTML) into the big page ----
  await record(page)
  const p0 = await metrics(cdp)
  if (prof) await cdp.send('Profiler.start')
  const pasteMs = await page.evaluate(async () => {
    const html =
      '<h2>Pasted</h2>' +
      Array.from(
        { length: 400 },
        (_, i) =>
          '<p>Pasted paragraph ' + i + ' with some words in it to wrap.</p>',
      ).join('')
    const dt = new DataTransfer()
    dt.setData('text/html', html)
    dt.setData('text/plain', 'Pasted')
    const t = performance.now()
    document.querySelector('.ProseMirror')!.dispatchEvent(
      new ClipboardEvent('paste', {
        clipboardData: dt,
        bubbles: true,
        cancelable: true,
      }),
    )
    await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))
    return performance.now() - t
  })
  await page.waitForTimeout(1500)
  const pasted = await stop(page)
  if (prof) await dumpProfile(cdp, 'paste')
  const p1 = await metrics(cdp)

  const d = (a: Row, b: Row, k: string) => (b[k] ?? 0) - (a[k] ?? 0)
  const out = {
    ...info,
    scrollFrames: scroll.frames.length,
    scrollMedianFrameMs: +median(scroll.frames).toFixed(1),
    scrollP95FrameMs: +percentile(scroll.frames, 0.95).toFixed(1),
    scrollLongTasks: scroll.long.length,
    scrollMaxLongMs: Math.round(Math.max(0, ...scroll.long)),
    scrollScriptMs: Math.round(d(m0, m1, 'ScriptDuration') * 1000),
    scrollLayoutMs: Math.round(d(m0, m1, 'LayoutDuration') * 1000),
    scrollStyleMs: Math.round(d(m0, m1, 'RecalcStyleDuration') * 1000),
    scrollLayouts: d(m0, m1, 'LayoutCount'),
    scrollRecalcs: d(m0, m1, 'RecalcStyleCount'),
    scrollScriptPerFrameMs: +(
      (d(m0, m1, 'ScriptDuration') * 1000) /
      Math.max(1, scroll.frames.length)
    ).toFixed(2),
    pasteFirstFrameMs: Math.round(pasteMs),
    pasteLongTasks: pasted.long.length,
    pasteMaxLongMs: Math.round(Math.max(0, ...pasted.long)),
    pasteScriptMs: Math.round(d(p0, p1, 'ScriptDuration') * 1000),
    pasteLayoutMs: Math.round(d(p0, p1, 'LayoutDuration') * 1000),
    typeLongTasks: typed.long.length,
    typeMaxLongMs: Math.round(Math.max(0, ...typed.long)),
    typeScriptMs: Math.round(d(t0, t1, 'ScriptDuration') * 1000),
    typeLayoutMs: Math.round(d(t0, t1, 'LayoutDuration') * 1000),
    typeLayouts: d(t0, t1, 'LayoutCount'),
    typeScriptPerKeyMs: +((d(t0, t1, 'ScriptDuration') * 1000) / 54).toFixed(2),
  }
  console.log('BIGPAGE ' + JSON.stringify(out))

  expect(info.blocks).toBeGreaterThan(20)
  if (process.env.BIGPAGE_NOASSERT) return
  // No long task in the scroll pass or while typing; the paste (one big edit)
  // may take a moment but must not freeze the page.
  expect(out.scrollMaxLongMs).toBeLessThan(100)
  expect(out.typeMaxLongMs).toBeLessThan(100)
  expect(out.scrollScriptPerFrameMs).toBeLessThan(6)
  expect(out.typeScriptPerKeyMs).toBeLessThan(25)
  expect(out.pasteMaxLongMs).toBeLessThan(1000)
})
