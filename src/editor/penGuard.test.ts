// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { Schema } from 'prosemirror-model'
import { EditorState } from 'prosemirror-state'
import {
  penState,
  refuseDelete,
  refuseInput,
  refuseTransaction,
  TAP_PATH_PX,
  tipPathTo,
  wasPenTap,
  watchPenGuard,
  type TipPath,
} from './penGuard'

const idle = { down: false, upAt: -1e9 }

describe('refuseDelete', () => {
  it('refuses a delete while the pen is down', () => {
    expect(
      refuseDelete('deleteContentBackward', 1000, { ...idle, down: true }, 0),
    ).toBe(true)
  })
  it('refuses it for 500 ms after the pen lifts, not after', () => {
    const pen = { down: false, upAt: 1000 }
    expect(refuseDelete('deleteByDrag', 1400, pen, 0)).toBe(true)
    expect(refuseDelete('deleteByDrag', 1500, pen, 0)).toBe(false)
  })
  it('lets a real key press through', () => {
    expect(
      refuseDelete('deleteContentBackward', 1000, { ...idle, down: true }, 800),
    ).toBe(false)
  })
  it('never refuses typing or a delete with no pen', () => {
    expect(refuseDelete('insertText', 1000, { ...idle, down: true }, 0)).toBe(
      false,
    )
    expect(refuseDelete('deleteContent', 1000, idle, 0)).toBe(false)
  })
})

describe('refuseInput (Scribble writing)', () => {
  const down = { ...idle, down: true }
  it('refuses handwriting and replacements while the pen is busy', () => {
    for (const type of [
      'insertText',
      'insertReplacementText',
      'insertCompositionText',
      'insertFromComposition',
    ]) {
      expect(refuseInput(type, 1000, down, 0, false)).toBe(true)
    }
  })
  it('lets handwriting and small deletes through when Scribble is free', () => {
    expect(refuseInput('insertReplacementText', 1000, down, 0, true)).toBe(
      false,
    )
    expect(refuseInput('deleteContentBackward', 1000, down, 0, true)).toBe(
      false,
    )
  })
  it('lets typed keys through', () => {
    expect(refuseInput('insertText', 1000, down, 900, false)).toBe(false)
  })
})

describe('refuseTransaction', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'paragraph+' },
      paragraph: { content: 'text*' },
      text: {},
    },
  })
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, schema.text('Hello world')),
  ])
  const fresh = () => EditorState.create({ doc }).tr
  const remove = (meta?: string) => {
    const tr = fresh().delete(1, 6)
    if (meta) tr.setMeta(meta, {})
    return tr
  }
  const insert = () => fresh().insertText('x', 3)
  const pen = { down: true, upAt: -1e9, lastKeyAt: -1e9 }

  it('rejects a delete or replace during a pen gesture', () => {
    expect(refuseTransaction(remove(), 1000, pen, false)).toBe(true)
  })
  it('rejects it for 500 ms after the pen lifts', () => {
    const up = { down: false, upAt: 1000, lastKeyAt: -1e9 }
    expect(refuseTransaction(remove(), 1400, up, false)).toBe(true)
    expect(refuseTransaction(remove(), 1500, up, false)).toBe(false)
  })
  it('allows typing in, undo and keys', () => {
    expect(refuseTransaction(insert(), 1000, pen, false)).toBe(false)
    expect(refuseTransaction(remove('history$'), 1000, pen, false)).toBe(false)
    expect(
      refuseTransaction(remove(), 1000, { ...pen, lastKeyAt: 800 }, false),
    ).toBe(false)
  })
  it('Scribble free: a small scratch-out is allowed, a big one is refused', () => {
    expect(refuseTransaction(remove(), 1000, pen, true)).toBe(false)
    const big = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('x'.repeat(40))),
    ])
    const tr = EditorState.create({ doc: big }).tr.delete(1, 31)
    expect(refuseTransaction(tr, 1000, pen, true)).toBe(true)
    expect(refuseTransaction(tr, 1000, { ...pen, lastKeyAt: 800 }, true)).toBe(
      false,
    )
  })
  it('allows deletes with no pen', () => {
    expect(
      refuseTransaction(
        remove(),
        1000,
        { down: false, upAt: -1e9, lastKeyAt: -1e9 },
        false,
      ),
    ).toBe(false)
  })
})

describe('grace period after a tap selects text', () => {
  const sel = { down: false, upAt: -1e9, selectedAt: 1000 }
  it('refuses delete and writing for 600 ms, even with Scribble free', () => {
    for (const type of [
      'deleteContentBackward',
      'insertText',
      'insertReplacementText',
    ]) {
      expect(refuseInput(type, 1500, sel, -1e9, true)).toBe(true)
      expect(refuseInput(type, 1599, sel, -1e9, false)).toBe(true)
      expect(refuseInput(type, 1600, sel, -1e9, true)).toBe(false)
    }
  })
  it('lets a real key press through', () => {
    expect(refuseInput('deleteContentBackward', 1200, sel, 1100, true)).toBe(
      false,
    )
  })
  it('refuses a transaction that replaces the selection, then allows it', () => {
    const schema = new Schema({
      nodes: {
        doc: { content: 'paragraph+' },
        paragraph: { content: 'text*' },
        text: {},
      },
    })
    const doc = schema.node('doc', null, [
      schema.node('paragraph', null, schema.text('let me type text')),
    ])
    const tr = () => EditorState.create({ doc }).tr.insertText('x', 8, 12)
    const pen = { down: false, upAt: -1e9, lastKeyAt: -1e9, selectedAt: 1000 }
    expect(refuseTransaction(tr(), 1300, pen, true)).toBe(true)
    expect(refuseTransaction(tr(), 1700, pen, true)).toBe(false)
  })
})

describe('grace period: only the selection is protected', () => {
  const schema = new Schema({
    nodes: {
      doc: { content: 'paragraph+' },
      paragraph: { content: 'text*' },
      text: {},
    },
  })
  const doc = schema.node('doc', null, [
    schema.node('paragraph', null, schema.text('let me type text')),
    schema.node('paragraph', null, schema.text('another block')),
  ])
  const pen = { down: false, upAt: -1e9, lastKeyAt: -1e9, selectedAt: 1000 }
  const sel = { from: 8, to: 12 }
  it('refuses a removal over the selection', () => {
    const tr = EditorState.create({ doc }).tr.insertText('x', 9, 11)
    expect(refuseTransaction(tr, 1200, pen, true, sel)).toBe(true)
  })
  it('lets a synced change to another block through', () => {
    const tr = EditorState.create({ doc }).tr.insertText('synced', 20, 25)
    expect(refuseTransaction(tr, 1200, pen, true, sel)).toBe(false)
  })
})

describe('a Pencil tap is told by the whole path of the tip (C4, C14)', () => {
  /** The path length (px) of a press through these points. */
  const pathOf = (pts: [number, number][]) => {
    let path: TipPath = { len: 0, x: pts[0][0], y: pts[0][1] }
    pts.slice(1).forEach(([x, y], i) => {
      path = tipPathTo(path, x, y, i === pts.length - 2)
    })
    return path.len
  }
  it('a quick scratch-out over a small glyph that ends where it began is not a tap', () => {
    // Four strokes across a 9 px glyph, back at the start: 0 px from start
    // to end (the old rule called it a tap), 36 px of travel.
    const zigzag: [number, number][] = [
      [100, 100],
      [109, 102],
      [100, 104],
      [109, 102],
      [100, 100],
    ]
    expect(pathOf(zigzag)).toBeGreaterThan(TAP_PATH_PX)
    expect(wasPenTap(180, pathOf(zigzag))).toBe(false)
  })
  it('a tap that drifts 5 px, with the sensor trembling, is a tap', () => {
    const tap: [number, number][] = [
      [100, 100],
      [100.6, 100.4],
      [100.1, 99.8],
      [101.2, 101],
      [102, 102.5],
      [103, 104],
    ]
    expect(pathOf(tap)).toBeLessThanOrEqual(8)
    expect(wasPenTap(220, pathOf(tap))).toBe(true)
  })
  it('a press held longer than 300 ms is not a tap', () => {
    expect(wasPenTap(301, 0)).toBe(false)
    expect(wasPenTap(300, TAP_PATH_PX)).toBe(true)
  })
})

/**
 * TB-37 burst ring (e2e/tb2-pencil.spec.ts, "a quick ring round a digit, its
 * moves merged by the browser"), failing 3 to 8 of 20 on ipad-webkit. The
 * page log of a failing run: press at (578, 560), a move at (579, 560), ONE
 * move back at (578, 560) holding the other 91 points of the ring in
 * getCoalescedEvents, lift at (578, 560) after 239 ms. The guard measured
 * the tip path from the two moves only (0 px), called the ring a tap (C14),
 * and its tap grace refused the ring's own 7 -> (7) replacement.
 */
describe('a quick ring whose moves the browser merged is not a tap', () => {
  type Ev = Event & { [k: string]: unknown }
  /** A Pencil event as the browser hands it to the page. */
  const pen = (
    type: string,
    x: number,
    y: number,
    t: number,
    target: EventTarget,
    merged: { x: number; y: number }[] = [],
  ) => {
    const e = new Event(type, { bubbles: true, cancelable: true }) as Ev
    const props: Record<string, unknown> = {
      pointerType: 'pen',
      pointerId: 7,
      clientX: x,
      clientY: y,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      timeStamp: t,
      getCoalescedEvents: () =>
        merged.map((q) => ({ clientX: q.x, clientY: q.y })),
    }
    for (const [k, value] of Object.entries(props))
      Object.defineProperty(e, k, { value })
    target.dispatchEvent(e)
  }
  /** Sets up the guard on a page text; returns the text element. */
  const page = () => {
    const dom = document.createElement('div')
    dom.className = 'bn-editor'
    const text = document.createElement('p')
    text.textContent = 'Step 7 done'
    dom.appendChild(text)
    document.body.appendChild(dom)
    const editor = {
      domElement: dom,
      prosemirrorView: undefined,
      onChange: () => () => {},
    }
    const stop = watchPenGuard(
      editor as unknown as Parameters<typeof watchPenGuard>[0],
      () => {},
    )
    return { text, stop: () => (stop(), dom.remove()) }
  }
  // The ring of the e2e test round the 7 (24 points, 4 sent per segment).
  const cx = 578.5
  const cy = 569.6
  const ring = Array.from({ length: 24 }, (_, i) => {
    const a = (i / 23) * Math.PI * 2 - Math.PI / 2
    return { x: cx + Math.cos(a) * 14.5, y: cy + Math.sin(a) * 9.5 }
  })
  const fine = ring.slice(1).flatMap((q, i) =>
    Array.from({ length: 4 }, (_, j) => ({
      x: ring[i].x + ((q.x - ring[i].x) * (j + 1)) / 4,
      y: ring[i].y + ((q.y - ring[i].y) * (j + 1)) / 4,
    })),
  )

  it('the ring of a failing run (two moves, 91 points merged) does not start a tap grace', () => {
    const { text, stop } = page()
    try {
      penState.tapAt = -1e9
      const s = ring[0]
      pen('pointerdown', s.x, s.y, 10_000, text)
      pen('pointermove', fine[0].x, fine[0].y, 10_056, text, [fine[0]])
      pen('pointermove', s.x, s.y, 10_133, text, fine.slice(1))
      pen('pointerup', s.x, s.y, 10_239, text)
      expect(penState.down).toBe(false)
      expect(penState.upAt).toBe(10_239)
      // 239 ms, but the tip went round a 75 px ring: not a tap.
      expect(penState.tapAt, 'the ring was taken for a tap').not.toBe(10_239)
    } finally {
      stop()
    }
  })

  it('a real tap stays a tap when its trembling samples are merged too', () => {
    const { text, stop } = page()
    try {
      penState.tapAt = -1e9
      // 20 samples within 1 px of the tip, drifting 3 px.
      const shake = Array.from({ length: 20 }, (_, i) => ({
        x: 300 + (i % 2 ? 0.9 : -0.9) + i * 0.15,
        y: 300 + (i % 3 ? 0.8 : -0.8),
      }))
      pen('pointerdown', 300, 300, 20_000, text)
      pen('pointermove', 301, 300, 20_060, text, shake.slice(0, 10))
      pen('pointermove', 303, 300, 20_120, text, shake.slice(10))
      pen('pointerup', 303, 300, 20_180, text)
      expect(penState.tapAt, 'a tap must keep its grace').toBe(20_180)
    } finally {
      stop()
    }
  })
})
