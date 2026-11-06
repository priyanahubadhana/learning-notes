import { expect, test } from '@playwright/test'
import {
  expectStrokes,
  inkNote,
  line,
  painted,
  stroke,
  textBox,
} from './inkHelpers.ts'

// TEMPORARY diagnostic (never on main): where the 500-stroke frame time goes.
test.use({
  launchOptions: process.env.PROBE_CHROME
    ? { args: ['--disable-frame-rate-limit', '--disable-gpu-vsync'] }
    : {},
})

test('probe: 500 strokes frame cost breakdown', async ({ page }) => {
  await inkNote(page, 'Pen')
  const box = await textBox(page)
  await stroke(
    page,
    line([box.x + 10, box.y + 150], [box.x + 100, box.y + 150]),
  )
  await expectStrokes(page, 1)
  await page.evaluate(async () => {
    const open = indexedDB.open('learning-notes')
    const db: IDBDatabase = await new Promise((res) => {
      open.onsuccess = () => res(open.result)
    })
    const read = (store: string) =>
      new Promise<Record<string, unknown>[]>((res) => {
        const r = db.transaction(store).objectStore(store).getAll()
        r.onsuccess = () => res(r.result)
      })
    const [chunk] = (await read('inkChunks')) as {
      id: string
      strokes: { id: string; pts: number[]; at: number }[]
    }[]
    const base = chunk.strokes[0]
    const rows: Record<string, unknown>[] = []
    for (let c = 0; c < 9; c++) {
      const strokes = []
      for (let i = 0; i < 55; i++) {
        const n = c * 55 + i
        const dy = (n % 40) * 0.02
        const pts: number[] = []
        for (let k = 0; k < 30; k++) {
          pts.push(
            0.05 + k * 0.02,
            0.2 + dy + Math.sin(k / 3) * 0.01,
            0.5,
            0,
            0,
            k * 8,
          )
        }
        strokes.push({ ...base, id: `perf-${n}`, at: base.at + n + 1, pts })
      }
      rows.push({ ...chunk, id: `perf-chunk-${c}`, strokes })
    }
    await new Promise<void>((res) => {
      const tx = db.transaction('inkChunks', 'readwrite')
      for (const r of rows) tx.objectStore('inkChunks').put(r)
      tx.oncomplete = () => res()
    })
    db.close()
  })
  await page.reload()
  await expect(page.locator('[data-ink-canvases]')).toBeAttached({
    timeout: 15000,
  })
  await expect
    .poll(() => painted(page, 'ink'), { timeout: 15000 })
    .toBeGreaterThan(1000)
  const out = await page.evaluate(async () => {
    const counts = {
      fill: 0,
      drawImage: 0,
      rect: 0,
      clearRect: 0,
      canvasResize: 0,
      styleWrites: 0,
    }
    let canvasOff = false
    const P = CanvasRenderingContext2D.prototype
    const oFill = P.fill
    P.fill = function (this: CanvasRenderingContext2D, ...a: unknown[]) {
      counts.fill++
      return (oFill as (...x: unknown[]) => void).apply(this, a)
    } as typeof P.fill
    const oDraw = P.drawImage
    P.drawImage = function (this: CanvasRenderingContext2D, ...a: unknown[]) {
      counts.drawImage++
      if (canvasOff) return
      return (oDraw as (...x: unknown[]) => void).apply(this, a)
    } as typeof P.drawImage
    const oClear = P.clearRect
    P.clearRect = function (this: CanvasRenderingContext2D, ...a: unknown[]) {
      counts.clearRect++
      if (canvasOff) return
      return (oClear as (...x: unknown[]) => void).apply(this, a)
    } as typeof P.clearRect
    const oRect = Element.prototype.getBoundingClientRect
    Element.prototype.getBoundingClientRect = function (this: Element) {
      counts.rect++
      return oRect.call(this)
    }
    const wDesc = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      'width',
    )!
    Object.defineProperty(HTMLCanvasElement.prototype, 'width', {
      ...wDesc,
      set(this: HTMLCanvasElement, v: number) {
        counts.canvasResize++
        wDesc.set!.call(this, v)
      },
    })
    const sDesc = Object.getOwnPropertyDescriptor(
      CSSStyleDeclaration.prototype,
      'setProperty',
    )
    const frame = () => new Promise((r) => requestAnimationFrame(r))
    const round = async (n: number, resize: boolean) => {
      const start = performance.now()
      for (let i = 0; i < n; i++) {
        if (resize) window.dispatchEvent(new Event('resize'))
        await frame()
      }
      return Math.round(((performance.now() - start) / n) * 10) / 10
    }
    const snap = () => ({ ...counts })
    const diff = (a: typeof counts, b: typeof counts) =>
      Object.fromEntries(
        Object.keys(a).map((k) => [
          k,
          b[k as keyof typeof a] - a[k as keyof typeof a],
        ]),
      )
    const rounds: Record<string, unknown> = {}
    await round(10, true) // warm-up
    let s = snap()
    rounds.resize = { ms: await round(10, true), ...diff(s, snap()) }
    s = snap()
    rounds.rafOnly = { ms: await round(10, false), ...diff(s, snap()) }
    s = snap()
    rounds.resizeAgain = { ms: await round(10, true), ...diff(s, snap()) }
    canvasOff = true
    s = snap()
    rounds.resizeNoCanvas = { ms: await round(10, true), ...diff(s, snap()) }
    canvasOff = false
    // Raw canvas cost at this size: clear every ink canvas, one frame each.
    const canvases = [
      ...document.querySelectorAll<HTMLCanvasElement>('[data-ink-canvas]'),
    ]
    const ctxs = canvases.map((c) => c.getContext('2d')!)
    let t = performance.now()
    for (let i = 0; i < 10; i++) {
      for (const [j, ctx] of ctxs.entries())
        oClear.call(ctx, 0, 0, canvases[j].width, canvases[j].height)
      await frame()
    }
    rounds.clearAllCanvases = { ms: Math.round(performance.now() - t) / 10 }
    t = performance.now()
    for (let i = 0; i < 10; i++) {
      oClear.call(ctxs[1], 0, 0, 1, 1)
      await frame()
    }
    rounds.touchInkCanvas1px = { ms: Math.round(performance.now() - t) / 10 }
    // Only the window listeners, no frame: how long the dispatch itself takes.
    t = performance.now()
    for (let i = 0; i < 10; i++) window.dispatchEvent(new Event('resize'))
    rounds.dispatchOnly = {
      ms: Math.round((performance.now() - t) * 100) / 1000,
    }
    await frame()
    // Where compositing might pay: effects on any element.
    const effects: string[] = []
    for (const el of document.querySelectorAll<HTMLElement>('*')) {
      const cs = getComputedStyle(el)
      const bits = [
        cs.mixBlendMode !== 'normal' && `blend:${cs.mixBlendMode}`,
        cs.filter !== 'none' && `filter:${cs.filter}`,
        (cs as unknown as { backdropFilter?: string }).backdropFilter &&
          (cs as unknown as { backdropFilter?: string }).backdropFilter !==
            'none' &&
          `backdrop:${(cs as unknown as { backdropFilter?: string }).backdropFilter}`,
        (cs.maskImage ??
          (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage) &&
          (cs.maskImage ??
            (cs as unknown as { webkitMaskImage?: string }).webkitMaskImage) !==
            'none' &&
          `mask`,
        cs.willChange !== 'auto' && `will-change:${cs.willChange}`,
        cs.position === 'fixed' && 'fixed',
        cs.position === 'sticky' && 'sticky',
      ].filter(Boolean)
      if (bits.length === 0) continue
      const tag =
        el.tagName.toLowerCase() +
        (el.id ? `#${el.id}` : '') +
        (typeof el.className === 'string' && el.className
          ? `.${el.className.split(' ').slice(0, 2).join('.')}`
          : '') +
        [...el.attributes]
          .filter((a) => a.name.startsWith('data-'))
          .slice(0, 2)
          .map((a) => `[${a.name}]`)
          .join('')
      effects.push(`${tag} ${bits.join(' ')}`)
    }
    return {
      ua: navigator.userAgent.slice(0, 80),
      dpr: window.devicePixelRatio,
      inner: `${window.innerWidth}x${window.innerHeight}`,
      nodes: document.getElementsByTagName('*').length,
      blocks: document.querySelectorAll('.bn-block-outer').length,
      canvases: canvases.map((c) => `${c.width}x${c.height}`),
      hasSetProperty: !!sDesc,
      rounds,
      effects,
    }
  })
  console.log('PROBE ' + JSON.stringify(out, null, 1))
})
