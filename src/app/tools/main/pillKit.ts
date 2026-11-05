import { t, type MessageKey } from '../../../i18n/t'
import { HIGHLIGHT_COLOURS, PEN_COLOURS, customColours } from './inkSettings'

export const keepFocus = (e: { preventDefault: () => void }) =>
  e.preventDefault()

export const PILL_BUTTON =
  'relative grid min-h-11 min-w-11 shrink-0 place-items-center rounded-xl px-1.5 text-ink-soft hover:bg-hover hover:text-ink motion-safe:transition-colors aria-disabled:opacity-60 data-[coming]:opacity-60 data-[hot]:bg-hover data-[hot]:ring-2 data-[hot]:ring-accent'

/** The colours for the pen or the highlighter and the ones the person added. */
export function paletteFor(
  kind: 'pen' | 'highlighter',
  custom: readonly string[],
) {
  const base = kind === 'pen' ? PEN_COLOURS : HIGHLIGHT_COLOURS
  return [
    ...base.map((c) => ({
      hex: c.hex,
      name: t(`ink.colour.${c.id}` as MessageKey),
      id: c.id,
    })),
    ...custom.map((hex) => ({ hex, name: hex, id: hex })),
  ]
}

/** The colours added with ⊕ (newest first). */
export const useCustomColours = () => customColours.useValue()
