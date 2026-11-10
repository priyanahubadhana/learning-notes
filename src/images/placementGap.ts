import { Plugin, PluginKey, Selection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'
import type { Node } from 'prosemirror-model'
import type { Editor } from '../editor/barActions'

/**
 * Picture placement (item 22g, 10 Nov): while the preview is dragged, a real
 * gap opens in the text flow at the drop point, exactly as tall as the
 * picture, so the text below slides down (a widget decoration, never a
 * document change: no Undo step, nothing saved). A gap in the middle of a
 * line splits it visually like a caret (22i): the block-level widget breaks
 * the line, words before stay above, words after continue below.
 */
export interface PlacementGap {
  pos: number
  px: number
}

const key = new PluginKey<PlacementGap | null>('pictureGap')

const plugin = new Plugin<PlacementGap | null>({
  key,
  state: {
    init: () => null,
    apply(tr, old) {
      const meta = tr.getMeta(key) as { gap: PlacementGap | null } | undefined
      if (meta) return meta.gap
      return old && tr.docChanged
        ? { ...old, pos: tr.mapping.map(old.pos) }
        : old
    },
  },
  props: {
    decorations(state) {
      const g = key.getState(state)
      if (!g) return null
      const at = textPos(state.doc, g.pos)
      return DecorationSet.create(state.doc, [
        Decoration.widget(
          at,
          () => {
            const el = document.createElement('span')
            el.setAttribute('data-place-gap', '')
            el.setAttribute('aria-hidden', 'true')
            el.contentEditable = 'false'
            el.style.cssText = `display:block;height:${g.px}px;pointer-events:none;transition:height 150ms ease-out`
            return el
          },
          { side: -1, key: 'gap-' + at + '-' + g.px },
        ),
      ])
    },
  },
})

/** A position inside a text line: the nearest one when `pos` is between blocks. */
function textPos(doc: Node, pos: number): number {
  const at = Math.max(0, Math.min(doc.content.size, pos))
  const $at = doc.resolve(at)
  return $at.parent.inlineContent ? at : Selection.near($at, 1).from
}

/** Opens (or, with null, closes) the gap. Changes no document content. */
export function setPlacementGap(
  editor: Editor,
  gap: PlacementGap | null,
): void {
  const view = editor.prosemirrorView
  if (!view) return
  if (!view.state.plugins.includes(plugin)) {
    if (!gap) return
    try {
      editor.registerExtension({
        key: 'pictureGap',
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
  const old = key.getState(view.state)
  if (old === gap || (old && gap && old.pos === gap.pos && old.px === gap.px))
    return
  view.dispatch(
    view.state.tr.setMeta(key, { gap }).setMeta('addToHistory', false),
  )
}

/** The gap's element in the page (null when none is open). */
export function gapElement(editor: Editor): HTMLElement | null {
  return (
    editor.prosemirrorView?.dom.querySelector<HTMLElement>(
      '[data-place-gap]',
    ) ?? null
  )
}

export type DropSpot =
  | { kind: 'split'; blockId: string; pos: number }
  | { kind: 'after'; blockId: string }
  | { kind: 'before'; blockId: string }

/**
 * Where a drop at document position `pos` puts the picture: inside a line it
 * splits the line (words before stay above), at the start of a block it goes
 * before it, at the end after it. Null if `pos` is not in a block. Pure.
 */
export function dropSpot(doc: Node, pos: number): DropSpot | null {
  const at = textPos(doc, pos)
  const $p = doc.resolve(at)
  if (!$p.parent.inlineContent) return null
  // The block container that holds this text line.
  let depth = $p.depth
  while (depth > 0 && $p.node(depth).type.name !== 'blockContainer') depth--
  if (depth === 0) return null
  const id = $p.node(depth).attrs.id as string | undefined
  if (!id) return null
  if ($p.parentOffset === 0 && $p.parent.content.size > 0)
    return { kind: 'before', blockId: id }
  if ($p.parentOffset === $p.parent.content.size)
    return { kind: 'after', blockId: id }
  return { kind: 'split', blockId: id, pos: at }
}
