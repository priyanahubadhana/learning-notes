import { t } from '../i18n/t'
import type { Editor } from './barActions'
import {
  BACKGROUND_HEX,
  COLOR_NAMES,
  ON_HIGHLIGHT,
  TEXT_HEX,
  colorLabel,
  setColor,
  useCurrentColors,
} from './colorData'

/**
 * The docked bar's colour button and picker (instead of BlockNote's, whose
 * round icon and pop-up are nearly invisible on the dark theme). The button
 * is an outlined swatch showing the current text and highlight colour; the
 * picker lists every colour with its name, so colour is never the only clue.
 * Colours are BlockNote's own names, so they look the same in the page.
 */

/** The picker: text colours, then highlight colours. */
export function ColorPanel({
  editor,
  px,
  onDone,
}: {
  editor: Editor
  px: number
  /** Called after a colour was chosen (the picker closes). */
  onDone?: () => void
}) {
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
            onClick={() => {
              setColor(editor, kind, name)
              onDone?.()
            }}
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
