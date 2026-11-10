/**
 * Owner bug batch 2, items 2 and 3: the app's own buttons, bars and dialogs
 * take a Pencil tap as a press and nothing else. The ink pad, the Lasso, the
 * paper and the editors skip any pointer that starts on our UI (`data-ui`, a
 * dialog, a menu) and every pointer while a modal dialog is open.
 */

/** What counts as our UI for the input code (the pen never inks over it). */
export const UI_SELECTOR =
  '[data-ui], dialog, [role="dialog"], [role="menu"], [role="toolbar"]'

/** Is a modal dialog or sheet open now? Everything behind it is dead to ink. */
export function modalOpen(doc: Document = document): boolean {
  try {
    return !!doc.querySelector('dialog:modal, [aria-modal="true"]')
  } catch {
    return !!doc.querySelector('dialog[open], [aria-modal="true"]')
  }
}

/** Did this pointer start on our UI, or is a modal open? Ink and Lasso skip it. */
export function isUiEvent(e: Event): boolean {
  if (modalOpen()) return true
  return e.target instanceof Element && !!e.target.closest(UI_SELECTOR)
}
