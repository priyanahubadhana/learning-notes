import { useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import { runTask } from '../app/errors'
import { PopupHeader } from '../app/tools/PopupClose'
import { readPref, writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import type { Page } from '../core/types'
import { t, type MessageKey } from '../i18n/t'
import {
  ensureLibrary,
  listPrompts,
  restorePrompt,
  savePrompt,
  seedLibrary,
  trashPrompt,
  type Library,
} from './libraryDb'
import { PromptEdit } from './PromptEdit'
import { RunPrompt } from './RunPrompt'
import { RunSkill } from './RunSkill'
import {
  PURPOSES,
  allSubjects,
  filterItems,
  newPrompt,
  starText,
  type LibraryFilter,
  type PromptItem,
} from './promptModel'

const SEEN_KEY = 'prompts.seeded'
const isStrings = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string')

/** Most rows drawn at once; "Show more" adds this many again. */
const PAGE = 50

const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'
const field = 'min-h-11 rounded-lg border border-line bg-bg px-2 text-sm'

export interface DialogProps {
  db: LearningNotesDB
  workspaceId: string
  /** The page the words come from, if any. */
  page?: Page
  onChanged?: () => void
  onClose: () => void
  /** Picker mode: choosing a row calls this instead of opening it. */
  onPick?: (item: PromptItem, lib: Library) => void
  /** Extra buttons for a row (the run view, part 2). */
  renderRowAction?: (item: PromptItem, lib: Library) => React.ReactNode
}

/**
 * The prompt library: search, filters (purpose, subject, kind), the list,
 * New prompt, and the editor. Loads the library database the first time
 * (made and seeded once). Everything is lazy: this file is only loaded when
 * a Prompts button is pressed.
 */
export default function PromptsDialog({
  db,
  workspaceId,
  page,
  onChanged,
  onClose,
  onPick,
  renderRowAction,
}: DialogProps) {
  const { toast } = useContext(AppUiContext)
  const [lib, setLib] = useState<Library | null>(null)
  const [items, setItems] = useState<PromptItem[]>([])
  const [filter, setFilter] = useState<LibraryFilter>({
    q: '',
    purpose: '',
    subject: '',
    kind: '',
  })
  const [shown, setShown] = useState(PAGE)
  const [editing, setEditing] = useState<PromptItem | null>(null)
  const [running, setRunning] = useState<PromptItem | null>(null)

  const reload = useCallback(
    async (l: Library) => {
      setItems(await listPrompts(db, l))
    },
    [db],
  )

  useEffect(() => {
    let live = true
    runTask(
      (async () => {
        const l = await ensureLibrary(db, workspaceId)
        const seen = readPref(SEEN_KEY, isStrings, [])
        const added = await seedLibrary(db, l, new Set(seen))
        if (added.length) writePref(SEEN_KEY, [...seen, ...added])
        if (!live) return
        setLib(l)
        await reload(l)
      })(),
    )
    return () => {
      live = false
    }
  }, [db, workspaceId, reload])

  const subjects = useMemo(() => allSubjects(items), [items])
  const results = useMemo(() => filterItems(items, filter), [items, filter])

  const patch = (p: Partial<LibraryFilter>) => {
    setFilter((f) => ({ ...f, ...p }))
    setShown(PAGE)
  }

  const save = async (next: PromptItem) => {
    if (!lib) return
    const old = items.find((i) => i.id === next.id)
    await savePrompt(db, lib, next, old)
    setEditing(null)
    await reload(lib)
  }

  const remove = async (item: PromptItem) => {
    if (!lib) return
    const trashed = await trashPrompt(db, item.id)
    setEditing(null)
    await reload(lib)
    toast(t('prompts.deleted'), {
      label: t('annot.undo'),
      onSelect: () =>
        runTask(restorePrompt(db, trashed).then(() => reload(lib))),
    })
  }

  return (
    <div
      data-chrome
      role="dialog"
      aria-label={t('prompts.title')}
      data-testid="prompts-dialog"
      className="fixed inset-0 z-50 flex items-start justify-center overflow-auto bg-black/30 p-3"
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div className="mt-6 w-full max-w-2xl rounded-xl border border-line bg-bg p-4 shadow-xl">
        <PopupHeader title={t('prompts.title')} onClose={onClose} />
        {!lib ? (
          <p className="py-6 text-sm text-muted">{t('prompts.loading')}</p>
        ) : running?.kind === 'skill' ? (
          <RunSkill
            db={db}
            workspaceId={workspaceId}
            page={page}
            item={running}
            lib={lib}
            onBack={() => {
              setRunning(null)
              runTask(reload(lib))
            }}
          />
        ) : running ? (
          <RunPrompt
            db={db}
            workspaceId={workspaceId}
            page={page}
            item={running}
            lib={lib}
            onBack={() => {
              setRunning(null)
              runTask(reload(lib))
            }}
            onChanged={onChanged}
          />
        ) : editing ? (
          <PromptEdit
            item={editing}
            onSave={(n) => runTask(save(n))}
            onDelete={editing.id ? () => runTask(remove(editing)) : undefined}
            onCancel={() => setEditing(null)}
          />
        ) : (
          <>
            <div className="mb-2 flex flex-wrap gap-2">
              <input
                type="search"
                autoFocus
                data-testid="prompt-search"
                aria-label={t('prompts.search')}
                placeholder={t('prompts.search')}
                value={filter.q}
                onChange={(e) => patch({ q: e.target.value })}
                onKeyDown={(e) => {
                  // Enter uses the top result.
                  const top = results[0]
                  if (e.key !== 'Enter' || !top) return
                  if (onPick) onPick(top, lib)
                  else setRunning(top)
                }}
                className={`${field} min-w-0 flex-1`}
              />
              <button
                type="button"
                data-testid="prompt-new"
                className={btn}
                onClick={() => setEditing(newPrompt('prompt'))}
              >
                {t('prompts.new')}
              </button>
              <button
                type="button"
                data-testid="skill-new"
                className={btn}
                onClick={() => setEditing(newPrompt('skill'))}
              >
                {t('prompts.newSkill')}
              </button>
            </div>
            <div className="mb-3 flex flex-wrap gap-2">
              <select
                aria-label={t('prompts.col.kind')}
                className={field}
                value={filter.kind}
                onChange={(e) =>
                  patch({ kind: e.target.value as LibraryFilter['kind'] })
                }
              >
                <option value="">{t('prompts.allKinds')}</option>
                <option value="prompt">{t('prompts.kind.prompt')}</option>
                <option value="skill">{t('prompts.kind.skill')}</option>
              </select>
              <select
                aria-label={t('prompts.col.purpose')}
                className={field}
                value={filter.purpose}
                onChange={(e) =>
                  patch({ purpose: e.target.value as LibraryFilter['purpose'] })
                }
              >
                <option value="">{t('prompts.allPurposes')}</option>
                {PURPOSES.map((p) => (
                  <option key={p} value={p}>
                    {t(`prompts.purpose.${p}` as MessageKey)}
                  </option>
                ))}
              </select>
              <select
                aria-label={t('prompts.col.subjects')}
                className={field}
                value={filter.subject}
                onChange={(e) => patch({ subject: e.target.value })}
              >
                <option value="">{t('prompts.allSubjects')}</option>
                {subjects.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            {results.length === 0 ? (
              <p className="py-6 text-sm text-muted">{t('prompts.none')}</p>
            ) : (
              <ul
                className="flex max-h-[55vh] flex-col gap-1 overflow-auto"
                data-testid="prompt-list"
              >
                {results.slice(0, shown).map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 rounded-lg border border-line px-2 py-1"
                  >
                    <button
                      type="button"
                      data-testid="prompt-row"
                      className="min-h-11 min-w-0 flex-1 text-left"
                      onClick={() =>
                        onPick ? onPick(item, lib) : setRunning(item)
                      }
                    >
                      <span className="block truncate text-sm font-medium">
                        {item.kind === 'skill' ? '⛓ ' : ''}
                        {item.name}
                      </span>
                      <span className="block truncate text-xs text-muted">
                        {t(`prompts.purpose.${item.purpose}` as MessageKey)}
                        {item.subjects.length > 0 &&
                          ` · ${item.subjects.join(', ')}`}
                        {item.stars > 0 && ` · ${starText(item.stars)}`}
                      </span>
                    </button>
                    {renderRowAction?.(item, lib)}
                    {!onPick && (
                      <button
                        type="button"
                        className={btn}
                        aria-label={t('prompts.editNamed', { name: item.name })}
                        onClick={() => setEditing(item)}
                      >
                        {t('prompts.edit')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {results.length > shown && (
              <button
                type="button"
                className={`${btn} mt-2`}
                onClick={() => setShown((n) => n + PAGE)}
              >
                {t('prompts.showMore', { count: results.length - shown })}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}
