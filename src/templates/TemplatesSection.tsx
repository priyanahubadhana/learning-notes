import { useLiveQuery } from 'dexie-react-hooks'
import { IconButton } from '../app/ui'
import { isBoolean } from '../app/uiPrefs'
import { usePref } from '../app/usePref'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { listTemplates } from './templateService'

interface TemplatesSectionProps {
  db: LearningNotesDB
  workspaceId: string
  currentPageId: string | null
  onOpen: (pageId: string) => void
  onCreate: () => void
  onRequestDelete: (template: Page) => void
}

/** "Templates" list in the sidebar. Templates open and edit like pages. */
export function TemplatesSection({
  db,
  workspaceId,
  currentPageId,
  onOpen,
  onCreate,
  onRequestDelete,
}: TemplatesSectionProps) {
  const templates = useLiveQuery(
    () => listTemplates(db, workspaceId),
    [db, workspaceId],
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
        <IconButton title="New template" onClick={onCreate}>
          +
        </IconButton>
      </div>
      {open &&
        templates?.map((t) => {
          const daily = t.templateRole === 'daily'
          return (
            <div
              key={t.id}
              className={`group flex items-center gap-1.5 rounded-md py-1 pr-2 pl-5 text-sm ${
                t.id === currentPageId
                  ? 'bg-hover font-medium'
                  : 'hover:bg-hover'
              }`}
            >
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
                    onClick={() => onRequestDelete(t)}
                  >
                    ×
                  </IconButton>
                </span>
              )}
            </div>
          )
        })}
    </div>
  )
}
