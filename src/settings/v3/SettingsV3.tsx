import { useEffect, useRef, useState } from 'react'
import { revealWhenReady } from '../../editor/revealBlock'
import type { LearningNotesDB } from '../../core/db'
import type { JsonValue } from '../../core/types'
import { t } from '../../i18n/t'
import { pushRouteParts, useRouteParts } from '../../app/router'
import { settingsRegistry } from '../builtinSettings'
import type { SettingDefinition } from '../registry'
import { useDeviceSetting, useSyncedSetting } from '../useSetting'
import '../toolbarSettings'
import '../spaceSettings'
import '../labSettings'
import '../flagSettings'
import '../readingSettings'
import '../lockSettings'
import '../../ai/aiSettings'
import '../../connector/claudeSettings'
import '../../sync/syncSettings'
import '../accountSettings'
import { PreviewPane } from './PreviewPane'
import { PreviewPill } from './PreviewPill'
import { SectionList } from './SectionList'
import { inSection, useVisibleSettings } from './visibleSettings'
import { tv } from './tv'
import { useWide } from './useWide'
import './settingsV3.css'

/**
 * Settings v3 (flag `settings.v3`): a list of sections on the left (a chip row
 * on a phone), the settings in the middle and a sticky preview on the right
 * (a pill and a sheet below 1180 px wide). It reads the same settings registry
 * and the same stored values as today's screen; nothing is copied.
 */
export function SettingsV3({
  db,
  focusId,
}: {
  db: LearningNotesDB
  focusId?: string
}) {
  const sections = settingsRegistry.categories()
  const [own, setOwn] = useState(
    () =>
      (focusId?.startsWith('category:') && focusId.slice(9)) ||
      (focusId?.includes('/') && focusId.split('/')[0]) ||
      (focusId && settingsRegistry.get(focusId)?.category) ||
      sections[0]?.id ||
      '',
  )
  const fromAddress = useRouteParts(0)
  const current =
    fromAddress && sections.some((s) => s.id === fromAddress)
      ? fromAddress
      : own
  const pick = (id: string) => {
    setOwn(id)
    pushRouteParts(0, id, [current])
  }

  const root = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!focusId) return
    revealWhenReady(
      () =>
        root.current?.querySelector<HTMLElement>(
          `[data-setting-id="${CSS.escape(focusId.split('/').pop() ?? focusId)}"]`,
        ) ?? null,
    )
  }, [focusId])

  const visible = useVisibleSettings(db)
  const items = sections.map((s) => ({
    id: s.id,
    label: t(s.labelKey),
    count: inSection(visible, s.id).length,
  }))
  const section = sections.find((s) => s.id === current)
  const rows = inSection(visible, current)

  // The phone preview: open or shut, and how many changes it has not shown.
  const wide = useWide(root)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [unseen, setUnseen] = useState(0)
  const toggleSheet = () => {
    setSheetOpen((o) => !o)
    setUnseen(0)
  }
  const changed = () => setUnseen((n) => n + 1)

  return (
    <div
      ref={root}
      data-settings-v3
      data-wide={wide ? '' : undefined}
      className="sv3"
    >
      <h1 className="sv3-title">{tv('sv3.title')}</h1>
      <div className="sv3-cols">
        <SectionList sections={items} current={current} onPick={pick} />
        <section
          className="sv3-main"
          aria-label={section ? t(section.labelKey) : undefined}
        >
          {section?.descriptionKey && (
            <p className="sv3-lead">{t(section.descriptionKey)}</p>
          )}
          {rows.map((s) => (
            <SettingLine
              key={s.id}
              db={db}
              definition={s}
              onChanged={changed}
            />
          ))}
          {rows.length === 0 && (
            <p className="sv3-lead">
              {section?.emptyKey ? t(section.emptyKey) : tv('sv3.sectionEmpty')}
            </p>
          )}
        </section>
        <PreviewPane />
      </div>
      {!wide && (
        <PreviewPill
          open={sheetOpen}
          onToggle={toggleSheet}
          pulse={unseen}
          area={root}
        />
      )}
    </div>
  )
}

/** One setting, read from the registry and its stored value (shell only). */
function SettingLine(props: {
  db: LearningNotesDB
  definition: SettingDefinition
  onChanged(): void
}) {
  return props.definition.scope === 'device' ? (
    <DeviceLine {...props} />
  ) : (
    <SyncedLine {...props} />
  )
}

function SyncedLine({
  db,
  definition,
  onChanged,
}: {
  db: LearningNotesDB
  definition: SettingDefinition
  onChanged(): void
}) {
  const value = useSyncedSetting(db, definition)
  if (value === undefined) return null
  return <Line definition={definition} value={value} onChanged={onChanged} />
}

function DeviceLine({
  definition,
  onChanged,
}: {
  definition: SettingDefinition
  onChanged(): void
}) {
  const [value] = useDeviceSetting(definition)
  return <Line definition={definition} value={value} onChanged={onChanged} />
}

function valueText(definition: SettingDefinition, value: JsonValue): string {
  const c = definition.control
  if (c.kind === 'segmented' || c.kind === 'select')
    return (
      c.options.find((o) => o.value === value)?.label() ?? tv('sv3.valueNone')
    )
  if (typeof value === 'number' || typeof value === 'string')
    return String(value)
  return ''
}

function Line({
  definition,
  value,
  onChanged,
}: {
  definition: SettingDefinition
  value: JsonValue
  onChanged(): void
}) {
  // Tell the shell when the stored value changes after the first showing.
  const seen = useRef<string | undefined>(undefined)
  const now = JSON.stringify(value)
  const notify = useRef(onChanged)
  useEffect(() => {
    notify.current = onChanged
  })
  useEffect(() => {
    if (seen.current !== undefined && seen.current !== now) notify.current()
    seen.current = now
  }, [now])
  return (
    <div data-setting-id={definition.id} className="sv3-line">
      <div className="sv3-line-text">
        <div className="sv3-line-label">{t(definition.labelKey)}</div>
        <div className="sv3-line-help">{t(definition.descriptionKey)}</div>
      </div>
      <div className="sv3-line-value" data-testid="sv3-value">
        {valueText(definition, value)}
      </div>
    </div>
  )
}
