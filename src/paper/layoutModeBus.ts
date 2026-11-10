/** Opens Layout mode for a page (Text strip, main toolbar, box menu). */
export const LAYOUT_MODE_EVENT = 'ln-layout-mode'
export const openLayoutMode = (pageId: string) =>
  window.dispatchEvent(new CustomEvent(LAYOUT_MODE_EVENT, { detail: pageId }))
