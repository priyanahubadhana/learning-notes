import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { Icon, type IconName } from '../app/tools/icons'
import { t } from '../i18n/t'
import { boxEditors } from './activeBox'
import { openBoxStyle } from './boxStyleBus'

/** All the text of a box as plain lines (no focus change, so the bar stays). */
function boxText(pageId: string, boxId: string): string {
  const view = boxEditors.get(pageId, boxId)?.prosemirrorView
  if (!view) return ''
  const doc = view.state.doc
  return doc.textBetween(0, doc.content.size, '\n', ' ')
}

/**
 * The floating bar above a selected box (owner final 3b, 11 Nov): Box style,
 * Duplicate, Cut, Copy, Delete and ⋯ (the rest). It shows when the box is
 * selected and you are NOT typing; while typing only the text bar above the
 * keyboard shows. Text formatting lives in that text bar, so nothing here
 * touches the editor's focus.
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
  /** Opens Layout for this page (kept in the ⋯ menu). */
  onLayout?: () => void
}) {
  const { toast } = useContext(AppUiContext)
  const copy = () => {
    const text = boxText(pageId, boxId)
    void navigator.clipboard
      ?.writeText(text)
      .catch(() => toast(t('paper.box.copyFailed')))
  }
  const cut = () => {
    copy()
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
      // The editor keeps its selection while a bar button is pressed.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={`flex size-11 items-center justify-center rounded-md hover:bg-hover ${danger ? 'text-danger' : ''}`}
    >
      <Icon name={icon} size={20} />
    </button>
  )
  return (
    <div
      data-box-bar
      data-ui
      role="toolbar"
      aria-label={t('paper.bar.label')}
      className="flex max-w-[92vw] items-center gap-0.5 rounded-xl border border-line bg-surface p-1 shadow-md"
    >
      {canEdit &&
        btn('style', 'palette', t('boxStyle.title'), () => openBoxStyle(boxId))}
      {btn('duplicate', 'copy', t('paper.box.duplicate'), onDuplicate)}
      {canEdit && btn('cut', 'scissors', t('pic.act.cut'), cut)}
      {btn('copy', 'clipboard', t('pic.act.copy'), copy)}
      {canEdit && btn('delete', 'trash', t('paper.box.delete'), onDelete, true)}
      {btn('more', 'more', t('paper.box.menu'), (e) =>
        onMenu(e.currentTarget.getBoundingClientRect()),
      )}
    </div>
  )
}
