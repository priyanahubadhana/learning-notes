import { SideMenuExtension } from '@blocknote/core/extensions'
import {
  useBlockNoteEditor,
  useComponentsContext,
  useExtensionState,
} from '@blocknote/react'
import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { t } from '../i18n/t'
import { addToSummary } from './addToSummary'
import { EditorContext } from './editorContext'
import type { EditorBlock } from './mapping'
import type { AppSchema } from './schema'

type Editor = AppSchema['BlockNoteEditor']

/** Selection toolbar button: "Summary". */
export function AddToSummaryButton() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const ctx = useContext(EditorContext)
  const { toast } = useContext(AppUiContext)
  // Template pages have no cards or Summary (reviewCards is unset on them).
  if (!ctx?.reviewCards) return null
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={t('summary.addMenu')}
      mainTooltip={t('summary.addMenu')}
      onClick={() => {
        void addToSummary(editor, ctx).then(toast)
        editor.focus()
      }}
    >
      {t('summary.addButton')}
    </Components.FormattingToolbar.Button>
  )
}

/** Block menu (⋮⋮ handle) entry: "Add to Summary". */
export function AddToSummaryItem() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const ctx = useContext(EditorContext)
  const { toast } = useContext(AppUiContext)
  const block = useExtensionState(SideMenuExtension, {
    editor,
    selector: (state) => state?.block,
  }) as EditorBlock | undefined
  if (!ctx?.reviewCards || !block || !Array.isArray(block.content)) return null
  return (
    <Components.Generic.Menu.Item
      className="bn-menu-item"
      onClick={() => void addToSummary(editor, ctx, block).then(toast)}
    >
      {t('summary.addMenu')}
    </Components.Generic.Menu.Item>
  )
}
