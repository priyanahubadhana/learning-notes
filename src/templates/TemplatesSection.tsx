import { displayName } from '../i18n/defaultNames'
import { t as tr } from '../i18n/t'
import type { ReactNode } from 'react'
import { Tip } from '../help/Help'
import { useLiveQuery } from 'dexie-react-hooks'
import { IconButton } from '../app/ui'
import type { TreeState } from '../app/useTreeState'
import { SidebarGroup } from '../app/SidebarGroup'
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

  const collapseLabel = tr('tree.collapse')
  const expandLabel = tr('tree.expand')

  return (
    <SidebarGroup
      id="templates"
      prefKey="templatesOpen"
      title={tr('templates.heading')}
      defaultOpen={false}
      action={
        <IconButton
          title={tr('templates.new')}
          tip="sidebar.newTemplate"
          onClick={onCreate}
        >
          +
        </IconButton>
      }
    >
      {templates?.map((t) => {
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
                  aria-label={expanded ? collapseLabel : expandLabel}
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
              <DailyTip daily={daily}>
                <button
                  type="button"
                  onClick={() => onOpen(t.id)}
                  className="flex-1 truncate text-left"
                >
                  {displayName(t.title) || tr('templates.untitled')}
                </button>
              </DailyTip>
              {!daily && (
                <span className="flex opacity-0 group-focus-within:opacity-100 group-hover:opacity-100">
                  <IconButton
                    title={tr('templates.delete')}
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
    </SidebarGroup>
  )
}

/** The Daily journal template explains itself; other templates need no tip. */
function DailyTip({
  daily,
  children,
}: {
  daily: boolean
  children: ReactNode
}) {
  return daily ? (
    <Tip
      id="sidebar.dailyTemplate"
      className="flex min-w-0 flex-1"
      touchInfo={false}
    >
      {children}
    </Tip>
  ) : (
    <>{children}</>
  )
}
