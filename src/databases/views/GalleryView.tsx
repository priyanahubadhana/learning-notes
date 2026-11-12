import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { runTask } from '../../app/errors'
import { AppUiContext } from '../../app/appUi'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import type { JsonObject } from '../../core/types'
import { rowCellText } from '../cellDisplay'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { queryRows, resolveRows } from '../databaseQuery'
import { placeRow, updateView } from '../databaseService'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { PopHeading, PopItem, Popover } from './Popover'
import { useDatabaseData } from './useDatabaseData'
import { knownQuery, readRowQuery, withSort } from './viewConfig'
import {
  dropPlace,
  imageUrl,
  stepPlace,
  tileColumns,
  type TilePlace,
} from './galleryTiles'
import { GatedPicture } from '../../images/RemotePictureCard'
import type { ViewProps } from './viewTypes'

/** Tiles drawn at first, and added per "Show more". */
const PAGE_SIZE = 60

/**
 * Gallery view: rows as tiles with a picture (from a Web link column, if
 * one is picked), the title and a few chosen values. Settings are saved in
 * the view (`imageColumnId`, `cardColumns`).
 */
export function GalleryView({ db, database, view, onOpenPage }: ViewProps) {
  const now = useMinuteClock()
  const data = useDatabaseData(db, database, now)
  const [shown, setShown] = useState(PAGE_SIZE)
  const [menu, setMenu] = useState<HTMLElement | null>(null)
  const columns = data?.databases.get(database.id)?.columns
  const ui = useContext(AppUiContext)

  // Dragging a tile: a mouse or pen drags at once, a finger after a short hold
  // (so scrolling still works). `over` is the tile it would go next to.
  const list = useRef<HTMLUListElement>(null)
  const press = useRef<{
    id: string
    el: HTMLElement
    pointerId: number
    x: number
    y: number
    touch: boolean
    active: boolean
    timer?: number
  } | null>(null)
  const [dragging, setDragging] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; after: boolean } | null>(null)
  const overNow = useRef<{ id: string; after: boolean } | null>(null)
  const justDragged = useRef(false)
  const [announce, setAnnounce] = useState('')

  const rows = useMemo(() => {
    if (!data || !columns) return []
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    return queryRows(
      resolveRows(data, now),
      columns,
      knownQuery(readRowQuery(view.config), ids),
    )
  }, [data, columns, now, view.config])

  const hasTiles = rows.length > 0
  // Holding a tile with a finger must not scroll the page.
  useEffect(() => {
    const el = list.current
    if (!el) return
    const block = (e: TouchEvent) => {
      if (press.current?.active) e.preventDefault()
    }
    el.addEventListener('touchmove', block, { passive: false })
    return () => el.removeEventListener('touchmove', block)
  }, [hasTiles])

  if (!data || !columns) {
    return <p className="text-sm text-muted">{t('notebook.loading')}</p>
  }
  const links = columns.filter((c) => c.type === 'url')
  const imageColumn =
    links.find((c) => c.id === view.config.imageColumnId) ??
    (view.config.imageColumnId === undefined ? links[0] : undefined)
  const values = tileColumns(view.config, columns, imageColumn?.id)
  const save = (changes: JsonObject) =>
    void updateView(db, view.id, { config: { ...view.config, ...changes } })
  const sorted = (readRowQuery(view.config).sorts?.length ?? 0) > 0
  const shownRows = rows.slice(0, shown)

  /** Puts a row at a place; a sorted view first asks to switch to manual order. */
  const move = (rowId: string, place: TilePlace) =>
    runTask(
      (async () => {
        if (sorted) {
          const answer = await ui.choose({
            title: t('gallery.manual.title'),
            message: t('gallery.manual.message'),
            options: [
              { value: 'no', label: t('ui.cancel') },
              { value: 'yes', label: t('gallery.manual.yes'), primary: true },
            ],
          })
          if (answer !== 'yes') return
          await updateView(db, view.id, {
            config: withSort(view.config, null),
          })
        }
        await placeRow(db, rowId, {}, place)
        const at = shownRows.findIndex((r) => r.page.id === rowId)
        setAnnounce(t('gallery.moved', { count: at + 1 }))
      })(),
    )
  const tileAt = (x: number, y: number) => {
    for (const el of list.current?.querySelectorAll<HTMLElement>(
      '[data-tile-id]',
    ) ?? []) {
      const r = el.getBoundingClientRect()
      if (x >= r.left && x <= r.right && y >= r.top && y <= r.bottom) {
        const rtl = getComputedStyle(el).direction === 'rtl'
        const second = x > r.left + r.width / 2
        return { id: el.dataset.tileId!, after: rtl ? !second : second }
      }
    }
    return null
  }
  const startDrag = () => {
    const p = press.current
    if (!p || p.active) return
    p.active = true
    p.el.setPointerCapture(p.pointerId)
    setDragging(p.id)
  }
  const endPress = () => {
    window.clearTimeout(press.current?.timer)
    press.current = null
    overNow.current = null
    setDragging(null)
    setOver(null)
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tip id="db.galleryOptions" touchInfo={false}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={menu !== null}
            onClick={(e) => setMenu(menu ? null : e.currentTarget)}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] hover:bg-hover"
          >
            {t('gallery.options')}
            <span aria-hidden className="text-[10px] text-muted">
              ▾
            </span>
          </button>
        </Tip>
        <span className="text-xs text-muted">
          {t('gallery.count', { count: rows.length })}
        </span>
        {rows.length > 1 && (
          <span className="text-xs text-muted">{t('gallery.dragHint')}</span>
        )}
        <span role="status" className="sr-only">
          {announce}
        </span>
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t('gallery.empty')}</p>
      ) : (
        <ul
          ref={list}
          className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3"
        >
          {shownRows.map((row) => {
            const src = imageColumn
              ? imageUrl(rowCellText(row, imageColumn))
              : null
            const lines = values
              .map((c) => ({ column: c, text: rowCellText(row, c) }))
              .filter((v) => v.text !== '')
            return (
              <li
                key={row.page.id}
                data-tile-id={row.page.id}
                onPointerDown={(e) => {
                  if (e.button !== 0 || rows.length < 2) return
                  const touch = e.pointerType === 'touch'
                  press.current = {
                    id: row.page.id,
                    el: e.currentTarget,
                    pointerId: e.pointerId,
                    x: e.clientX,
                    y: e.clientY,
                    touch,
                    active: false,
                    timer: touch
                      ? window.setTimeout(startDrag, 400)
                      : undefined,
                  }
                }}
                onPointerMove={(e) => {
                  const p = press.current
                  if (!p) return
                  if (!p.active) {
                    const far =
                      Math.hypot(e.clientX - p.x, e.clientY - p.y) >
                      (p.touch ? 10 : 6)
                    if (!far) return
                    // A finger that moves before the hold is scrolling.
                    if (p.touch) endPress()
                    else startDrag()
                    return
                  }
                  const hit = tileAt(e.clientX, e.clientY)
                  const next = hit && hit.id !== p.id ? hit : null
                  overNow.current = next
                  setOver(next)
                }}
                onPointerUp={() => {
                  const p = press.current
                  const target = overNow.current
                  const wasDragging = p?.active === true
                  endPress()
                  if (!p || !wasDragging) return
                  justDragged.current = true
                  window.setTimeout(() => (justDragged.current = false), 0)
                  const place =
                    target && dropPlace(p.id, target.id, target.after)
                  if (place) move(p.id, place)
                }}
                onPointerCancel={endPress}
                onContextMenu={(e) =>
                  press.current?.active && e.preventDefault()
                }
                className={`overflow-hidden rounded-xl border border-line bg-bg select-none [-webkit-touch-callout:none] ${
                  dragging === row.page.id ? 'opacity-50' : ''
                } ${
                  over?.id === row.page.id
                    ? over.after
                      ? 'shadow-[inset_-4px_0_0_var(--color-accent)]'
                      : 'shadow-[inset_4px_0_0_var(--color-accent)]'
                    : ''
                }`}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    if (justDragged.current) {
                      e.preventDefault()
                      return
                    }
                    onOpenPage(row.page.id)
                  }}
                  onKeyDown={(e) => {
                    // Alt + arrow keys move the tile one step.
                    if (!e.altKey) return
                    const delta =
                      e.key === 'ArrowLeft' || e.key === 'ArrowUp'
                        ? -1
                        : e.key === 'ArrowRight' || e.key === 'ArrowDown'
                          ? 1
                          : 0
                    if (!delta) return
                    e.preventDefault()
                    const place = stepPlace(
                      shownRows.map((r) => r.page.id),
                      row.page.id,
                      delta,
                    )
                    if (place) move(row.page.id, place)
                  }}
                  className="block w-full text-start hover:bg-hover"
                >
                  {src ? (
                    <TileImage src={src} />
                  ) : (
                    <div
                      aria-hidden
                      className="flex h-28 w-full items-center justify-center bg-soft text-2xl text-muted"
                    >
                      ◫
                    </div>
                  )}
                  <div className="p-2.5">
                    <div className="font-medium break-words">
                      {row.page.title || t('review.untitled')}
                    </div>
                    {lines.map(({ column, text }) => (
                      <div
                        key={column.id}
                        className="mt-0.5 truncate text-xs text-muted"
                      >
                        {text}
                      </div>
                    ))}
                  </div>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      {rows.length > shown && (
        <button
          type="button"
          onClick={() => setShown(shown + PAGE_SIZE)}
          className="mt-3 min-h-10 w-full rounded-lg border border-line text-sm text-muted hover:border-accent hover:text-accent"
        >
          {t('search.more')}
        </button>
      )}
      {menu && (
        <Popover
          anchor={menu}
          label={t('gallery.options')}
          onClose={() => setMenu(null)}
        >
          <PopHeading>{t('gallery.image')}</PopHeading>
          <PopItem
            label={t('gallery.noImage')}
            on={!imageColumn}
            onClick={() => save({ imageColumnId: '' })}
          />
          {links.map((c) => (
            <PopItem
              key={c.id}
              icon="link"
              label={c.name}
              on={imageColumn?.id === c.id}
              onClick={() => save({ imageColumnId: c.id })}
            />
          ))}
          <PopHeading>{t('board.cardShows')}</PopHeading>
          {columns
            .filter((c) => c.id !== imageColumn?.id)
            .map((c) => {
              const on = values.some((v) => v.id === c.id)
              return (
                <PopItem
                  key={c.id}
                  pressable
                  label={c.name}
                  on={on}
                  onClick={() =>
                    save({
                      cardColumns: (on
                        ? values.filter((v) => v.id !== c.id)
                        : [...values, c]
                      ).map((v) => v.id),
                    })
                  }
                />
              )
            })}
        </Popover>
      )}
    </div>
  )
}

/** A tile's picture: a web address as it is, or one stored on this device. */
function TileImage({ src }: { src: string }) {
  const empty = (
    <div
      aria-hidden
      className="flex h-28 w-full items-center justify-center bg-soft text-2xl text-muted"
    >
      ◫
    </div>
  )
  return (
    <GatedPicture source={src} fallback={empty}>
      {(url, onError) => (
        <img
          src={url}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={onError}
          className="h-28 w-full object-cover"
        />
      )}
    </GatedPicture>
  )
}
