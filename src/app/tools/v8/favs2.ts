import { cleanStore, prefStore } from '../store'
import {
  ERASER_MODES,
  PEN_TYPES,
  eraserSettings,
  highlighterSettings,
  lassoSettings,
  penSettings,
  type EraserMode,
  type LassoShape,
  type PenType,
} from '../main/inkSettings'
import { activeTool, type ModeTool } from '../main/mainTools'
import {
  cleanFavourites,
  penFavourites,
  type Favourite,
} from '../main/penFavourites'
import { V8_TOOL_IDS, type V8ToolId } from './registryV8'
import { v8Tool, followMode } from './barState'

/**
 * Favourites of the v8 tool row (TB-50 to TB-58): a saved setup for any of the
 * six tools. They live under their own key, `toolbar.favourites2`; the old
 * pen list (`toolbar.favourites`) keeps its shape and is still written for the
 * pens, so an older build loses nothing. Nothing here goes to the server.
 */

export const MAX_PER_TOOL = 6
export const NAME_MAX = 24

export interface Fav2 {
  id: string
  /** The person's own name; without one the tool or type names it. */
  name?: string
  tool: V8ToolId
  /** Pen only: a highlighter instead of a pen. */
  hl?: boolean
  /** Only what the person ticked is kept; a missing field is left as it is. */
  type?: PenType
  colour?: string
  size?: 0 | 1 | 2
  exact?: number | null
  mode?: EraserMode
  shape?: LassoShape
}

const HEX = /^#[0-9a-fA-F]{3,8}$/
const isSize = (v: unknown): v is 0 | 1 | 2 => v === 0 || v === 1 || v === 2
const SHAPES: readonly LassoShape[] = ['free', 'rect']

/** One saved favourite, or undefined when it cannot be used. */
function cleanOne(v: unknown): Fav2 | undefined {
  if (typeof v !== 'object' || v === null) return undefined
  const f = v as Record<string, unknown>
  if (typeof f.id !== 'string' || f.id === '') return undefined
  if (!(V8_TOOL_IDS as readonly unknown[]).includes(f.tool)) return undefined
  const out: Fav2 = { id: f.id, tool: f.tool as V8ToolId }
  if (typeof f.name === 'string' && f.name.trim())
    out.name = f.name.trim().slice(0, NAME_MAX)
  if (out.tool === 'pen') {
    if (f.hl === true) out.hl = true
    if (!out.hl && (PEN_TYPES as readonly unknown[]).includes(f.type))
      out.type = f.type as PenType
    if (typeof f.colour === 'string' && HEX.test(f.colour))
      out.colour = f.colour
    if (isSize(f.size)) out.size = f.size
    if (typeof f.exact === 'number' && f.exact >= 0.5 && f.exact <= 30)
      out.exact = f.exact
  }
  if (out.tool === 'eraser') {
    if ((ERASER_MODES as readonly unknown[]).includes(f.mode))
      out.mode = f.mode as EraserMode
    if (isSize(f.size)) out.size = f.size
  }
  if (out.tool === 'lasso' && (SHAPES as readonly unknown[]).includes(f.shape))
    out.shape = f.shape as LassoShape
  return out
}

/** A saved list, cleaned: bad entries and repeated ids drop out, six per tool. */
export function cleanFavs2(v: unknown): Fav2[] | undefined {
  if (!Array.isArray(v)) return undefined
  const out: Fav2[] = []
  for (const raw of v) {
    const f = cleanOne(raw)
    if (!f || out.some((o) => o.id === f.id)) continue
    if (out.filter((o) => o.tool === f.tool).length >= MAX_PER_TOOL) continue
    out.push(f)
  }
  return out
}

export const favs2 = cleanStore<Fav2[]>('toolbar.favourites2', cleanFavs2, [])
const migratedFlag = prefStore<boolean>(
  'toolbar.favourites2.from1',
  (v): v is boolean => typeof v === 'boolean',
  false,
)

/** An old pen favourite as a new one. */
export const fromOld = (f: Favourite, n: number): Fav2 => ({
  id: `m${n}`,
  tool: 'pen',
  ...(f.tool === 'highlighter' ? { hl: true } : { type: f.type ?? undefined }),
  colour: f.colour,
  size: f.size,
  ...(f.exact !== null ? { exact: f.exact } : {}),
})

/** What the old list should hold: pens and highlighters kept whole. */
export function toOld(list: readonly Fav2[]): Favourite[] {
  const out: Favourite[] = []
  for (const f of list) {
    if (f.tool !== 'pen' || f.colour === undefined || f.size === undefined)
      continue
    if (f.hl) {
      out.push({
        tool: 'highlighter',
        type: null,
        colour: f.colour,
        size: f.size,
        exact: null,
      })
    } else if (f.type !== undefined) {
      out.push({
        tool: 'pen',
        type: f.type,
        colour: f.colour,
        size: f.size,
        exact: f.exact ?? null,
      })
    }
  }
  return cleanFavourites(out) ?? []
}

/** The first time: today's pen favourites come over (the old key stays). */
export function migrateOnce(): void {
  if (migratedFlag.get()) return
  if (favs2.get().length === 0)
    favs2.set(penFavourites.get().map((f, i) => fromOld(f, i)))
  migratedFlag.set(true)
}

/** Saves the list, and keeps the old pen list in step for older builds. */
export function saveFavs(next: Fav2[]): void {
  favs2.set(next)
  const old = toOld(next)
  if (JSON.stringify(old) !== JSON.stringify(penFavourites.get()))
    penFavourites.set(old)
}

export const rowOf = (list: readonly Fav2[], tool: V8ToolId): Fav2[] =>
  list.filter((f) => f.tool === tool)

/** Puts a reordered row of one tool back; other tools keep their places. */
export function withRow(
  list: readonly Fav2[],
  tool: V8ToolId,
  row: readonly Fav2[],
): Fav2[] {
  const queue = [...row]
  const out: Fav2[] = []
  for (const f of list) {
    if (f.tool !== tool) out.push(f)
    else {
      const next = queue.shift()
      if (next) out.push(next)
    }
  }
  return [...out, ...queue]
}

export function addFav(
  list: readonly Fav2[],
  fav: Fav2,
): { list: Fav2[]; result: 'added' | 'full' } {
  if (rowOf(list, fav.tool).length >= MAX_PER_TOOL)
    return { list: [...list], result: 'full' }
  return { list: [...list, fav], result: 'added' }
}

/** Takes one out; `index` is its place in the whole list (to put it back). */
export function removeFav(
  list: readonly Fav2[],
  id: string,
): { list: Fav2[]; removed?: Fav2; index: number } {
  const index = list.findIndex((f) => f.id === id)
  if (index < 0) return { list: [...list], index: -1 }
  return {
    list: list.filter((f) => f.id !== id),
    removed: list[index],
    index,
  }
}

export function restoreFav(
  list: readonly Fav2[],
  fav: Fav2,
  index: number,
): Fav2[] {
  const out = [...list]
  out.splice(Math.min(Math.max(index, 0), out.length), 0, fav)
  return out
}

/** Clears one tool's row (Reset: the default set is empty). */
export const resetRow = (list: readonly Fav2[], tool: V8ToolId): Fav2[] =>
  list.filter((f) => f.tool !== tool)

export const newFavId = (): string =>
  `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`

// ---- What a setup is made of ----

/** The things a tool's setup can keep, for the ticks of the Add form. */
export type Keep = 'type' | 'colour' | 'size' | 'mode' | 'shape'
export const KEEPS: Record<V8ToolId, readonly Keep[]> = {
  text: [],
  pen: ['type', 'colour', 'size'],
  eraser: ['mode', 'size'],
  shapes: [],
  lasso: ['shape'],
  insert: [],
}

/** The tool's setup as it is now, keeping only what is ticked. */
export function currentSetup(
  tool: V8ToolId,
  keep: readonly Keep[],
  mode: ModeTool = activeTool.get(),
): Omit<Fav2, 'id' | 'name'> {
  const out: Omit<Fav2, 'id' | 'name'> = { tool }
  if (tool === 'pen') {
    const hl = mode === 'highlighter'
    const p = hl ? highlighterSettings.get() : penSettings.get()
    if (hl) out.hl = true
    else if (keep.includes('type')) out.type = penSettings.get().type
    if (keep.includes('colour')) out.colour = p.colour
    if (keep.includes('size')) {
      out.size = p.size
      if (!hl && penSettings.get().exact !== null)
        out.exact = penSettings.get().exact
    }
  } else if (tool === 'eraser') {
    const e = eraserSettings.get()
    if (keep.includes('mode')) out.mode = e.mode
    if (keep.includes('size')) out.size = e.size
  } else if (tool === 'lasso') {
    if (keep.includes('shape')) out.shape = lassoSettings.get().shape
  }
  return out
}

/** Ready-made starts for "Any preset of this tool". */
export function presetsOf(tool: V8ToolId): Omit<Fav2, 'id' | 'name'>[] {
  if (tool === 'pen') {
    const colour = penSettings.get().colour
    return [
      ...PEN_TYPES.map((type) => ({
        tool,
        type,
        colour,
        size: 1 as const,
      })),
      { tool, hl: true, colour: highlighterSettings.get().colour, size: 1 },
    ]
  }
  if (tool === 'eraser')
    return ERASER_MODES.map((mode) => ({ tool, mode, size: 1 as const }))
  if (tool === 'lasso') return SHAPES.map((shape) => ({ tool, shape }))
  return []
}

/** The kind a favourite shows and is named by. */
export const favKind = (f: Fav2): string =>
  f.tool === 'pen'
    ? f.hl
      ? 'highlighter'
      : (f.type ?? 'pen')
    : f.tool === 'eraser'
      ? (f.mode ?? 'eraser')
      : f.tool === 'lasso'
        ? (f.shape ?? 'lasso')
        : f.tool

// ---- Using a favourite ----

interface Before {
  pen: ReturnType<typeof penSettings.get>
  hl: ReturnType<typeof highlighterSettings.get>
  eraser: ReturnType<typeof eraserSettings.get>
  lasso: ReturnType<typeof lassoSettings.get>
  mode: ModeTool
  tool: V8ToolId
}

/** Applies a whole setup in one step; returns what puts the old one back. */
export function applyFav(f: Fav2): () => void {
  const before: Before = {
    pen: penSettings.get(),
    hl: highlighterSettings.get(),
    eraser: eraserSettings.get(),
    lasso: lassoSettings.get(),
    mode: activeTool.get(),
    tool: v8Tool.get(),
  }
  const from = v8Tool.get()
  if (f.tool === 'pen') {
    if (f.hl) {
      highlighterSettings.update({
        ...(f.colour !== undefined ? { colour: f.colour } : {}),
        ...(f.size !== undefined ? { size: f.size } : {}),
      })
      activeTool.set('highlighter')
    } else {
      penSettings.update({
        ...(f.type !== undefined ? { type: f.type } : {}),
        ...(f.colour !== undefined ? { colour: f.colour } : {}),
        ...(f.size !== undefined ? { size: f.size } : {}),
        ...(f.exact !== undefined ? { exact: f.exact } : {}),
      })
      if (activeTool.get() === 'highlighter') activeTool.set('pen')
    }
  }
  if (f.tool === 'eraser')
    eraserSettings.update({
      ...(f.mode !== undefined ? { mode: f.mode } : {}),
      ...(f.size !== undefined ? { size: f.size } : {}),
    })
  if (f.tool === 'lasso' && f.shape !== undefined)
    lassoSettings.update({ shape: f.shape })
  v8Tool.set(f.tool)
  followMode(f.tool, from)
  return () => {
    penSettings.update(before.pen)
    highlighterSettings.update(before.hl)
    eraserSettings.update(before.eraser)
    lassoSettings.update(before.lasso)
    activeTool.set(before.mode)
    v8Tool.set(before.tool)
    followMode(before.tool, f.tool)
  }
}

/** True while the tool is on and every kept field matches what is set now. */
export function favIsOn(f: Fav2): boolean {
  if (v8Tool.get() !== f.tool) return false
  const mode = activeTool.get()
  if (f.tool === 'pen') {
    if ((mode === 'highlighter') !== !!f.hl) return false
    const p = f.hl ? highlighterSettings.get() : penSettings.get()
    if (
      f.colour !== undefined &&
      p.colour.toLowerCase() !== f.colour.toLowerCase()
    )
      return false
    if (f.size !== undefined && p.size !== f.size) return false
    if (!f.hl) {
      const s = penSettings.get()
      if (f.type !== undefined && s.type !== f.type) return false
      if (f.exact !== undefined && s.exact !== f.exact) return false
    }
    return true
  }
  if (f.tool === 'eraser') {
    const e = eraserSettings.get()
    return (
      (f.mode === undefined || e.mode === f.mode) &&
      (f.size === undefined || e.size === f.size)
    )
  }
  if (f.tool === 'lasso')
    return f.shape === undefined || lassoSettings.get().shape === f.shape
  return true
}
