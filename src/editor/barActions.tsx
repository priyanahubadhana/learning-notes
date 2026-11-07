import { useActiveStyles } from './useActiveStyles'
import type { ReactNode } from 'react'
import { markActionId } from '../app/deviceMode'
import { isApple } from '../app/keys'
import { t } from '../i18n/t'
import {
  markLabels,
  MARK_STYLE,
  markName,
  type MarkLabel,
} from '../revise/reviseMarks'
import { BLANK_STYLE, toggleBlank } from './blankActions'
import { canMakeCard, makeCard } from './cardActions'
import { addLineAfterCursor } from './lineActions'
import { toggleMark } from './markActions'
import type { AppSchema } from './schema'

/**
 * Every button the docked formatting bar can show (on the bar or under
 * More). Each one calls the same editor actions the floating toolbar uses;
 * BlockNote's own colour and link buttons are drawn by the bar itself
 * (`special`). Names come from BlockNote's dictionary, so they follow the
 * chosen language like the floating toolbar.
 */

export type Editor = AppSchema['BlockNoteEditor']

export interface BarAction {
  /** Stable id saved with the bar (`mark:<label>` for Revise marks). */
  id: string
  /** The full name (screen readers, More list, Edit bar). */
  label: string
  /** What the bar button shows. */
  face: ReactNode
  /** Shortcut, shown as a hint when hints are on. */
  hint?: string
  active?: boolean
  disabled?: boolean
  run?: () => void
  /** Drawn by BlockNote's own button (it opens its own popup). */
  special?: 'color' | 'link'
}

type Alignment = 'left' | 'center' | 'right'

type Dictionary = Record<
  string,
  { tooltip: string; secondary_tooltip?: string }
>

/** BlockNote's "Mod+B" written for this device ("Ctrl+B", or "⌘+B" on Apple). */
const hintOf = (text?: string) =>
  text ? text.replace('Mod', isApple() ? '⌘' : 'Ctrl') : undefined

/** Blocks the next change applies to: the selected ones, or the cursor's. */
function targetBlocks(editor: Editor) {
  return editor.getSelection()?.blocks ?? [editor.getTextCursorPosition().block]
}

function setAlignment(editor: Editor, alignment: Alignment) {
  for (const block of targetBlocks(editor)) {
    if ('textAlignment' in block.props) {
      editor.updateBlock(block, {
        props: { textAlignment: alignment },
      } as never)
    }
  }
}

function currentAlignment(editor: Editor): unknown {
  const props = editor.getTextCursorPosition().block.props as Record<
    string,
    unknown
  >
  return props.textAlignment
}

const TEXT_STYLES = [
  { id: 'bold', face: <b>B</b> },
  { id: 'italic', face: <i>I</i> },
  { id: 'underline', face: <u>U</u> },
  { id: 'strike', face: <s>S</s> },
  { id: 'code', face: <code>{'</>'}</code> },
] as const

const ALIGNMENTS = [
  { id: 'alignLeft', alignment: 'left', face: '⇤', dict: 'align_left' },
  { id: 'alignCenter', alignment: 'center', face: '↔', dict: 'align_center' },
  { id: 'alignRight', alignment: 'right', face: '⇥', dict: 'align_right' },
] as const

/** Ids of every button, in the order of the Edit bar list. */
function allActionIds(): string[] {
  return [
    ...TEXT_STYLES.map((s) => s.id),
    ...markLabels().map((l) => markActionId(l.id)),
    'blank',
    'card',
    'newLine',
    ...ALIGNMENTS.map((a) => a.id),
    'color',
    'indent',
    'outdent',
    'link',
  ]
}

/** All buttons with their current state; re-draws as the selection changes. */
export function useBarActions(editor: Editor): BarAction[] {
  const styles = useActiveStyles(editor)
  const dict = (
    editor.dictionary as unknown as { formatting_toolbar: Dictionary }
  ).formatting_toolbar
  const block = editor.getTextCursorPosition().block
  const alignment = currentAlignment(editor)
  const done = () => editor.focus()

  const actions = new Map<string, BarAction>()
  const add = (action: BarAction) => actions.set(action.id, action)

  for (const s of TEXT_STYLES) {
    add({
      id: s.id,
      label: dict[s.id].tooltip,
      face: s.face,
      hint: hintOf(dict[s.id].secondary_tooltip),
      active: !!styles[s.id],
      run: () => {
        editor.toggleStyles({ [s.id]: true } as never)
        done()
      },
    })
  }
  for (const l of markLabels()) {
    const id: MarkLabel = l.id
    add({
      id: markActionId(id),
      label: markName(id),
      face: markName(id),
      active: styles[MARK_STYLE] === id,
      run: () => {
        toggleMark(editor, id)
        done()
      },
    })
  }
  const inBlank = BLANK_STYLE in styles
  add({
    id: 'blank',
    label: t(inBlank ? 'blank.remove' : 'blank.make'),
    face: t('blank.button'),
    active: inBlank,
    run: () => {
      toggleBlank(editor)
      done()
    },
  })
  add({
    id: 'card',
    label: t('card.make'),
    face: t('card.make'),
    disabled: !canMakeCard(block),
    run: () => makeCard(editor, block),
  })
  add({
    id: 'newLine',
    label: t('bar.newLine'),
    face: `↵ ${t('bar.newLine')}`,
    run: () => addLineAfterCursor(editor),
  })
  for (const a of ALIGNMENTS) {
    add({
      id: a.id,
      label: dict[a.dict].tooltip,
      face: a.face,
      active: alignment === a.alignment,
      run: () => {
        setAlignment(editor, a.alignment)
        done()
      },
    })
  }
  add({
    id: 'color',
    label: dict.colors.tooltip,
    face: null,
    special: 'color',
  })
  add({
    id: 'indent',
    label: dict.nest.tooltip,
    hint: hintOf(dict.nest.secondary_tooltip),
    face: '→',
    disabled: !editor.canNestBlock(),
    run: () => {
      editor.nestBlock()
      done()
    },
  })
  add({
    id: 'outdent',
    label: dict.unnest.tooltip,
    hint: hintOf(dict.unnest.secondary_tooltip),
    face: '←',
    disabled: !editor.canUnnestBlock(),
    run: () => {
      editor.unnestBlock()
      done()
    },
  })
  add({ id: 'link', label: dict.link.tooltip, face: null, special: 'link' })

  return allActionIds().flatMap((id) => actions.get(id) ?? [])
}
