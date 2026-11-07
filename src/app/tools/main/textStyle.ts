import { isOneOf } from '../../../settings/registry'
import { ensureFont } from '../../reading/fonts'
import {
  fontStack,
  isReadingFont,
  type ReadingFont,
} from '../../reading/readingPrefs'
import { prefStore } from '../store'
/** "default", a built-in font, or an imported one (`custom:<id>`). */
export type NoteFont = Exclude<ReadingFont, 'app'> | 'default'
const isNoteFont = (v: unknown): v is NoteFont =>
  v === 'default' || (v !== 'app' && isReadingFont(v))
export const NOTE_SIZES = [90, 100, 115, 130, 150] as const
export const NOTE_LINES = ['default', 'tight', 'loose'] as const
export type NoteLine = (typeof NOTE_LINES)[number]
const LINE_VALUE: Record<Exclude<NoteLine, 'default'>, string> = {
  tight: '1.35',
  loose: '1.95',
}

export const noteFont = prefStore<NoteFont>('text.font', isNoteFont, 'default')
/** Percent of the normal size; 100 = unchanged. */
export const noteSize = prefStore<number>(
  'text.size',
  (v): v is number => (NOTE_SIZES as readonly unknown[]).includes(v),
  100,
)
export const noteLine = prefStore<NoteLine>(
  'text.line',
  isOneOf(NOTE_LINES),
  'default',
)

/** Writes the three values onto the page (nothing when all are default). */
export function applyNoteStyle(
  root: HTMLElement | undefined = typeof document === 'undefined'
    ? undefined
    : document.documentElement,
): void {
  if (!root) return
  const font = noteFont.get()
  const size = noteSize.get()
  const line = noteLine.get()
  void ensureFont(font)
  const set = (name: string, flag: string, value: string | null) => {
    if (value === null) {
      root.style.removeProperty(name)
      root.removeAttribute(flag)
    } else {
      root.style.setProperty(name, value)
      root.setAttribute(flag, '')
    }
  }
  set(
    '--note-font',
    'data-note-font',
    font === 'default' ? null : fontStack(font),
  )
  set('--note-size', 'data-note-size', size === 100 ? null : `${size / 100}em`)
  set(
    '--note-line',
    'data-note-line',
    line === 'default' ? null : LINE_VALUE[line],
  )
}

export function resetNoteStyle(): void {
  noteFont.set('default')
  noteSize.set(100)
  noteLine.set('default')
  applyNoteStyle()
}
