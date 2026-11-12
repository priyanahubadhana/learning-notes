import { use, useEffect, useId, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { LearningNotesDB } from '../../core/db'
import type { JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { settingsRegistry } from '../builtinSettings'
import type { SettingDefinition } from '../registry'
import { SettingSyncBadge } from '../SettingSyncBadge'
import { setSetting } from '../settingsService'
import { useDeviceSetting, useSyncedSetting } from '../useSetting'
import { useSettingsHistory } from './historyCtx'
import { RowControl } from './RowControl'
import { RowExtra } from './RowExtra'
import { RowPreview } from './RowPreview'
import { valueText, type Change } from './changeNote'

interface RowProps {
  db: LearningNotesDB
  definition: SettingDefinition
  /** The section on screen (for the "Also in" note). */
  section: string
  onChanged(change: Omit<Change, 'seq'>): void
  /** Counts up when a search result opened this row: it glows. */
  jump?: number
}

/** One editable setting: same stored value as today's screen (registry only). */
export function SettingRow(props: RowProps) {
  return props.definition.scope === 'device' ? (
    <DeviceRow {...props} />
  ) : (
    <SyncedRow {...props} />
  )
}

function SyncedRow(props: RowProps) {
  const { toast } = use(AppUiContext)
  const value = useSyncedSetting(props.db, props.definition)
  if (value === undefined) return null
  const save = (next: JsonValue) =>
    setSetting(props.db, props.definition, next).catch((error: unknown) => {
      console.error(error)
      toast(t('settings.error.save'))
    })
  return <RowBody {...props} value={value} onSave={save} />
}

function DeviceRow(props: RowProps) {
  const [value, setValue] = useDeviceSetting(props.definition)
  return <RowBody {...props} value={value} onSave={setValue} />
}

/** How long a changed row glows: 1.5 s, twice. */
const GLOW_MS = 3000

function RowBody({
  definition,
  section,
  value,
  onSave,
  onChanged,
  jump,
}: RowProps & { value: JsonValue; onSave(next: JsonValue): void }) {
  const id = useId()
  const history = useSettingsHistory()
  const labelId = `${id}-label`
  const descId = `${id}-desc`
  const name = t(definition.labelKey)
  // Every change is one Undo step with a toast (SET-B10).
  const commit = (next: JsonValue) => {
    history.record({
      label: name,
      items: [{ id: definition.id, before: value, after: next }],
    })
    onSave(next)
  }
  const isDefault =
    JSON.stringify(value) === JSON.stringify(definition.defaultValue)
  const others = [definition.category, ...(definition.alsoIn ?? [])]
    .filter((c) => c !== section)
    .map((c) => {
      const cat = settingsRegistry.categories().find((x) => x.id === c)
      return cat ? t(cat.labelKey) : c
    })

  // A change after the first showing (from here or another window or device).
  const [glow, setGlow] = useState(0)
  const seen = useRef<{ json: string; text: string } | undefined>(undefined)
  const notify = useRef(onChanged)
  useEffect(() => {
    notify.current = onChanged
  })
  const json = JSON.stringify(value)
  const text = valueText(definition, value)
  useEffect(() => {
    const before = seen.current
    seen.current = { json, text }
    if (!before || before.json === json) return
    notify.current({
      id: definition.id,
      name: t(definition.labelKey),
      from: before.text,
      to: text,
    })
    setGlow((n) => n + 1)
  }, [json, text, definition])

  // A search result opened this row: glow once per opening.
  const [jumpSeen, setJumpSeen] = useState(0)
  if (jump && jump !== jumpSeen) {
    setJumpSeen(jump)
    setGlow((n) => n + 1)
  }
  useEffect(() => {
    if (glow === 0) return
    const timer = setTimeout(() => setGlow(0), GLOW_MS)
    return () => clearTimeout(timer)
  }, [glow])

  return (
    <section
      data-setting-id={definition.id}
      data-glow={glow > 0 ? 'on' : undefined}
      aria-labelledby={labelId}
      className="sv3-row"
    >
      <div className="sv3-row-head">
        <h3 id={labelId} className="sv3-row-name">
          {name}
        </h3>
        <SettingSyncBadge definition={definition} />
      </div>
      <p id={descId} className="sv3-line-help">
        {t(definition.descriptionKey)}
      </p>
      <div className="sv3-row-control">
        <RowControl
          definition={definition}
          value={value}
          onSave={commit}
          label={name}
          descId={descId}
        />
        <RowExtra definition={definition} value={value} onSave={commit} />
      </div>
      <RowPreview definition={definition} value={value} glowKey={glow} />
      {((definition.alsoIn && others.length > 0) || !isDefault) && (
        <div className="sv3-row-foot">
          {definition.alsoIn && others.length > 0 && (
            <span data-also-in>
              {t('settings.alsoIn', { categories: others.join(', ') })}
            </span>
          )}
          {!isDefault && (
            <button
              type="button"
              data-row-reset
              className="sv3-link"
              onClick={() => commit(definition.defaultValue)}
            >
              {t('settings.reset')}
            </button>
          )}
        </div>
      )}
    </section>
  )
}
