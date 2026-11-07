import type { Node } from 'prosemirror-model'
import { Plugin, PluginKey, Selection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { Editor } from '../barActions'
import { BACKGROUND_HEX, TEXT_HEX } from '../colorData'
import { handCss, type PadWeight } from './handStyle'
import type { PadLook } from './apply'

/**
 * Live writing (R6-16): the pad's text drawn at the page cursor as a ghost,
 * so it is seen in context. It is a ProseMirror widget decoration driven by
 * transaction meta, never a document change: no Undo step, nothing to save
 * or sync. Insert / Replace still commits the text as one step (apply.ts).
 */
export interface Ghost {
  pos: number
  pieces: readonly { text: string; weight: PadWeight }[]
  look: PadLook
}

const key = new PluginKey<Ghost | null>('writePadGhost')

const plugin = new Plugin<Ghost | null>({
  key,
  state: {
    init: () => null,
    apply(tr, old) {
      const meta = tr.getMeta(key) as { ghost: Ghost | null } | undefined
      if (meta) return meta.ghost
      return old && tr.docChanged
        ? { ...old, pos: tr.mapping.map(old.pos) }
        : old
    },
  },
  props: {
    decorations(state) {
      const g = key.getState(state)
      if (!g) return null
      const at = inlinePos(state.doc, g.pos)
      return DecorationSet.create(state.doc, [
        Decoration.widget(at, () => draw(g), { side: 1 }),
      ])
    },
  },
})

/** A position inside a text line: the nearest one when pos is between blocks. */
export function inlinePos(doc: Node, pos: number): number {
  const at = Math.max(0, Math.min(doc.content.size, pos))
  const $at = doc.resolve(at)
  return $at.parent.inlineContent ? at : Selection.near($at, 1).from
}

function draw(g: Ghost): HTMLElement {
  const root = document.createElement('span')
  root.setAttribute('data-write-pad-ghost', '')
  root.setAttribute('aria-hidden', 'true')
  root.contentEditable = 'false'
  root.style.whiteSpace = 'pre-wrap'
  root.style.textDecoration = 'underline dashed'
  root.style.textUnderlineOffset = '3px'
  root.style.opacity = '0.85'
  for (const piece of g.pieces) {
    const span = document.createElement('span')
    span.textContent = piece.text
    Object.assign(span.style, handCss({ ...g.look, weight: piece.weight }))
    if (g.look.color !== 'default')
      span.style.color = TEXT_HEX[g.look.color] ?? ''
    if (g.look.highlight !== 'default')
      span.style.background = BACKGROUND_HEX[g.look.highlight] ?? ''
    root.append(span)
  }
  return root
}

/**
 * Keeps the ghost visible: the pad covers the lower page, so when the ghost
 * is under it (or above the top) the page scrolls it into the free part.
 */
function keepVisible(editor: Editor): void {
  const el = editor.prosemirrorView?.dom.querySelector(
    '[data-write-pad-ghost]',
  ) as HTMLElement | null
  const padEl = document.querySelector('[data-write-pad]')
  if (!el || !padEl) return
  const r = el.getBoundingClientRect()
  const limit = padEl.getBoundingClientRect().top - 24
  if (r.bottom <= limit && r.top >= 0) return
  let sp: HTMLElement | null = el.parentElement
  while (
    sp &&
    !(
      sp.scrollHeight > sp.clientHeight + 1 &&
      /(auto|scroll)/.test(getComputedStyle(sp).overflowY)
    )
  )
    sp = sp.parentElement
  const delta = r.bottom > limit ? r.bottom - limit : r.top
  if (sp) sp.scrollTop += delta
  else window.scrollBy(0, delta)
}

/** Shows (or, with null, hides) the ghost. Changes no document content. */
export function setGhost(editor: Editor, ghost: Ghost | null): void {
  const view = editor.prosemirrorView
  if (!view) return
  if (!view.state.plugins.includes(plugin)) {
    if (!ghost) return
    // Registered with the editor, so a later plugin change cannot drop it.
    try {
      editor.registerExtension({
        key: 'writePadGhost',
        prosemirrorPlugins: [plugin],
      })
    } catch {
      // Already registered, or not supported: fall back below.
    }
    if (!view.state.plugins.includes(plugin))
      view.updateState(
        view.state.reconfigure({ plugins: [...view.state.plugins, plugin] }),
      )
  }
  view.dispatch(
    view.state.tr.setMeta(key, { ghost }).setMeta('addToHistory', false),
  )
  if (ghost) requestAnimationFrame(() => keepVisible(editor))
}
