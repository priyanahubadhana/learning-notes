import { Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { Fragment, type ReactNode } from 'react'
import { pageTitle } from '../app/pageTitle'
import { routeToHash } from '../app/router'
import { AnchoredMenu } from '../app/tools/AnchoredMenu'
import { useAnchoredMenu } from '../app/tools/useAnchoredMenu'
import type { LearningNotesDB } from '../core/db'
import type { Database, Notebook, Page } from '../core/types'
import { sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { listChildPages } from './pageService'
import { collapsePath, type PathStyle } from './pathStyle'

/**
 * The page path in the top bar, in the chosen style (see pathStyle.ts):
 * Simple (Notebook / Page), Full (a folder-like path where every part is a
 * link and every arrow lists the pages at that level) and Page only (the
 * name; tapping it shows the full path). Lists are pop-ups with a ✕.
 */

/** Opens a notebook (its address). */
function openNotebook(id: string): void {
  location.hash = routeToHash({ kind: 'notebook', id, parts: [] })
}

const LINK = 'max-w-[14rem] min-w-0 truncate leading-5 hover:text-ink'
const CHIP =
  'inline-flex min-h-11 items-center rounded-md px-1 hover:bg-hover hover:text-ink'

interface Part {
  key: string
  label: string
  /** The page this part is (null for the notebook or database root). */
  page: Page | null
  open: () => void
}

export function PagePath({
  db,
  style,
  notebook,
  rowDatabase,
  path,
  onOpenPage,
  onOpenDatabase,
}: {
  db: LearningNotesDB
  style: PathStyle
  notebook: Notebook | undefined
  /** A database row page is named after its database. */
  rowDatabase: Database | undefined
  path: Page[]
  onOpenPage: (pageId: string) => void
  onOpenDatabase?: (databaseId: string) => void
}) {
  const nameOf = (p: Page) => sampleName(p) || t('review.untitled')
  const rootLabel = rowDatabase?.title ?? notebook?.title ?? ''
  const root: Part = {
    key: 'root',
    label: rootLabel,
    page: null,
    open: () => {
      if (rowDatabase && onOpenDatabase) onOpenDatabase(rowDatabase.id)
      else if (notebook) openNotebook(notebook.id)
    },
  }
  const parts: Part[] = [
    root,
    ...path.map((p) => ({
      key: p.id,
      label: nameOf(p),
      page: p,
      open: () => onOpenPage(p.id),
    })),
  ]

  if (style === 'simple') {
    return (
      <Nav>
        {rowDatabase && onOpenDatabase ? (
          <button type="button" onClick={root.open} className={LINK}>
            {rootLabel}
          </button>
        ) : (
          <span className="max-w-[14rem] min-w-0 truncate">{rootLabel}</span>
        )}
        {path.map((p, i) => (
          <Fragment key={p.id}>
            <span>/</span>
            {i < path.length - 1 ? (
              <button
                type="button"
                onClick={() => onOpenPage(p.id)}
                className={LINK}
              >
                {nameOf(p)}
              </button>
            ) : (
              <span className="max-w-[14rem] min-w-0 truncate">
                {nameOf(p)}
              </span>
            )}
          </Fragment>
        ))}
      </Nav>
    )
  }

  if (style === 'page') {
    return (
      <Nav>
        <PageOnly parts={parts} />
      </Nav>
    )
  }

  // Full path, like folders.
  const { head, hidden, tail } = collapsePath(parts)
  const shown: ({ part: Part } | { dots: Part[] })[] = [
    ...head.map((part) => ({ part })),
    ...(hidden.length > 0 ? [{ dots: hidden }] : []),
    ...tail.map((part) => ({ part })),
  ]
  const siblingsOf = (before: Part | undefined) =>
    before
      ? { notebookId: notebook?.id, parentId: before.page?.id ?? null }
      : null
  return (
    <Nav>
      {shown.map((entry, i) => {
        // The arrow before an entry lists that entry's siblings: the pages under
        // the part before it in the full path.
        const first = 'dots' in entry ? entry.dots[0] : entry.part
        const before = parts[parts.indexOf(first) - 1]
        const sep =
          i === 0 ? null : (
            <Sep
              db={db}
              place={rowDatabase && before === root ? null : siblingsOf(before)}
              pathIds={new Set(path.map((p) => p.id))}
              onOpenPage={onOpenPage}
            />
          )
        return (
          <Fragment key={'dots' in entry ? 'dots' : entry.part.key}>
            {sep}
            {'dots' in entry ? (
              <Dots parts={entry.dots} />
            ) : (
              <button
                type="button"
                onClick={entry.part.open}
                aria-current={
                  entry.part.page?.id === path[path.length - 1]?.id &&
                  entry.part.page
                    ? 'page'
                    : undefined
                }
                className={`${LINK} ${
                  entry.part === parts[parts.length - 1] ? 'text-ink' : ''
                }`}
              >
                {entry.part === root && !rowDatabase ? '📘 ' : ''}
                {entry.part.label}
              </button>
            )}
          </Fragment>
        )
      })}
    </Nav>
  )
}

function Nav({ children }: { children: ReactNode }) {
  return (
    <nav
      aria-label={t('page.breadcrumb')}
      data-path
      className="flex min-w-0 flex-1 items-center gap-x-1 overflow-hidden text-sm whitespace-nowrap text-muted"
    >
      {children}
    </nav>
  )
}

/** One arrow: it lists the pages at that level (the part before it, down one). */
function Sep({
  db,
  place,
  pathIds,
  onOpenPage,
}: {
  db: LearningNotesDB
  place: { notebookId: string | undefined; parentId: string | null } | null
  /** The pages of the open page's path (ticked in the list). */
  pathIds: Set<string>
  onOpenPage: (pageId: string) => void
}) {
  const menu = useAnchoredMenu()
  const pages =
    useLiveQuery(
      async () =>
        menu.open && place?.notebookId
          ? listChildPages(db, place.notebookId, place.parentId)
          : [],
      [db, menu.open, place?.notebookId, place?.parentId],
    ) ?? []
  if (!place) return <span aria-hidden>›</span>
  return (
    <>
      <Tip id="path.sep" touchInfo={false} className="inline-flex">
        <button
          type="button"
          data-path-sep
          {...menu.trigger}
          aria-label={t('path.siblings')}
          onClick={menu.toggle}
          className={`${CHIP} min-w-8 justify-center`}
        >
          <span aria-hidden>›</span>
        </button>
      </Tip>
      <AnchoredMenu menu={menu} label={t('path.siblings')} width={260}>
        {pages.length === 0 && (
          <p className="px-2 py-2 text-sm text-muted">{t('path.noPages')}</p>
        )}
        {pages.map((p) => (
          <button
            key={p.id}
            type="button"
            role="menuitem"
            aria-current={pathIds.has(p.id) ? 'page' : undefined}
            onClick={() => {
              menu.close()
              onOpenPage(p.id)
            }}
            className="flex min-h-11 w-full items-center gap-2 rounded-lg px-2 text-left text-sm hover:bg-hover"
          >
            <span aria-hidden className="w-4 text-accent">
              {pathIds.has(p.id) ? '✓' : ''}
            </span>
            <span className="min-w-0 flex-1 truncate">{pageTitle(p)}</span>
          </button>
        ))}
      </AnchoredMenu>
    </>
  )
}

/** "…": the parts that did not fit; tapping shows them as links. */
function Dots({ parts }: { parts: Part[] }) {
  const menu = useAnchoredMenu()
  return (
    <>
      <button
        type="button"
        data-path-dots
        {...menu.trigger}
        aria-label={t('path.hidden')}
        onClick={menu.toggle}
        className={CHIP}
      >
        …
      </button>
      <AnchoredMenu menu={menu} label={t('path.hidden')} width={260}>
        {parts.map((part) => (
          <button
            key={part.key}
            type="button"
            role="menuitem"
            onClick={() => {
              menu.close()
              part.open()
            }}
            className="flex min-h-11 w-full items-center rounded-lg px-2 text-left text-sm hover:bg-hover"
          >
            <span className="min-w-0 truncate">{part.label}</span>
          </button>
        ))}
      </AnchoredMenu>
    </>
  )
}

/** "Page only": the name; a tap shows the whole path. */
function PageOnly({ parts }: { parts: Part[] }) {
  const menu = useAnchoredMenu()
  const last = parts[parts.length - 1]
  return (
    <>
      <button
        type="button"
        data-path-page
        {...menu.trigger}
        aria-label={t('path.showFull', { name: last.label })}
        onClick={menu.toggle}
        className={`${LINK} min-h-11 text-ink`}
      >
        {last.label}
      </button>
      <AnchoredMenu menu={menu} label={t('path.full')} width={280}>
        {parts.map((part, i) => (
          <button
            key={part.key}
            type="button"
            role="menuitem"
            aria-current={i === parts.length - 1 ? 'page' : undefined}
            onClick={() => {
              menu.close()
              part.open()
            }}
            style={{ paddingInlineStart: 8 + i * 14 }}
            className="flex min-h-11 w-full items-center rounded-lg pe-2 text-left text-sm hover:bg-hover"
          >
            <span className="min-w-0 truncate">{part.label}</span>
          </button>
        ))}
      </AnchoredMenu>
    </>
  )
}
