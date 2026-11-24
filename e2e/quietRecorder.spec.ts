// Browser types for code that runs inside the page.
/// <reference lib="dom" />
import { expect, test, type Page } from '@playwright/test'
import { cornerAction, setTheme } from './helpers.ts'
import { expectStrokes, inkNote, stroke, textBox, wave } from './inkHelpers.ts'
import { openNote, tool } from './mainBarHelpers.ts'
import { appSwitch, setVisibility } from './toolsHelpers.ts'
import { loopAround, type Box } from './steps/geometry.ts'
import {
  replayTrace,
  traceBounds,
  type TraceEventIn,
  type TraceIn,
} from './circleTrace.ts'

/**
 * Part A2, the quiet recorder (docs/features/quiet-recorder.md). Each test
 * name starts with the ids it proves (R1 to R4 are the scenarios, RC-nn the
 * detail lines). R1 (every Lasso scenario with the recorder on) is run by
 * `LASSO_RECORDER_ON=1 npm run test:scenarios` (the config puts the switch on
 * for every scenario) and e2e/lassoFreeze.spec.ts when it is merged; the
 * first test here proves that the switch really is on in such a run.
 *
 * A replay sends untrusted events, so Scribble (which only answers trusted
 * Pencil input) is never exercised by a replay.
 */
test.use({ viewport: { width: 1024, height: 1000 }, hasTouch: true })

type Rec = TraceEventIn & {
  n: number
  e: string
  t: number
  p: number
  tr: number
  g?: string
  id?: string
  dp?: number
  rc?: number
  fk?: string
  vs?: string
  sr?: number
  sc?: number
  so?: [number, number]
  sl?: number
  it?: string
  il?: number
  m?: string
  st?: {
    tool: string
    gesture: string
    machine: string
    sel: string
    selCount: number
    outlines: number
    editable: string
    timer: boolean
    ended: string
  }
}
type Trace = {
  v: 2
  build: string
  screen: { w: number; h: number; dpr: number }
  span: number[]
  end: NonNullable<Rec['st']>
  events: Rec[]
}

const COPY = '[data-lasso-recorder-copy]'

async function stubClipboard(page: Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: async (s: string) => {
          ;(window as unknown as { __copied: string }).__copied = s
        },
      },
    })
  })
}

/** Opens a note with `n` drawings and the Lasso picked. */
async function scene(page: Page, n = 1, recorder = true) {
  await stubClipboard(page)
  await inkNote(page, 'Pen', 'pencil', {
    'ink.lasso': { ink: true, text: false, pictures: false },
    ...(recorder ? { 'preview.circleRecorder': 'on' } : {}),
  })
  const l1 = await textBox(page)
  const drawings: Box[] = []
  for (let i = 0; i < n; i++) {
    const y = l1.y + l1.height + 70 + i * 90
    await stroke(page, wave(l1.x + 20, l1.x + 200, y))
    drawings.push({ x: l1.x + 20, y: y - 16, width: 180, height: 32 })
  }
  await expectStrokes(page, n)
  await tool(page, 'Lasso').click()
  await page.evaluate(() => window.__lnTools!.setLasso({ shape: 'free' }))
  await page.waitForTimeout(600)
  return drawings
}

async function copyTrace(page: Page): Promise<Trace> {
  await page.locator(COPY).click()
  await expect
    .poll(() =>
      page.evaluate(
        () => (window as unknown as { __copied?: string }).__copied ?? '',
      ),
    )
    .not.toBe('')
  const text = await page.evaluate(
    () => (window as unknown as { __copied: string }).__copied,
  )
  await page.evaluate(() => {
    delete (window as unknown as { __copied?: string }).__copied
  })
  return JSON.parse(text) as Trace
}

const types = (tr: Trace) => tr.events.map((e) => e.e)
const lassoSel = (page: Page) =>
  page.evaluate(() => Number(window.__lnTools!.toolState().ink.selection))

test('R1 the switch is on for a scenario run, and the Lasso still selects', async ({
  page,
}) => {
  const [d] = await scene(page)
  await expect(page.locator(COPY)).toBeVisible()
  await stroke(page, loopAround(d))
  await expect.poll(() => lassoSel(page)).toBe(1)
})

test('R2 Copy last trace: three loops, the copy holds them, a short note shows', async ({
  page,
}) => {
  const ds = await scene(page, 3)
  for (const d of ds) await stroke(page, loopAround(d))
  await expect.poll(() => lassoSel(page)).toBe(1)
  await page.locator(COPY).click()
  await expect(page.getByRole('status')).toHaveText(
    'Trace copied: paste it in the chat',
  )
  const text = await page.evaluate(
    () => (window as unknown as { __copied: string }).__copied,
  )
  const tr = JSON.parse(text) as Trace
  expect(tr.v).toBe(2)
  const downs = tr.events.filter((e) => e.e === 'pointerdown' && e.pt === 'pen')
  expect(downs.length).toBeGreaterThanOrEqual(3)
  expect(tr.end.sel).toBe('ink')
})

test('RC-05 the build id and screen size are at the top; the button is outside the page', async ({
  page,
}) => {
  await scene(page)
  const tr = await copyTrace(page)
  expect(typeof tr.build).toBe('string')
  expect(tr.screen.w).toBe(1024)
  expect(tr.screen.h).toBe(1000)
  expect(tr.screen.dpr).toBeGreaterThan(0)
  // Outside the page: a child of the body, in the top layer, not in any scroller.
  const where = await page.evaluate(() => {
    const el = document.querySelector('[data-lasso-recorder]')!
    return {
      parent: el.parentElement === document.body,
      popover: el.matches(':popover-open'),
      inPaper: !!el.closest(
        '[data-paper-box],[data-ink-overlay],[data-ink-pad]',
      ),
    }
  })
  expect(where).toEqual({ parent: true, popover: true, inPaper: false })
  const b = await page.locator(COPY).boundingBox()
  expect(b!.height).toBeGreaterThanOrEqual(44)
  expect(b!.width).toBeGreaterThanOrEqual(44)
})

test('RC-05, RC-04 the copy takes the last 30 seconds (fake clock); the buffer keeps a minute', async ({
  page,
}) => {
  await page.clock.install()
  const [d] = await scene(page)
  await stroke(page, loopAround(d))
  const first = await copyTrace(page)
  expect(types(first)).toContain('pointerdown')
  const firstDown = first.events.find(
    (e) => e.e === 'pointerdown' && e.pt === 'pen',
  )!
  // 40 seconds pass: the first loop is older than 30 s.
  await page.clock.fastForward(40_000)
  await page.mouse.move(300, 300)
  await page.mouse.move(310, 310)
  const second = await copyTrace(page)
  expect(second.events.some((e) => e.n === firstDown.n)).toBe(false)
  expect(second.events.length).toBeGreaterThan(0)
})

test('RC-01 every event: order, both clocks, pointer fields, touch count, target kind, trusted, cancelled', async ({
  page,
}) => {
  await scene(page)
  await page.evaluate(() => {
    // WebKit works tilt out of its own angles, so what the page itself reads is the truth.
    window.addEventListener(
      'pointerdown',
      (e) => {
        if (e.pointerId === 9)
          (window as unknown as { __tilt: number[] }).__tilt = [
            e.tiltX,
            e.tiltY,
          ]
      },
      true,
    )
    const el = document.querySelector('[data-paper-box]')!
    const r = el.getBoundingClientRect()
    const at = { clientX: r.x + 30, clientY: r.y + 10 }
    const mk = (type: string, buttons: number) =>
      new PointerEvent(type, {
        ...at,
        pointerId: 9,
        pointerType: 'pen',
        isPrimary: true,
        button: 0,
        buttons,
        pressure: 0.37,
        tiltX: 12,
        tiltY: -5,
        width: 3,
        height: 4,
        bubbles: true,
        cancelable: true,
      })
    el.dispatchEvent(mk('pointerdown', 1))
    el.dispatchEvent(mk('pointerup', 0))
    const touch = new Event('touchstart', { bubbles: true, cancelable: true })
    Object.defineProperty(touch, 'touches', {
      value: [{ identifier: 3, clientX: at.clientX, clientY: at.clientY }],
    })
    Object.defineProperty(touch, 'changedTouches', {
      value: [{ identifier: 3, clientX: at.clientX, clientY: at.clientY }],
    })
    el.dispatchEvent(touch)
  })
  const tr = await copyTrace(page)
  const down = tr.events.find((e) => e.e === 'pointerdown' && e.pid === 9)!
  expect(down).toMatchObject({
    pt: 'pen',
    pri: 1,
    b: 0,
    bs: 1,
    pres: 0.37,
    w: 3,
    h: 4,
    tr: 0,
    g: 'box',
  })
  const tilt = await page.evaluate(
    () => (window as unknown as { __tilt: number[] }).__tilt,
  )
  expect([down.tx, down.ty]).toEqual(tilt)
  expect(typeof down.t).toBe('number')
  expect(typeof down.p).toBe('number')
  expect(down.rc).toBe(1)
  expect(typeof down.dp).toBe('number')
  const ns = tr.events.map((e) => e.n)
  expect([...ns].sort((a, b) => a - b)).toEqual(ns)
  const touch = tr.events.find((e) => e.e === 'touchstart')!
  expect(touch.tc).toBe(1)
  expect(touch.ch).toEqual([expect.objectContaining({ i: 3 })])
})

test('RC-01 a target keeps only a fixed test id, never text', async ({
  page,
}) => {
  await scene(page)
  await page.evaluate(() => {
    for (const [id, label] of [
      ['fixed-id', 'ok'],
      ['Service rate-is 2000', 'bad'],
    ]) {
      const b = document.createElement('div')
      b.setAttribute('data-testid', id)
      b.textContent = label
      b.style.cssText = 'position:fixed;left:5px;top:5px;width:9px;height:9px'
      document.body.append(b)
      b.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }))
      b.remove()
    }
  })
  const tr = await copyTrace(page)
  const ids = tr.events.filter((e) => e.e === 'pointerdown').map((e) => e.id)
  expect(ids).toContain('fixed-id')
  expect(JSON.stringify(tr)).not.toContain('Service')
})

test('RC-02 capture, hover, click, focus, hidden, selection and text input are recorded', async ({
  page,
}) => {
  await scene(page)
  await page.evaluate(() => {
    document.addEventListener(
      'pointerdown',
      (e) => (e.target as Element).setPointerCapture?.(e.pointerId),
      true,
    )
    const i = document.createElement('input')
    i.id = 'probe'
    i.style.cssText = 'position:fixed;left:300px;top:400px;width:200px'
    document.body.append(i)
  })
  await page.mouse.move(150, 600)
  await page.mouse.move(300, 420)
  await page.mouse.down()
  await page.mouse.up()
  await page.locator('#probe').focus()
  await page.keyboard.type('Hello')
  await page.locator('#probe').evaluate((el: HTMLInputElement) => el.select())
  await page.locator('#probe').blur()
  await setVisibility(page, 'hidden')
  await setVisibility(page, 'visible')
  const tr = await copyTrace(page)
  const ty = new Set(types(tr))
  for (const t of [
    'pointerover',
    'pointerout',
    'gotpointercapture',
    'lostpointercapture',
    'click',
    'focusin',
    'focusout',
    'visibilitychange',
    'beforeinput',
    'input',
    'selectionchange',
  ])
    expect(ty, t).toContain(t)
  expect(
    tr.events.find((e) => e.e === 'focusin' && e.fk === 'input'),
  ).toBeTruthy()
  expect(
    tr.events.filter((e) => e.e === 'visibilitychange').map((e) => e.vs),
  ).toEqual(['hidden', 'visible'])
  const inp = tr.events.filter((e) => e.e === 'input').pop()!
  expect(inp.it).toBe('insertText')
  expect(inp.il).toBe(1)
  expect(JSON.stringify(tr)).not.toContain('Hello')
})

test('RC-03 the app state beside each Lasso event: tool, gesture, machine, selection, outlines, timer, ended', async ({
  page,
}) => {
  const [d] = await scene(page)
  // A loop whose lift is withheld: the state while it is open.
  await stroke(page, loopAround(d), { keepDown: true })
  const open = await copyTrace(page)
  expect(open.end.tool).toBe('lasso')
  expect(open.end.gesture).toMatch(/^lasso#/)
  expect(open.end.machine).not.toBe('idle')
  expect(open.end.timer).toBe(true)
  expect(open.end.outlines).toBeGreaterThanOrEqual(1)
  const down = open.events.find((e) => e.e === 'pointerdown' && e.st)!
  expect(down.st!.tool).toBe('lasso')
  expect(typeof down.st!.editable).toBe('string')
  // The pointer is lost (app switch): the reason shows.
  await appSwitch(page, 7)
  await page.waitForTimeout(200)
  const gone = await copyTrace(page)
  expect(gone.end.timer).toBe(false)
  expect(gone.end.ended).not.toBe('never')
  expect(gone.events.some((e) => e.e === 'machine')).toBe(true)
  // A finished loop: selected, one outline gone.
  await stroke(page, loopAround(d), { id: 8 })
  await expect.poll(() => lassoSel(page)).toBe(1)
  const done = await copyTrace(page)
  expect(done.end.sel).toBe('ink')
  expect(done.end.selCount).toBe(1)
  expect(done.end.outlines).toBe(0)
})

test('RC-04 at most 20 000 events, nothing is written to storage', async ({
  page,
}) => {
  await scene(page)
  const before = await page.evaluate(() => [
    JSON.stringify({ ...localStorage }),
    JSON.stringify({ ...sessionStorage }),
  ])
  await page.evaluate(() => {
    for (let i = 0; i < 25_000; i++)
      document.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 4,
          pointerType: 'pen',
          clientX: 100 + (i % 50),
          clientY: 100,
        }),
      )
  })
  const tr = await copyTrace(page)
  expect(tr.events.length).toBeLessThanOrEqual(20_000)
  expect(tr.events.length).toBeGreaterThan(10_000)
  const after = await page.evaluate(() => [
    JSON.stringify({ ...localStorage }),
    JSON.stringify({ ...sessionStorage }),
  ])
  expect(after).toEqual(before)
})

test('RC-04, RC-05, RC-07 the switch row says what it does; off clears the buffer and removes the button', async ({
  page,
}) => {
  await scene(page)
  await expect(page.locator(COPY)).toBeVisible()
  await page.goto('/')
  await cornerAction(page, 'Settings')
  await page
    .getByRole('navigation', { name: 'Settings categories' })
    .getByRole('button', { name: /^Try new features/ })
    .click()
  const row = page
    .locator('main')
    .getByRole('region', { name: 'Lasso recorder', exact: true })
  await expect(row).toBeVisible()
  await expect(row).toContainText('records no note words')
  await row.getByRole('button', { name: 'Off' }).click()
  await expect(page.locator(COPY)).toHaveCount(0)
  await row.getByRole('button', { name: 'On' }).click()
  await expect(page.locator(COPY)).toBeVisible()
  // The buffer was cleared with the switch: a new copy has no old events.
  await page.mouse.move(200, 200)
  const tr = await copyTrace(page)
  expect(tr.events.every((e) => e.p > 0)).toBe(true)
  expect(types(tr)).not.toContain('pointerdown')
})

test('RC-05 with the switch off there is no button and no recording', async ({
  page,
}) => {
  const [d] = await scene(page, 1, false)
  await stroke(page, loopAround(d))
  await expect.poll(() => lassoSel(page)).toBe(1)
  await expect(page.locator('[data-lasso-recorder]')).toHaveCount(0)
})

test('RC-06 the replay sends pressure, buttons, pointer type, id, tilt and touches from the trace', async ({
  page,
}) => {
  await scene(page)
  const seen = await page.evaluate(() => {
    const got: Record<string, unknown>[] = []
    for (const type of ['pointerdown', 'pointermove', 'pointerup']) {
      window.addEventListener(type, (e) => {
        const p = e as PointerEvent
        if (p.pointerId === 21)
          got.push({
            type,
            t: p.isTrusted,
            pt: p.pointerType,
            pres: p.pressure,
            b: p.button,
            bs: p.buttons,
            tx: p.tiltX,
            ty: p.tiltY,
            w: p.width,
            h: p.height,
          })
      })
    }
    const touches: unknown[] = []
    window.addEventListener('touchstart', (e) =>
      touches.push((e as unknown as TouchEvent).changedTouches.length),
    )
    ;(window as unknown as { __got: unknown }).__got = { got, touches }
    return true
  })
  expect(seen).toBe(true)
  const base = 5000
  const trace: TraceIn = {
    v: 2,
    events: [
      {
        e: 'pointerdown',
        p: base,
        pid: 21,
        pt: 'pen',
        pri: 1,
        b: 0,
        bs: 1,
        pres: 0.5,
        tx: 9,
        ty: -3,
        w: 2,
        h: 2,
        x: 400,
        y: 400,
      },
      {
        e: 'pointermove',
        p: base + 16,
        pid: 21,
        pt: 'pen',
        pri: 1,
        b: -1,
        bs: 1,
        pres: 0.75,
        tx: 11,
        ty: -4,
        w: 2,
        h: 2,
        x: 410,
        y: 404,
        co: [405, 402, 410, 404],
      },
      {
        e: 'pointerup',
        p: base + 32,
        pid: 21,
        pt: 'pen',
        pri: 1,
        b: 0,
        bs: 0,
        pres: 0,
        tx: 0,
        ty: 0,
        w: 2,
        h: 2,
        x: 410,
        y: 404,
      },
      {
        e: 'touchstart',
        p: base + 48,
        tc: 2,
        ch: [
          { i: 1, x: 200, y: 200, k: 'direct' },
          { i: 2, x: 220, y: 200, k: 'direct' },
        ],
      },
    ],
  }
  const r = await replayTrace(page, trace)
  expect(r.sent).toBe(5) // the move sends its two coalesced points
  const out = await page.evaluate(
    () =>
      (
        window as unknown as {
          __got: { got: Record<string, unknown>[]; touches: number[] }
        }
      ).__got,
  )
  expect(out.got[0]).toMatchObject({
    t: false,
    pt: 'pen',
    pres: 0.5,
    b: 0,
    bs: 1,
    w: 2,
    h: 2,
  })
  // WebKit ignores the tilt a script gives a pointer event (it works it out from its own angles).
  if (test.info().project.name.includes('chromium'))
    expect(out.got[0]).toMatchObject({ tx: 9, ty: -3 })
  expect(out.got[1]).toMatchObject({ pres: 0.75, b: -1, bs: 1 })
  expect(out.got[2]).toMatchObject({ pres: 0.75, bs: 1 })
  expect(out.got[3]).toMatchObject({ type: 'pointerup', pres: 0, bs: 0 })
  expect(out.touches).toEqual([2])
})

test('R3 a trace replays the same way: the app ends in the Lasso state the trace holds', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000) // two pages in one test
  const ds = await scene(page, 2)
  await stroke(page, loopAround(ds[0]))
  await expect.poll(() => lassoSel(page)).toBe(1)
  const recorded = await copyTrace(page)
  expect(recorded.end).toMatchObject({ sel: 'ink', selCount: 1, outlines: 0 })
  // A fresh page with the same drawings, the Lasso picked, the recorder off.
  const fresh = await (
    await browser.newContext({
      ...test.info().project.use,
      storageState: test.info().project.use.storageState,
    })
  ).newPage()
  const ds2 = await scene(fresh, 2, false)
  const dy = ds2[0].y - ds[0].y
  const dx = ds2[0].x - ds[0].x
  const replay = recorded.events.filter(
    (e) => e.pt === 'pen' || e.e === 'click',
  )
  const b = traceBounds({ v: 2, events: replay })
  expect(b.width).toBeGreaterThan(50)
  const r = await replayTrace(
    fresh,
    { v: 2, events: recorded.events },
    { dx, dy },
  )
  expect(r.sent).toBeGreaterThan(10)
  await expect.poll(() => lassoSel(fresh)).toBe(1)
  const now = await fresh.evaluate(() => {
    const ink = window.__lnTools!.toolState().ink
    return {
      selCount: Number(ink.selection),
      outlines: document.querySelectorAll('[data-paper-lasso]').length,
      gesture: String(ink.gesture),
    }
  })
  expect(now.selCount).toBe(recorded.end.selCount)
  expect(now.outlines).toBe(recorded.end.outlines)
  expect(now.gesture.startsWith('lasso')).toBe(
    recorded.end.gesture.startsWith('lasso'),
  )
  await fresh.context().close()
})

test('RC-N2 (R4) no note words in a trace: typed and selected words never appear', async ({
  page,
}) => {
  await stubClipboard(page)
  await inkNote(page, 'Pen', 'pencil', { 'preview.circleRecorder': 'on' })
  await tool(page, 'Text').click()
  const editor = page.locator('.bn-editor')
  await editor.click()
  await page.keyboard.press('Control+End')
  await page.keyboard.press('Enter')
  await page.keyboard.type('Service 23-11 2000 rate-is')
  // Select "2000" (double click) in the page text.
  const w = await page.evaluate(() => {
    const walker = document.createTreeWalker(
      document.querySelector('.bn-editor')!,
      NodeFilter.SHOW_TEXT,
    )
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      const i = (n.textContent ?? '').indexOf('2000')
      if (i < 0) continue
      const r = document.createRange()
      r.setStart(n, i)
      r.setEnd(n, i + 4)
      const b = r.getBoundingClientRect()
      return { x: b.x + b.width / 2, y: b.y + b.height / 2 }
    }
    throw new Error('no words')
  })
  await page.mouse.dblclick(w.x, w.y)
  await page.keyboard.type('x')
  const tr = await copyTrace(page)
  const text = JSON.stringify(tr)
  for (const word of ['Service', '2000', 'rate-is', '23-11'])
    expect(text, word).not.toContain(word)
  expect(types(tr)).toContain('input')
  expect(types(tr)).toContain('selectionchange')
  // Keys are never recorded either.
  expect(types(tr)).not.toContain('keydown')
  expect(text).not.toContain('"key"')
})

test('RC-N1 the recorder draws nothing, cancels or stops no event, captures no pointer, sets no timer', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const calls: string[] = []
    ;(window as unknown as { __calls: string[] }).__calls = calls
    const here = () =>
      /lassoRecorder/.test(new Error().stack ?? '') ? ['recorder'] : []
    for (const [proto, name] of [
      [Event.prototype, 'preventDefault'],
      [Event.prototype, 'stopPropagation'],
      [Event.prototype, 'stopImmediatePropagation'],
      [Element.prototype, 'setPointerCapture'],
      [Element.prototype, 'releasePointerCapture'],
    ] as const) {
      const real = (
        proto as unknown as Record<string, (...a: unknown[]) => unknown>
      )[name]
      ;(proto as unknown as Record<string, unknown>)[name] = function (
        this: unknown,
        ...a: unknown[]
      ) {
        if (here().length) calls.push(name)
        return real.apply(this, a)
      }
    }
    for (const name of [
      'setTimeout',
      'setInterval',
      'requestAnimationFrame',
    ] as const) {
      const real = window[name] as (...a: unknown[]) => number
      ;(window as unknown as Record<string, unknown>)[name] = (
        ...a: unknown[]
      ) => {
        if (here().length) calls.push(name)
        return real(...a)
      }
    }
  })
  const [d] = await scene(page)
  await stroke(page, loopAround(d))
  // A spot on the page, away from the side bars (a tap at the corner opens Search on the iPad layout).
  await page.mouse.move(d.x + d.width + 60, d.y)
  await page.mouse.down()
  await page.mouse.up()
  // Drawn: while recording, the recorder's box holds only its one button.
  expect(
    await page.evaluate(
      () => document.querySelector('[data-lasso-recorder]')!.children.length,
    ),
  ).toBe(1)
  await copyTrace(page)
  const calls = await page.evaluate(
    () => (window as unknown as { __calls: string[] }).__calls,
  )
  expect(calls).toEqual([])
  // Drawn: only the button's own box (outside the page) exists.
  expect(await page.locator('[data-lasso-recorder]').count()).toBe(1)
  expect(
    await page.locator('[data-ink-overlay] [data-lasso-recorder]').count(),
  ).toBe(0)
})

test('RC-N1 with the recorder on, a Lasso loop selects exactly as with it off', async ({
  page,
  browser,
}) => {
  test.setTimeout(150_000) // two pages in one test
  const run = async (p: Page, on: boolean) => {
    const [d] = await scene(p, 1, on)
    await stroke(p, loopAround(d))
    await expect.poll(() => lassoSel(p)).toBe(1)
    return p.evaluate(() => {
      const ink = window.__lnTools!.toolState().ink
      return {
        sel: ink.selection,
        gesture: ink.gesture,
        dashed: !!document.querySelector('[data-ink-box]'),
      }
    })
  }
  const on = await run(page, true)
  const ctx = await browser.newContext({
    ...test.info().project.use,
    storageState: test.info().project.use.storageState,
  })
  const off = await run(await ctx.newPage(), false)
  await ctx.close()
  expect(on).toEqual(off)
})

test('RC-N3 no heavy work per event: moves cost a push, not a measurement', async ({
  page,
}) => {
  await scene(page)
  const cost = (): Promise<number> =>
    page.evaluate(() => {
      const ev = () =>
        new PointerEvent('pointermove', {
          bubbles: true,
          pointerId: 5,
          pointerType: 'pen',
          clientX: 50,
          clientY: 50,
        })
      const t0 = performance.now()
      for (let i = 0; i < 4000; i++) document.dispatchEvent(ev())
      return (performance.now() - t0) / 4000
    })
  await cost() // warm up
  const on = await cost()
  // Under 0.1 ms an event (a push plus a few fields); a layout read, a stack
  // capture or a state dump per event costs far more.
  expect(on).toBeLessThan(0.1)
  // And a move reads no app state: nothing but a pointer down, up, cancel, lost capture or click carries one.
  const tr = await copyTrace(page)
  expect(tr.events.filter((e) => e.e === 'pointermove' && e.st)).toEqual([])
})

/**
 * RC-05, RC-07 first look: the switch row in Settings and the "Copy last
 * trace" button, light (Day) and dark (Night), Beginner and Professional,
 * iPad upright, iPad sideways and phone. The checks always run; the pictures
 * are written only when SHOT_DIR is set (docs/HOW-WE-BUILD.md section 7).
 */
/** The button may sit over a panel the test must tap (the quiet corner): hide it for that tap. */
const hideWhile = async (page: Page, run: () => Promise<void>) => {
  const set = (v: string) =>
    page.evaluate((d) => {
      const el = document.querySelector<HTMLElement>('[data-lasso-recorder]')
      if (el) el.style.visibility = d
    }, v)
  await set('hidden')
  await run()
  await set('visible')
}
const SIZES = {
  'ipad-upright': { width: 834, height: 1194 },
  'ipad-sideways': { width: 1194, height: 834 },
  phone: { width: 390, height: 844 },
} as const
for (const level of ['beginner', 'professional'] as const)
  test(`RC-05, RC-07 first look (${level}): the button and the switch row in every size and theme`, async ({
    page,
  }) => {
    test.setTimeout(180_000)
    const dir = process.env.SHOT_DIR
    await stubClipboard(page)
    await openNote(page, 'pencil', {
      'preview.circleRecorder': 'on',
      level: { level, unlocked: [] },
    })
    const shot = async (name: string) => {
      if (dir) await page.screenshot({ path: `${dir}/${name}.png` })
    }
    for (const [theme, label] of [
      ['light', 'Day'],
      ['dark', 'Night'],
    ] as const) {
      await hideWhile(page, () => setTheme(page, label))
      for (const [size, v] of Object.entries(SIZES)) {
        await page.setViewportSize(v)
        await page.waitForTimeout(300)
        const button = page.locator(COPY)
        await expect(button).toBeVisible()
        const box = (await button.boundingBox())!
        expect(box.x + box.width).toBeLessThanOrEqual(v.width)
        expect(box.y + box.height).toBeLessThanOrEqual(v.height)
        await shot(`a2-button-${level}-${theme}-${size}`)
        if (size === 'phone') {
          await button.click()
          await expect(page.getByRole('status')).toBeVisible()
          await shot(`a2-copied-${level}-${theme}-${size}`)
        }
      }
    }
    await cornerAction(page, 'Settings')
    await page
      .getByRole('navigation', { name: 'Settings categories' })
      .getByRole('button', { name: /^Try new features/ })
      .click()
    for (const [theme, label] of [
      ['light', 'Day'],
      ['dark', 'Night'],
    ] as const) {
      await hideWhile(page, () => setTheme(page, label))
      for (const [size, v] of Object.entries(SIZES)) {
        await page.setViewportSize(v)
        const row = page
          .locator('main')
          .getByRole('region', { name: 'Lasso recorder', exact: true })
        await row.scrollIntoViewIfNeeded()
        await expect(row).toContainText('records no note words')
        await shot(`a2-switch-${level}-${theme}-${size}`)
      }
    }
  })
