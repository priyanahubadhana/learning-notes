import type { DeviceMode } from '../../deviceMode'

/**
 * Which of the speak / key / paste buttons the TOP tool row shows in each
 * device mode (owner, 19 Nov 2026, picture paste-mock2): Pencil mode shows
 * Mic, Backspace, Enter and Paste ▾; Touch and Computer show Mic and Paste ▾.
 * ONE table, so a change of the owner's mind is a one-line flip. The floating
 * Pencil bar is hidden while the top row already shows all four.
 */
export interface TopRowButtons {
  mic: boolean
  backspace: boolean
  enter: boolean
  paste: boolean
}

export const TOP_ROW_BUTTONS: Record<DeviceMode, TopRowButtons> = {
  pencil: { mic: true, backspace: true, enter: true, paste: true },
  touch: { mic: true, backspace: false, enter: false, paste: true },
  computer: { mic: true, backspace: false, enter: false, paste: true },
}

/** True when the top row shows every button the floating bar has. */
export const topRowHasAll = (mode: DeviceMode): boolean => {
  const b = TOP_ROW_BUTTONS[mode]
  return b.mic && b.backspace && b.enter && b.paste
}

/**
 * The floating bar. Switch off (page.menus): as before, the toggle decides.
 * Switch on: hidden while the top row covers it, unless dictation runs.
 */
export const floatingBarShown = (o: {
  mode: DeviceMode
  toggledOn: boolean
  dictating: boolean
  switchedOn: boolean
}): boolean =>
  o.switchedOn
    ? o.dictating || (o.toggledOn && !topRowHasAll(o.mode))
    : o.toggledOn

export const MIC_SLOT = 's:mic'
export const PASTE_SLOT = 's:paste'

/**
 * The top row's tokens with the table applied (switch on): Enter and
 * Backspace only where the table says, Mic before and Paste ▾ after that
 * group (at the end when neither shows), as in the approved picture.
 */
export function topRowTokens(
  tokens: readonly string[],
  mode: DeviceMode,
  switchedOn: boolean,
): string[] {
  if (!switchedOn) return [...tokens]
  const b = TOP_ROW_BUTTONS[mode]
  const kept = tokens.filter(
    (k) =>
      !(k === 'm:newLine' && !b.enter) &&
      !(k === 'm:backspace' && !b.backspace),
  )
  const at = kept
    .map((k, i) => (k === 'm:newLine' || k === 'm:backspace' ? i : -1))
    .filter((i) => i >= 0)
  const first = at.length ? at[0] : kept.length
  const last = at.length ? at[at.length - 1] + 1 : kept.length
  const out = [...kept]
  if (b.paste) out.splice(last, 0, PASTE_SLOT)
  if (b.mic) out.splice(first, 0, MIC_SLOT)
  return out
}
