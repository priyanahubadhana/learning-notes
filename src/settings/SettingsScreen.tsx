import { useLiveQuery } from 'dexie-react-hooks'
import { Suspense, lazy, use, useEffect, useId, useRef, useState } from 'react'
import { revealWhenReady } from '../editor/revealBlock'
import { AppUiContext } from '../app/appUi'
import type { LearningNotesDB } from '../core/db'
import type { JsonValue } from '../core/types'
import { createId } from '../core/ids'
import { t, type MessageKey } from '../i18n/t'
import {
  BUILTIN_LABELS,
  DEFAULT_LABELS,
  isLabelList,
  LABEL_COLORS,
  MAX_LABELS,
  markName,
  type LabelDef,
} from '../revise/reviseMarks'
import { pushRouteParts, useRouteParts } from '../app/router'
import { settingsRegistry } from './builtinSettings'
import type { SettingControl, SettingDefinition } from './registry'
import { getSetting, setSetting } from './settingsService'
import { useDeviceSetting, useSyncedSetting } from './useSetting'
import { AboutSection } from './AboutSection'
import { averageReviewSeconds, estimateMinutes } from './reviewTime'
import { DeviceSection } from './DeviceSection'
import './toolbarSettings'
import './spaceSettings'
import './labSettings'
import './readingSettings'
import './lockSettings'
import '../ai/aiSettings'
import { AiSection } from '../ai/AiSection'
import { ConnectionsSection } from '../ai/ConnectionsSection'
import { LockSection } from '../app/lock/LockSection'
import { PageTabsSection } from './PageTabsSection'
import '../sync/syncSettings'
import './accountSettings'

const PermissionsSection = lazy(() =>
  import('../ai/PermissionsSection').then((m) => ({
    default: m.PermissionsSection,
  })),
)
// Sync's screen (and its encryption code) loads only when opened.
const AccountSection = lazy(() =>
  import('../sync/AccountSection').then((m) => ({ default: m.AccountSection })),
)
const SyncSection = lazy(() =>
  import('../sync/SyncSection').then((m) => ({ default: m.SyncSection })),
)

/**
 * Settings screen: categories on the left (a row of chips on small screens),
 * the chosen category's settings on the right. "All" lists every setting and
 * can be searched. Everything shown comes from the settings registry.
 */

const ALL = 'all'

/**
 * `focusId`: a setting to open at (its home category), scrolled to and
 * highlighted, e.g. from a dialog's "Change in Settings" link.
 */
export function SettingsScreen({
  db,
  focusId,
}: {
  db: LearningNotesDB
  focusId?: string
}) {
  // The open category is kept in the address, so Back and refresh keep it.
  const [ownCategory, setOwnCategory] = useState(
    () =>
      (focusId?.startsWith('category:') && focusId.slice(9)) ||
      (focusId && settingsRegistry.get(focusId)?.category) ||
      ALL,
  )
  const routeCategory = useRouteParts(0)
  const category =
    routeCategory &&
    (routeCategory === ALL ||
      settingsRegistry.categories().some((c) => c.id === routeCategory))
      ? routeCategory
      : ownCategory
  const setCategory = (id: string) => {
    setOwnCategory(id)
    pushRouteParts(0, id, [category])
  }
  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusId) return
    revealWhenReady(
      () =>
        root.current?.querySelector<HTMLElement>(
          `[data-setting-id="${CSS.escape(focusId)}"]`,
        ) ?? null,
    )
  }, [focusId])
  const [query, setQuery] = useState('')
  const categories = settingsRegistry.categories()
  const current = categories.find((c) => c.id === category)

  const visible = useVisibleSettings(db)
  const q = query.trim().toLowerCase()
  const shown =
    category === ALL
      ? visible.filter(
          (s) =>
            !q ||
            `${t(s.labelKey)} ${t(s.descriptionKey)} ${s.keywords ?? ''}`
              .toLowerCase()
              .includes(q),
        )
      : inCategory(visible, category)

  const tabs = [
    {
      id: ALL,
      label: t('settings.category.all'),
      count: visible.length,
    },
    ...categories.map((c) => ({
      id: c.id,
      label: t(c.labelKey),
      count: inCategory(visible, c.id).length,
    })),
  ]

  return (
    <div
      ref={root}
      className="mx-auto max-w-[760px] px-4 pt-8 pb-24 md:px-12 md:pt-12"
    >
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
          {category === ALL && !q && <DeviceSection db={db} />}
          {category === ALL && !q && <AboutSection />}
          {category === 'lock' && <LockSection db={db} />}
          {(category === 'general' || (category === ALL && !q)) && (
            <PageTabsSection db={db} />
          )}
          {category === 'ai' && <AiSection db={db} onGo={setCategory} />}
          {category === 'apis' && <ConnectionsSection onGo={setCategory} />}
          {category === 'permissions' && (
            <Suspense fallback={null}>
              <PermissionsSection db={db} />
            </Suspense>
          )}
          {category === 'account' && (
            <Suspense fallback={null}>
              <AccountSection db={db} />
            </Suspense>
          )}
          {category === 'sync' && (
            <Suspense fallback={null}>
              <SyncSection db={db} />
            </Suspense>
          )}
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
          {current?.descriptionKey && (
            <p className="mb-2 text-sm text-muted">
              {t(current.descriptionKey)}
            </p>
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
const inCategory = (visible: SettingDefinition[], category: string) => {
  const ids = new Set(settingsRegistry.inCategory(category).map((s) => s.id))
  return visible.filter((s) => ids.has(s.id))
}

/** All settings, minus those hidden by `shownWhen` (hidden while loading). */
function useVisibleSettings(db: LearningNotesDB): SettingDefinition[] {
  const all = settingsRegistry.list().filter((s) => !s.searchOnly)
  const controllers = useLiveQuery(async () => {
    const ids = [
      ...new Set(
        all.flatMap((s) => (s.shownWhen ? [s.shownWhen.settingId] : [])),
      ),
    ]
    const values = await Promise.all(
      ids.map((id) => getSetting(db, settingsRegistry.get(id)!)),
    )
    return new Map(ids.map((id, i) => [id, values[i]]))
  }, [db])
  return all.filter(
    (s) =>
      !s.shownWhen ||
      (controllers !== undefined &&
        s.shownWhen.values.includes(controllers.get(s.shownWhen.settingId)!)),
  )
}

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
      extra={
        definition.id === 'review.newPerDay' && typeof value === 'number' ? (
          <TimeHint db={db} cards={value} />
        ) : undefined
      }
    />
  )
}

/** "About N min a day" under the new-cards limit, from your own pace. */
function TimeHint({ db, cards }: { db: LearningNotesDB; cards: number }) {
  const seconds = useLiveQuery(() => averageReviewSeconds(db), [db])
  if (seconds === undefined || cards <= 0) return null
  return (
    <p data-testid="time-hint" className="mt-1.5 text-xs text-muted">
      {t('settings.newPerDay.minutes', {
        minutes: estimateMinutes(cards, seconds),
      })}
    </p>
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
  extra,
}: {
  definition: SettingDefinition
  category: string
  value: JsonValue
  onSave: (value: JsonValue) => void
  /** A line under the control (a hint). */
  extra?: React.ReactNode
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
      data-setting-id={definition.id}
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
          key={
            definition.control.kind === 'labels'
              ? 'labels'
              : JSON.stringify(value)
          }
          definition={definition}
          control={definition.control}
          value={value}
          onSave={onSave}
          labelId={labelId}
          descId={descId}
        />
        {extra}
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
  if (control.kind === 'labels') return <LabelsControl {...props} />
  if (control.kind === 'action') {
    return (
      <button
        type="button"
        onClick={control.run}
        aria-describedby={props.descId}
        className="min-h-11 rounded-lg border border-line px-4 text-sm hover:bg-hover"
      >
        {t(control.buttonKey)}
      </button>
    )
  }
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

/** The Revise labels: name and colour of each, add and remove your own. */
function LabelsControl({ value, onSave, labelId, descId }: ControlProps) {
  const saved = isLabelList(value)
    ? value
    : DEFAULT_LABELS.map((l) => ({ ...l }))
  const [draft, setDraft] = useState<LabelDef[]>(saved)
  // What this control last saved itself: that echo must not overwrite
  // what is being typed. A change from elsewhere (Reset) does.
  const lastSaved = useRef(JSON.stringify(saved))
  const savedText = JSON.stringify(saved)
  useEffect(() => {
    if (savedText !== lastSaved.current) {
      lastSaved.current = savedText
      setDraft(JSON.parse(savedText) as LabelDef[])
    }
  }, [savedText])
  const commit = (next: LabelDef[]) => {
    setDraft(next)
    if (isLabelList(next) && JSON.stringify(next) !== savedText) {
      lastSaved.current = JSON.stringify(next)
      onSave(next as unknown as JsonValue)
    }
  }
  const change = (id: string, patch: Partial<LabelDef>) =>
    draft.map((l) => (l.id === id ? { ...l, ...patch } : l))
  const nameOf = (l: LabelDef) => l.name || markName(l.id)

  return (
    <div role="group" aria-labelledby={labelId} aria-describedby={descId}>
      <ul className="grid gap-2">
        {draft.map((l, i) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={l.name}
              maxLength={40}
              placeholder={markName(l.id)}
              aria-label={t('settings.reviseLabels.name', { n: i + 1 })}
              onChange={(e) => setDraft(change(l.id, { name: e.target.value }))}
              onBlur={() => commit(draft)}
              onKeyDown={(e) => e.key === 'Enter' && commit(draft)}
              className={`${fieldClass} w-48 border-line`}
            />
            <span
              role="group"
              aria-label={t('settings.reviseLabels.color', { name: nameOf(l) })}
              className="flex gap-1"
            >
              {LABEL_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  aria-pressed={l.color === color}
                  aria-label={t(`tags.color.${color}` as MessageKey)}
                  onClick={() => commit(change(l.id, { color }))}
                  style={{ background: color }}
                  className={`size-6 rounded-full border-2 ${
                    l.color === color ? 'border-ink' : 'border-transparent'
                  }`}
                />
              ))}
            </span>
            {!(BUILTIN_LABELS as readonly string[]).includes(l.id) && (
              <button
                type="button"
                aria-label={t('settings.reviseLabels.remove', {
                  name: nameOf(l),
                })}
                onClick={() => commit(draft.filter((x) => x.id !== l.id))}
                className="size-8 rounded-lg text-muted hover:bg-hover hover:text-ink"
              >
                ×
              </button>
            )}
          </li>
        ))}
      </ul>
      {draft.length < MAX_LABELS && (
        <button
          type="button"
          onClick={() =>
            commit([
              ...draft,
              {
                id: createId(),
                name: t('settings.reviseLabels.newName'),
                color: LABEL_COLORS[draft.length % LABEL_COLORS.length],
              },
            ])
          }
          className="mt-2 min-h-9 rounded-lg border border-line px-3 text-[13px] hover:bg-hover"
        >
          {t('settings.reviseLabels.add')}
        </button>
      )}
    </div>
  )
}
