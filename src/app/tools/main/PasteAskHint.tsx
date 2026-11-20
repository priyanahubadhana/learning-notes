import { createPortal } from 'react-dom'
import { clipboardAsk } from '../../../editor/appClipboard'
import { t } from '../../../i18n/t'

/**
 * C0-4 / C0-6: while Safari's own black "Paste" bubble waits for a tap, a short
 * line under the tapped button says what to do. It shows only for a button
 * inside the element marked `data-paste-scope="<scope>"` (so the top row and the box bar never both show it), clears
 * itself the moment the read ends, and takes no touch (the bubble stays
 * tappable).
 */
const WIDTH = 280

export function PasteAskHint({ scope }: { scope: string }) {
  const ask = clipboardAsk.useValue()
  if (
    ask.phase !== 'asking' ||
    !ask.anchor?.closest(`[data-paste-scope="${scope}"]`)
  )
    return null
  const r = ask.anchor.getBoundingClientRect()
  const w = Math.min(WIDTH, window.innerWidth - 16)
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8))
  return createPortal(
    <div
      role="status"
      data-testid="paste-ask-hint"
      className="fixed z-(--z-menu) rounded-xl bg-ink px-3 py-2 text-sm font-medium text-bg pointer-events-none"
      style={{ left, top: r.bottom + 8, width: w }}
    >
      {t('paste.asking')}
    </div>,
    document.body,
  )
}
