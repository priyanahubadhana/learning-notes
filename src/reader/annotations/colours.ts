import type { HighlightColour } from '../../core/types'

/** Colour of each highlight (a soft fill that keeps the text readable). */
export const COLOUR_FILL: Record<HighlightColour, string> = {
  yellow: 'rgba(250, 204, 21, 0.4)',
  green: 'rgba(74, 222, 128, 0.4)',
  blue: 'rgba(96, 165, 250, 0.4)',
  pink: 'rgba(244, 114, 182, 0.4)',
  purple: 'rgba(192, 132, 252, 0.4)',
}

/** Where the selection pop-up sits (viewport pixels). */
export interface PopupRect {
  x: number
  y: number
  w: number
  h: number
}

/** A web address that looks up the selected word or phrase (opened in a new tab). */
export function lookupUrl(
  kind: 'dictionary' | 'wikipedia' | 'translate',
  selected: string,
): string {
  const q = selected.replace(/\s+/g, ' ').trim().slice(0, 60)
  const e = encodeURIComponent(q)
  if (kind === 'dictionary') {
    return `https://en.wiktionary.org/wiki/${encodeURIComponent(q.split(' ')[0] ?? q)}`
  }
  if (kind === 'wikipedia') {
    return `https://en.wikipedia.org/wiki/Special:Search?search=${e}`
  }
  return `https://translate.google.com/?sl=auto&op=translate&text=${e}`
}
