import { useActiveStyles } from '@blocknote/react'
import { t, type MessageKey } from '../i18n/t'
import type { Editor } from './barActions'

/** The colour names and values the bar's colour picker and the Aa pill share. */

export const COLOR_NAMES = [
  'default',
  'gray',
  'brown',
  'red',
  'orange',
  'yellow',
  'green',
  'blue',
  'purple',
  'pink',
] as const

/** The colours BlockNote paints text and highlights with (same values). */
export const TEXT_HEX: Record<string, string> = {
  gray: '#9b9a97',
  brown: '#64473a',
  red: '#e03e3e',
  orange: '#d9730d',
  yellow: '#dfab01',
  green: '#4d6461',
  blue: '#0b6e99',
  purple: '#6940a5',
  pink: '#ad1a72',
}
export const BACKGROUND_HEX: Record<string, string> = {
  gray: '#ebeced',
  brown: '#e9e5e3',
  red: '#fbe4e4',
  orange: '#f6e9d9',
  yellow: '#fbf3db',
  green: '#ddedea',
  blue: '#ddebf1',
  purple: '#eae4f2',
  pink: '#f4dfeb',
}
/** Dark letters on a highlight, whatever the theme (the highlights are pale). */
export const ON_HIGHLIGHT = '#1d1d1f'

export const colorLabel = (name: string) => t(`color.${name}` as MessageKey)

/** The text and highlight colour of the selection (or the cursor). */
export function useCurrentColors(editor: Editor): {
  text: string
  highlight: string
} {
  const styles = useActiveStyles(editor) as Record<string, unknown>
  return {
    text: typeof styles.textColor === 'string' ? styles.textColor : 'default',
    highlight:
      typeof styles.backgroundColor === 'string'
        ? styles.backgroundColor
        : 'default',
  }
}

/** Sets (or, for "default", removes) the text or highlight colour. */
export function setColor(
  editor: Editor,
  kind: 'textColor' | 'backgroundColor',
  name: string,
): void {
  if (name === 'default') editor.removeStyles({ [kind]: name } as never)
  else editor.addStyles({ [kind]: name } as never)
  editor.focus()
}
