/* eslint-disable react-hooks/refs -- useReorder keeps drag state in refs on purpose; the props it returns only read them inside event handlers (same as ReorderList). */
import { useLiveQuery } from 'dexie-react-hooks'
import {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { AppUiContext } from '../../appUi'
import { runTask } from '../../errors'
import { holdJustFired, rightClickInfo, useRowHold } from '../../rowHold'
import { Icon } from '../../tools/icons'
import type { LearningNotesDB } from '../../../core/db'
import type { Page } from '../../../core/types'
import { ContextStrip } from '../../../design/parts/ContextStrip'
import { EmptyState } from '../../../design/parts/EmptyState'
import {
  ObjectBar,
  type ObjectBarAction,
} from '../../../design/parts/ObjectBar'
import { DropLine } from '../../../design/parts/drag/DropLine'
import { Grip } from '../../../design/parts/drag/Grip'
import { useReorder } from '../../../design/parts/drag/useReorder'
import '../../../design/parts/drag/drag.css'
import { sampleName } from '../../../i18n/defaultNames'
import { t } from '../../../i18n/t'
import { listNotePages } from '../../../pages/pageService'
import { isUnlocked, useLevel } from '../../../settings/level'
import { previewLines } from '../panelModel'
import { ExtractDialog } from './ExtractDialog'
import {
  canLand,
  canShift,
  copyName,
  flattenPages,
  pageAfterDelete,
  planDelete,
  planDrop,
  planDuplicate,
  planShift,
  rowWindow,
  subtreeOf,
  topPicked,
  type FlatRow,
  type MovePlan,
} from './pageOrganise'
import {
  addPageAfter,
  anyDeleteBlocked,
  applyMoves,
  duplicatePages,
  ExtractRefusedError,
  extractPages,
  restorePages,
  trashPages,
  undoExtract,
  type ExtractTarget,
} from './pageOrganiseService'
import { pageStripItems } from './pageStrip'

/** One row: 94 px thumbnail card + 6 px gap. Fixed, so the list can be windowed. */
export const ROW_H = 100
/** NB-B41: up to this many rows, then "Show more". */
export const PAGE_CAP = 200

const getRowId = (r: FlatRow<Page>) => r.page.id
const pageName = (p: Page) => sampleName(p) || t('review.untitled')

/** The Pencil never lifts or drags a row (finger and mouse only). */
function noPen<E extends { pointerType: string }>(fn?: (e: E) => void) {
  return (e: E) => {
    if (e.pointerType === 'pen') return
    fn?.(e)
  }
}

/** A page's first lines, read only while its row is on screen. */
function usePreview(db: LearningNotesDB, page: Page) {
  return useLiveQuery(
    async () =>
      page.locked
        ? []
        : previewLines(
            await db.blocks.where('pageId').equals(page.id).toArray(),
          ),
    [db, page.id, page.locked],
  )
}

function Thumb({
  db,
  page,
  number,
  picked,
  organise,
}: {
  db: LearningNotesDB
  page: Page
  number: number
  picked: boolean
  organise: boolean
}) {
  const lines = usePreview(db, page)
  return (
    <>
      <span className="lpv2-th" aria-hidden="true">
        {page.locked ? <Icon name="lock" size={16} /> : number}
        {organise && picked && (
          <span className="lpv2-tick">
            <Icon name="check" size={12} />
          </span>
        )}
      </span>
      <span className="lpv2-text">
        <b>{pageName(page)}</b>
        {page.locked ? (
          <small>{t('lp2.pages.locked')}</small>
        ) : lines === undefined ? null : lines.length === 0 ? (
          <small style={{ fontStyle: 'italic' }}>{t('lp2.pages.blank')}</small>
        ) : (
          lines.map((l, i) => <small key={i}>{l}</small>)
        )}
      </span>
    </>
  )
}

interface UndoEntry {
  run: () => Promise<void>
  done: boolean
}

export function PagesTabV2({
  db,
  notebookId,
  pageId,
  onOpenPage,
}: {
  db: LearningNotesDB
  notebookId: string
  pageId: string
  onOpenPage: (id: string) => void
}) {
  useLevel() // re-draw when a Professional switch changes
  const { toast } = useContext(AppUiContext)
  const pages = useLiveQuery(
    () => listNotePages(db, notebookId),
    [db, notebookId],
  )
  const rows = useMemo(() => (pages ? flattenPages(pages) : null), [pages])
  const byId = useMemo(
    () => new Map((rows ?? []).map((r) => [r.page.id, r])),
    [rows],
  )
  const loaded = rows !== null
  const [asked, setLimit] = useState(PAGE_CAP)
  // The open page is always within the rows shown, so it can be centred.
  const openAt = rows ? rows.findIndex((x) => x.page.id === pageId) : -1
  const limit = Math.max(asked, Math.ceil((openAt + 1) / PAGE_CAP) * PAGE_CAP)
  const shown = useMemo(() => (rows ?? []).slice(0, limit), [rows, limit])
  const [organise, setOrganise] = useState(false)
  const [picked, setPicked] = useState<ReadonlySet<string>>(new Set())
  const [strip, setStrip] = useState<{ id: string; el: HTMLElement } | null>(
    null,
  )
  const [extract, setExtract] = useState<string[] | null>(null)
  const stepsDone = useRef<UndoEntry[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const footRef = useRef<HTMLDivElement>(null)

  // ---- Which rows are on screen ----
  const scroller = useRef<HTMLDivElement>(null)
  const [scrollTop, setScrollTop] = useState(0)
  const [viewH, setViewH] = useState(0)
  useEffect(() => {
    const el = scroller.current
    if (!el) return
    const measure = () => setViewH(el.clientHeight)
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
    // The list shows once the pages are read, so measure again then.
  }, [loaded])
  const lifted = useRef(false)
  const lastRange = useRef({ from: 0, to: 0 })
  const live = rowWindow(shown.length, ROW_H, scrollTop, viewH)
  // While a row is lifted the slice stays as it was (the drag works on it).
  const range = lifted.current ? lastRange.current : live
  lastRange.current = range
  const items = useMemo(
    () => shown.slice(range.from, range.to),
    [shown, range.from, range.to],
  )
  const windowIds = useMemo(() => items.map(getRowId), [items])

  // ---- Undo (toast button and the Object bar's Undo share one entry) ----
  const remember = useCallback(
    (message: string, run: () => Promise<void>) => {
      const entry: UndoEntry = { run, done: false }
      stepsDone.current.push(entry)
      setUndoCount(stepsDone.current.length)
      toast(message, {
        label: t('lp2.undo'),
        onSelect: () => {
          if (entry.done) return
          entry.done = true
          runTask(run())
        },
      })
    },
    [toast],
  )
  const undoLast = () => {
    const entry = stepsDone.current.pop()
    setUndoCount(stepsDone.current.length)
    if (!entry || entry.done) return
    entry.done = true
    runTask(entry.run().then(() => toast(t('lp2.undone'))))
  }

  // ---- Actions ----
  const applyPlan = (plan: MovePlan, message: string) => {
    runTask(
      applyMoves(db, plan.ops).then(() =>
        remember(message, () => applyMoves(db, plan.undo)),
      ),
    )
  }
  const doShift = (ids: ReadonlySet<string>, dir: -1 | 1) => {
    if (!rows) return
    const plan = planShift(rows, ids, dir)
    if (plan.ops.length === 0) return
    applyPlan(plan, t('lp2.moved'))
  }
  const dropped = (id: string, to: number) => {
    if (!rows) return
    const plan = planDrop(rows, range.from, windowIds, id, to)
    if (plan) applyPlan(plan, t('lp2.moved'))
  }
  const doDelete = async (ids: ReadonlySet<string>) => {
    if (!rows) return
    const plan = planDelete(rows, ids)
    if (plan.roots.length === 0) return
    if (plan.blocked) return toast(t('lp2.lastPage'))
    if (await anyDeleteBlocked(db, plan.roots))
      return toast(t('editLock.refused'))
    const gone = new Set(
      plan.roots.flatMap((id) => [id, ...subtreeOf(rows, id)]),
    )
    const next = gone.has(pageId) ? pageAfterDelete(rows, gone, pageId) : null
    await trashPages(db, plan.roots)
    setPicked(new Set())
    if (next) onOpenPage(next)
    remember(t('lp2.trashed', { count: plan.total }), async () => {
      await restorePages(db, plan.roots)
      if (next) onOpenPage(pageId)
    })
  }
  const doDuplicate = async (ids: ReadonlySet<string>) => {
    if (!rows) return
    const steps = planDuplicate(rows, ids)
    if (steps.length === 0) return
    const made = await duplicatePages(db, steps, (p) =>
      copyName(pageName(p), t('lp2.copySuffix')),
    )
    setPicked(new Set())
    remember(t('lp2.copied', { count: made.length }), () =>
      trashPages(db, made),
    )
  }
  const doExtract = async (ids: string[], target: ExtractTarget) => {
    if (!rows) return
    setExtract(null)
    const roots = topPicked(rows, new Set(ids))
    if (planDelete(rows, new Set(roots)).blocked)
      return toast(t('lp2.lastPage'))
    const gone = new Set(roots.flatMap((id) => [id, ...subtreeOf(rows, id)]))
    try {
      const { notebookId: to, undo } = await extractPages(db, roots, target)
      const name =
        target.kind === 'new'
          ? target.title
          : sampleName((await db.notebooks.get(to)) ?? { title: '' })
      setPicked(new Set())
      const next = gone.has(pageId) ? pageAfterDelete(rows, gone, pageId) : null
      if (next) onOpenPage(next)
      remember(t('lp2.extracted', { count: gone.size, name }), async () => {
        await undoExtract(db, undo)
        if (next) onOpenPage(pageId)
      })
    } catch (e) {
      if (e instanceof ExtractRefusedError)
        toast(t(e.message === 'locked' ? 'lp2.extractLocked' : 'lp2.gone'))
      else throw e
    }
  }
  const addPage = () =>
    runTask(
      addPageAfter(db, notebookId, pageId || null).then((p) =>
        onOpenPage(p.id),
      ),
    )

  // ---- Rows ----
  const grip = isUnlocked('nb.dragGrip')
  const r = useReorder<FlatRow<Page>>({
    items,
    getId: getRowId,
    axis: 'y',
    handle: grip ? 'both' : 'row',
    disabled: organise,
    label: (row) => pageName(row.page),
    onMove: dropped,
    fit: (id, _slot, order) => canLand(byId, id, order, windowIds, range.from),
  })
  lifted.current = r.drag?.phase === 'lifted'

  const lastPointer = useRef(0)
  const tap = (id: string) => {
    if (holdJustFired()) return
    if (organise) {
      setPicked((old) => {
        const next = new Set(old)
        if (!next.delete(id)) next.add(id)
        return next
      })
    } else onOpenPage(id)
  }

  // Hold (finger or mouse, 0.5 s) and right-click open the Context strip.
  useRowHold((info) => {
    if (info.kind !== 'page' || organise) return
    // A hold that stayed still also lifted the row: let it go again.
    if (document.documentElement.hasAttribute('data-reorder-active')) {
      info.el.closest('li')?.dispatchEvent(
        new PointerEvent('pointercancel', {
          bubbles: true,
          pointerId: lastPointer.current,
        }),
      )
    }
    setStrip({ id: info.id, el: info.el })
  })
  const onContext = (e: React.MouseEvent) => {
    const info = rightClickInfo(e.target)
    if (!info || info.kind !== 'page') return
    e.preventDefault()
    setStrip({ id: info.id, el: info.el })
  }

  // Centre the open page in the list when the list first shows it.
  const centred = useRef<string | null>(null)
  useEffect(() => {
    if (!rows || !pageId || viewH === 0 || centred.current === pageId) return
    const at = rows.findIndex((x) => x.page.id === pageId)
    if (at < 0) return
    centred.current = pageId
    const top = Math.max(0, at * ROW_H - (viewH - ROW_H) / 2)
    scroller.current?.scrollTo({ top })
  }, [rows, pageId, viewH])

  // The Object bar of Organise.
  const stripFor = strip ? byId.get(strip.id) : undefined
  const siblingsOf = (id: string) => {
    const me = byId.get(id)
    return me
      ? (rows ?? []).filter((x) => x.page.parentId === me.page.parentId)
      : []
  }
  const sibs = stripFor ? siblingsOf(stripFor.page.id) : []
  const sibAt = sibs.findIndex((x) => x.page.id === strip?.id)
  const nothing = picked.size === 0
  const everyone = rows !== null && picked.size === rows.length
  const barActions: ObjectBarAction[] = [
    {
      id: 'earlier',
      icon: 'chevronUp',
      label: t('lp2.org.earlier'),
      disabled: nothing || !rows || !canShift(rows, picked, -1),
    },
    {
      id: 'later',
      icon: 'chevronDown',
      label: t('lp2.org.later'),
      disabled: nothing || !rows || !canShift(rows, picked, 1),
    },
    {
      id: 'duplicate',
      icon: 'duplicate',
      label: t('lp2.act.duplicate'),
      disabled: nothing,
    },
    {
      id: 'extract',
      icon: 'move',
      label: t('lp2.act.extract'),
      disabled: nothing,
    },
    {
      id: 'pickAll',
      icon: 'checkSquare',
      label: everyone ? t('lp2.org.pickNone') : t('lp2.org.pickAll'),
    },
    {
      id: 'undo',
      icon: 'undo',
      label: t('lp2.undo'),
      disabled: undoCount === 0,
    },
    {
      id: 'delete',
      icon: 'trash',
      label: t('lp2.act.delete'),
      danger: true,
      disabled: nothing,
    },
  ]
  const onBar = (id: string) => {
    if (!rows) return
    if (id === 'earlier') doShift(picked, -1)
    else if (id === 'later') doShift(picked, 1)
    else if (id === 'duplicate') void doDuplicate(picked)
    else if (id === 'extract') setExtract(topPicked(rows, picked))
    else if (id === 'delete') void doDelete(picked)
    else if (id === 'undo') undoLast()
    else if (id === 'pickAll')
      setPicked(everyone ? new Set() : new Set(rows.map((x) => x.page.id)))
  }
  const barTarget = useCallback(
    () => footRef.current?.getBoundingClientRect() ?? new DOMRect(),
    [],
  )

  const act = (id: string) => {
    const target = stripFor
    setStrip(null)
    if (!target) return
    const one = new Set([target.page.id])
    if (id === 'open') onOpenPage(target.page.id)
    else if (id === 'pick') {
      setOrganise(true)
      setPicked(one)
    } else if (id === 'duplicate') void doDuplicate(one)
    else if (id === 'extract') setExtract([target.page.id])
    else if (id === 'moveUp') doShift(one, -1)
    else if (id === 'moveDown') doShift(one, 1)
    else if (id === 'delete') void doDelete(one)
  }

  if (!rows) return <div className="lpv2-scroll" />
  return (
    <>
      <div className="lpv2-bar">
        {rows.length > 0 && (
          <button
            type="button"
            className="lpv2-btn"
            data-testid="lpv2-organise"
            aria-pressed={organise}
            onClick={() => {
              setOrganise(!organise)
              setPicked(new Set())
            }}
          >
            <Icon name={organise ? 'check' : 'checkSquare'} size={16} />
            {organise ? t('lp2.org.done') : t('lp2.org.start')}
          </button>
        )}
        {organise && (
          <span
            role="status"
            style={{ fontSize: 12, color: 'var(--color-muted)' }}
          >
            {t('lp2.org.picked', { count: picked.size })}
          </span>
        )}
      </div>
      <div
        ref={scroller}
        className="lpv2-scroll"
        data-testid="lpv2-pages-scroll"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        onContextMenu={onContext}
      >
        {rows.length === 0 ? (
          <EmptyState
            variant="inline"
            icon="fileText"
            text={t('lp2.pages.empty')}
            action={t('lp2.pages.new')}
            onAction={addPage}
            testId="lpv2-pages-empty"
          />
        ) : (
          <>
            <ul
              ref={r.setContainer}
              role="list"
              aria-label={t('lp2.pages.list')}
              className="lpv2-list"
              data-testid="lpv2-pages"
              data-rows={items.length}
              style={
                {
                  height: shown.length * ROW_H,
                  '--lpv2-row-h': `${ROW_H}px`,
                } as React.CSSProperties
              }
              onPointerDownCapture={(e) => {
                lastPointer.current = e.pointerId
              }}
              {...r.containerProps}
            >
              {r.ordered.map((row, i) => {
                const id = row.page.id
                const ip = r.itemProps(id)
                const number = byId.has(id)
                  ? rows.indexOf(byId.get(id)!) + 1
                  : 0
                const isPicked = picked.has(id)
                const onKey = (e: KeyboardEvent<HTMLElement>) => {
                  ip.onKeyDown(e)
                  if (
                    !e.defaultPrevented &&
                    e.target === e.currentTarget &&
                    (e.key === 'Enter' || e.key === ' ')
                  ) {
                    e.preventDefault()
                    tap(id)
                  }
                }
                return (
                  <li
                    key={id}
                    className="rord-item"
                    {...ip}
                    onPointerDown={noPen(ip.onPointerDown)}
                    onKeyDown={onKey}
                    // A pressed row holds the pointer, so the click lands on the row itself.
                    onClick={(e) => {
                      if ((e.target as Element).closest('[data-reorder-grip]'))
                        return
                      tap(id)
                    }}
                    style={{ top: (range.from + i) * ROW_H }}
                    aria-label={t('lp2.pages.rowLabel', {
                      n: number,
                      name: pageName(row.page),
                    })}
                    aria-current={id === pageId ? 'page' : undefined}
                  >
                    <div
                      className="lpv2-row"
                      data-testid="lpv2-page"
                      data-hold={`page:${id}`}
                      data-page-id={id}
                      data-picked={isPicked ? '' : undefined}
                      aria-current={id === pageId ? 'page' : undefined}
                      style={{
                        marginInlineStart: Math.min(row.depth, 3) * 10,
                      }}
                    >
                      {r.hasGrip && (
                        <span className="lpv2-grip">
                          <Grip
                            {...r.gripProps(id)}
                            onPointerDown={noPen(r.gripProps(id).onPointerDown)}
                            data-testid="lpv2-grip"
                          />
                        </span>
                      )}
                      <div role="button" className="lpv2-main">
                        <Thumb
                          db={db}
                          page={row.page}
                          number={number}
                          picked={isPicked}
                          organise={organise}
                        />
                      </div>
                    </div>
                  </li>
                )
              })}
              <DropLine rect={r.line} />
            </ul>
            {rows.length > limit && (
              <button
                type="button"
                className="lpv2-btn"
                data-testid="lpv2-more"
                style={{ width: '100%' }}
                onClick={() => setLimit(limit + PAGE_CAP)}
              >
                {t('lp2.pages.more', { count: rows.length - limit })}
              </button>
            )}
          </>
        )}
        <div className="rord-live" role="status" aria-live="polite">
          {r.announcement}
        </div>
      </div>
      <div className="lpv2-foot" ref={footRef}>
        <span>{organise ? t('lp2.pages.hintPick') : t('lp2.pages.hint')}</span>
        <button
          type="button"
          className="lpv2-btn"
          data-testid="lpv2-add-page"
          onClick={addPage}
        >
          <Icon name="plus" size={16} />
          {t('lp2.pages.add')}
        </button>
      </div>
      {organise && (
        <ObjectBar
          kind="rows"
          count={picked.size}
          target={barTarget}
          actions={barActions}
          onAction={onBar}
        />
      )}
      {strip && stripFor && (
        <ContextStrip
          items={pageStripItems({
            unlocked: isUnlocked,
            canMoveUp: sibAt > 0,
            canMoveDown: sibAt >= 0 && sibAt < sibs.length - 1,
          })}
          target={() => {
            const rc = strip.el.getBoundingClientRect()
            return {
              left: rc.left,
              top: rc.top,
              width: rc.width,
              height: rc.height,
            }
          }}
          opener={strip.el}
          testId="lpv2-strip"
          onAction={act}
          onClose={() => setStrip(null)}
        />
      )}
      {extract && (
        <ExtractDialog
          db={db}
          notebookId={notebookId}
          count={extract.length}
          onCancel={() => setExtract(null)}
          onSubmit={(target) => void doExtract(extract, target)}
        />
      )}
    </>
  )
}
