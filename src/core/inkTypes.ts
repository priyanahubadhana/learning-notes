/**
 * Data shapes of ink (redesign step 3). Plain data, no editor or canvas
 * code, so ink can be saved, backed up and later synced like any note.
 *
 * - A page has one or more LAYERS (`InkLayer`); ink sits over the text.
 * - Strokes are saved in CHUNKS (`InkChunk`): one row holds up to
 *   `CHUNK_MAX` strokes of one layer drawn over one block, indexed by
 *   pageId, so a page with thousands of strokes is many small rows and a
 *   save rewrites only the rows that changed.
 * - A stroke keeps its RAW points (so changing the pen later never loses
 *   data). Points are stored relative to the block they were drawn over
 *   (`blockId`), so ink follows the text when it reflows.
 */
import type { BaseRecord, OrderKey } from './types'

/** Strokes in one row. */
export const CHUNK_MAX = 60
/** Numbers per point: x, y, pressure, tiltX, tiltY, t. */
export const STRIDE = 6

export type PenKind = 'fountain' | 'ball' | 'brush' | 'pencil' | 'marker'
/** 'tape' is a filled box that hides what is under it (G1). */
export type StrokeKind = 'ink' | 'highlight' | 'tape'
export type ShapeKind = 'line' | 'rect' | 'ellipse' | 'triangle' | 'arrow'

/** How a stroke looks. Saved with the stroke, so the pen can change later. */
export interface StrokeStyle {
  /** Pen type for ink; highlights use 'marker'. */
  pen: PenKind
  /** Base width in px at the page width the stroke was drawn at (`bw`). */
  width: number
  colour: string
  /** 0.05 to 1. */
  opacity: number
  sharpness: number
  pressure: number
  flatness: number
  stabilisation: number
  tilt: boolean
  speedWidth: boolean
  line: 'solid' | 'dashed' | 'dotted'
  /** Highlights: drawn under the ink (default) or over it. */
  behind: boolean
}

export interface Stroke {
  id: string
  /** When the stroke began (UTC ms). A hook to replay ink with audio later. */
  at: number
  kind: StrokeKind
  style: StrokeStyle
  /**
   * Flat list of `STRIDE` numbers per point: x, y (in page widths from the
   * block's corner), pressure 0..1, tiltX and tiltY (degrees), and t (ms
   * since `at`).
   */
  pts: number[]
  /** Page width in px when drawn: converts `style.width` to page units. */
  bw: number
  /** Set when the stroke was snapped to a perfect shape. */
  shape?: ShapeKind
  /** Closed shapes: fill the inside with the colour. */
  fill?: true
  /**
   * Settings snapshot when drawn ("View as drawn", for the reader in
   * step 5): page width in px and text size per cent.
   */
  drawn?: { w: number; fs: number }
}

/** A layer of ink on one page. */
export interface InkLayer extends BaseRecord {
  pageId: string
  name: string
  order: OrderKey
  hidden?: true
  locked?: true
}

/** Where a chunk's block was (page px from the page's top-left) when last saved. */
export interface InkFallback {
  x: number
  y: number
  w: number
}

/** Up to `CHUNK_MAX` strokes of one layer over one block. */
export interface InkChunk extends BaseRecord {
  pageId: string
  layerId: string
  /** The block the strokes are anchored to; null = the page itself. */
  blockId: string | null
  strokes: Stroke[]
  /** Used when the block is gone (deleted): the strokes stay where they were. */
  fb?: InkFallback
}

/** Ink of a page copied into a history version. */
export interface InkSnapshot {
  layers: InkLayer[]
  chunks: InkChunk[]
}
