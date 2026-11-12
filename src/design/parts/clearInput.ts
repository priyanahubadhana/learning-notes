/**
 * Empties a text field the way a user would: sets the value through the
 * native setter and fires `input`, so React (controlled) and plain listeners
 * both see it. Keeps focus in the field.
 */
export function clearInput(
  el: HTMLInputElement | HTMLTextAreaElement,
  onClear?: () => void,
): void {
  const proto =
    el instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const set = Object.getOwnPropertyDescriptor(proto, 'value')?.set
  if (set) set.call(el, '')
  else el.value = ''
  el.dispatchEvent(new Event('input', { bubbles: true }))
  onClear?.()
  el.focus()
}

/** Types that are text the user types into (not password, number, file...). */
const TEXT_TYPES = new Set(['', 'text', 'search', 'email', 'url', 'tel'])

/** True when a field gets a ✕: a system text field, not opted out. */
export function wantsClear(el: HTMLInputElement | HTMLTextAreaElement): boolean {
  if (el.hasAttribute('data-noclr')) return false
  if (el instanceof HTMLTextAreaElement) return true
  return TEXT_TYPES.has((el.getAttribute('type') ?? '').toLowerCase())
}
