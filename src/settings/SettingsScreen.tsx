import { use, useId, useState } from 'react'
import { AppUiContext } from '../app/appUi'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import { t } from '../i18n/t'
import { settingsRegistry } from './builtinSettings'
import type { SettingControl, SettingDefinition } from './registry'
import { setSetting } from './settingsService'
import { useDeviceSetting, useSyncedSetting } from './useSetting'

/**
 * Settings screen: categories on the left (a row of chips on small screens),
 * the chosen category's settings on the right. "All" lists every setting and
 * can be searched. Everything shown comes from the settings registry.
 */

const ALL = 'all'

export function SettingsScreen({ db }: { db: LearningNotesDB }) {
  const [category, setCategory] = useState(ALL)
  const [query, setQuery] = useState('')
  const categories = settingsRegistry.categories()
  const current = categories.find((c) => c.id === category)

  const q = query.trim().toLowerCase()
  const shown =
    category === ALL
      ? settingsRegistry
          .list()
          .filter(
            (s) =>
              !q ||
              `${t(s.labelKey)} ${t(s.descriptionKey)}`
                .toLowerCase()
                .includes(q),
          )
      : settingsRegistry.inCategory(category)

  const tabs = [
    {
      id: ALL,
      label: t('settings.category.all'),
      count: settingsRegistry.list().length,
    },
    ...categories.map((c) => ({
      id: c.id,
      label: t(c.labelKey),
      count: settingsRegistry.inCategory(c.id).length,
    })),
  ]

  return (
    <div className="mx-auto max-w-[760px] px-4 pt-8 pb-24 md:px-12 md:pt-12">
      <h1 className="text-[32px] leading-tight font-bold tracking-[-0.02em]">
        {t('settings.title')}
      </h1>
      <div className="mt-6 flex flex-col gap-4 md:grid md:grid-cols-[170px_1fr] md:gap-8">
        <nav
          aria-label={t('settings.categories')}
          className="-mx-4 flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-col md:gap-0.5 md:px-0"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategory(tab.id)}
              aria-current={tab.id === category ? 'page' : undefined}
              aria-label={`${tab.label}, ${t('settings.count', { count: tab.count })}`}
              className={`flex min-h-9 shrink-0 items-center gap-2 rounded-full border px-3 text-sm transition-colors md:rounded-lg md:border-transparent md:px-2.5 ${
                tab.id === category
                  ? 'border-ink font-semibold md:bg-hover'
                  : 'border-line text-muted hover:bg-hover md:text-ink'
              }`}
            >
              <span className="flex-1 text-left">{tab.label}</span>
              <span className="text-xs text-muted tabular-nums" aria-hidden>
                {tab.count}
              </span>
            </button>
          ))}
        </nav>

        <div className="min-w-0">
          {category === ALL && (
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('settings.search')}
              aria-label={t('settings.search')}
              className="mb-2 min-h-10 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent"
            />
          )}
          {shown.map((s) => (
            <SettingRow key={s.id} db={db} definition={s} category={category} />
          ))}
          {shown.length === 0 && (
            <p className="py-6 text-muted">
              {category === ALL
                ? t('settings.noResults', { query: query.trim() })
                : current?.emptyKey && t(current.emptyKey)}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/** Picks where the value comes from (database or this device). */
function SettingRow(props: {
  db: LearningNotesDB
  definition: SettingDefinition
  category: string
}) {
  return props.definition.scope === 'device' ? (
    <DeviceRow {...props} />
  ) : (
    <SyncedRow {...props} />
  )
}

function SyncedRow({
  db,
  definition,
  category,
}: {
  db: LearningNotesDB
  definition: SettingDefinition
  category: string
}) {
  const { toast } = use(AppUiContext)
  const value = useSyncedSetting(db, definition)
  if (value === undefined) return null // loading (a split second)
  const save = (next: JsonValue) =>
    setSetting(db, definition, next).catch((error: unknown) => {
      console.error(error)
      toast(t('settings.error.save'))
    })
  return (
    <RowLayout
      definition={definition}
      category={category}
      value={value}
      onSave={save}
    />
  )
}

function DeviceRow({
  definition,
  category,
}: {
  definition: SettingDefinition
  category: string
}) {
  const [value, setValue] = useDeviceSetting(definition)
  return (
    <RowLayout
      definition={definition}
      category={category}
      value={value}
      onSave={setValue}
    />
  )
}

function RowLayout({
  definition,
  category,
  value,
  onSave,
}: {
  definition: SettingDefinition
  category: string
  value: JsonValue
  onSave: (value: JsonValue) => void
}) {
  const id = useId()
  const labelId = `${id}-label`
  const descId = `${id}-desc`
  const isDefault =
    JSON.stringify(value) === JSON.stringify(definition.defaultValue)
  const otherCategories = [definition.category, ...(definition.alsoIn ?? [])]
    .filter((c) => c !== category)
    .map((c) => {
      const cat = settingsRegistry.categories().find((x) => x.id === c)
      return cat ? t(cat.labelKey) : c
    })
  const synced = definition.scope === 'synced'

  return (
    <section
      aria-labelledby={labelId}
      className="border-b border-line py-4 last:border-b-0"
    >
      <div className="flex flex-wrap items-center gap-2">
        <h2 id={labelId} className="font-semibold">
          {t(definition.labelKey)}
        </h2>
        <span
          title={t(
            synced
              ? 'settings.scope.synced.hint'
              : 'settings.scope.device.hint',
          )}
          className="rounded-full border border-line px-2 text-[11px] text-muted"
        >
          {t(synced ? 'settings.scope.synced' : 'settings.scope.device')}
        </span>
      </div>
      <p id={descId} className="mt-0.5 text-[13px] text-muted">
        {t(definition.descriptionKey)}
      </p>
      <div className="mt-2.5">
        {/* key: re-create the control when the saved value changes elsewhere */}
        <Control
          key={JSON.stringify(value)}
          definition={definition}
          control={definition.control}
          value={value}
          onSave={onSave}
          labelId={labelId}
          descId={descId}
        />
      </div>
      {(otherCategories.length > 0 && definition.alsoIn) || !isDefault ? (
        <div className="mt-2 flex flex-wrap gap-x-3 text-xs text-muted">
          {definition.alsoIn && otherCategories.length > 0 && (
            <span>
              {t('settings.alsoIn', { categories: otherCategories.join(', ') })}
            </span>
          )}
          {!isDefault && (
            <button
              type="button"
              onClick={() => onSave(definition.defaultValue)}
              className="text-accent hover:underline"
            >
              {t('settings.reset')}
            </button>
          )}
        </div>
      ) : null}
    </section>
  )
}

interface ControlProps {
  definition: SettingDefinition
  control: SettingControl
  value: JsonValue
  onSave: (value: JsonValue) => void
  labelId: string
  descId: string
}

const fieldClass =
  'min-h-9 rounded-lg border bg-bg px-2.5 text-sm tabular-nums outline-none focus:border-accent'

function Control(props: ControlProps) {
  const { control } = props
  if (control.kind === 'number')
    return <NumberControl {...props} control={control} />
  if (control.kind === 'steps')
    return <StepsControl {...props} control={control} />
  return <ChoiceControl {...props} control={control} />
}

function ChoiceControl({
  control,
  value,
  onSave,
  labelId,
  descId,
}: ControlProps & { control: { kind: 'segmented' | 'select' } }) {
  if (control.kind === 'select') {
    return (
      <select
        value={String(value)}
        onChange={(e) => {
          const option = control.options.find(
            (o) => String(o.value) === e.target.value,
          )
          if (option) onSave(option.value)
        }}
        aria-labelledby={labelId}
        aria-describedby={descId}
        className={`${fieldClass} border-line`}
      >
        {control.options.map((o) => (
          <option key={o.value} value={String(o.value)}>
            {o.label()}
          </option>
        ))}
      </select>
    )
  }
  return (
    <div
      role="group"
      aria-labelledby={labelId}
      aria-describedby={descId}
      className="inline-flex flex-wrap gap-0.5 rounded-lg border border-line bg-side p-0.5"
    >
      {control.options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onSave(o.value)}
          className={`min-h-9 rounded-md px-3.5 text-sm transition-colors ${
            o.value === value
              ? 'bg-bg font-semibold shadow-sm'
              : 'text-muted hover:text-ink'
          }`}
        >
          {o.label()}
        </button>
      ))}
    </div>
  )
}

function NumberControl({
  definition,
  control,
  value,
  onSave,
  labelId,
  descId,
}: ControlProps & { control: { kind: 'number' } }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value))
  const [error, setError] = useState(false)
  const errorId = useId()

  const commit = () => {
    const text = draft.trim()
    const next: JsonValue =
      text === '' && control.emptyKey ? null : text === '' ? NaN : Number(text)
    if (!definition.isValid(next)) return setError(true)
    setError(false)
    if (next !== value) onSave(next)
  }

  return (
    <div>
      <div className="flex items-center gap-2">
        <input
          type="text"
          inputMode="numeric"
          value={draft}
          placeholder={control.emptyKey && t(control.emptyKey)}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
          aria-labelledby={labelId}
          aria-describedby={`${descId}${error ? ` ${errorId}` : ''}`}
          aria-invalid={error}
          className={`${fieldClass} w-24 text-right ${error ? 'border-danger' : 'border-line'}`}
        />
        {control.unitKey && (
          <span className="text-sm text-muted">{t(control.unitKey)}</span>
        )}
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {t('settings.error.number', { min: control.min, max: control.max })}
        </p>
      )}
    </div>
  )
}

function StepsControl({
  definition,
  control,
  value,
  onSave,
  descId,
}: ControlProps & {
  control: { kind: 'steps'; min: number; max: number; maxCount: number }
}) {
  const saved = Array.isArray(value) ? value.map(String) : []
  const [draft, setDraft] = useState(saved)
  const [error, setError] = useState(false)
  const errorId = useId()

  const commit = (steps: string[]) => {
    const next = steps.map((s) => (s.trim() === '' ? NaN : Number(s)))
    if (!definition.isValid(next)) return setError(true)
    setError(false)
    if (JSON.stringify(next) !== JSON.stringify(value)) onSave(next)
  }

  const last = Number(draft[draft.length - 1])
  const canAdd =
    draft.length < control.maxCount &&
    Number.isFinite(last) &&
    last < control.max

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5">
        {draft.map((step, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && (
              <span className="text-xs text-muted" aria-hidden>
                →
              </span>
            )}
            <input
              type="text"
              inputMode="numeric"
              value={step}
              onChange={(e) =>
                setDraft(draft.map((s, j) => (j === i ? e.target.value : s)))
              }
              onBlur={() => commit(draft)}
              onKeyDown={(e) => e.key === 'Enter' && commit(draft)}
              aria-label={t('settings.goodSteps.step', { n: i + 1 })}
              aria-describedby={`${descId}${error ? ` ${errorId}` : ''}`}
              aria-invalid={error}
              className={`${fieldClass} w-14 text-center ${error ? 'border-danger' : 'border-line'}`}
            />
          </span>
        ))}
        <span className="text-sm text-muted">{t(control.unitKey)}</span>
      </div>
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            const next = [...draft, String(Math.min(control.max, last * 2))]
            setDraft(next)
            commit(next)
          }}
          className="min-h-9 rounded-lg border border-line px-3 text-xs transition-colors hover:bg-hover disabled:opacity-40"
        >
          + {t('settings.goodSteps.add')}
        </button>
        <button
          type="button"
          disabled={draft.length <= 1}
          onClick={() => {
            const next = draft.slice(0, -1)
            setDraft(next)
            commit(next)
          }}
          className="min-h-9 rounded-lg border border-line px-3 text-xs transition-colors hover:bg-hover disabled:opacity-40"
        >
          − {t('settings.goodSteps.remove')}
        </button>
      </div>
      {error && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-danger">
          {t('settings.error.steps', { min: control.min, max: control.max })}
        </p>
      )}
    </div>
  )
}
