import {
  FormattingToolbar,
  getFormattingToolbarItems,
  useActiveStyles,
  useBlockNoteEditor,
  useComponentsContext,
} from '@blocknote/react'
import { t } from '../i18n/t'
import { BLANK_STYLE, toggleBlank } from './blankActions'
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

export function AppFormattingToolbar() {
  return (
    <FormattingToolbar>
      {getFormattingToolbarItems()}
      <MakeBlankButton key="makeBlank" />
      <MakeCardButton key="makeCard" />
    </FormattingToolbar>
  )
}
