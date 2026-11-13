import { useEffect, useMemo, useState } from 'react'
import { AllSelection, TextSelection } from 'prosemirror-state'
import type { Rect } from '../../app/overlay'
import { ContextStrip } from '../../design/parts/ContextStrip'
import { readAiConfig } from '../../ai/route'
import { t } from '../../i18n/t'
import { useUnlocked } from '../../settings/level'
import { duplicateBlock } from '../blockActions'
import { runHistory } from '../historyActions'
import { copyAs } from '../clipboard'
import type { HoldPoint } from '../holdMenuWatch'
import { addExtraLine } from '../lineActions'
import type { EditorBlock } from '../mapping'
import { boxHost } from '../pasteBox'
import type { AppSchema } from '../schema'
import { posNear, rangeForTaps } from '../tapSelect'
import { pasteIn, peekPasteForms } from './pasteMenu'
import { moreCommands, pasteMenu, stripItems } from './stripModel'

type Editor = AppSchema['BlockNoteEditor']
type Toast = (
  message: string,
  action?: { label: string; onSelect: () => void },
) => void

const TURN: Record<string, { type: string; props?: Record<string, unknown> }> =
  {
    paragraph: { type: 'paragraph' },
    heading1: { type: 'heading', props: { level: 1 } },
    heading2: { type: 'heading', props: { level: 2 } },
    heading3: { type: 'heading', props: { level: 3 } },
    bullet: { type: 'bulletListItem' },
    numbered: { type: 'numberedListItem' },
    check: { type: 'checkListItem' },
    quote: { type: 'quote' },
  }

/** The rectangle to keep clear: the selected words, else the pressed spot. */
function targetRect(at: HoldPoint): Rect {
  const sel = window.getSelection()
  if (sel && sel.rangeCount > 0 && !sel.isCollapsed) {
    const r = sel.getRangeAt(0).getBoundingClientRect()
    if (r.width > 0 || r.height > 0) {
      return { left: r.left, top: r.top, width: r.width, height: r.height }
    }
  }
  return { left: at.x - 1, top: at.y - 10, width: 2, height: 20 }
}

/**
 * The press-and-hold / right-click strip on the shared Context strip (flag
 * page.menus, PM-20..PM-26): Paste ▾, Copy, Cut, Duplicate, Turn into ▾,
 * Colour ▾, Delete, ⋯. Beginner shows Cut, Copy, Paste ▾, Delete, ⋯ (the
 * part decides); the rest stays in ⋯.
 */
export default function PageStrip({
  editor,
  at,
  onClose,
  toast,
  onSelected,
  choosePicture,
}: {
  editor: Editor
  at: HoldPoint
  onClose: () => void
  toast: Toast
  onSelected: () => void
  choosePicture: () => void
}) {
  const view = editor.prosemirrorView
  const pro = useUnlocked('page.contextMore')
  const [target] = useState(() => targetRect(at))
  // A press on empty text puts the cursor there, so Delete / Duplicate act on that line.
  useEffect(() => {
    if (!view || !view.state.selection.empty) return
    const pos = posNear(view, at.x, at.y)
    if (pos !== null) {
      view.dispatch(
        view.state.tr.setSelection(
          TextSelection.near(view.state.doc.resolve(pos)),
        ),
      )
    }
  }, [view, at.x, at.y])

  // What the clipboard allows (null until known: every row stays).
  const [forms, setForms] = useState<string[] | null>(null)
  useEffect(() => {
    let live = true
    void peekPasteForms(editor).then((f) => live && setForms(f))
    return () => {
      live = false
    }
  }, [editor])

  const items = useMemo(() => {
    const ai = readAiConfig()
    const menu = pasteMenu({
      box: !!boxHost(editor),
      ai: ai.enabled && ai.candidates.length > 0,
      forms,
    })
    return stripItems().map((i) => (i.id === 'paste' ? { ...i, menu } : i))
  }, [editor, forms])
  const commands = useMemo(() => moreCommands({ pro }), [pro])

  const block = (): EditorBlock => editor.getTextCursorPosition().block
  const select = (from: number, to: number) => {
    if (!view) return
    view.dispatch(
      view.state.tr.setSelection(
        TextSelection.create(view.state.doc, from, to),
      ),
    )
    view.focus()
    onSelected()
  }

  const act = (id: string, sub?: string) => {
    if (!view) return
    const hasSelection = !view.state.selection.empty
    const done = () => {
      editor.focus()
      onClose()
    }
    switch (id) {
      case 'paste':
        // A pick from the ▾ list; the button itself only opens the list.
        void pasteIn(editor, sub ?? 'keep', toast)
        return onClose()
      case 'copy':
      case 'cut':
        view.focus()
        document.execCommand(id)
        return onClose()
      case 'duplicate':
        duplicateBlock(editor, block())
        return onClose()
      case 'turn': {
        const to = sub ? TURN[sub] : undefined
        if (to) editor.updateBlock(block(), to as never)
        return done()
      }
      case 'colour': {
        const colour = sub ?? 'default'
        if (hasSelection) editor.addStyles({ textColor: colour } as never)
        else
          editor.updateBlock(block(), { props: { textColor: colour } } as never)
        return done()
      }
      case 'delete': {
        if (hasSelection) {
          view.dispatch(view.state.tr.deleteSelection())
        } else {
          editor.removeBlocks([block()])
        }
        toast(t('pageMenus.deleted'), {
          label: t('reading.undo'),
          onSelect: () => runHistory(editor, 'undo'),
        })
        return done()
      }
      case 'select': {
        const pos = posNear(view, at.x, at.y)
        const range = pos === null ? null : rangeForTaps(view, pos, 2, at.y)
        if (range) select(range[0], range[1])
        return onClose()
      }
      case 'selectAll':
        view.dispatch(
          view.state.tr.setSelection(new AllSelection(view.state.doc)),
        )
        view.focus()
        onSelected()
        return onClose()
      case 'picture':
        choosePicture()
        return onClose()
      case 'line':
        view.focus()
        addExtraLine(editor, 'divider')
        return onClose()
      case 'copyMarkdown':
      case 'copyRich':
      case 'copyPlain': {
        const kind =
          id === 'copyMarkdown'
            ? 'markdown'
            : id === 'copyRich'
              ? 'all'
              : 'plain'
        void copyAs(editor, kind, (m) => toast(m))
        return onClose()
      }
    }
  }

  return (
    <ContextStrip
      items={items}
      commands={commands}
      target={target}
      onAction={act}
      onClose={onClose}
      testId="page-strip"
      phoneLabels
    />
  )
}
