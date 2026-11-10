/** Opens the Box style panel for a box (the panel itself loads on demand). */
export const BOX_STYLE_EVENT = 'ln-box-style'
export const openBoxStyle = (boxId: string) =>
  window.dispatchEvent(new CustomEvent(BOX_STYLE_EVENT, { detail: boxId }))

/** Opens Layout Assist for a box (from the Text strip). */
export const LAYOUT_EVENT = 'ln-layout-assist'
export const openLayout = (boxId: string) =>
  window.dispatchEvent(new CustomEvent(LAYOUT_EVENT, { detail: boxId }))
