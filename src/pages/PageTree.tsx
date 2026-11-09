import { displayName, sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useState, type ReactNode } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { favourites, toggleFavourite } from '../app/favourites'
import { RenameInput, RowMenuButton, IconButton } from '../app/ui'
import { LazyPageMenu } from '../app/LazyNameSheet'
import { useLongPress } from '../app/useLongPress'
import { touchUi } from '../app/touchUi'
import type { TreeState } from '../app/useTreeState'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { monthLabel, shortDayLabel } from '../journal/dates'
import {
  currentPlace,
  dropIntent,
  planPageMove,
  planStep,
  type DropIntent,
  type PageMovePlan,
} from './pageDrag'
import {
  listNotePages,
  movePage,
  movePageToTopLevel,
  renamePage,
} from './pageService'

interface PageTreeProps {
  db: LearningNotesDB
  notebookId: string
  currentPageId: string | null
  tree: TreeState
  /** Journal notebook: newest first, short date labels, no add/move. */
  journal?: boolean
  /** Show only the sub-pages of this page (e.g. a template's), no moving. */
  rootId?: string
  onOpen: (pageId: string) => void
  /** `anchor`: the + button's position, for the Blank/Template menu. */
  onAddSubPage?: (parentId: string, anchor: DOMRect) => void
  /** `affectsCurrent`: the open page is this page or inside it. */
  onRequestDelete: (page: Page, affectsCurrent: boolean) => void
}

/** The nested pages of one notebook in the sidebar. Updates live. */
export function PageTree({
  db,
  notebookId,
  currentPageId,
  tree,
  journal = false,
  rootId,
  onOpen,
  onAddSubPage,
  onRequestDelete,
}: PageTreeProps) {
  const pages = useLiveQuery(
    () => listNotePages(db, notebookId),
    [db, notebookId],
  )
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const starred = favourites.useValue()
  const { toast, askName } = useContext(AppUiContext)
  const [dragId, setDragId] = useState<string | null>(null)
  const [over, setOver] = useState<{ id: string; intent: DropIntent } | null>(
    null,
  )
  // Touch: press and hold a page row for the same actions as its icons.
  const [rowMenu, setRowMenu] = useState<{
    id: string
    anchor: DOMRect
  } | null>(null)
  const menuPage = rowMenu ? pages?.find((p) => p.id === rowMenu.id) : undefined
  const hold = useLongPress((x, y) => {
    const row = document
      .elementFromPoint(x, y)
      ?.closest<HTMLElement>('[data-page-id]')
    if (row) {
      setRowMenu({
        id: row.dataset.pageId!,
        anchor: row.getBoundingClientRect(),
      })
    }
  }, true)
  if (!pages) return null

  // A move with one Undo that puts the page back where it was.
  const moveWithUndo = (id: string, plan: PageMovePlan | null) => {
    if (!plan) return
    const before = currentPlace(pages, id)
    runTask(
      movePage(db, id, plan.parentId, plan.index).then(() => {
        if (!before) return
        toast(t('tree.moved'), {
          label: t('reading.undo'),
          onSelect: () =>
            runTask(movePage(db, id, before.parentId, before.index)),
        })
      }),
    )
  }
  const canMove = !journal && !rootId
  // Touch and Pencil rename in the Name it sheet; a mouse edits in the row.
  const startRename = (page: Page) =>
    touchUi()
      ? runTask(
          askName(t('sidebar.rename.title'), page.title).then((name) =>
            name ? renamePage(db, page.id, name) : undefined,
          ),
        )
      : setRenamingId(page.id)

  // The open page and the pages above it, worked out once per draw.
  const openPath = new Set<string>()
  const parentOf = new Map(pages.map((p) => [p.id, p.parentId]))
  for (let id = currentPageId; id && !openPath.has(id);) {
    openPath.add(id)
    id = parentOf.get(id) ?? null
  }

  const childrenOf = new Map<string | null, Page[]>()
  for (const page of pages) {
    const list = childrenOf.get(page.parentId) ?? []
    list.push(page)
    childrenOf.set(page.parentId, list)
  }
  if (journal) {
    // Newest month and day first ("YYYY-MM(-DD)" keys sort as text).
    const key = (p: Page) => p.journalDate ?? p.journalMonth ?? ''
    for (const list of childrenOf.values()) {
      list.sort((a, b) => (key(a) < key(b) ? 1 : key(a) > key(b) ? -1 : 0))
    }
  }

  const renderLevel = (parentId: string | null, depth: number): ReactNode =>
    (childrenOf.get(parentId) ?? []).map((page) => {
      const hasChildren = childrenOf.has(page.id)
      const open = tree.isPageOpen(page.id)
      const active = page.id === currentPageId
      const affectsCurrent = openPath.has(page.id)

      return (
        <div key={page.id}>
          <div
            data-testid="page-row"
            data-page-id={page.id}
            draggable={canMove && renamingId !== page.id}
            onDragStart={(e) => {
              e.dataTransfer.effectAllowed = 'move'
              e.dataTransfer.setData('text/plain', page.id) // Firefox
              setDragId(page.id)
            }}
            onDragOver={(e) => {
              if (!dragId || dragId === page.id) return
              if (!planPageMove(pages, dragId, page.id, 'inside')) return
              e.preventDefault()
              const rect = e.currentTarget.getBoundingClientRect()
              const intent = dropIntent(e.clientY - rect.top, rect.height)
              if (over?.id !== page.id || over.intent !== intent) {
                setOver({ id: page.id, intent })
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dragId && over) {
                moveWithUndo(
                  dragId,
                  planPageMove(pages, dragId, over.id, over.intent),
                )
              }
              setDragId(null)
              setOver(null)
            }}
            onDragEnd={() => {
              setDragId(null)
              setOver(null)
            }}
            className={`group @container flex min-h-9 items-center gap-1.5 rounded-md py-1 pr-2 text-sm ${
              active ? 'bg-accent-soft font-medium' : 'hover:bg-hover'
            } ${dragId === page.id ? 'opacity-40' : ''} ${
              over?.id === page.id
                ? over.intent === 'before'
                  ? 'shadow-[inset_0_2px_0_var(--color-accent)]'
                  : over.intent === 'after'
                    ? 'shadow-[inset_0_-2px_0_var(--color-accent)]'
                    : 'outline-2 -outline-offset-2 outline-accent'
                : ''
            }`}
            style={{ paddingLeft: 8 + depth * 14 }}
          >
            <button
              type="button"
              onClick={() => hasChildren && tree.togglePage(page.id)}
              aria-label={t(open ? 'tree.collapse' : 'tree.expand')}
              className="w-3.5 text-center text-[10px] text-muted"
            >
              {hasChildren ? (open ? '▾' : '▸') : '·'}
            </button>
            {renamingId === page.id && !touchUi() ? (
              <RenameInput
                initial={page.title}
                onDone={(title) => {
                  setRenamingId(null)
                  if (title) runTask(renamePage(db, page.id, title))
                }}
              />
            ) : (
              <button
                type="button"
                onClick={() => onOpen(page.id)}
                onDoubleClick={() => startRename(page)}
                className="line-clamp-2 min-w-[5rem] flex-1 text-left break-words"
              >
                {page.locked ? '🔒 ' : ''}
                {page.editLocked ? '🔏 ' : ''}
                {page.journalDate && !page.customTitle
                  ? shortDayLabel(page.journalDate)
                  : page.journalMonth && !page.customTitle
                    ? monthLabel(page.journalMonth)
                    : (rootId ? displayName(page.title) : sampleName(page)) ||
                      t('review.untitled')}
              </button>
            )}
            {/* May be clipped on a deep row, so the page name keeps its room. */}
            <RowMenuButton
              name={page.title || t('review.untitled')}
              narrowToo
              onOpen={(anchor) => setRowMenu({ id: page.id, anchor })}
            />
            <span className="flex shrink-0 opacity-0 group-focus-within:opacity-100 group-hover:opacity-100 any-pointer-coarse:hidden">
              <span className="flex @max-[19rem]:hidden">
                {canMove && (
                  <>
                    <IconButton
                      title={t('tree.moveUp')}
                      tip="sidebar.moveUp"
                      onClick={() =>
                        moveWithUndo(page.id, planStep(pages, page.id, -1))
                      }
                    >
                      ↑
                    </IconButton>
                    <IconButton
                      title={t('tree.moveDown')}
                      tip="sidebar.moveDown"
                      onClick={() =>
                        moveWithUndo(page.id, planStep(pages, page.id, 1))
                      }
                    >
                      ↓
                    </IconButton>
                  </>
                )}
                {!journal && !rootId && page.parentId !== null && (
                  <IconButton
                    title={t('tree.moveTop')}
                    tip="sidebar.moveTop"
                    onClick={() => runTask(movePageToTopLevel(db, page.id))}
                  >
                    ↰
                  </IconButton>
                )}
                {!rootId && (
                  <IconButton
                    aria-label={t(
                      starred.includes(page.id) ? 'fav.remove' : 'fav.add',
                    )}
                    aria-pressed={starred.includes(page.id)}
                    onClick={() => toggleFavourite(page.id)}
                  >
                    {starred.includes(page.id) ? '★' : '☆'}
                  </IconButton>
                )}
              </span>
              {!journal && onAddSubPage && (
                <IconButton
                  title={t('tree.addSub')}
                  tip="sidebar.addSubPage"
                  onClick={(e) =>
                    onAddSubPage(
                      page.id,
                      e.currentTarget.getBoundingClientRect(),
                    )
                  }
                >
                  +
                </IconButton>
              )}
              <IconButton
                title={t('tree.deletePage')}
                tip="sidebar.deletePage"
                onClick={() => onRequestDelete(page, affectsCurrent)}
              >
                ✕
              </IconButton>
            </span>
          </div>
          {hasChildren && open && renderLevel(page.id, depth + 1)}
        </div>
      )
    })

  return (
    <div {...hold}>
      {rootId ? renderLevel(rootId, 2) : renderLevel(null, 1)}
      {rowMenu && menuPage && (
        <LazyPageMenu
          db={db}
          page={menuPage}
          anchor={rowMenu.anchor}
          toast={toast}
          rootId={rootId}
          canMove={canMove}
          canAddSub={!journal && !!onAddSubPage}
          onRename={() => startRename(menuPage)}
          onAddSub={() => onAddSubPage?.(menuPage.id, rowMenu.anchor)}
          onMove={(step) =>
            moveWithUndo(menuPage.id, planStep(pages, menuPage.id, step))
          }
          onMoveTop={
            !journal && !rootId && menuPage.parentId !== null
              ? () => runTask(movePageToTopLevel(db, menuPage.id))
              : undefined
          }
          onDelete={() => onRequestDelete(menuPage, openPath.has(menuPage.id))}
          onClose={() => setRowMenu(null)}
        />
      )}
    </div>
  )
}
