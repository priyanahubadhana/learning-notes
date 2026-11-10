import { AllSelection, TextSelection } from 'prosemirror-state'
import { MenuPopover, type MenuItem } from '../app/ui'
import { t } from '../i18n/t'
import { addExtraLine } from './lineActions'
import { pastePlainFromClipboard } from './clipboard'
import type { HoldPoint } from './holdMenuWatch'
import { posNear, rangeForTaps } from './tapSelect'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/** Our press-and-hold menu (item 19): Paste, Select, Select all, Cut/Copy, Insert. */
export default function HoldMenu({
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
  toast: (message: string) => void
  /** Opens the mini toolbar after a selection. */
  onSelected: () => void
  choosePicture: () => void
}) {
  const view = editor.prosemirrorView
  const selected = !!view && !view.state.selection.empty
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
  const items: MenuItem[] = [
    {
      label: t('hold.paste'),
      icon: '📋',
      onSelect: () => {
        if (view && view.state.selection.empty) {
          const pos = posNear(view, at.x, at.y)
          if (pos !== null)
            view.dispatch(
              view.state.tr.setSelection(
                TextSelection.near(view.state.doc.resolve(pos)),
              ),
            )
        }
        void pastePlainFromClipboard(editor, toast)
      },
    },
    {
      label: t('hold.select'),
      icon: '▭',
      onSelect: () => {
        if (!view) return
        const pos = posNear(view, at.x, at.y)
        const range = pos === null ? null : rangeForTaps(view, pos, 2, at.y)
        if (range) select(range[0], range[1])
      },
    },
    {
      label: t('hold.selectAll'),
      icon: '▦',
      onSelect: () => {
        if (!view) return
        view.dispatch(
          view.state.tr.setSelection(new AllSelection(view.state.doc)),
        )
        view.focus()
        onSelected()
      },
    },
  ]
  if (selected) {
    const clip = (command: 'cut' | 'copy') => () => {
      view?.focus()
      document.execCommand(command)
    }
    items.push(
      { label: t('hold.cut'), icon: '✂', onSelect: clip('cut') },
      { label: t('hold.copy'), icon: '⧉', onSelect: clip('copy') },
    )
  }
  items.push({
    label: t('hold.insert'),
    icon: '＋',
    onSelect: () => {},
    submenu: [
      { label: t('hold.insert.picture'), icon: '🖼', onSelect: choosePicture },
      {
        label: t('hold.insert.line'),
        icon: '—',
        onSelect: () => {
          view?.focus()
          addExtraLine(editor, 'divider')
        },
      },
    ],
  })
  const anchor = new DOMRect(at.x, at.y, 1, 1)
  return <MenuPopover anchor={anchor} items={items} onClose={onClose} />
}
