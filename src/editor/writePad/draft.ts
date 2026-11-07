/**
 * The pad's unsent text is kept per page in localStorage, so closing the pad,
 * changing page or reloading never loses it (R6-15). Empty text removes it.
 */
const key = (pageId: string | undefined) =>
  `learning-notes:writePad.draft.${pageId ?? 'none'}`

export function loadDraft(pageId: string | undefined): string {
  try {
    return localStorage.getItem(key(pageId)) ?? ''
  } catch {
    return ''
  }
}

export function saveDraft(pageId: string | undefined, text: string): void {
  try {
    if (text === '') localStorage.removeItem(key(pageId))
    else localStorage.setItem(key(pageId), text)
  } catch {
    // Storage blocked or full: the text still lives in the box.
  }
}
