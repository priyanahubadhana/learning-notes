import type { Stroke, StrokeKind, StrokeStyle } from '../core/inkTypes'
import {
  highlighterSettings,
  HIGHLIGHT_WIDTHS,
  penSettings,
  penWidth,
  type HighlighterSettings,
  type PenSettings,
} from '../app/tools/main/inkSettings'
import { createId } from '../core/ids'
import { packPoints } from './geometry'

/** How opaque each pen type is (pencil and marker are a little see-through). */
const PEN_OPACITY = { pencil: 0.85, marker: 0.75 } as const

export function inkStyle(p: PenSettings = penSettings.get()): StrokeStyle {
  return {
    pen: p.type,
    width: penWidth(p),
    colour: p.colour,
    opacity: (PEN_OPACITY as Record<string, number>)[p.type] ?? 1,
    sharpness: p.sharpness,
    pressure: p.pressure,
    flatness: p.flatness,
    stabilisation: p.stabilisation,
    tilt: p.tilt,
    speedWidth: p.speedWidth,
    line: p.line,
    behind: false,
  }
}

export function highlightStyle(
  h: HighlighterSettings = highlighterSettings.get(),
): StrokeStyle {
  return {
    pen: 'marker',
    width: HIGHLIGHT_WIDTHS[h.size],
    colour: h.colour,
    opacity: h.opacity / 100,
    sharpness: 0,
    pressure: 0,
    flatness: 0,
    stabilisation: 40,
    tilt: false,
    speedWidth: false,
    line: 'solid',
    behind: h.behindInk,
  }
}

export interface RawPoint {
  x: number
  y: number
  p?: number
  tx?: number
  ty?: number
  t?: number
}

/** Makes a stroke from points that are already in saved units. */
export function makeStroke(
  kind: StrokeKind,
  style: StrokeStyle,
  points: readonly RawPoint[],
  bw: number,
  at = Date.now(),
  drawn?: Stroke['drawn'],
): Stroke {
  return {
    id: createId(),
    at,
    kind,
    style,
    pts: packPoints(points),
    bw,
    ...(drawn ? { drawn } : {}),
  }
}
