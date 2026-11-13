import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useMemo, useRef, useState } from 'react'
import { AppUiContext } from '../../appUi'
import { usePref } from '../../usePref'
import { AnchoredMenu } from '../../tools/AnchoredMenu'
import { Icon } from '../../tools/icons'
import { useAnchoredMenu } from '../../tools/useAnchoredMenu'
import { formatDuration } from '../../../audio/recordingService'
import type { LearningNotesDB } from '../../../core/db'
import { ClearField } from '../../../design/parts/ClearField'
import { EmptyState } from '../../../design/parts/EmptyState'
import { sampleName } from '../../../i18n/defaultNames'
import { t } from '../../../i18n/t'
import { listNotePages } from '../../../pages/pageService'
import { useUnlocked } from '../../../settings/level'
import { outlineRequest } from '../outlineRequest'
import { rowWindow } from './pageOrganise'
import {
  RES_BLOCK_TYPES,
  RES_FILTERS,
  RES_ICON,
  effectiveScope,
  filterResources,
  isResFilter,
  isResScope,
  resourcesOfBlocks,
  scopesOn,
  type ResFilter,
  type ResItem,
  type ResScope,
} from './resourcesModel'

/** Every resource row is this tall (60 px card + 6 px gap), so the list can be windowed. */
const RES_H = 70
/** "Everywhere" reads at most this many blocks, so it stays fast with a big library. */
const EVERYWHERE_CAP = 600

const KIND_KEY: Record<ResFilter, string> = {
  all: 'lp2.res.all',
  image: 'lp2.res.image',
  link: 'lp2.res.link',
  ref: 'lp2.res.ref',
  note: 'lp2.res.note',
  audio: 'lp2.res.audio',
  file: 'lp2.res.file',
}

interface Loaded {
  items: ResItem[]
  titles: Map<string, string>
}

/** The notes' pictures, links, references, notes, recordings and files in one scope. */
async function loadResources(
  db: LearningNotesDB,
  scope: ResScope,
  notebookId: string,
  pageId: string,
): Promise<Loaded> {
  const pageIds =
    scope === 'page'
      ? [pageId]
      : scope === 'notebook'
        ? (await listNotePages(db, notebookId)).map((p) => p.id)
        : null
  const blocks = pageIds
    ? await db.blocks
        .where('pageId')
        .anyOf(pageIds)
        .filter((b) => b.deletedAt === null && RES_BLOCK_TYPES.has(b.type))
        .toArray()
    : await db.blocks
        .filter((b) => b.deletedAt === null && RES_BLOCK_TYPES.has(b.type))
        .limit(EVERYWHERE_CAP)
        .toArray()
  const items = resourcesOfBlocks(blocks)
  // Recordings: only the name and length are kept (the sound stays in the database).
  const rec = pageIds
    ? db.recordings.where('pageId').anyOf(pageIds)
    : db.recordings.toCollection()
  await rec
    .filter((r) => r.deletedAt === null)
    .limit(300)
    .each((r) =>
      items.push({
        id: r.id,
        kind: 'audio',
        title: r.name,
        pageId: r.pageId,
        durationMs: r.durationMs,
        copy: r.name,
      }),
    )
  // Locked pages and locked notebooks show nothing (never readable while locked).
  const ids = [...new Set(items.map((i) => i.pageId))]
  const pages = await db.pages.bulkGet(ids)
  const notebooks = await db.notebooks.bulkGet([
    ...new Set(pages.flatMap((p) => (p ? [p.notebookId] : []))),
  ])
  const lockedBook = new Set(
    notebooks.flatMap((n) => (n && n.locked ? [n.id] : [])),
  )
  const titles = new Map<string, string>()
  const visible = new Set<string>()
  pages.forEach((p, i) => {
    if (!p || p.deletedAt !== null || p.locked || lockedBook.has(p.notebookId))
      return
    visible.add(ids[i])
    titles.set(p.id, sampleName(p) || t('review.untitled'))
  })
  return { items: items.filter((i) => visible.has(i.pageId)), titles }
}

/**
 * Resources (NB-B50, NB-P41): what the notes already hold, by scope (This
 * page, Notebook; Everywhere behind `nb.resourceScope`) and kind. Rows
 * open their page or copy their text.
 */
export function ResourcesTab({
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
  const everywhere = useUnlocked('nb.resourceScope')
  const { toast } = useContext(AppUiContext)
  const [savedScope, setScope] = usePref<ResScope>(
    'leftPanel.res.scope',
    isResScope,
    'page',
  )
  const [kind, setKind] = usePref<ResFilter>(
    'leftPanel.res.kind',
    isResFilter,
    'all',
  )
  const scope = effectiveScope(savedScope, everywhere)
  const [query, setQuery] = useState('')
  // The reader's "Audio" request lands here with the Audio chip on.
  const ask = outlineRequest.useValue()
  useEffect(() => {
    if (ask.n > 0 && Date.now() - ask.at < 1500 && ask.tab === 'audio')
      setKind('audio')
  }, [ask, setKind])

  const data = useLiveQuery(
    () => loadResources(db, scope, notebookId, pageId),
    [db, scope, notebookId, pageId],
  )
  const shown = useMemo(
    () => filterResources(data?.items ?? [], kind, query),
    [data, kind, query],
  )

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
  }, [])
  const win = rowWindow(shown.length, RES_H, scrollTop, viewH)

  const copy = (text: string) => {
    void navigator.clipboard
      ?.writeText(text)
      .then(() => toast(t('lp2.res.copied')))
      .catch(() => toast(t('lp2.res.copyFailed')))
  }

  return (
    <>
      <div
        className="lpv2-bar"
        style={{ flexDirection: 'column', alignItems: 'stretch' }}
      >
        <ClearField
          type="search"
          value={query}
          placeholder={t('lp2.res.find')}
          aria-label={t('lp2.res.find')}
          data-testid="lpv2-res-find"
          autoComplete="off"
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
        />
        <div
          className="lpv2-seg"
          role="group"
          aria-label={t('lp2.res.scope')}
          data-testid="lpv2-scope"
        >
          {scopesOn(everywhere).map((s) => (
            <button
              key={s}
              type="button"
              data-scope={s}
              aria-pressed={scope === s}
              onClick={() => {
                setScope(s)
                scroller.current?.scrollTo({ top: 0 })
                setScrollTop(0)
              }}
            >
              {t(`lp2.res.scope.${s}`)}
            </button>
          ))}
        </div>
        <div
          className="lpv2-chips"
          role="group"
          aria-label={t('lp2.res.kind')}
          data-testid="lpv2-kinds"
        >
          {RES_FILTERS.map((k) => (
            <button
              key={k}
              type="button"
              className="lpv2-chip"
              data-kind={k}
              aria-pressed={kind === k}
              onClick={() => setKind(k)}
            >
              {k !== 'all' && <Icon name={RES_ICON[k]} size={16} />}
              {t(KIND_KEY[k] as 'lp2.res.all')}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={scroller}
        className="lpv2-scroll"
        data-testid="lpv2-res-scroll"
        onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
      >
        {data && shown.length === 0 ? (
          <EmptyState
            variant="inline"
            icon="inbox"
            text={t('lp2.res.empty')}
            testId="lpv2-res-empty"
          />
        ) : (
          <ul
            role="list"
            aria-label={t('lp2.tab.resources')}
            className="lpv2-list"
            data-testid="lpv2-resources"
            data-rows={win.to - win.from}
            style={
              {
                height: shown.length * RES_H,
                '--lpv2-res-h': `${RES_H}px`,
              } as React.CSSProperties
            }
          >
            {shown.slice(win.from, win.to).map((r, i) => (
              <li
                key={r.id}
                className="lpv2-res"
                data-testid="lpv2-resource"
                data-kind={r.kind}
                style={{ top: (win.from + i) * RES_H }}
              >
                <span className="lpv2-th" aria-hidden="true">
                  <Icon name={RES_ICON[r.kind]} size={18} />
                </span>
                <span className="lpv2-text">
                  <b title={r.title}>{r.title}</b>
                  <small>
                    {r.durationMs !== undefined
                      ? `${formatDuration(r.durationMs)} · `
                      : ''}
                    {data?.titles.get(r.pageId) ?? ''}
                  </small>
                </span>
                <ResMenu
                  item={r}
                  onOpen={() => onOpenPage(r.pageId)}
                  onCopy={() => copy(r.copy)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="lpv2-foot">
        <span>{t('lp2.res.hint')}</span>
      </div>
    </>
  )
}

/** The ⋯ of one row: open its page, copy its text. */
function ResMenu({
  item,
  onOpen,
  onCopy,
}: {
  item: ResItem
  onOpen: () => void
  onCopy: () => void
}) {
  const menu = useAnchoredMenu()
  const pick = (fn: () => void) => {
    menu.close()
    fn()
  }
  return (
    <>
      <button
        type="button"
        className="lpv2-more"
        {...menu.trigger}
        aria-label={t('lp2.res.more', { name: item.title })}
        onClick={menu.toggle}
      >
        <Icon name="more" size={18} />
      </button>
      <AnchoredMenu menu={menu} label={t('lp2.res.more', { name: item.title })}>
        <div className="tabrow-menu" data-testid="lpv2-res-menu">
          <button type="button" role="menuitem" onClick={() => pick(onOpen)}>
            {t('lp2.res.openPage')}
          </button>
          <button type="button" role="menuitem" onClick={() => pick(onCopy)}>
            {t('lp2.res.copy')}
          </button>
        </div>
      </AnchoredMenu>
    </>
  )
}
