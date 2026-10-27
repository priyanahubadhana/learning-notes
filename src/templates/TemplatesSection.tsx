import { useLiveQuery } from 'dexie-react-hooks'
import { IconButton } from '../app/ui'
import type { TreeState } from '../app/useTreeState'
import { isBoolean } from '../app/uiPrefs'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { PageTree } from '../pages/PageTree'
import { listPages } from '../pages/pageService'
import { listTemplates } from './templateService'

interface TemplatesSectionProps {
  db: LearningNotesDB
  workspaceId: string
  currentPageId: string | null
  tree: TreeState
  onOpen: (pageId: string) => void
  onCreate: () => void
  onRequestDelete: (template: Page) => void
  /** A template's sub-page (see `PageTree`). */
  onRequestPageDelete: (page: Page, affectsCurrent: boolean) => void
}

/**
 * "Templates" list in the sidebar. Templates open and edit like pages; a
 * template's sub-pages fold out below it (folded at first).
 */
export function TemplatesSection({
  db,
  workspaceId,
  currentPageId,
  tree,
  onOpen,
  onCreate,
  onRequestDelete,
  onRequestPageDelete,
}: TemplatesSectionProps) {
  const templates = useLiveQuery(
    () => listTemplates(db, workspaceId),
    [db, workspaceId],
  )
  const notebookId = templates?.[0]?.notebookId
  const parents = useLiveQuery(
    async () =>
      notebookId
        ? new Set((await listPages(db, notebookId)).map((p) => p.parentId))
        : new Set<string | null>(),
    [db, notebookId],
  )
  const [open, setOpen] = usePref('templatesOpen', isBoolean, true)

  return (
    <div className="mt-4">
      <div className="flex items-center">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="flex flex-1 items-center gap-1.5 rounded-md px-2.5 py-1 text-[11px] tracking-[0.06em] text-muted uppercase hover:bg-hover"
        >
          <span aria-hidden className="w-3 text-[10px]">
            {open ? '▾' : '▸'}
          </span>
          Templates
        </button>
        <IconButton
          title="New template"
          tip="sidebar.newTemplate"
          onClick={onCreate}
        >
          +
        </IconButton>
      </div>
      {open &&
        templates?.map((t) => {
          const daily = t.templateRole === 'daily'
          const hasSubPages = parents?.has(t.id) ?? false
          const expanded = hasSubPages && tree.isPageOpen(t.id)
          return (
            <div key={t.id}>
              <div
                className={`group flex items-center gap-1.5 rounded-md py-1 pr-2 pl-[22px] text-sm ${
                  t.id === currentPageId
                    ? 'bg-hover font-medium'
                    : 'hover:bg-hover'
                }`}
              >
                {hasSubPages ? (
                  <button
                    type="button"
                    onClick={() => tree.togglePage(t.id)}
                    aria-label={expanded ? 'Collapse' : 'Expand'}
                    className="w-3.5 text-center text-[10px] text-muted"
                  >
                    {expanded ? '▾' : '▸'}
                  </button>
                ) : (
                  <span aria-hidden className="w-3.5" />
                )}
                <span aria-hidden className="w-4 text-center text-xs">
                  {daily ? '☀' : '📋'}
                </span>
                <button
                  type="button"
                  onClick={() => onOpen(t.id)}
                  title={daily ? 'Fills each new journal day' : undefined}
                  className="flex-1 truncate text-left"
                >
                  {t.title || 'Untitled template'}
                </button>
                {!daily && (
                  <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                    <IconButton
                      title="Delete template"
                      tip="sidebar.deleteTemplate"
                      onClick={() => onRequestDelete(t)}
                    >
                      ×
                    </IconButton>
                  </span>
                )}
              </div>
              {expanded && (
                <PageTree
                  db={db}
                  notebookId={t.notebookId}
                  currentPageId={currentPageId}
                  tree={tree}
                  rootId={t.id}
                  onOpen={onOpen}
                  onRequestDelete={onRequestPageDelete}
                />
              )}
            </div>
          )
        })}
    </div>
  )
}
