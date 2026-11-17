/**
 * Small messages between the one bar, the ⋯ list and the cards (box bar part
 * A), as the Box style panel already does (boxStyleBus.ts): one event each, so
 * the lazy parts need not know each other.
 */
export type OneBarPop =
  'colour' | 'size' | 'font' | 'bi' | 'align' | 'list' | 'paste'

export const ONEBAR_POP_EVENT = 'ln-onebar-pop'
/** Opens one strip of the bar (the phone's ⋯ list: Font, List, Paste). */
export const openOneBarPop = (boxId: string, pop: OneBarPop) =>
  window.dispatchEvent(
    new CustomEvent(ONEBAR_POP_EVENT, { detail: { boxId, pop } }),
  )

export const TEXT_OPTIONS_EVENT = 'ln-text-options'
/** Opens ⋯ › Text options… (the Text tool's Format card) for a box. */
export const openTextOptions = (boxId: string) =>
  window.dispatchEvent(new CustomEvent(TEXT_OPTIONS_EVENT, { detail: boxId }))

export const BOX_LAYOUT_EVENT = 'ln-box-layout'
/** Opens the Box card on its Layout tab (⋯ › Layout…). */
export const openBoxLayout = (boxId: string) =>
  window.dispatchEvent(new CustomEvent(BOX_LAYOUT_EVENT, { detail: boxId }))
