import { isReadingFont } from '../../app/reading/readingPrefs'
import { ensureFont } from '../../app/reading/fonts'
import type { Editor } from '../../editor/barActions'
import { FONT_FACE_STYLE, FONT_SIZE_STYLE } from '../../editor/lookStyle'
import { pasteAs, pasteWith } from '../../editor/pasteFlow'
import { boxEditors } from '../activeBox'
import { SIZE_NORMAL, clampSize, type OneBarList } from './oneBarModel'

/**
 * What the one bar's buttons do to the words of a box (box bar part A). Three
 * scopes: the whole box (it is selected, no caret in it), the selected words,
 * or the caret (what is typed next). The bar never moves the caret or the
 * selection itself, so a tap on it types, selects and draws nothing.
 */

type View = NonNullable<Editor['prosemirrorView']>
export type Scope = 'box' | 'words' | 'caret'

export const editorOf = (pageId: string, boxId: string): Editor | undefined =>
  boxEditors.get(pageId, boxId)

/** Is the caret in the editor, and are words selected? */
export function scopeOf(editor: Editor): Scope {
  const view = editor.prosemirrorView
  if (!view || !view.hasFocus()) return 'box'
  return view.state.selection.empty ? 'caret' : 'words'
}

type Mark = { isInSet: (m: readonly unknown[]) => unknown }

/** Does every word of the range carry this mark (any word at all)? */
function rangeHas(view: View, name: string): boolean {
  const type = view.state.schema.marks[name] as Mark | undefined
  if (!type) return false
  let any = false
  let all = true
  view.state.doc.nodesBetween(0, view.state.doc.content.size, (n) => {
    if (!n.isText) return
    any = true
    if (!type.isInSet(n.marks)) all = false
  })
  return any && all
}

/** Puts a mark on (or takes it off) every word of the box in one step. */
function markWholeBox(
  view: View,
  name: string,
  value: string | true | null,
): void {
  const { schema, doc, tr } = view.state
  const type = schema.marks[name]
  if (!type) return
  const end = doc.content.size
  if (value === null) tr.removeMark(0, end, type)
  else
    tr.addMark(
      0,
      end,
      type.create(value === true ? undefined : { stringValue: value }),
    )
  view.dispatch(tr)
}

/** Bold, Italic, Underline, Strike: on if some are off, else off. */
export function toggleStyle(
  editor: Editor,
  name: 'bold' | 'italic' | 'underline' | 'strike',
): void {
  const view = editor.prosemirrorView
  if (scopeOf(editor) !== 'box' || !view) {
    editor.toggleStyles({ [name]: true } as never)
    return
  }
  markWholeBox(view, name, rangeHas(view, name) ? null : true)
}

/** The text colour, or the highlight (`backgroundColor`); "default" clears it. */
export function setColour(
  editor: Editor,
  kind: 'textColor' | 'backgroundColor',
  name: string,
): void {
  const view = editor.prosemirrorView
  if (scopeOf(editor) !== 'box' || !view) {
    if (name === 'default') editor.removeStyles({ [kind]: name } as never)
    else editor.addStyles({ [kind]: name } as never)
    return
  }
  markWholeBox(view, kind, name === 'default' ? null : name)
}

/** Highlight on/off with the standard yellow. */
export function toggleHighlight(editor: Editor): void {
  const on = currentStyles(editor).backgroundColor !== undefined
  setColour(editor, 'backgroundColor', on ? 'default' : 'yellow')
}

/** Size in px for the box, the words or what is typed next. */
export function setSize(editor: Editor, px: number): void {
  const n = clampSize(px)
  const view = editor.prosemirrorView
  if (scopeOf(editor) !== 'box' || !view) {
    editor.addStyles({ [FONT_SIZE_STYLE]: String(n) } as never)
    return
  }
  markWholeBox(view, FONT_SIZE_STYLE, String(n))
}

/** A font (an id of the app's list) for the box, the words or what is typed next. */
export function setFont(editor: Editor, font: string): void {
  if (!isReadingFont(font)) return
  void ensureFont(font)
  const view = editor.prosemirrorView
  if (scopeOf(editor) !== 'box' || !view) {
    editor.addStyles({ [FONT_FACE_STYLE]: font } as never)
    return
  }
  markWholeBox(view, FONT_FACE_STYLE, font)
}

/** The styles the strips show as on: of the words, or of the first words of the box. */
export function currentStyles(editor: Editor): Record<string, unknown> {
  const view = editor.prosemirrorView
  if (scopeOf(editor) !== 'box' || !view) {
    return editor.getActiveStyles() as Record<string, unknown>
  }
  const out: Record<string, unknown> = {}
  let done = false
  view.state.doc.descendants((n) => {
    if (done) return false
    if (!n.isText) return true
    for (const m of n.marks) {
      const v = (m.attrs as { stringValue?: string }).stringValue
      out[m.type.name] = v === undefined ? true : v
    }
    done = true
    return false
  })
  return out
}

/** The size the strip shows: the words' own, else what the page draws now. */
export function currentSize(editor: Editor, boxEl: Element | null): number {
  const own = Number(currentStyles(editor)[FONT_SIZE_STYLE])
  if (Number.isFinite(own) && own > 0) return Math.round(own)
  const text = boxEl?.querySelector('.bn-inline-content')
  const px = text ? parseFloat(getComputedStyle(text).fontSize) : NaN
  return Number.isFinite(px) ? Math.round(px) : SIZE_NORMAL
}

// ---- Paragraph: align and lists work on whole blocks ----

type Block = ReturnType<Editor['getTextCursorPosition']>['block']

/** The lines a change applies to: the box's own, the selected, or the caret's. */
function linesOf(editor: Editor): Block[] {
  if (scopeOf(editor) === 'box') return editor.document as Block[]
  return editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]
}

export function setAlign(
  editor: Editor,
  align: 'left' | 'center' | 'right',
): void {
  for (const block of linesOf(editor)) {
    if ('textAlignment' in (block.props as object))
      editor.updateBlock(block, { props: { textAlignment: align } } as never)
  }
}

export function alignNow(editor: Editor): string {
  const first = linesOf(editor)[0]
  const a = (first?.props as { textAlignment?: string } | undefined)
    ?.textAlignment
  return a ?? 'left'
}

const LIST_TYPE: Record<OneBarList, string> = {
  bullets: 'bulletListItem',
  numbers: 'numberedListItem',
  checklist: 'checkListItem',
  star: 'bulletListItem',
  toggle: 'toggleListItem',
}

/** Which list the lines are (all the same kind), if any. */
export function listNow(editor: Editor): OneBarList | null {
  const lines = linesOf(editor)
  if (!lines.length) return null
  for (const kind of Object.keys(LIST_TYPE) as OneBarList[]) {
    if (lines.every((b) => isKind(b, kind))) return kind
  }
  return null
}
const isKind = (b: Block, kind: OneBarList): boolean => {
  if (b.type !== LIST_TYPE[kind]) return false
  const star = (b.props as { marker?: string }).marker === 'star'
  return kind === 'star' ? star : kind === 'bullets' ? !star : true
}

/** Makes the lines this list; the same list again turns it off. */
export function setList(editor: Editor, kind: OneBarList): void {
  const lines = linesOf(editor)
  const same = lines.every((b) => isKind(b, kind))
  for (const block of lines) {
    editor.updateBlock(
      block,
      (same
        ? { type: 'paragraph', props: {} }
        : kind === 'star'
          ? { type: 'bulletListItem', props: { marker: 'star' } }
          : kind === 'bullets'
            ? { type: 'bulletListItem', props: { marker: '' } }
            : { type: LIST_TYPE[kind] }) as never,
    )
  }
}

// ---- Cut, copy, paste ----

/** All the text of a box as plain lines (no focus change, so the bar stays). */
export function boxText(pageId: string, boxId: string): string {
  const view = editorOf(pageId, boxId)?.prosemirrorView
  if (!view) return ''
  const doc = view.state.doc
  return doc.textBetween(0, doc.content.size, '\n', ' ')
}

/** The selected words, or empty. */
export function pickedText(editor: Editor): string {
  const view = editor.prosemirrorView
  if (!view || view.state.selection.empty) return ''
  const { from, to } = view.state.selection
  return view.state.doc.textBetween(from, to, '\n', ' ')
}

/** Copies the selected words, else the box's text; false when the clipboard refuses. */
export async function copyBox(pageId: string, boxId: string): Promise<boolean> {
  try {
    if (!navigator.clipboard) throw new Error('no clipboard')
    const ed = editorOf(pageId, boxId)
    const text =
      ed && scopeOf(ed) === 'words' ? pickedText(ed) : boxText(pageId, boxId)
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}

/**
 * Cut: copy first, then take the selected words (or, with none, the box) away.
 * A clipboard that refuses keeps everything and returns false: Cut is never a
 * plain delete of the owner's text.
 */
export async function cutBox(
  pageId: string,
  boxId: string,
  onDelete: () => void,
): Promise<boolean> {
  const ed = editorOf(pageId, boxId)
  const words = !!ed && scopeOf(ed) === 'words' && pickedText(ed) !== ''
  if (!(await copyBox(pageId, boxId))) return false
  if (ed && words) deleteWords(ed)
  else onDelete()
  return true
}

/** Takes the selected words out (after they were copied). */
export function deleteWords(editor: Editor): void {
  const view = editor.prosemirrorView
  if (view && !view.state.selection.empty)
    view.dispatch(view.state.tr.deleteSelection())
}

export type PasteHow = 'settings' | 'keep' | 'match' | 'plain'

/** Reads the clipboard (text and, when there, the formatted copy). */
async function readClipboard(): Promise<{ html: string; text: string } | null> {
  try {
    if (navigator.clipboard.read) {
      const items = await navigator.clipboard.read()
      let html = ''
      let text = ''
      for (const item of items) {
        if (item.types.includes('text/html'))
          html = await (await item.getType('text/html')).text()
        if (item.types.includes('text/plain'))
          text = await (await item.getType('text/plain')).text()
      }
      if (html || text) return { html, text }
    }
    return { html: '', text: await navigator.clipboard.readText() }
  } catch {
    return null
  }
}

/** Pastes into the box at its end (or at the caret): false when nothing could be read. */
export async function pasteInto(
  editor: Editor,
  how: PasteHow,
): Promise<boolean> {
  const data = await readClipboard()
  if (!data || (!data.html && !data.text)) return false
  if (scopeOf(editor) === 'box') {
    const last = editor.document[editor.document.length - 1]
    editor.setTextCursorPosition(last, 'end')
  }
  editor.focus()
  const paste = { html: data.html, text: data.text, own: false }
  // Match style is the plain words, which take the look where they land.
  const done =
    how === 'plain' || how === 'match'
      ? pasteWith(editor, paste, true)
      : how === 'keep'
        ? pasteAs(editor, paste)
        : pasteWith(editor, paste, false)
  // One plain line is left to the browser's own paste: no paste event here, so
  // the words go in directly.
  if (!done) editor.insertInlineContent([data.text])
  return true
}
