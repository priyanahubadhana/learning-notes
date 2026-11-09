/**
 * Inter (the app's font on Windows, Android and Linux) is fetched after the
 * first paint, never in the critical path: the system font shows at once and
 * Inter swaps in (font-display: swap). Apple devices keep SF and download
 * nothing. Open Font Licence 1.1 (public/licenses/fonts-OFL.txt).
 */
export const isAppleDevice = (ua: string, platform = ''): boolean =>
  /iPhone|iPad|iPod|Macintosh|Mac OS X/.test(ua) || /Mac|iP/.test(platform)

let started = false

export function loadInter(win: Window = window): void {
  if (started) return
  started = true
  if (isAppleDevice(win.navigator.userAgent, win.navigator.platform)) return
  const go = () => void import('./inter.css').catch(() => {})
  const later = () => {
    const idle = (
      win as Window & {
        requestIdleCallback?: (f: () => void, o?: { timeout: number }) => void
      }
    ).requestIdleCallback
    if (idle) idle.call(win, go, { timeout: 4000 })
    else win.setTimeout(go, 1500)
  }
  if (win.document.readyState === 'complete') later()
  else win.addEventListener('load', later, { once: true })
}
