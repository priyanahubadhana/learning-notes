/** Opens the Box style panel for a box (the panel itself loads on demand). */
export const BOX_STYLE_EVENT = 'ln-box-style'
export const openBoxStyle = (boxId: string) =>
  window.dispatchEvent(new CustomEvent(BOX_STYLE_EVENT, { detail: boxId }))
