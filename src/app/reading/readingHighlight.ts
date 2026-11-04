import { TextSelection } from 'prosemirror-state'
import { currentRunner } from '../tools/toolRuntime'

/** Wiktionary page of a word (only that word leaves the device, on a tap). */
export const lookUpUrl = (word: string, lang: string): string =>
  `https://${/^[a-z]{2,3}$/.test(lang) ? lang : 'en'}.wiktionary.org/wiki/${encodeURIComponent(
    word,
  )}`

/** The first word of a selection (letters and digits of any script). */
export const firstWord = (text: string): string =>
  text.match(/[\p{L}\p{N}\p{M}'’-]+/u)?.[0] ?? ''

/** Puts the yellow highlight on the selected words, through the editor. */
export function highlightDomSelection(): boolean {
  const editor = currentRunner().editor as {
    prosemirrorView?: {
      posAtDOM: (node: Node, offset: number) => number
    }
    transact: <T>(fn: (tr: never) => T) => T
    addStyles: (styles: object) => void
  } | null
  const view = editor?.prosemirrorView
  const sel = window.getSelection()
  if (!editor || !view || !sel || sel.rangeCount === 0 || sel.isCollapsed) {
    return false
  }
  const range = sel.getRangeAt(0)
  const from = view.posAtDOM(range.startContainer, range.startOffset)
  const to = view.posAtDOM(range.endContainer, range.endOffset)
  if (from === to) return false
  editor.transact((tr: never) => {
    const t2 = tr as unknown as {
      doc: never
      setSelection: (s: unknown) => void
    }
    t2.setSelection(TextSelection.create(t2.doc, from, to))
  })
  editor.addStyles({ backgroundColor: 'yellow' })
  return true
}
