import { useLiveQuery } from 'dexie-react-hooks'
import { useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { LearningNotesDB } from '../../core/db'
import { createId } from '../../core/ids'
import type { Database, DbColumn, JsonObject } from '../../core/types'
import { t, type MessageKey } from '../../i18n/t'
import { TAG_COLORS } from '../../tags/tagTools'
import { tagColorStyle } from '../../tags/tagStyle'
import { cellText, DEFAULT_STAR_MAX } from '../cellDisplay'
import {
  getColumnType,
  TITLE_COLUMN_ID,
  type ChoiceOption,
} from '../columnTypes'
import type { DatabaseData } from '../databaseQuery'
import {
  addColumn,
  addRelationColumn,
  changeColumnType,
  deleteColumn,
  listDatabases,
  renameColumn,
  restoreColumn,
  ROLLUP_FUNCTIONS,
  setRelationTwoWay,
  titleColumnName,
  updateColumnConfig,
} from '../databaseService'
import { typeName } from './columnLook'
import { previewFormula } from './formulaPreview'

/** What the dialog works on: a new column, a column, or the title column. */
export type ColumnTarget =
  | { kind: 'new'; type: string }
  | { kind: 'edit'; column: DbColumn }
  | { kind: 'title' }

/** Types a column can be changed to (relations keep their type). */
const EDIT_TYPES = [
  'text',
  'number',
  'date',
  'choice',
  'choices',
  'checkbox',
  'url',
  'tag',
  'noteLink',
  'formula',
  'rollup',
]

const field =
  'min-h-9 w-full rounded-lg border border-line bg-bg px-2.5 text-sm outline-none focus:border-accent'

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="mb-3 block">
      <span className="mb-1 block text-xs text-muted">{label}</span>
      {children}
    </label>
  )
}

/** Settings a rollup starts with: the first relation, its rows' titles, count. */
function rollupStart(columns: readonly DbColumn[]): JsonObject {
  const relation = columns.find((c) => c.type === 'relation')
  return relation
    ? {
        relationColumnId: relation.id,
        targetColumnId: TITLE_COLUMN_ID,
        fn: 'count',
      }
    : { relationColumnId: '', targetColumnId: '', fn: 'count' }
}

/**
 * Adds or edits a column: name, type and the type's settings (number
 * format, options, formula with a live preview, relation target, rollup).
 * Editing also offers Delete (with Undo).
 */
export function ColumnDialog({
  db,
  data,
  database,
  target,
  now,
  onClose,
}: {
  db: LearningNotesDB
  data: DatabaseData
  database: Database
  target: ColumnTarget
  now: number
  onClose: () => void
}) {
  const ui = useContext(AppUiContext)
  const ref = useRef<HTMLDialogElement>(null)
  const columns = data.databases.get(database.id)?.columns ?? []
  const editing = target.kind === 'edit' ? target.column : undefined
  const startType =
    target.kind === 'new' ? target.type : (editing?.type ?? 'text')

  const [name, setName] = useState(() =>
    target.kind === 'title'
      ? titleColumnName(database)
      : (editing?.name ?? typeName(startType)),
  )
  const [type, setType] = useState(startType)
  const [config, setConfig] = useState<JsonObject>(() =>
    editing
      ? editing.config
      : startType === 'rollup'
        ? rollupStart(columns)
        : (getColumnType(startType)?.defaultConfig?.() ?? {}),
  )
  const [targetId, setTargetId] = useState('')
  const [twoWay, setTwoWay] = useState(
    editing ? typeof editing.config.pairedColumnId === 'string' : true,
  )
  const [newOption, setNewOption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const databases = useLiveQuery(
    () => listDatabases(db, database.workspaceId),
    [db, database.workspaceId],
  )

  useEffect(() => {
    ref.current?.showModal()
    ref.current?.querySelector('input')?.select()
  }, [])

  const typeChanged = editing !== undefined && type !== editing.type
  const patch = (changes: JsonObject) => setConfig({ ...config, ...changes })
  const options = Array.isArray(config.options)
    ? (config.options as unknown as ChoiceOption[])
    : []
  const relations = columns.filter(
    (c) => c.type === 'relation' && c.id !== editing?.id,
  )
  const relation = columns.find((c) => c.id === config.relationColumnId)
  const relatedColumns = relation
    ? (data.databases.get(String(relation.config.databaseId))?.columns ?? [])
    : []
  const relationTarget =
    targetId || databases?.find((d) => d.id !== database.id)?.id || database.id
  const isBack = editing?.type === 'relation' && editing.config.back === true

  /** The settings saved for the chosen type. */
  const settings = (): JsonObject => {
    if (type === 'number') {
      const format = config.format ?? 'number'
      return {
        format,
        ...(format === 'currency' && {
          currency: String(config.currency ?? '')
            .trim()
            .toUpperCase(),
        }),
        ...(format === 'stars' && { max: config.max ?? DEFAULT_STAR_MAX }),
      }
    }
    if (type === 'date') return { includeTime: config.includeTime === true }
    if (type === 'choice' || type === 'choices') {
      // A changed type gets its options from the old values (see service).
      return typeChanged ? {} : { options: config.options ?? [] }
    }
    if (type === 'formula') return { formula: String(config.formula ?? '') }
    if (type === 'rollup') {
      return {
        relationColumnId: config.relationColumnId ?? '',
        targetColumnId: config.targetColumnId ?? '',
        fn: config.fn ?? 'count',
      }
    }
    return {}
  }

  const save = async () => {
    setError(null)
    try {
      if (target.kind === 'title') {
        await renameColumn(db, database.id, TITLE_COLUMN_ID, name)
      } else if (target.kind === 'new') {
        if (type === 'relation') {
          await addRelationColumn(db, database.id, {
            name,
            targetDatabaseId: relationTarget,
            twoWay,
          })
        } else {
          await addColumn(db, database.id, { name, type, config: settings() })
        }
      } else if (editing) {
        if (name.trim() && name !== editing.name) {
          await renameColumn(db, database.id, editing.id, name)
        }
        if (typeChanged) await changeColumnType(db, editing.id, type)
        const changes = settings()
        if (Object.keys(changes).length > 0) {
          await updateColumnConfig(db, editing.id, changes)
        }
        const hadPartner = typeof editing.config.pairedColumnId === 'string'
        if (editing.type === 'relation' && !isBack && twoWay !== hadPartner) {
          await setRelationTwoWay(db, editing.id, twoWay)
        }
      }
      onClose()
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    }
  }

  const remove = async () => {
    if (!editing) return
    await deleteColumn(db, editing.id)
    onClose()
    ui.toast(t('column.deleted', { name: editing.name }), {
      label: t('review.undo'),
      onSelect: () => void restoreColumn(db, editing.id),
    })
  }

  const addOption = () => {
    const clean = newOption.replace(/\s+/g, ' ').trim()
    if (!clean) return
    const lower = clean.toLocaleLowerCase()
    if (!options.some((o) => o.name.toLocaleLowerCase() === lower)) {
      const option: ChoiceOption = {
        id: createId(),
        name: clean,
        color: TAG_COLORS[options.length % TAG_COLORS.length],
      }
      patch({ options: [...options, option] as unknown as JsonObject[] })
    }
    setNewOption('')
  }
  const setOptions = (next: ChoiceOption[]) =>
    patch({ options: next as unknown as JsonObject[] })

  const preview =
    type === 'formula'
      ? previewFormula(data, String(config.formula ?? ''), now, editing?.id)
      : null
  const dateName = columns.find((c) => c.type === 'date')?.name
  // A number column with a limit that fits it: under 75 %, under 3 stars …
  const numbers = columns.filter((c) => c.type === 'number')
  const scored =
    numbers.find((c) => c.config.format === 'percent') ??
    numbers.find((c) => c.config.format === 'stars') ??
    numbers[0]
  const numberName = scored?.name
  const limit =
    scored?.config.format === 'percent'
      ? '0.75'
      : scored?.config.format === 'stars'
        ? '3'
        : '10'
  const examples: [string, MessageKey][] = [
    [`DAYS([${dateName ?? 'Exam date'}], TODAY())`, 'column.example.days'],
    [
      `IF([${numberName ?? 'Score'}] < ${limit}, "Redo", "OK")`,
      'column.example.label',
    ],
    [`[${numberName ?? 'Score'}] * 1.5`, 'column.example.math'],
  ]

  const title =
    target.kind === 'new'
      ? t('column.newTitle', { type: typeName(type) })
      : t('column.editTitle')
  const cantSave = type === 'rollup' && !config.relationColumnId

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose() // click on the backdrop
      }}
      className="m-auto max-h-[calc(100vh-2rem)] w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-bg p-5 text-ink shadow-[0_12px_32px_rgba(0,0,0,0.14)] backdrop:bg-black/20"
    >
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
      >
        <h2 className="mb-3 text-[15px] font-semibold">{title}</h2>
        <Field label={t('column.name')}>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={field}
          />
        </Field>
        {target.kind === 'title' && (
          <p className="mb-3 text-xs text-muted">{t('column.titleHint')}</p>
        )}

        {editing && editing.type !== 'relation' && (
          <Field label={t('column.type')}>
            <select
              value={type}
              onChange={(e) => {
                const next = e.target.value
                setType(next)
                if (next === 'rollup' && !config.relationColumnId) {
                  patch(rollupStart(columns))
                }
              }}
              className={field}
            >
              {EDIT_TYPES.map((ty) => (
                <option key={ty} value={ty}>
                  {typeName(ty)}
                </option>
              ))}
            </select>
          </Field>
        )}
        {editing?.type === 'relation' && (
          <p className="mb-3 text-xs text-muted">{t('column.typeLocked')}</p>
        )}

        {type === 'number' && (
          <>
            <Field label={t('column.format')}>
              <select
                value={String(config.format ?? 'number')}
                onChange={(e) => patch({ format: e.target.value })}
                className={field}
              >
                {['number', 'percent', 'currency', 'stars'].map((f) => (
                  <option key={f} value={f}>
                    {t(`column.format.${f}` as MessageKey)}
                  </option>
                ))}
              </select>
            </Field>
            {config.format === 'currency' && (
              <Field label={t('column.currency')}>
                <input
                  value={String(config.currency ?? '')}
                  maxLength={3}
                  placeholder="INR"
                  aria-describedby="currency-hint"
                  onChange={(e) => patch({ currency: e.target.value })}
                  className={`${field} uppercase`}
                />
                <span
                  id="currency-hint"
                  className="mt-1 block text-xs text-muted"
                >
                  {t('column.currencyHint')}
                </span>
              </Field>
            )}
            {config.format === 'stars' && (
              <Field label={t('column.starMax')}>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={Number(config.max ?? DEFAULT_STAR_MAX)}
                  onChange={(e) =>
                    patch({
                      max: Math.max(
                        1,
                        Math.min(10, Math.round(+e.target.value || 1)),
                      ),
                    })
                  }
                  className={field}
                />
              </Field>
            )}
          </>
        )}

        {type === 'date' && (
          <label className="mb-3 flex min-h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={config.includeTime === true}
              onChange={(e) => patch({ includeTime: e.target.checked })}
            />
            {t('column.includeTime')}
          </label>
        )}

        {(type === 'choice' || type === 'choices') && !typeChanged && (
          <fieldset className="mb-3">
            <legend className="mb-1 text-xs text-muted">
              {t('column.options')}
            </legend>
            <ul className="mb-1.5 flex flex-col gap-1">
              {options.map((option, i) => (
                <li key={option.id} className="flex items-center gap-1.5">
                  <span
                    aria-hidden
                    className="tag-dot shrink-0"
                    style={tagColorStyle(option.color)}
                  />
                  <input
                    aria-label={t('column.options')}
                    value={option.name}
                    onChange={(e) =>
                      setOptions(
                        options.map((o, j) =>
                          j === i ? { ...o, name: e.target.value } : o,
                        ),
                      )
                    }
                    className={field}
                  />
                  <button
                    type="button"
                    aria-label={t('column.removeOption', { name: option.name })}
                    onClick={() =>
                      setOptions(options.filter((_, j) => j !== i))
                    }
                    className="min-h-9 min-w-9 rounded-lg text-muted hover:bg-hover hover:text-ink"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <input
              aria-label={t('column.addOption')}
              placeholder={t('column.addOption')}
              value={newOption}
              onChange={(e) => setNewOption(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addOption()
                }
              }}
              onBlur={addOption}
              className={field}
            />
          </fieldset>
        )}

        {type === 'formula' && (
          <>
            <p className="mb-2 text-xs text-muted">{t('column.formulaHint')}</p>
            <Field label={t('column.formula')}>
              <input
                value={String(config.formula ?? '')}
                spellCheck={false}
                onChange={(e) => patch({ formula: e.target.value })}
                className={`${field} font-mono`}
              />
            </Field>
            <p className="mb-3 text-sm" aria-live="polite">
              {preview ? (
                <>
                  {t('column.preview', {
                    row: preview.title || t('review.untitled'),
                  })}{' '}
                  <b>{cellText(preview.value) || '—'}</b>
                </>
              ) : (
                <span className="text-muted">{t('column.previewNoRows')}</span>
              )}
            </p>
            <div className="mb-3">
              <div className="mb-1 text-xs text-muted">
                {t('column.examples')}
              </div>
              {examples.map(([formula, hint]) => (
                <button
                  key={hint}
                  type="button"
                  onClick={() => patch({ formula })}
                  className="block min-h-8 w-full rounded-md px-2 text-start text-[13px] hover:bg-hover"
                >
                  <code>{formula}</code>
                  <span className="text-muted"> · {t(hint)}</span>
                </button>
              ))}
            </div>
          </>
        )}

        {type === 'relation' && target.kind === 'new' && (
          <Field label={t('column.relationTo')}>
            <select
              value={relationTarget}
              onChange={(e) => setTargetId(e.target.value)}
              className={field}
            >
              {databases?.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.id === database.id
                    ? t('column.thisDatabase', { name: d.title })
                    : d.title}
                </option>
              ))}
            </select>
          </Field>
        )}
        {type === 'relation' && !isBack && (
          <label className="mb-3 flex min-h-9 items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={twoWay}
              onChange={(e) => setTwoWay(e.target.checked)}
            />
            {t('column.twoWay')}
          </label>
        )}

        {type === 'rollup' &&
          (relations.length === 0 ? (
            <p className="mb-3 text-sm text-muted">
              {t('column.needRelation')}
            </p>
          ) : (
            <>
              <Field label={t('column.rollupRelation')}>
                <select
                  value={String(config.relationColumnId ?? '')}
                  onChange={(e) =>
                    patch({
                      relationColumnId: e.target.value,
                      targetColumnId: TITLE_COLUMN_ID,
                    })
                  }
                  className={field}
                >
                  {relations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('column.rollupTarget')}>
                <select
                  value={String(config.targetColumnId ?? TITLE_COLUMN_ID)}
                  onChange={(e) => patch({ targetColumnId: e.target.value })}
                  className={field}
                >
                  <option value={TITLE_COLUMN_ID}>
                    {relation &&
                      titleColumnName(
                        data.databases.get(String(relation.config.databaseId))
                          ?.database ?? database,
                      )}
                  </option>
                  {relatedColumns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t('column.rollupFn')}>
                <select
                  value={String(config.fn ?? 'count')}
                  onChange={(e) => patch({ fn: e.target.value })}
                  className={field}
                >
                  {ROLLUP_FUNCTIONS.map((fn) => (
                    <option key={fn} value={fn}>
                      {t(`rollup.${fn}` as MessageKey)}
                    </option>
                  ))}
                </select>
              </Field>
            </>
          ))}

        {error && (
          <p role="alert" className="mb-3 text-sm text-danger">
            {error}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2 text-sm">
          {editing && (
            <button
              type="button"
              onClick={() => void remove()}
              className="me-auto min-h-9 rounded-lg px-3 text-danger hover:bg-hover"
            >
              {t('column.delete')}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="min-h-9 rounded-lg px-3 text-muted hover:bg-hover hover:text-ink"
          >
            {t('dialog.cancel')}
          </button>
          <button
            type="submit"
            disabled={cantSave}
            className="min-h-9 rounded-lg bg-accent px-3 font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {target.kind === 'new' ? t('column.add') : t('dialog.save')}
          </button>
        </div>
      </form>
    </dialog>
  )
}
