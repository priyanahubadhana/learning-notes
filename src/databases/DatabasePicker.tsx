import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useId, useRef, useState } from 'react'
import type { LearningNotesDB } from '../core/db'
import { displayName, sampleName } from '../i18n/defaultNames'
import { t } from '../i18n/t'
import { listDatabases } from './databaseService'
import { STARTER_IDS, starterName } from './starterDatabases'

/** One row of the picker: an existing database or a new one from a starter. */
interface Choice {
  /** `db:<id>` or `new:<starter>`. */
  value: string
  label: string
  /** The notebook an existing database belongs to. */
  detail?: string
}

const matches = (text: string, query: string) =>
  text.toLocaleLowerCase().includes(query)

/**
 * "/database": which database to show in the note. A search box, your
 * databases first (most recently changed first, with their notebook), and
 * the ready-made ones to start from under "Create new". ↑ ↓ Enter, Esc.
 */
export function DatabasePicker({
  db,
  workspaceId,
  onDone,
}: {
  db: LearningNotesDB
  workspaceId: string
  /** The chosen value (`db:<id>` / `new:<starter>`), or null if cancelled. */
  onDone: (value: string | null) => void
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const [text, setText] = useState('')
  const [selected, setSelected] = useState(0)
  const listId = useId()

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  const existing = useLiveQuery(async () => {
    const [databases, notebooks] = await Promise.all([
      listDatabases(db, workspaceId),
      db.notebooks.toArray(),
    ])
    const names = new Map(notebooks.map((n) => [n.id, n]))
    return databases
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map<Choice>((d) => {
        const notebook = d.notebookId ? names.get(d.notebookId) : undefined
        return {
          value: `db:${d.id}`,
          label: d.title,
          detail:
            notebook && !notebook.kind
              ? displayName(sampleName(notebook))
              : t('databasePicker.loose'),
        }
      })
  }, [db, workspaceId])

  const query = text.trim().toLocaleLowerCase()
  const yours = (existing ?? []).filter(
    (c) => !query || matches(c.label, query) || matches(c.detail ?? '', query),
  )
  const created = STARTER_IDS.map<Choice>((id) => ({
    value: `new:${id}`,
    label: starterName(id),
  })).filter((c) => !query || matches(c.label, query))
  const all = [...yours, ...created]
  const active = Math.min(selected, Math.max(all.length - 1, 0))
  const optionId = (i: number) => `${listId}-${i}`

  const row = (choice: Choice, index: number) => (
    <li
      key={choice.value}
      id={optionId(index)}
      role="option"
      aria-selected={index === active}
      onPointerEnter={() => setSelected(index)}
      onClick={() => onDone(choice.value)}
      className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm ${
        index === active ? 'bg-hover' : ''
      }`}
    >
      <span className="min-w-0 flex-1 truncate">{choice.label}</span>
      {choice.detail && (
        <span className="max-w-[40%] shrink-0 truncate text-xs text-muted">
          {choice.detail}
        </span>
      )}
    </li>
  )

  return (
    <dialog
      ref={ref}
      aria-label={t('databaseBlock.choose.title')}
      onCancel={() => onDone(null)}
      onClick={(e) => {
        if (e.target === ref.current) onDone(null) // click on the backdrop
      }}
      className="m-auto max-h-[min(34rem,calc(100vh-2rem))] w-[min(30rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-3 p-4 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <h2 className="mb-2 text-[15px] font-semibold">
        {t('databaseBlock.choose.title')}
      </h2>
      <input
        autoFocus
        role="combobox"
        aria-expanded
        aria-controls={listId}
        aria-activedescendant={all.length > 0 ? optionId(active) : undefined}
        aria-label={t('databasePicker.search')}
        placeholder={t('databasePicker.search')}
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSelected(0)
        }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown') {
            e.preventDefault()
            setSelected(Math.min(active + 1, all.length - 1))
          } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setSelected(Math.max(active - 1, 0))
          } else if (e.key === 'Enter' && all[active]) {
            e.preventDefault()
            onDone(all[active].value)
          }
        }}
        className="mb-2 min-h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={t('databasePicker.yours')}
        className="max-h-[22rem] overflow-y-auto"
      >
        <li role="presentation" className="px-2.5 pt-1 pb-1 text-xs text-muted">
          {t('databasePicker.yours')}
        </li>
        {yours.map((c, i) => row(c, i))}
        {yours.length === 0 && (
          <li role="presentation" className="px-2.5 py-2 text-sm text-muted">
            {query
              ? t('databasePicker.none', { query: text.trim() })
              : t('databasePicker.empty')}
          </li>
        )}
        {created.length > 0 && (
          <li
            role="presentation"
            className="px-2.5 pt-3 pb-1 text-xs text-muted"
          >
            {t('databasePicker.create')}
          </li>
        )}
        {created.map((c, i) => row(c, yours.length + i))}
      </ul>
    </dialog>
  )
}
