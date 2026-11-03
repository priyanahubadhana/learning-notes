import { useActiveStyles } from '@blocknote/react'
import { t, type MessageKey } from '../i18n/t'
import type { Editor } from './barActions'

/**
 * The docked bar's colour button and picker (instead of BlockNote's, whose
 * round icon and pop-up are nearly invisible on the dark theme). The button
 * is an outlined swatch showing the current text and highlight colour; the
 * picker lists every colour with its name, so colour is never the only clue.
 * Colours are BlockNote's own names, so they look the same in the page.
 */

const COLOR_NAMES = [
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
const TEXT_HEX: Record<string, string> = {
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
const BACKGROUND_HEX: Record<string, string> = {
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
const ON_HIGHLIGHT = '#1d1d1f'

const colorLabel = (name: string) => t(`color.${name}` as MessageKey)

/** The text and highlight colour of the selection (or the cursor). */
function useCurrentColors(editor: Editor): {
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
function setColor(
  editor: Editor,
  kind: 'textColor' | 'backgroundColor',
  name: string,
): void {
  if (name === 'default') editor.removeStyles({ [kind]: name } as never)
  else editor.addStyles({ [kind]: name } as never)
  editor.focus()
}

/** The swatch: an outlined box with "A", the highlight behind it and a bar in the text colour. */
export function ColorSwatch({
  text,
  highlight,
}: {
  text: string
  highlight: string
}) {
  return (
    <span
      data-swatch
      data-background-color={highlight}
      style={{ backgroundColor: BACKGROUND_HEX[highlight] }}
      className="grid size-8 place-items-center rounded-md border-2 border-ink"
    >
      <span
        className="flex flex-col items-center leading-none font-bold"
        // On a pale highlight the letter is always dark, so it stays readable.
        style={{ color: BACKGROUND_HEX[highlight] ? ON_HIGHLIGHT : undefined }}
      >
        A
        <span
          data-text-color={text}
          className="mt-0.5 h-1 w-4 rounded-full border border-ink-soft bg-current"
          style={{ color: TEXT_HEX[text] ?? 'var(--color-muted)' }}
        />
      </span>
    </span>
  )
}

/** The colour button on the bar. */
export function ColorButton({
  editor,
  px,
  open,
  onClick,
}: {
  editor: Editor
  px: number
  open: boolean
  onClick: () => void
}) {
  const { text, highlight } = useCurrentColors(editor)
  const label = t('color.button', {
    text: colorLabel(text),
    highlight: colorLabel(highlight),
  })
  return (
    <button
      type="button"
      data-bar-btn
      data-action="color"
      aria-label={label}
      aria-expanded={open}
      aria-haspopup="true"
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      style={{ minHeight: px, minWidth: px }}
      className="grid shrink-0 place-items-center rounded-lg border border-line px-1.5 hover:bg-hover"
    >
      <ColorSwatch text={text} highlight={highlight} />
    </button>
  )
}

/** The picker: text colours, then highlight colours. */
export function ColorPanel({ editor, px }: { editor: Editor; px: number }) {
  const current = useCurrentColors(editor)
  const min = Math.max(px, 44)
  const group = (
    title: string,
    kind: 'textColor' | 'backgroundColor',
    active: string,
  ) => (
    <div role="group" aria-label={title} className="grid gap-0.5">
      <strong className="px-2 pt-1 text-xs text-ink-soft">{title}</strong>
      <div className="grid grid-cols-2 gap-0.5">
        {COLOR_NAMES.map((name) => (
          <button
            key={name}
            type="button"
            data-color={`${kind}:${name}`}
            aria-pressed={active === name}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setColor(editor, kind, name)}
            style={{ minHeight: min }}
            className={`flex items-center gap-2 rounded-lg border px-2 text-left text-sm text-ink hover:bg-hover ${
              active === name ? 'border-accent bg-hover' : 'border-transparent'
            }`}
          >
            <span
              aria-hidden
              {...(kind === 'textColor'
                ? { 'data-text-color': name }
                : { 'data-background-color': name })}
              style={
                kind === 'backgroundColor'
                  ? {
                      backgroundColor: BACKGROUND_HEX[name],
                      color: BACKGROUND_HEX[name] ? ON_HIGHLIGHT : undefined,
                    }
                  : { color: TEXT_HEX[name] }
              }
              className="grid size-7 shrink-0 place-items-center rounded-md border-2 border-ink font-bold"
            >
              A
            </span>
            <span className="min-w-0 flex-1 truncate">{colorLabel(name)}</span>
            {active === name && <span aria-hidden>✓</span>}
          </button>
        ))}
      </div>
    </div>
  )
  return (
    <div role="group" aria-label={t('color.title')} className="grid gap-1">
      {group(t('color.text'), 'textColor', current.text)}
      {group(t('color.highlight'), 'backgroundColor', current.highlight)}
    </div>
  )
}
