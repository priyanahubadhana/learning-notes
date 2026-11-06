import {
  FormattingToolbar,
  getFormattingToolbarItems,
  useActiveStyles,
  useBlockNoteEditor,
  useComponentsContext,
} from '@blocknote/react'
import { t } from '../i18n/t'
import { openPictureEditor } from '../images/pictureEditorStore'
import {
  markLabels,
  MARK_STYLE,
  markName,
  type MarkLabel,
} from '../revise/reviseMarks'
import { BLANK_STYLE, toggleBlank } from './blankActions'
import { toggleMark } from './markActions'
import { canMakeCard, makeCard } from './cardActions'
import type { AppSchema } from './schema'

/**
 * The toolbar shown over selected text: BlockNote's formatting buttons plus
 * "Make blank" and "Make card". It also appears on touch screens, so both
 * recall actions work without the hover-only block menu.
 */

type Editor = AppSchema['BlockNoteEditor']

function MakeBlankButton() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const styles = useActiveStyles(editor) as Record<string, unknown>
  const inBlank = BLANK_STYLE in styles
  const label = t(inBlank ? 'blank.remove' : 'blank.make')
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={label}
      mainTooltip={label}
      isSelected={inBlank}
      onClick={() => {
        toggleBlank(editor)
        editor.focus()
      }}
    >
      {t('blank.button')}
    </Components.FormattingToolbar.Button>
  )
}

function MakeCardButton() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const block = editor.getTextCursorPosition().block
  if (!canMakeCard(block)) return null
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={t('card.make')}
      mainTooltip={t('card.make')}
      onClick={() => makeCard(editor, block)}
    >
      {t('card.button')}
    </Components.FormattingToolbar.Button>
  )
}

/** "Edit picture" over a selected picture (crop, turn, cut out). */
function EditPictureButton() {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const selected = editor.getSelection()?.blocks ?? [
    editor.getTextCursorPosition().block,
  ]
  const block = selected.length === 1 ? selected[0] : undefined
  if (!block || block.type !== 'image') return null
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={t('pic.edit')}
      mainTooltip={t('pic.edit')}
      onClick={() => openPictureEditor(editor as never, block.id)}
    >
      {t('pic.edit')}
    </Components.FormattingToolbar.Button>
  )
}

/** One toolbar button per Revise label; pressing it again removes the mark. */
function MarkButton({ label }: { label: MarkLabel }) {
  const Components = useComponentsContext()!
  const editor = useBlockNoteEditor() as unknown as Editor
  const styles = useActiveStyles(editor) as Record<string, unknown>
  const on = styles[MARK_STYLE] === label
  return (
    <Components.FormattingToolbar.Button
      className="bn-button"
      label={markName(label)}
      mainTooltip={markName(label)}
      isSelected={on}
      onClick={() => {
        toggleMark(editor, label)
        editor.focus()
      }}
    >
      {markName(label)}
    </Components.FormattingToolbar.Button>
  )
}

export function AppFormattingToolbar() {
  return (
    <FormattingToolbar>
      {getFormattingToolbarItems()}
      <EditPictureButton key="editPicture" />
      {markLabels().map((label) => (
        <MarkButton key={label.id} label={label.id} />
      ))}
      <MakeBlankButton key="makeBlank" />
      <MakeCardButton key="makeCard" />
    </FormattingToolbar>
  )
}
