import { prefStore } from '../../app/tools/store'
import {
  PAD_FONTS,
  PAD_SIZES,
  PAD_WEIGHTS,
  type PadFont,
  type PadWeight,
} from './handStyle'

/** What the Write pad remembers on this device (not saved with the notes). */
export interface PadPrefs {
  font: PadFont
  weight: PadWeight
  size: number
  /** BlockNote colour names ("default" = none). */
  color: string
  highlight: string
  /** Height of the pad in px and its writing zoom. */
  height: number
  zoom: number
  /** How handwriting is read: Scribble (the textarea) or the user's AI. */
  engine?: 'scribble' | 'ai'
  /** Show the writing on the page as a dashed draft while writing (on). */
  liveCopy?: boolean
  /** The Scribble to AI explainer was dismissed with "Don't show again". */
  explainerOff?: boolean
  /** The pad Eraser set the shared Eraser to small and precise once. */
  eraserSeeded?: boolean
}

export const PAD_ZOOMS = [1, 1.5, 2, 3] as const
export const MIN_HEIGHT = 160
export const DEFAULT_PREFS: PadPrefs = {
  font: 'caveat',
  weight: 'normal',
  size: 125,
  color: 'default',
  highlight: 'default',
  height: 340,
  zoom: 1.5,
}

const isPrefs = (v: unknown): v is PadPrefs => {
  const p = v as Partial<PadPrefs> | null
  return (
    !!p &&
    typeof p === 'object' &&
    (PAD_FONTS as readonly unknown[]).includes(p.font) &&
    (PAD_WEIGHTS as readonly unknown[]).includes(p.weight) &&
    (PAD_SIZES as readonly unknown[]).includes(p.size) &&
    typeof p.color === 'string' &&
    typeof p.highlight === 'string' &&
    typeof p.height === 'number' &&
    p.height >= MIN_HEIGHT &&
    p.height <= 4000 &&
    (PAD_ZOOMS as readonly unknown[]).includes(p.zoom) &&
    (p.engine === undefined || p.engine === 'scribble' || p.engine === 'ai') &&
    (p.liveCopy === undefined || typeof p.liveCopy === 'boolean') &&
    (p.explainerOff === undefined || typeof p.explainerOff === 'boolean') &&
    (p.eraserSeeded === undefined || typeof p.eraserSeeded === 'boolean')
  )
}

export const padPrefs = prefStore('writePad.prefs', isPrefs, DEFAULT_PREFS)
