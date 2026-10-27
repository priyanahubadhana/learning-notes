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
  choiceOptions,
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
import {
  firstOptionName,
  formulaMeaning,
  formulaRule,
  needsValue,
  ruleFormula,
  ruleOpLabel,
  ruleOps,
  type FormulaRule,
  type RuleColumn,
  type RuleOp,
} from './formulaSentence'

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

/** A number column a formula can test, with a limit that fits it. */
function scoredColumn(columns: readonly DbColumn[]) {
  const numbers = columns.filter((c) => c.type === 'number')
  const column =
    numbers.find((c) => c.config.format === 'percent') ??
    numbers.find((c) => c.config.format === 'stars') ??
    numbers[0]
  if (!column) return null
  const format = column.config.format
  // Under 75 %, under 3 stars, under 10.
  const limit = format === 'percent' ? 0.75 : format === 'stars' ? 3 : 10
  return { column, limit }
}

/** The sentence a new formula starts with ("If Confidence is below 3 …"). */
function startRule(columns: readonly RuleColumn[]): FormulaRule {
  const scored = scoredColumn(
    columns.flatMap((c) => (c.column ? [c.column] : [])),
  )
  if (scored) {
    const { column, limit } = scored
    return {
      columnName: column.name,
      op: 'lt',
      value: column.config.format === 'percent' ? '75' : String(limit),
      then: t('formula.builder.defaultThen'),
      otherwise: t('formula.builder.defaultOtherwise'),
    }
  }
  return {
    columnName: columns[0]?.name ?? '',
    op: 'notEmpty',
    value: '',
    then: t('formula.builder.yes'),
    otherwise: t('formula.builder.no'),
  }
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
  // Formulas: the sentence builder, or typed (Advanced) when it can't show one.
  const ruleColumns: RuleColumn[] = [
    { name: titleColumnName(database), column: null },
    ...columns
      .filter((c) => c.id !== editing?.id)
      .map((c) => ({ name: c.name, column: c })),
  ]
  const startFormula = String(editing?.config.formula ?? '')
  const [rule, setRule] = useState<FormulaRule>(
    () => formulaRule(startFormula, ruleColumns) ?? startRule(ruleColumns),
  )
  const [advanced, setAdvanced] = useState(
    () =>
      startFormula.trim() !== '' &&
      formulaRule(startFormula, ruleColumns) === null,
  )
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
    if (type === 'formula') return { formula: formulaText ?? '' }
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

  const ruleTarget =
    ruleColumns.find((c) => c.name === rule.columnName) ?? ruleColumns[0]
  const typed = String(config.formula ?? '')
  const formulaText = advanced ? typed : ruleFormula(rule, ruleTarget.column)
  const preview =
    type === 'formula'
      ? previewFormula(data, formulaText ?? '', now, editing?.id)
      : null
  const meaning = advanced ? formulaMeaning(typed, ruleColumns) : null
  const setRuleColumn = (columnName: string) => {
    const next = ruleColumns.find((c) => c.name === columnName)?.column ?? null
    const ops = ruleOps(next)
    setRule({
      ...rule,
      columnName,
      op: ops.includes(rule.op) ? rule.op : ops[0],
      value: next?.type === 'choice' ? firstOptionName(next) : '',
    })
  }
  const toAdvanced = () => {
    patch({ formula: formulaText ?? '' })
    setAdvanced(true)
  }
  const typedRule = formulaRule(typed, ruleColumns)
  const toSimple = () => {
    if (typedRule) setRule(typedRule)
    setAdvanced(false)
  }
  /** Picks an example: simple ones open in the builder, others as typed. */
  const pickExample = (formula: string) => {
    const picked = formulaRule(formula, ruleColumns)
    if (picked) {
      setRule(picked)
      setAdvanced(false)
    } else {
      patch({ formula })
      setAdvanced(true)
    }
  }
  const dateName = columns.find((c) => c.type === 'date')?.name
  const scored = scoredColumn(columns.filter((c) => c.id !== editing?.id))
  const examples = [
    dateName && `DAYS([${dateName}], TODAY())`,
    scored &&
      `IF([${scored.column.name}] < ${scored.limit}, "${t('formula.builder.defaultThen')}", "${t('formula.builder.defaultOtherwise')}")`,
    scored && `[${scored.column.name}] * 1.5`,
  ].flatMap((formula) => {
    const sentence = formula && formulaMeaning(formula, ruleColumns)
    return formula && sentence ? [{ formula, sentence }] : []
  })

  const title =
    target.kind === 'new'
      ? t('column.newTitle', { type: typeName(type) })
      : t('column.editTitle')
  const cantSave =
    (type === 'rollup' && !config.relationColumnId) ||
    (type === 'formula' && formulaText === null)

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
            {advanced ? (
              <>
                <Field label={t('column.formula')}>
                  <input
                    value={typed}
                    spellCheck={false}
                    onChange={(e) => patch({ formula: e.target.value })}
                    className={`${field} font-mono`}
                  />
                </Field>
                <p className="-mt-2 mb-2 text-xs text-muted">
                  {meaning
                    ? t('formula.means', { text: meaning })
                    : t('column.formulaHint')}
                </p>
                {(typedRule || typed.trim() === '') && (
                  <button
                    type="button"
                    onClick={toSimple}
                    className="mb-3 min-h-8 text-[13px] text-accent hover:underline"
                  >
                    {t('column.simple')}
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="mb-3 grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2.5 gap-y-2 text-sm">
                  <span className="text-muted">{t('formula.builder.if')}</span>
                  <select
                    aria-label={t('formula.builder.column')}
                    value={ruleTarget.name}
                    onChange={(e) => setRuleColumn(e.target.value)}
                    className={field}
                  >
                    {ruleColumns.map((c) => (
                      <option
                        key={c.column?.id ?? TITLE_COLUMN_ID}
                        value={c.name}
                      >
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <span aria-hidden />
                  <div className="flex min-w-0 gap-2">
                    <select
                      aria-label={t('formula.builder.condition')}
                      value={rule.op}
                      onChange={(e) => {
                        const op = e.target.value as RuleOp
                        const column = ruleTarget.column
                        const value =
                          needsValue(op) &&
                          column?.type === 'choice' &&
                          !rule.value
                            ? firstOptionName(column)
                            : rule.value
                        setRule({ ...rule, op, value })
                      }}
                      className={`${field} min-w-0 flex-1`}
                    >
                      {ruleOps(ruleTarget.column).map((op) => (
                        <option key={op} value={op}>
                          {ruleOpLabel(op)}
                        </option>
                      ))}
                    </select>
                    {needsValue(rule.op) &&
                      (ruleTarget.column?.type === 'choice' ? (
                        <select
                          aria-label={t('formula.builder.value')}
                          value={rule.value}
                          onChange={(e) =>
                            setRule({ ...rule, value: e.target.value })
                          }
                          className={`${field} min-w-0 flex-1`}
                        >
                          {choiceOptions(ruleTarget.column).map((o) => (
                            <option key={o.id} value={o.name}>
                              {o.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="flex min-w-0 flex-1 items-center gap-1">
                          <input
                            aria-label={t('formula.builder.value')}
                            inputMode={
                              ruleTarget.column?.type === 'number'
                                ? 'decimal'
                                : undefined
                            }
                            value={rule.value}
                            onChange={(e) =>
                              setRule({ ...rule, value: e.target.value })
                            }
                            className={`${field} min-w-0`}
                          />
                          {ruleTarget.column?.config.format === 'percent' && (
                            <span className="text-muted">%</span>
                          )}
                        </span>
                      ))}
                  </div>
                  <label className="contents">
                    <span className="text-muted">
                      {t('formula.builder.then')}
                    </span>
                    <input
                      value={rule.then}
                      onChange={(e) =>
                        setRule({ ...rule, then: e.target.value })
                      }
                      className={field}
                    />
                  </label>
                  <label className="contents">
                    <span className="text-muted">
                      {t('formula.builder.otherwise')}
                    </span>
                    <input
                      value={rule.otherwise}
                      onChange={(e) =>
                        setRule({ ...rule, otherwise: e.target.value })
                      }
                      className={field}
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={toAdvanced}
                  className="mb-3 min-h-8 text-[13px] text-accent hover:underline"
                >
                  {t('column.advanced')}
                </button>
              </>
            )}
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
            {examples.length > 0 && (
              <div className="mb-3">
                <div className="mb-1 text-xs text-muted">
                  {t('column.examples')}
                </div>
                {examples.map(({ formula, sentence }) => (
                  <button
                    key={formula}
                    type="button"
                    onClick={() => pickExample(formula)}
                    className="block min-h-8 w-full rounded-md px-2 text-start text-[13px] hover:bg-hover"
                  >
                    {sentence.charAt(0).toLocaleUpperCase() + sentence.slice(1)}
                  </button>
                ))}
              </div>
            )}
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
