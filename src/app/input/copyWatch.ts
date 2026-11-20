/**
 * Hears a normal copy or cut anywhere in the page (C0-4). At the window, in
 * the bubbling phase, so the editor and our own copy code have already put
 * their data on the event. Returns the undo.
 */
export function onCopyOrCut(fn: (e: ClipboardEvent) => void): () => void {
  window.addEventListener('copy', fn)
  window.addEventListener('cut', fn)
  return () => {
    window.removeEventListener('copy', fn)
    window.removeEventListener('cut', fn)
  }
}
