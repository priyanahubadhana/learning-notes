import { readDeviceSetting } from '../settings/settingsService'
import { holdMenuSetting } from '../settings/builtinSettings'
import { t } from '../i18n/t'
import { focusEndLine } from '../editor/lineActions'
import { MAIN_BOX } from './boxes'
import { boxEditors } from './activeBox'
import { HOLD_STILL_PX, RING_AFTER_MS, showRing } from '../editor/holdMenuWatch'

/**
 * Hold on blank paper (bug batch 2, item 8; text-tool-plan 4): finger or
 * mouse held still (the hold time, 1.5 s) on empty paper opens a one-item menu
 * "Start typing here". It puts the caret at the end of the page's own box; if
 * the press was below its end, empty lines are added down to that point. The
 * Pencil does not start it (a Pencil tap makes a box; resting is Scribble).
 * Loaded on the first press on blank paper with the Text tool.
 */
export function startBlankHold(
  e: PointerEvent,
  pageId: string,
  lineMm: number,
  px: number,
): void {
  if (e.pointerType === 'pen' || e.button > 0 || !e.isPrimary) return
  const doc = document
  const x0 = e.clientX
  const y0 = e.clientY
  const hold = readDeviceSetting(holdMenuSetting)
  let ring: (() => void) | null = null
  const ringTimer = window.setTimeout(
    () => (ring = showRing(doc, x0, y0, hold - RING_AFTER_MS)),
    Math.min(RING_AFTER_MS, hold),
  )
  const stop = () => {
    window.clearTimeout(timer)
    window.clearTimeout(ringTimer)
    ring?.()
    doc.removeEventListener('pointermove', move, true)
    doc.removeEventListener('pointerup', stop, true)
    doc.removeEventListener('pointercancel', stop, true)
  }
  const move = (m: PointerEvent) => {
    if (
      m.pointerId === e.pointerId &&
      Math.hypot(m.clientX - x0, m.clientY - y0) > HOLD_STILL_PX
    )
      stop()
  }
  const timer = window.setTimeout(() => {
    stop()
    openMenu(doc, x0, y0, pageId, lineMm, px)
  }, hold)
  doc.addEventListener('pointermove', move, true)
  doc.addEventListener('pointerup', stop, true)
  doc.addEventListener('pointercancel', stop, true)
}

function openMenu(
  doc: Document,
  x: number,
  y: number,
  pageId: string,
  lineMm: number,
  px: number,
) {
  const menu = doc.createElement('div')
  menu.setAttribute('role', 'menu')
  menu.setAttribute('data-ui', '')
  menu.setAttribute('data-blank-hold-menu', '')
  menu.className = 'glass fixed z-50 w-52 rounded-xl p-1 text-ink'
  const vw = window.visualViewport?.width ?? window.innerWidth
  const vh = window.visualViewport?.height ?? window.innerHeight
  menu.style.left = Math.max(8, Math.min(x, vw - 216)) + 'px'
  menu.style.top = Math.max(8, Math.min(y, vh - 64)) + 'px'
  const item = doc.createElement('button')
  item.type = 'button'
  item.setAttribute('role', 'menuitem')
  item.className =
    'flex min-h-11 w-full items-center rounded-md px-2.5 text-left text-sm hover:bg-hover'
  item.textContent = t('textTool.startTyping')
  menu.append(item)
  const close = () => {
    menu.remove()
    doc.removeEventListener('pointerdown', away, true)
    doc.removeEventListener('keydown', key, true)
  }
  const away = (ev: Event) => {
    if (!menu.contains(ev.target as Node)) close()
  }
  const key = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape') close()
  }
  item.addEventListener('click', () => {
    close()
    startTypingHere(pageId, y, lineMm, px)
  })
  doc.body.append(menu)
  item.focus({ preventScroll: true })
  doc.addEventListener('pointerdown', away, true)
  doc.addEventListener('keydown', key, true)
}

/** The caret to the end of the page's own box, with empty lines down to `y`. */
export function startTypingHere(
  pageId: string,
  y: number,
  lineMm: number,
  px: number,
): void {
  const ed = boxEditors.get(pageId, MAIN_BOX)
  if (!ed) return
  const bottom = ed.domElement
    ?.querySelector('.bn-editor, .bn-block-group')
    ?.getBoundingClientRect().bottom
  const line = Math.max(8, lineMm * px)
  const extra =
    bottom === undefined ? 0 : Math.max(0, Math.floor((y - bottom) / line))
  focusEndLine(ed)
  const lines = Math.min(60, extra)
  if (lines > 0) {
    const last = ed.document[ed.document.length - 1]
    ed.insertBlocks(
      Array.from({ length: lines }, () => ({ type: 'paragraph' }) as never),
      last,
      'after',
    )
    const end = ed.document[ed.document.length - 1]
    ed.setTextCursorPosition(end, 'start')
    ed.focus()
  }
}
