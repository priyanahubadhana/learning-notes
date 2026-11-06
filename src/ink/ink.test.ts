import { describe, expect, it } from 'vitest'
import { STRIDE, type InkLayer, type Stroke } from '../core/inkTypes'
import { pickAnchor, toLocal, toWorld, type BlockRect } from './anchor'
import { eraseStroke, touches } from './eraser'
import {
  around,
  apply,
  boundsOf,
  inPolygon,
  mapXY,
  packPoints,
  pointCount,
  simplify,
  xy,
  type Pt,
} from './geometry'
import { InkDoc, emptyEdit, type Edit, type Placed } from './inkDoc'
import { InkHistory } from './inkHistory'
import {
  canAddLayer,
  activeLayerOf,
  extraLayers,
  layerForDrawing,
  mergeExtras,
  mergeLayers,
  liveLayers,
  MAX_LAYERS,
  moved,
  newLayer,
  removed,
  rename,
  setHidden,
  setLocked,
} from './layers'
import { PEN_SHAPE, strokeOutline, UNIT, widthUnits } from './outline'
import {
  insideLoop,
  isLoop,
  isScribble,
  recogniseShape,
  snapLine,
} from './shapes'
import { highlightStyle, inkStyle, makeStroke } from './style'

let counter = 0
const line = (n: number, f: (i: number) => Pt, p = 0.5): Stroke =>
  makeStroke(
    'ink',
    inkStyle(),
    Array.from({ length: n }, (_, i) => ({ ...f(i), p, t: i * 8 })),
    800,
    1000 + counter++,
  )

describe('stroke model', () => {
  it('keeps raw points: x, y, pressure, tilt, time, six numbers each', () => {
    const s = makeStroke(
      'ink',
      inkStyle(),
      [
        { x: 0.1234567, y: 0.5, p: 0.3333, tx: 12.4, ty: -3, t: 0 },
        { x: 0.2, y: 0.6, p: 0.9, tx: 0, ty: 0, t: 16.4 },
      ],
      800,
      5,
    )
    expect(STRIDE).toBe(6)
    expect(pointCount(s)).toBe(2)
    expect(s.pts.slice(0, 6)).toEqual([0.1235, 0.5, 0.33, 12, -3, 0])
    expect(s.pts[11]).toBe(16)
    expect(s.at).toBe(5)
    expect(s.bw).toBe(800)
  })

  it('five pen types make different outlines from the same points', () => {
    const pts = Array.from({ length: 30 }, (_, i) => ({
      x: 0.05 + i * 0.02,
      y: 0.1 + Math.sin(i / 4) * 0.02,
      p: 0.3 + (i % 7) / 10,
      t: i * 8,
    }))
    const polys = (
      ['fountain', 'ball', 'brush', 'pencil', 'marker'] as const
    ).map((pen) => {
      const s = makeStroke('ink', { ...inkStyle(), pen, width: 4 }, pts, 800, 1)
      const o = strokeOutline(s)
      expect(o?.kind).toBe('fill')
      return JSON.stringify(o)
    })
    expect(new Set(polys).size).toBe(5)
    expect(Object.keys(PEN_SHAPE)).toHaveLength(5)
  })

  it('dashed, dotted, highlights and shapes are lines', () => {
    const base = line(10, (i) => ({ x: i * 0.01, y: 0.1 }))
    const dashed = {
      ...base,
      style: { ...base.style, line: 'dashed' as const },
    }
    expect(strokeOutline(dashed)).toMatchObject({ kind: 'line' })
    const o = strokeOutline(dashed)
    expect(o?.kind === 'line' && o.dash.length).toBe(2)
    const dotted = {
      ...base,
      style: { ...base.style, line: 'dotted' as const },
    }
    const od = strokeOutline(dotted)
    expect(od?.kind === 'line' && od.cap).toBe('round')
    const hl = makeStroke(
      'highlight',
      highlightStyle(),
      [
        { x: 0, y: 0 },
        { x: 0.3, y: 0 },
      ],
      800,
      1,
    )
    expect(strokeOutline(hl)).toMatchObject({ kind: 'line', cap: 'butt' })
    expect(strokeOutline({ ...base, shape: 'rect' })).toMatchObject({
      kind: 'line',
      closed: true,
    })
  })

  it('width scales with the page width the stroke was drawn at', () => {
    const s = line(5, (i) => ({ x: i * 0.01, y: 0 }))
    const w = widthUnits(s)
    expect(w).toBeCloseTo((s.style.width / 800) * UNIT)
    expect(strokeOutline({ ...s, pts: [] })).toBeNull()
  })

  it('geometry: pack, map, bounds, simplify, polygon', () => {
    expect(packPoints([{ x: 1, y: 2 }])).toHaveLength(6)
    const moved = mapXY(packPoints([{ x: 1, y: 2, p: 0.7 }]), (p) => ({
      x: p.x + 1,
      y: p.y,
    }))
    expect(moved.slice(0, 3)).toEqual([2, 2, 0.7])
    expect(
      boundsOf([
        { x: 1, y: 5 },
        { x: 4, y: 2 },
      ]),
    ).toEqual({ x: 1, y: 2, w: 3, h: 3 })
    const straight = Array.from({ length: 20 }, (_, i) => ({ x: i, y: 0 }))
    expect(simplify(straight, 0.5)).toHaveLength(2)
    expect(
      inPolygon({ x: 1, y: 1 }, [
        { x: 0, y: 0 },
        { x: 3, y: 0 },
        { x: 3, y: 3 },
        { x: 0, y: 3 },
      ]),
    ).toBe(true)
    const m = around({ x: 0, y: 0 }, 2, Math.PI / 2, 5, 0)
    const q = apply(m, { x: 1, y: 0 })
    expect(q.x).toBeCloseTo(5)
    expect(q.y).toBeCloseTo(2)
    expect(xy(line(3, (i) => ({ x: i, y: i })))).toHaveLength(3)
  })
})

describe('anchoring to blocks', () => {
  const blocks: BlockRect[] = [
    { id: 'a', x: 0, y: 0, w: 700, h: 40 },
    { id: 'b', x: 0, y: 60, w: 700, h: 40 },
    { id: 'c', x: 20, y: 120, w: 680, h: 40 },
  ]

  it('picks the block under the point, else the block above, else the first', () => {
    expect(pickAnchor({ x: 5, y: 70 }, blocks)).toBe('b')
    expect(pickAnchor({ x: 5, y: 50 }, blocks)).toBe('a') // between: the one above
    expect(pickAnchor({ x: 5, y: 900 }, blocks)).toBe('c') // below the last line
    expect(pickAnchor({ x: 5, y: -10 }, blocks)).toBe('a') // above the first
    expect(pickAnchor({ x: 5, y: 5 }, [])).toBeNull()
  })

  it('moves with the block when text reflows, and scales with the page width', () => {
    const f = { x: 0, y: 60, w: 800 }
    const local = toLocal({ x: 80, y: 90 }, f)
    expect(local).toEqual({ x: 0.1, y: 0.0375 })
    // The block moved down 100px and the page got narrower.
    const after = toWorld(local, { x: 0, y: 160, w: 400 })
    expect(after).toEqual({ x: 40, y: 175 })
    // Round trip.
    expect(toWorld(toLocal({ x: 33, y: 71 }, f), f)).toEqual({ x: 33, y: 71 })
  })
})

describe('eraser', () => {
  const s = line(21, (i) => ({ x: i * 0.01, y: 0.1 })) // 0 .. 0.2 across

  it('precise splits a stroke into two pieces around the touched part', () => {
    const out = eraseStroke(s, [{ x: 0.1, y: 0.1 }], 0.02, 'precise')
    expect(out).toHaveLength(2)
    expect(out[0].id).not.toBe(s.id)
    expect(out[0].style).toEqual(s.style)
    expect(out[0].at).toBe(s.at)
    const left = Math.max(...xy(out[0]).map((p) => p.x))
    const right = Math.min(...xy(out[1]).map((p) => p.x))
    expect(right - left).toBeGreaterThan(0.03)
    expect(right - left).toBeLessThan(0.06)
  })

  it('leaves the stroke alone (same object) when nothing is touched', () => {
    expect(eraseStroke(s, [{ x: 0.1, y: 0.5 }], 0.02, 'precise')).toEqual([s])
    expect(eraseStroke(s, [{ x: 0.1, y: 0.5 }], 0.02, 'precise')[0]).toBe(s)
  })

  it('erasing the end leaves one piece; erasing it all leaves none', () => {
    expect(eraseStroke(s, [{ x: 0.2, y: 0.1 }], 0.03, 'precise')).toHaveLength(
      1,
    )
    expect(eraseStroke(s, [{ x: 0.1, y: 0.1 }], 0.5, 'precise')).toEqual([])
  })

  it('whole stroke removes the stroke on any touch', () => {
    expect(eraseStroke(s, [{ x: 0.15, y: 0.105 }], 0.01, 'stroke')).toEqual([])
    expect(touches(s, [{ x: 0.15, y: 0.4 }], 0.01)).toBe(false)
  })

  it('standard reaches further and drops specks', () => {
    const precise = eraseStroke(s, [{ x: 0.1, y: 0.1 }], 0.02, 'precise')
    const standard = eraseStroke(s, [{ x: 0.1, y: 0.1 }], 0.02, 'standard')
    const gap = (o: Stroke[]) =>
      Math.min(...xy(o[1]).map((p) => p.x)) -
      Math.max(...xy(o[0]).map((p) => p.x))
    expect(gap(standard)).toBeGreaterThan(gap(precise))
    // A speck of the stroke left near the end is dropped by Standard.
    const nearEnd = eraseStroke(s, [{ x: 0.17, y: 0.1 }], 0.02, 'standard')
    expect(nearEnd).toHaveLength(1)
  })

  it('a path (a drag) erases along its whole length', () => {
    const out = eraseStroke(
      s,
      [
        { x: 0.05, y: 0.1 },
        { x: 0.15, y: 0.1 },
      ],
      0.01,
      'precise',
    )
    expect(out).toHaveLength(2)
    expect(Math.max(...xy(out[0]).map((p) => p.x))).toBeLessThan(0.05)
    expect(Math.min(...xy(out[1]).map((p) => p.x))).toBeGreaterThan(0.15)
  })
})

describe('shape recognition (draw and hold)', () => {
  const jitter = (i: number) => Math.sin(i * 12.9898) * 1.2
  const along = (a: Pt, b: Pt, n: number): Pt[] =>
    Array.from({ length: n }, (_, i) => ({
      x: a.x + ((b.x - a.x) * i) / (n - 1) + jitter(i),
      y: a.y + ((b.y - a.y) * i) / (n - 1) + jitter(i + 7),
    }))
  const poly = (corners: Pt[], per = 16): Pt[] =>
    corners.flatMap((c, i) => along(c, corners[(i + 1) % corners.length], per))

  it('a wobbly line becomes a line (and snaps to horizontal)', () => {
    const r = recogniseShape(along({ x: 10, y: 100 }, { x: 300, y: 108 }, 30))
    expect(r?.kind).toBe('line')
    expect(r?.pts).toHaveLength(2)
    expect(r?.pts[1].y).toBeCloseTo(100, 0)
    const free = recogniseShape(
      along({ x: 10, y: 100 }, { x: 300, y: 108 }, 30),
      { snap: false },
    )
    expect(Math.abs(free!.pts[1].y - 108)).toBeLessThan(2)
    expect(snapLine({ x: 0, y: 0 }, { x: 100, y: 3 }).y).toBeCloseTo(0)
    expect(snapLine({ x: 0, y: 0 }, { x: 100, y: 20 }).y).toBe(20) // not near 45 or 0
  })

  it('a rough rectangle becomes a rectangle; a square when nearly square', () => {
    const r = recogniseShape(
      poly([
        { x: 10, y: 10 },
        { x: 210, y: 14 },
        { x: 206, y: 120 },
        { x: 8, y: 116 },
      ]),
    )
    expect(r?.kind).toBe('rect')
    expect(r?.closed).toBe(true)
    expect(r?.pts).toHaveLength(5)
    const sq = recogniseShape(
      poly([
        { x: 10, y: 10 },
        { x: 110, y: 12 },
        { x: 108, y: 108 },
        { x: 9, y: 110 },
      ]),
    )
    const b = boundsOf(sq!.pts)
    expect(Math.abs(b.w - b.h)).toBeLessThan(1)
  })

  it('a triangle', () => {
    const r = recogniseShape(
      poly([
        { x: 100, y: 10 },
        { x: 200, y: 160 },
        { x: 10, y: 150 },
      ]),
    )
    expect(r?.kind).toBe('triangle')
    expect(r?.pts).toHaveLength(4)
  })

  it('a round loop becomes an ellipse, and a circle when nearly round', () => {
    const loop = Array.from({ length: 60 }, (_, i) => {
      const a = (i / 59) * Math.PI * 2
      return {
        x: 150 + Math.cos(a) * 80 + jitter(i),
        y: 100 + Math.sin(a) * 78 + jitter(i + 3),
      }
    })
    const r = recogniseShape(loop)
    expect(r?.kind).toBe('ellipse')
    const b = boundsOf(r!.pts)
    expect(Math.abs(b.w - b.h)).toBeLessThan(0.5)
    const oval = loop.map((p) => ({ x: p.x, y: 100 + (p.y - 100) * 0.5 }))
    const o = boundsOf(recogniseShape(oval)!.pts)
    expect(o.w).toBeGreaterThan(o.h * 1.5)
  })

  it('a line with a head becomes an arrow', () => {
    const shaft = along({ x: 10, y: 100 }, { x: 250, y: 100 }, 30)
    const head = [
      ...along({ x: 250, y: 100 }, { x: 220, y: 80 }, 6),
      ...along({ x: 220, y: 80 }, { x: 250, y: 100 }, 6),
      ...along({ x: 250, y: 100 }, { x: 220, y: 122 }, 6),
    ]
    const r = recogniseShape([...shaft, ...head])
    expect(r?.kind).toBe('arrow')
    expect(r?.pts).toHaveLength(5)
  })

  it('a scribble is not a shape', () => {
    const zig = Array.from({ length: 40 }, (_, i) => ({
      x: (i % 2) * 60 + jitter(i) * 5,
      y: i * 3,
    }))
    expect(recogniseShape(zig)).toBeNull()
  })
})

describe('pen gestures', () => {
  it('scribble: many sharp turns in a small area', () => {
    const zig = Array.from({ length: 60 }, (_, i) => ({
      x: 20 + (i % 2 ? 50 : 0) + (i % 5),
      y: 20 + i * 1.2,
    }))
    expect(isScribble(zig)).toBe(true)
    const straight = Array.from({ length: 60 }, (_, i) => ({ x: i * 4, y: 10 }))
    expect(isScribble(straight)).toBe(false)
    const circle = Array.from({ length: 60 }, (_, i) => ({
      x: 100 + Math.cos(i / 9.5) * 50,
      y: 100 + Math.sin(i / 9.5) * 50,
    }))
    expect(isScribble(circle)).toBe(false)
  })

  it('circle: a closed round loop around something', () => {
    const loop = Array.from({ length: 50 }, (_, i) => {
      const a = (i / 49) * Math.PI * 2
      return { x: 100 + Math.cos(a) * 60, y: 100 + Math.sin(a) * 60 }
    })
    expect(isLoop(loop)).toBe(true)
    expect(insideLoop({ x: 100, y: 100 }, loop)).toBe(true)
    expect(insideLoop({ x: 300, y: 100 }, loop)).toBe(false)
    expect(isLoop(loop.slice(0, 25))).toBe(false) // half a circle is not closed
    expect(isLoop(loop.map((p) => ({ x: p.x / 10, y: p.y / 10 })))).toBe(false) // too small
  })
})

describe('layers', () => {
  const stroke = (id: string): Stroke => ({
    ...line(3, (i) => ({ x: i, y: i })),
    id,
  })
  const layers = (): InkLayer[] => {
    const a = newLayer('p', [], 'Layer 1', 1)
    const b = newLayer('p', [a], 'Layer 2', 2)
    const c = newLayer('p', [a, b], 'Layer 3', 3)
    return [a, b, c]
  }

  it('new layers go on top, in order', () => {
    const [a, b, c] = layers()
    expect(liveLayers([c, a, b]).map((l) => l.name)).toEqual([
      'Layer 1',
      'Layer 2',
      'Layer 3',
    ])
  })

  it('rename, hide, lock', () => {
    const [a] = layers()
    expect(rename(a, '  Notes ').name).toBe('Notes')
    expect(rename(a, '   ')).toBe(a)
    expect(rename(a, 'x'.repeat(100)).name).toHaveLength(40)
    const hidden = setHidden(a, true)
    expect(hidden.hidden).toBe(true)
    expect('hidden' in setHidden(hidden, false)).toBe(false)
    expect(setLocked(a, true).locked).toBe(true)
  })

  it('reorder moves one place up or down, and stops at the ends', () => {
    const [a, b, c] = layers()
    const all = [a, b, c]
    const up = moved(all, a.id, 'up')!
    expect(liveLayers([up, b, c]).map((l) => l.name)).toEqual([
      'Layer 2',
      'Layer 1',
      'Layer 3',
    ])
    const down = moved(all, c.id, 'down')!
    expect(liveLayers([a, b, down]).map((l) => l.name)).toEqual([
      'Layer 1',
      'Layer 3',
      'Layer 2',
    ])
    expect(moved(all, c.id, 'up')).toBeNull()
    expect(moved(all, a.id, 'down')).toBeNull()
  })

  it('delete is a soft delete; a limit of layers', () => {
    const [a, b] = layers()
    const gone = removed(a, 9)
    expect(gone.deletedAt).toBe(9)
    expect(liveLayers([gone, b])).toHaveLength(1)
    const many = Array.from({ length: MAX_LAYERS }, (_, i) =>
      newLayer('p', [], `L${i}`),
    )
    expect(canAddLayer(many)).toBe(false)
    expect(canAddLayer([a])).toBe(true)
  })

  it('new ink goes to the chosen layer; a locked or hidden one says why', () => {
    const [a, b, c] = layers()
    expect(layerForDrawing([a, b, c], a.id).layer?.id).toBe(a.id)
    // Nothing chosen: the top layer that is free.
    expect(layerForDrawing([a, b, setLocked(c, true)], null).layer?.id).toBe(
      b.id,
    )
    // The chosen layer is locked or hidden: nothing is drawn, with the reason.
    const locked = layerForDrawing([a, setLocked(b, true)], b.id)
    expect(locked.layer).toBeNull()
    expect(locked.reason).toBe('locked')
    const hidden = layerForDrawing([a, setHidden(b, true)], b.id)
    expect(hidden.reason).toBe('hidden')
    expect(activeLayerOf([a, b], null)?.id).toBe(b.id)
  })

  it('merging moves every stroke and puts the layer away (one edit, undoable)', () => {
    const [a, b] = layers()
    const doc = new InkDoc({
      pageId: 'p',
      data: { layers: [a, b], chunks: [] },
      save: () => {},
    })
    const s1 = stroke('s1')
    const s2 = stroke('s2')
    doc.apply({
      ...emptyEdit(),
      add: [
        { layerId: a.id, blockId: null, stroke: s1 },
        { layerId: b.id, blockId: null, stroke: s2 },
      ],
    })
    const edit = mergeLayers(doc, b.id, a.id)!
    doc.apply(edit)
    expect(doc.layers.map((l) => l.id)).toEqual([a.id])
    expect(
      doc
        .strokesOf(a.id)
        .map((p) => p.stroke.id)
        .sort(),
    ).toEqual(['s1', 's2'])
    doc.revert(edit)
    expect(doc.layers).toHaveLength(2)
    expect(doc.strokesOf(b.id).map((p) => p.stroke.id)).toEqual(['s2'])
    expect(mergeLayers(doc, a.id, a.id)).toBeNull()
  })

  it('mergeExtras folds old extra layers into Layer 2', () => {
    const chain: InkLayer[] = []
    for (const n of [1, 2, 3, 4]) chain.push(newLayer('p', chain, `Layer ${n}`))
    const doc = new InkDoc({
      pageId: 'p',
      data: { layers: chain, chunks: [] },
      save: () => {},
    })
    doc.apply({
      ...emptyEdit(),
      add: chain.map((layer, i) => ({
        layerId: layer.id,
        blockId: null,
        stroke: stroke(`x${i}`),
      })),
    })
    expect(extraLayers(doc.layers)).toHaveLength(2)
    const edit = mergeExtras(doc)!
    doc.apply(edit)
    expect(doc.layers).toHaveLength(2)
    expect(doc.strokesOf(chain[1].id)).toHaveLength(3)
    expect(mergeExtras(doc)).toBeNull()
  })
})

describe('ink document and one history', () => {
  const place = (
    layerId: string,
    blockId: string | null,
    s: Stroke,
  ): Placed => ({ layerId, blockId, stroke: s })
  const make = () => {
    const saved: number[] = []
    const layer = newLayer('p', [], 'Layer 1')
    const doc = new InkDoc({
      pageId: 'p',
      data: { layers: [layer], chunks: [] },
      save: (l, c) => {
        saved.push(l.length * 100 + c.length)
      },
      delay: 5,
    })
    return { doc, layer, saved }
  }

  it('adds, removes and takes back, one edit at a time', () => {
    const { doc, layer } = make()
    const s1 = line(5, (i) => ({ x: i * 0.01, y: 0 }))
    const s2 = line(5, (i) => ({ x: i * 0.01, y: 0.1 }))
    const add: Edit = {
      ...emptyEdit(),
      add: [place(layer.id, 'b1', s1), place(layer.id, null, s2)],
    }
    doc.apply(add)
    expect(doc.strokeCount).toBe(2)
    expect(doc.strokesOf(layer.id).map((p) => p.stroke.id)).toEqual([
      s1.id,
      s2.id,
    ])
    expect(doc.find(s1.id)?.blockId).toBe('b1')
    const split = eraseStroke(s1, [{ x: 0.02, y: 0 }], 0.005, 'precise')
    const erase: Edit = {
      ...emptyEdit(),
      del: [place(layer.id, 'b1', s1)],
      add: split.map((s) => place(layer.id, 'b1', s)),
    }
    doc.apply(erase)
    expect(doc.find(s1.id)).toBeUndefined()
    expect(doc.strokeCount).toBe(1 + split.length)
    doc.revert(erase)
    expect(doc.find(s1.id)).toBeDefined()
    expect(doc.strokeCount).toBe(2)
    doc.revert(add)
    expect(doc.strokeCount).toBe(0)
    expect(doc.anchorBlocks().size).toBe(0)
  })

  it('keeps stroke order by time, saves only changed chunks, chunks at 60', async () => {
    const { doc, layer, saved } = make()
    const many = Array.from({ length: 130 }, (_, i) => ({
      ...line(3, (k) => ({ x: k * 0.01, y: i * 0.01 })),
      at: 5000 + i,
    }))
    doc.apply({ ...emptyEdit(), add: many.map((s) => place(layer.id, 'b', s)) })
    await doc.flush()
    expect(saved).toEqual([3]) // 3 chunks (60 + 60 + 10)
    expect(doc.strokesOf(layer.id).map((p) => p.stroke.at)).toEqual(
      many.map((s) => s.at),
    )
    doc.apply({ ...emptyEdit(), del: [place(layer.id, 'b', many[0])] })
    await doc.flush()
    expect(saved[1]).toBe(1) // one chunk rewritten
    await doc.flush()
    expect(saved).toHaveLength(2) // nothing more to write
  })

  it('layer changes are part of an edit and are taken back with it', () => {
    const { doc, layer } = make()
    const hidden = setHidden(layer, true)
    const e: Edit = {
      ...emptyEdit(),
      layers: [{ before: layer, after: removed(layer, 9) }],
    }
    doc.apply(e)
    expect(doc.layers).toHaveLength(0)
    doc.revert(e)
    expect(doc.layers).toHaveLength(1)
    doc.patchLayer(hidden)
    expect(doc.layer(layer.id)?.hidden).toBe(true)
  })

  it('remembers where a block was for ink whose block is deleted', () => {
    const { doc, layer } = make()
    doc.apply({
      ...emptyEdit(),
      add: [
        place(
          layer.id,
          'b1',
          line(2, () => ({ x: 0, y: 0 })),
        ),
      ],
    })
    doc.noteBlock('b1', { x: 4, y: 300, w: 700 })
    expect(doc.fallbackOf('b1')).toEqual({ x: 4, y: 300, w: 700 })
    expect(doc.fallbackOf('nope')).toBeUndefined()
  })

  it('Undo and Redo walk text and ink in the order they happened', () => {
    const h = new InkHistory()
    const edit = (): Edit => emptyEdit()
    // text typed (depth 1), ink drawn (stamp 1), more text typed (depth 2)
    h.push(edit(), 1)
    expect(h.undoTarget(2)).toBe('text') // the newest was text
    expect(h.undoTarget(1)).toBe('ink') // text is level: the ink is newest
    expect(h.takeUndo()).toBeDefined()
    expect(h.undoTarget(1)).toBe('text') // no more ink: the rest is text
    expect(h.redoTarget(0)).toBe('text') // text first comes back
    expect(h.redoTarget(1)).toBe('ink')
    expect(h.takeRedo()).toBeDefined()
    expect(h.canRedo).toBe(false)
    // new ink clears Redo
    h.takeUndo()
    h.push(edit(), 1)
    expect(h.canRedo).toBe(false)
    h.takeUndo()
    h.forgetRedo()
    expect(h.canRedo).toBe(false)
    expect(h.size).toBe(0)
  })
})
