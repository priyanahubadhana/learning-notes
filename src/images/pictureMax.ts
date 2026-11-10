import { sheetMetrics } from '../paper/paginateHold'
import { t } from '../i18n/t'

/**
 * Item 22j (10 Nov): a picture is never taller or wider than one sheet's
 * writable area, so it can always sit whole on a sheet and never crosses the
 * gap. The widest width (CSS px) for a picture of height/width `ratio`, in a
 * column `room` wide and a sheet whose writable height is `writableH`
 * (Infinity when the page is not in sheets). Pure.
 */
export function maxPictureWidth(
  ratio: number,
  room: number,
  writableH: number,
): number {
  const byHeight =
    Number.isFinite(writableH) && ratio > 0 ? writableH / ratio : Infinity
  return Math.max(1, Math.floor(Math.min(room, byHeight)))
}

/**
 * The writable height of one sheet in the editor's CSS px (sheet height minus
 * the top and bottom margins, divided by the zoom the editor sits in).
 * Infinity when the page is not shown in sheets (fit width, the reader).
 */
export function writableHeight(editorEl: HTMLElement | null | undefined) {
  const sheet = document.querySelector<HTMLElement>('[data-paper-sheet="1"]')
  if (!sheet || !editorEl) return Infinity
  const h =
    sheet.getBoundingClientRect().height -
    sheetMetrics.topMargin -
    sheetMetrics.bottomMargin
  const scale = editorEl.offsetWidth
    ? editorEl.getBoundingClientRect().width / editorEl.offsetWidth
    : 1
  return h > 0 ? h / (scale || 1) : Infinity
}

let hintTimer = 0
/** A short, quiet line near the bottom of the window ("Largest size for one page"). */
export function sizeHint(): void {
  let el = document.querySelector<HTMLElement>('[data-size-hint]')
  if (!el) {
    el = document.createElement('div')
    el.setAttribute('data-size-hint', '')
    el.setAttribute('role', 'status')
    el.className =
      'fixed bottom-24 left-1/2 z-[var(--z-toast)] -translate-x-1/2 rounded-full border border-line bg-surface px-3 py-1.5 text-sm text-ink shadow-md'
    document.body.append(el)
  }
  el.textContent = t('pic.maxSize')
  window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => el?.remove(), 1800)
}
