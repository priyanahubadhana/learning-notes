import { useEffect, useRef, useState, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../../i18n/t'
import { Icon, type IconName } from './icons'
import {
  inBox,
  insertAt,
  moveTo,
  moveToSlot,
  removeId,
  slotAt,
} from './listEdit'

/**
 * The one "edit a list" screen (R7-11): the tool bar, a pill's options and
 * any other customisable list. A modal sheet that shows only a preview of the
 * list and the tools that are not on it yet.
 *
 * - Drag a row (finger, Pencil or mouse) to move it, drop a tool from
 *   "More tools" into the list to add it, drop a row outside the list to
 *   remove it. Every row also has ↑ ↓ and a remove / add button.
 * - Done (and ✕) keep the changes; Cancel (and Esc) throws them away.
 * Nothing is saved until Done, so a slip is never kept.
 */

export interface SheetItem {
  id: string
  label: string
  icon?: IconName
}

interface Props {
  title: string
  hint?: string
  /** Every item that can be on the list. */
  items: readonly SheetItem[]
  /** On the list now, in order. */
  value: readonly string[]
  /** A row that may not be removed (the last tool of the bar). */
  canRemove?: (id: string, draft: readonly string[]) => boolean
  /** "Reset" puts this list back. */
  defaults?: readonly string[]
  /** Where a tool added with its + button goes (default: the end). */
  addAt?: 'start' | 'end'
  scope: string
  onCommit: (next: string[]) => void
  onClose: () => void
}

const ROW = 'flex items-center gap-1 rounded-lg'
const BTN =
  'grid min-h-11 min-w-11 shrink-0 place-items-center rounded-lg text-sm hover:bg-hover disabled:opacity-35'

interface Drag {
  id: string
  from: 'list' | 'more'
  /** Slot in the list the pointer is over (null = not over the list). */
  slot: number | null
  /** Over the "More tools" part (a row dropped there is removed). */
  overMore: boolean
}

export function EditListSheet({
  title,
  hint,
  items,
  value,
  canRemove = (_id, draft) => draft.length > 1,
  defaults,
  addAt = 'end',
  scope,
  onCommit,
  onClose,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const listBox = useRef<HTMLUListElement>(null)
  const moreBox = useRef<HTMLDivElement>(null)
  const done = useRef<HTMLButtonElement>(null)
  const [draft, setDraft] = useState<string[]>([...value])
  const [find, setFind] = useState('')
  const [drag, setDrag] = useState<Drag | null>(null)
  const byId = new Map(items.map((i) => [i.id, i]))
  const shown = draft.filter((id) => byId.has(id))
  const more = items.filter(
    (i) =>
      !shown.includes(i.id) &&
      (!find.trim() ||
        i.label.toLowerCase().includes(find.trim().toLowerCase())),
  )

  useEffect(() => {
    dialog.current?.showModal()
    done.current?.focus()
  }, [])

  const commit = () => {
    onCommit(shown)
    onClose()
  }
  const add = (id: string, index?: number) =>
    setDraft(
      insertAt(shown, id, index ?? (addAt === 'start' ? 0 : shown.length)),
    )
  const remove = (id: string) => {
    if (canRemove(id, shown)) setDraft(removeId(shown, id))
  }

  // ---- Dragging (pointer events: finger, Pencil and mouse alike) ----
  const begin = (e: PointerEvent, id: string, from: Drag['from']) => {
    if (e.button !== 0) return
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // Not a real pointer (a test): move and up still arrive.
    }
    setDrag({ id, from, slot: null, overMore: false })
  }
  const track = (e: PointerEvent) => {
    if (!drag) return
    const list = listBox.current?.getBoundingClientRect()
    const rows = [
      ...(listBox.current?.querySelectorAll<HTMLElement>('[data-row-id]') ??
        []),
    ].map((r) => r.getBoundingClientRect())
    const over = list ? inBox(list, e.clientX, e.clientY, 8) : false
    const moreRect = moreBox.current?.getBoundingClientRect()
    setDrag({
      ...drag,
      slot: over ? slotAt(rows, e.clientY) : null,
      overMore: !over && !!moreRect && inBox(moreRect, e.clientX, e.clientY, 0),
    })
    // Slide a column while the finger is near the top or bottom of the sheet.
    const under = document
      .elementFromPoint(e.clientX, e.clientY)
      ?.closest<HTMLElement>('[data-scroll]')
    const box = scroller.current?.getBoundingClientRect()
    if (box) {
      const dy =
        e.clientY < box.top + 40 ? -14 : e.clientY > box.bottom - 40 ? 14 : 0
      const target = [under, scroller.current].find(
        (el) => el && el.scrollHeight > el.clientHeight,
      )
      if (dy && target) target.scrollTop += dy
    }
  }
  const finish = () => {
    if (!drag) return
    if (drag.slot !== null) {
      setDraft(
        drag.from === 'list'
          ? moveToSlot(shown, drag.id, drag.slot)
          : insertAt(shown, drag.id, drag.slot),
      )
    } else if (drag.from === 'list' && drag.overMore) remove(drag.id)
    setDrag(null)
  }

  const handle = (id: string, label: string, from: Drag['from']) => (
    <button
      type="button"
      data-pen-own
      data-edit-handle={id}
      aria-label={t('bar.drag', { name: label })}
      onPointerDown={(e) => begin(e, id, from)}
      onPointerMove={track}
      onPointerUp={finish}
      onPointerCancel={() => setDrag(null)}
      style={{ touchAction: 'none' }}
      className={`${BTN} cursor-grab select-none`}
    >
      <span aria-hidden>⠿</span>
    </button>
  )

  const face = (item: SheetItem) => (
    <>
      {item.icon && <Icon name={item.icon} size={18} />}
      <span className="min-w-0 truncate">{item.label}</span>
    </>
  )

  const marker = (slot: number) =>
    drag && drag.slot === slot ? (
      <li
        key={`slot-${slot}`}
        aria-hidden
        data-drop-slot={slot}
        className="h-1 rounded-full bg-accent"
      />
    ) : null

  return createPortal(
    <dialog
      ref={dialog}
      data-palm-guard
      data-edit-sheet={scope}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault()
        onClose()
      }}
      className="m-auto h-[min(40rem,calc(100dvh-1rem))] w-[min(52rem,calc(100vw-1rem))] overflow-hidden rounded-2xl border border-line bg-surface-3 p-0 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <div className="flex h-full flex-col">
        <header className="flex items-center gap-2 border-b border-line px-3 py-2">
          <h2 className="grow text-base font-semibold">{title}</h2>
          <button
            type="button"
            aria-label={t('editList.close')}
            onClick={commit}
            className={BTN}
          >
            <span aria-hidden>✕</span>
          </button>
        </header>
        <div
          ref={scroller}
          className="min-h-0 grow overflow-y-auto overscroll-contain px-3 py-2 min-[700px]:grid min-[700px]:grid-cols-2 min-[700px]:grid-rows-[minmax(0,1fr)] min-[700px]:gap-3 min-[700px]:overflow-hidden"
        >
          <div
            data-scroll
            className="min-w-0 overscroll-contain min-[700px]:min-h-0 min-[700px]:overflow-y-auto"
          >
            {hint && <p className="mb-2 text-xs text-ink-soft">{hint}</p>}
            <p className="text-xs font-semibold text-ink-soft">
              {t('editList.preview')}
            </p>
            <div
              data-edit-preview={scope}
              className="mb-3 flex min-h-12 flex-wrap items-center gap-1 rounded-xl bg-hover p-1"
            >
              {shown.map((id) => {
                const item = byId.get(id)!
                return (
                  <span
                    key={id}
                    data-preview-item={id}
                    className="flex min-h-10 min-w-10 items-center justify-center gap-1 rounded-lg bg-bg px-2 text-xs"
                  >
                    {item.icon ? (
                      <Icon name={item.icon} size={18} />
                    ) : (
                      item.label
                    )}
                  </span>
                )
              })}
            </div>
            <p className="text-xs font-semibold text-ink-soft">
              {t('editList.onList')}
            </p>
            <ul
              ref={listBox}
              data-edit-list={scope}
              className="mb-3 grid min-h-14 gap-0.5 rounded-xl border border-dashed border-line p-1"
            >
              {shown.length === 0 && (
                <li className="p-3 text-center text-xs text-ink-soft">
                  {t('editList.empty')}
                </li>
              )}
              {shown.map((id, i) => {
                const item = byId.get(id)!
                return (
                  <li key={id} className="grid gap-0.5">
                    {marker(i)}
                    <div
                      data-row-id={id}
                      className={`${ROW} ${drag?.id === id ? 'bg-hover opacity-60' : ''}`}
                    >
                      {handle(id, item.label, 'list')}
                      <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                        {face(item)}
                      </span>
                      <button
                        type="button"
                        disabled={i === 0}
                        aria-label={t('bar.moveEarlier', { name: item.label })}
                        onClick={() => setDraft(moveTo(shown, id, i - 1))}
                        className={BTN}
                      >
                        <span aria-hidden>↑</span>
                      </button>
                      <button
                        type="button"
                        disabled={i === shown.length - 1}
                        aria-label={t('bar.moveLater', { name: item.label })}
                        onClick={() => setDraft(moveTo(shown, id, i + 1))}
                        className={BTN}
                      >
                        <span aria-hidden>↓</span>
                      </button>
                      <button
                        type="button"
                        disabled={!canRemove(id, shown)}
                        aria-label={t('editList.remove', { name: item.label })}
                        onClick={() => remove(id)}
                        className={BTN}
                      >
                        <span aria-hidden>−</span>
                      </button>
                    </div>
                    {i === shown.length - 1 && marker(shown.length)}
                  </li>
                )
              })}
            </ul>
          </div>
          <div
            data-scroll
            className="min-w-0 overscroll-contain min-[700px]:min-h-0 min-[700px]:overflow-y-auto"
          >
            <div
              ref={moreBox}
              data-edit-more={scope}
              className={`rounded-xl p-1 ${drag?.overMore ? 'bg-hover' : ''}`}
            >
              <p className="text-xs font-semibold text-ink-soft">
                {t('editList.more')}
              </p>
              <input
                type="search"
                value={find}
                onChange={(e) => setFind(e.target.value)}
                aria-label={t('editList.find')}
                placeholder={t('editList.find')}
                className="mb-1 min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm"
              />
              <ul className="grid gap-0.5">
                {more.map((item) => (
                  <li
                    key={item.id}
                    data-more-id={item.id}
                    className={`${ROW} ${drag?.id === item.id ? 'bg-hover opacity-60' : ''}`}
                  >
                    {handle(item.id, item.label, 'more')}
                    <span className="flex min-w-0 flex-1 items-center gap-2 text-sm">
                      {face(item)}
                    </span>
                    <button
                      type="button"
                      aria-label={t('editList.add', { name: item.label })}
                      onClick={() => add(item.id)}
                      className={BTN}
                    >
                      <span aria-hidden>+</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        <footer className="flex items-center gap-2 border-t border-line px-3 py-2">
          {defaults && (
            <button
              type="button"
              onClick={() => setDraft([...defaults])}
              className={`${BTN} border border-line px-3`}
            >
              {t('bar.reset')}
            </button>
          )}
          <span className="grow" />
          <button
            type="button"
            onClick={onClose}
            className={`${BTN} px-4 text-muted`}
          >
            {t('editList.cancel')}
          </button>
          <button
            ref={done}
            type="button"
            onClick={commit}
            className={`${BTN} bg-accent px-5 font-semibold text-white`}
          >
            {t('bar.done')}
          </button>
        </footer>
      </div>
    </dialog>,
    document.body,
  )
}

export default EditListSheet
