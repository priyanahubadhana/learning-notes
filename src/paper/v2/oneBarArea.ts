import { pageArea } from '../../app/tools/main/miniBarPrefs'
import { t } from '../../i18n/t'
import { cutByPanels, type Area } from './oneBarDockModel'

/**
 * Where a docked bar may stand (box bar part B): the page area, less the page's
 * scroll bar lane on the right (the bar never covers the scroll bar or its
 * thumb) and, at the bottom, the room of the zoom pill. Screen px.
 */
export function dockArea(): Area {
  const a = pageArea()
  const sb = document.querySelector('.sbar')?.getBoundingClientRect()
  const right =
    sb && sb.width > 0 && sb.left > a.left
      ? Math.min(a.right, sb.left)
      : a.right
  const zoom = document.querySelector(`[aria-label="${t('paper.zoomOut')}"]`)
  // The pill sits under the page and scrolls with it: keep its height free.
  const bottom = zoom ? a.bottom - 48 : a.bottom
  // A panel over the page (the Notebooks sidebar on an upright iPad) is not
  // page: the bar stays beside it, never over it (issue #60).
  const panels: Area[] = []
  for (const el of document.querySelectorAll('aside')) {
    if (getComputedStyle(el).position !== 'fixed') continue
    const r = el.getBoundingClientRect()
    if (r.width > 0 && r.height > 0)
      panels.push({
        left: r.left,
        top: r.top,
        right: r.right,
        bottom: r.bottom,
      })
  }
  return cutByPanels({ left: a.left, top: a.top, right, bottom }, panels)
}
