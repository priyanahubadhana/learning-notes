/** True on Apple devices, where shortcuts use ⌘ instead of Ctrl. */
export function isApple(): boolean {
  const nav = globalThis.navigator
  return /Mac|iPhone|iPad|iPod/.test(nav?.platform ?? nav?.userAgent ?? '')
}

/** How to show Ctrl+`key` on this device: "Ctrl+K", or "⌘K" on Apple. */
export function shortcutLabel(key: string): string {
  return isApple() ? `⌘${key}` : `Ctrl+${key}`
}

/** How to show Alt+`key` on this device: "Alt+R", or "⌥R" on Apple. */
export function altShortcutLabel(key: string): string {
  return isApple() ? `⌥${key}` : `Alt+${key}`
}
