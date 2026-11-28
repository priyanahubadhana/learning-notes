/**
 * Puts the keyboard focus on `el`, a part that was just shown (made visible
 * or opened in the top layer) in the same task. Returns whether it got focus.
 *
 * Why: while a style sheet is still loading (the app loads the style sheets
 * of lazy parts on the way), WebKit's focus() skips its style update and
 * judges `el` by its old style, e.g. still `visibility: hidden` before the
 * part was placed. The old element then loses focus and nothing gets it (the
 * page body), so keys stop working (CI run 46122961075, ipad-webkit; Safari on
 * the iPad is the same engine). Reading the layout first brings the style up
 * to date: WebKit's layout reads do not wait for style sheets that are still
 * loading.
 */
export function focusShown(
  el: HTMLElement | null | undefined,
  options?: FocusOptions,
): boolean {
  if (!el) return false
  void el.offsetWidth
  el.focus(options)
  return document.activeElement === el
}
