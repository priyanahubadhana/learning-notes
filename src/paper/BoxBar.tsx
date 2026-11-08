import { useState } from 'react'
import { AllSelection } from 'prosemirror-state'
import { MenuPopover, type MenuItem } from '../app/ui'
import { runEditorCommand } from '../app/tools/editorCommands'
import { activeTool } from '../app/tools/main/mainTools'
import { runTool } from '../app/tools/toolRegistry'
import { Icon, type IconName } from '../app/tools/icons'
import {
  ALIGNS,
  setAlign,
  setList,
  setStyle,
  TEXT_STYLES,
} from '../app/tools/main/textOps'
import {
  COLOR_NAMES,
  colorLabel,
  setColor,
  TEXT_HEX,
} from '../editor/colorData'
import type { Editor } from '../editor/barActions'
import { t, type MessageKey } from '../i18n/t'
import { boxEditors } from './activeBox'

/** Select every block of a box's editor, so a change applies to all of it. */
function selectAllBlocks(editor: Editor): void {
  const view = editor.prosemirrorView
  if (!view) return
  view.dispatch(view.state.tr.setSelection(new AllSelection(view.state.doc)))
}

/**
 * The floating bar under a tapped box (owner fix 7b): text colour, size,
 * font, Bold, Italic, align, list, Cut, Duplicate, Delete and ⋯. It reuses
 * the toolbar's own text operations and applies them to the whole box.
 */
export function BoxBar({
  pageId,
  boxId,
  canEdit,
  onDuplicate,
  onDelete,
  onMenu,
}: {
  pageId: string
  boxId: string
  canEdit: boolean
  onDuplicate: () => void
  onDelete: () => void
  onMenu: (at: DOMRect) => void
}) {
  const [menu, setMenu] = useState<{ at: DOMRect; items: MenuItem[] } | null>(
    null,
  )
  /** Runs a text change on all of this box's text. */
  const onAll = (fn: (editor: Editor) => void) => {
    let tries = 0
    const run = () => {
      const editor = boxEditors.get(pageId, boxId)
      if (!editor) return
      // The page takes a moment to become editable after the tool changes.
      if (!editor.isEditable && tries++ < 25) {
        window.setTimeout(run, 80)
        return
      }
      editor.focus()
      selectAllBlocks(editor)
      fn(editor)
    }
    // The ink tools keep the text still: switch to the Text tool first.
    if (activeTool.get() === 'text') return run()
    activeTool.set('text')
    window.setTimeout(run, 80)
  }
  const open = (e: { currentTarget: Element }, items: MenuItem[]) =>
    setMenu({ at: e.currentTarget.getBoundingClientRect(), items })
  const cut = () => {
    onAll(() => document.execCommand('copy'))
    onDelete()
  }
  const btn = (
    id: string,
    icon: IconName,
    label: string,
    onClick: (e: { currentTarget: Element }) => void,
    danger = false,
  ) => (
    <button
      key={id}
      type="button"
      data-box-bar-action={id}
      aria-label={label}
      title={undefined}
      // The editor keeps its selection while a bar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex size-9 items-center justify-center rounded-md hover:bg-hover ${danger ? 'text-danger' : ''}`}
    >
      <Icon name={icon} size={18} />
    </button>
  )
  return (
    <div
      data-box-bar
      role="toolbar"
      aria-label={t('paper.bar.label')}
      className="flex max-w-[92vw] flex-wrap items-center gap-0.5 rounded-lg border border-line bg-surface p-1 shadow-md"
    >
      {canEdit && (
        <>
          {btn('colour', 'palette', t('main.card.text.textColor'), (e) =>
            open(
              e,
              COLOR_NAMES.map((name) => ({
                label: colorLabel(name),
                icon: name === 'default' ? '○' : '●',
                onSelect: () => onAll((ed) => setColor(ed, 'textColor', name)),
                hint: name === 'default' ? undefined : TEXT_HEX[name],
              })),
            ),
          )}
          {btn('size', 'textSize', t('main.text.size'), (e) =>
            open(
              e,
              TEXT_STYLES.map((s) => ({
                label: t(`main.style.${s}` as MessageKey),
                icon: 'A',
                onSelect: () => onAll((ed) => setStyle(ed, s)),
              })),
            ),
          )}
          {btn('font', 'font', t('tool.font'), () => runTool('font'))}
          {btn('bold', 'bold', t('tool.bold'), () =>
            onAll((editor) =>
              runEditorCommand('bold', { editor, extras: null, app: null }),
            ),
          )}
          {btn('italic', 'italic', t('tool.italic'), () =>
            onAll((editor) =>
              runEditorCommand('italic', { editor, extras: null, app: null }),
            ),
          )}
          {btn('align', 'alignCenter', t('main.align.center'), (e) =>
            open(
              e,
              ALIGNS.map((a) => ({
                label: t(`main.align.${a}` as MessageKey),
                icon: '≡',
                onSelect: () => onAll((ed) => setAlign(ed, a)),
              })),
            ),
          )}
          {btn('list', 'list', t('main.list.bullets'), () =>
            onAll((ed) => setList(ed, 'bullets')),
          )}
          {btn('cut', 'scissors', t('pic.act.cut'), cut)}
        </>
      )}
      {btn('duplicate', 'copy', t('paper.box.duplicate'), onDuplicate)}
      {canEdit && btn('delete', 'trash', t('paper.box.delete'), onDelete, true)}
      {btn('more', 'more', t('paper.box.menu'), (e) =>
        onMenu(e.currentTarget.getBoundingClientRect()),
      )}
      {menu && (
        <MenuPopover
          anchor={menu.at}
          items={menu.items}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  )
}
