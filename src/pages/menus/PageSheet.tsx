import { useLiveQuery } from 'dexie-react-hooks'
import { useMemo, useState } from 'react'
import type { ToastAction } from '../../app/appUi'
import { Icon } from '../../app/tools/icons'
import { readPref, writePref } from '../../app/uiPrefs'
import type { LearningNotesDB } from '../../core/db'
import { descendantIds } from '../../core/records'
import type { Page } from '../../core/types'
import { ArrangeSheet, type ArrangeRow } from '../../design/parts/ArrangeSheet'
import { Sheet } from '../../design/parts/Sheet'
import { sampleName } from '../../i18n/defaultNames'
import { t, type MessageKey } from '../../i18n/t'
import { useUnlocked } from '../../settings/level'
import { listPages } from '../pageService'
import {
  buildRows,
  cleanPins,
  PIN_MAX,
  visibleGroups,
  type PageSheetActions,
  type SheetRow,
} from './pageSheetModel'
import { moveThisPage } from './pageSheetService'
import './PageSheet.css'

const PINS_KEY = 'page.sheetPins'
type View = 'main' | 'move' | 'pins' | 'arrange'

/**
 * The page more-menu on the shared Sheet (flag page.menus, PM-60..PM-64):
 * docked right on iPad / PC, full screen on a phone. Beginner: 8 plain rows.
 * Professional (page.menuAll): every action in 5 sections, with up to 5
 * pinned tiles on top.
 */
export default function PageSheet({
  db,
  page,
  actions,
  toast,
  onClose,
  opener,
}: {
  db: LearningNotesDB
  page: Page
  actions: PageSheetActions
  toast: (message: string, action?: ToastAction) => void
  onClose: () => void
  opener?: HTMLElement | null
}) {
  const all = useUnlocked('page.menuAll')
  const [view, setView] = useState<View>('main')
  const [open, setOpen] = useState<string | null>(null)
  const rows = useMemo(() => buildRows(actions), [actions])
  const known = rows.map((r) => r.id)
  const [pins, setPins] = useState(() =>
    cleanPins(readPref(PINS_KEY, Array.isArray, []), known),
  )
  const savePins = (next: string[]) => {
    setPins(next)
    writePref(PINS_KEY, next)
  }
  const livePins = cleanPins(pins, known)

  const pinRows: ArrangeRow[] = livePins.flatMap((id) => {
    const r = rows.find((x) => x.id === id)
    return r ? [{ id, label: r.label, removable: true }] : []
  })

  /** Runs a row, then closes the sheet so a dialog it opens is not stacked on it. */
  const go = (fn?: () => void) => () => {
    onClose()
    fn?.()
  }
  const press = (row: SheetRow) => {
    if (row.view) return setView(row.view)
    if (row.children) return setOpen(open === row.id ? null : row.id)
    go(row.run)()
  }

  const title =
    view === 'move'
      ? t('pageMenus.sheet.moveTo')
      : view === 'pins'
        ? t('pageMenus.sheet.pinAdd').replace(/^\+\s*/, '')
        : t('pageMenus.sheet.title')

  return (
    <Sheet
      title={title}
      onClose={onClose}
      opener={opener}
      data-testid="page-sheet"
    >
      {view !== 'main' && view !== 'arrange' && (
        <button
          type="button"
          className="ps-row"
          data-testid="ps-back"
          onClick={() => setView('main')}
        >
          <Icon name="chevronLeft" size={18} />
          <span className="ps-row__name">{t('pageMenus.sheet.back')}</span>
        </button>
      )}
      {view === 'move' && (
        <MoveList
          db={db}
          page={page}
          onPick={(parentId) => {
            onClose()
            void moveThisPage(db, page, parentId, toast)
          }}
        />
      )}
      {view === 'pins' && (
        <div role="group" aria-label={title}>
          {rows
            .filter((r) => r.id !== 'delete')
            .map((r) => {
              const on = livePins.includes(r.id)
              return (
                <button
                  key={r.id}
                  type="button"
                  role="menuitemcheckbox"
                  aria-checked={on}
                  className="ps-row"
                  data-testid={`ps-pin-${r.id}`}
                  disabled={!on && livePins.length >= PIN_MAX}
                  onClick={() =>
                    savePins(
                      on
                        ? livePins.filter((p) => p !== r.id)
                        : [...livePins, r.id],
                    )
                  }
                >
                  <Icon name={r.icon} size={18} />
                  <span className="ps-row__name">{r.label}</span>
                  {on && <Icon name="check" size={18} />}
                </button>
              )
            })}
        </div>
      )}
      {view === 'main' && (
        <>
          {all && (
            <div
              className="ps-pinned"
              role="group"
              aria-label={t('pageMenus.sheet.pinned')}
              data-testid="ps-pinned"
            >
              {livePins.map((id) => {
                const r = rows.find((x) => x.id === id)
                if (!r) return null
                return (
                  <button
                    key={id}
                    type="button"
                    className="ps-tile"
                    data-danger={r.danger || undefined}
                    data-testid={`ps-tile-${id}`}
                    onClick={() => press(r)}
                  >
                    <Icon name={r.icon} size={20} />
                    <span className="ps-tile__name">{r.label}</span>
                  </button>
                )
              })}
              {livePins.length > 1 && (
                <button
                  type="button"
                  className="ps-tile ps-tile--add"
                  data-testid="ps-arrange"
                  aria-label={t('pageMenus.sheet.arrange')}
                  onClick={() => setView('arrange')}
                >
                  <Icon name="sliders" size={20} />
                  <span className="ps-tile__name">
                    {t('pageMenus.sheet.arrange')}
                  </span>
                </button>
              )}
              {livePins.length < PIN_MAX && (
                <button
                  type="button"
                  className="ps-tile ps-tile--add"
                  aria-label={t('pageMenus.sheet.pinAdd')}
                  data-testid="ps-pin-add"
                  onClick={() => setView('pins')}
                >
                  <Icon name="plus" size={20} />
                  <span className="ps-tile__name">
                    {t('pageMenus.sheet.pin')}
                  </span>
                </button>
              )}
            </div>
          )}
          {visibleGroups(rows, all).map((g) => (
            <section
              key={g.section ?? 'plain'}
              className="ps-group"
              data-testid={g.section ? `ps-section-${g.section}` : undefined}
            >
              {g.section && (
                <h3 className="ps-head">
                  {t(`pageMenus.sheet.${g.section}` as MessageKey)}
                </h3>
              )}
              {g.rows.map((r) => (
                <div key={r.id}>
                  <button
                    type="button"
                    className="ps-row"
                    data-danger={r.danger || undefined}
                    data-testid={`ps-row-${r.id}`}
                    aria-expanded={r.children ? open === r.id : undefined}
                    onClick={() => press(r)}
                  >
                    <Icon name={r.icon} size={18} />
                    <span className="ps-row__name">{r.label}</span>
                    {(r.children || r.view) && (
                      <span className="ps-row__chev" aria-hidden="true">
                        <Icon
                          name={r.children ? 'chevronDown' : 'chevronRight'}
                          size={16}
                        />
                      </span>
                    )}
                  </button>
                  {r.children && open === r.id && (
                    <div className="ps-sub" role="group" aria-label={r.label}>
                      {r.children.map((c) => (
                        <button
                          key={c.label}
                          type="button"
                          role="menuitemradio"
                          aria-checked={!!c.checked}
                          className="ps-row"
                          onClick={go(c.run)}
                        >
                          <span className="ps-row__name">{c.label}</span>
                          {c.checked && <Icon name="check" size={16} />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </section>
          ))}
        </>
      )}
      {view === 'arrange' && (
        <div className="ps-arrange">
          <ArrangeSheet
            mode="inline"
            title={t('pageMenus.sheet.arrange')}
            rows={pinRows}
            onChange={(next) => savePins(next.map((r) => r.id))}
            onDone={() => setView('main')}
          />
        </div>
      )}
    </Sheet>
  )
}

/** Where this page can go: the top level, or under any other page that is not its own sub-page. */
function MoveList({
  db,
  page,
  onPick,
}: {
  db: LearningNotesDB
  page: Page
  onPick: (parentId: string | null) => void
}) {
  const pages = useLiveQuery(
    () => listPages(db, page.notebookId),
    [db, page.notebookId],
  )
  if (!pages) return null
  const own = new Set([page.id, ...descendantIds(pages, page.id)])
  const targets = pages.filter((p) => !own.has(p.id) && p.id !== page.parentId)
  const rows: { id: string | null; label: string }[] = [
    ...(page.parentId === null
      ? []
      : [{ id: null, label: t('pageMenus.sheet.moveTop') }]),
    ...targets.map((p) => ({
      id: p.id,
      label: sampleName(p) || t('review.untitled'),
    })),
  ]
  if (rows.length === 0)
    return <p className="ps-empty">{t('pageMenus.sheet.noTargets')}</p>
  return (
    <div role="group" aria-label={t('pageMenus.sheet.moveTo')}>
      {rows.map((r) => (
        <button
          key={r.id ?? 'top'}
          type="button"
          className="ps-row"
          data-testid={`ps-move-${r.id ?? 'top'}`}
          onClick={() => onPick(r.id)}
        >
          <span className="ps-row__name">{r.label}</span>
        </button>
      ))}
    </div>
  )
}
