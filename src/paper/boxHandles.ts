/** The 8 resize handles: 4 sides (n, s, e, w) and 4 corners. */
export type ResizeHow = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw'
export const RESIZE_HANDLES: readonly ResizeHow[] = [
  'nw',
  'n',
  'ne',
  'e',
  'se',
  's',
  'sw',
  'w',
]
export const HANDLE_AT: Record<ResizeHow, [string, string]> = {
  nw: ['0%', '0%'],
  n: ['50%', '0%'],
  ne: ['100%', '0%'],
  e: ['100%', '50%'],
  se: ['100%', '100%'],
  s: ['50%', '100%'],
  sw: ['0%', '100%'],
  w: ['0%', '50%'],
}

/** A tap on the frame (not on the text) puts the caret at the end of the box's text. */
export function caretAtEnd(root: HTMLElement) {
  const ed = root.querySelector<HTMLElement>(
    '.ProseMirror[contenteditable="true"]',
  )
  if (!ed) return
  ed.focus()
  const sel = window.getSelection()
  if (!sel) return
  const r = document.createRange()
  r.selectNodeContents(ed)
  r.collapse(false)
  sel.removeAllRanges()
  sel.addRange(r)
}
