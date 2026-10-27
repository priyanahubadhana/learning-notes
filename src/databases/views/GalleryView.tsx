import { useMemo, useState } from 'react'
import { Tip } from '../../help/Help'
import { t } from '../../i18n/t'
import type { JsonObject } from '../../core/types'
import { rowCellText } from '../cellDisplay'
import { TITLE_COLUMN_ID } from '../columnTypes'
import { queryRows, resolveRows } from '../databaseQuery'
import { updateView } from '../databaseService'
import { useMinuteClock } from '../../recall/useMinuteClock'
import { PopHeading, PopItem, Popover } from './Popover'
import { useDatabaseData } from './useDatabaseData'
import { knownQuery, readRowQuery } from './viewConfig'
import { imageUrl, tileColumns } from './galleryTiles'
import { useImageUrl } from '../../images/useImageUrl'
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

  const rows = useMemo(() => {
    if (!data || !columns) return []
    const ids = new Set([TITLE_COLUMN_ID, ...columns.map((c) => c.id)])
    return queryRows(
      resolveRows(data, now),
      columns,
      knownQuery(readRowQuery(view.config), ids),
    )
  }, [data, columns, now, view.config])

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
      </div>
      {rows.length === 0 ? (
        <p className="text-sm text-muted">{t('gallery.empty')}</p>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] gap-3">
          {rows.slice(0, shown).map((row) => {
            const src = imageColumn
              ? imageUrl(rowCellText(row, imageColumn))
              : null
            const lines = values
              .map((c) => ({ column: c, text: rowCellText(row, c) }))
              .filter((v) => v.text !== '')
            return (
              <li
                key={row.page.id}
                className="overflow-hidden rounded-xl border border-line bg-bg"
              >
                <button
                  type="button"
                  onClick={() => onOpenPage(row.page.id)}
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
              icon="🔗"
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
  const url = useImageUrl(src)
  if (!url) {
    return (
      <div
        aria-hidden
        className="flex h-28 w-full items-center justify-center bg-soft text-2xl text-muted"
      >
        ◫
      </div>
    )
  }
  return (
    <img
      src={url}
      alt=""
      loading="lazy"
      referrerPolicy="no-referrer"
      className="h-28 w-full object-cover"
    />
  )
}
