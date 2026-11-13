import type { LearningNotesDB } from '../core/db'
import { createId } from '../core/ids'
import {
  cleanStyle,
  isOwnPresets,
  MAX_OWN_PRESETS,
  type BoxStyle,
  type OwnPreset,
} from '../core/boxStyle'
import { pushStep } from '../core/historySteps'
import { t } from '../i18n/t'
import type { JsonValue } from '../core/types'
import type { SettingDefinition } from '../settings/registry'
import { getSetting, setSetting } from '../settings/settingsService'

/**
 * The person's own box style presets and the default style for new boxes
 * (bug batch 2, item 8). Both are synced settings (group "appearance"), so
 * they follow the account (text-tool-plan, owner answer: per account, up to 8).
 */

export const ownPresetsSetting: SettingDefinition<JsonValue> = {
  id: 'paper.boxPresets',
  labelKey: 'boxStyle.title',
  descriptionKey: 'boxStyle.mine',
  category: 'general',
  scope: 'synced',
  group: 'appearance',
  defaultValue: [],
  isValid: isOwnPresets as unknown as (v: unknown) => v is JsonValue,
  control: { kind: 'labels' },
}

/** The style new boxes start with (an empty object = none). */
export const newBoxStyleSetting: SettingDefinition<JsonValue> = {
  id: 'paper.boxStyleDefault',
  labelKey: 'boxStyle.useNew',
  descriptionKey: 'boxStyle.title',
  category: 'general',
  scope: 'synced',
  group: 'appearance',
  defaultValue: {},
  isValid: (v): v is JsonValue =>
    !!v &&
    typeof v === 'object' &&
    !Array.isArray(v) &&
    (Object.keys(v).length === 0 || cleanStyle(v) !== undefined),
  control: { kind: 'labels' },
}

export const loadPresets = async (db: LearningNotesDB) =>
  (await getSetting(db, ownPresetsSetting)) as unknown as OwnPreset[]

const store = (db: LearningNotesDB, next: OwnPreset[]) =>
  setSetting(db, ownPresetsSetting, next as unknown as JsonValue)

export async function savePreset(
  db: LearningNotesDB,
  name: string,
  style: BoxStyle,
): Promise<OwnPreset[] | null> {
  const clean = cleanStyle(style)
  const all = await loadPresets(db)
  if (!clean || all.length >= MAX_OWN_PRESETS) return null
  const next = [
    ...all,
    { id: createId(), name: name.slice(0, 40), style: clean },
  ]
  await store(db, next)
  return next
}

export async function renamePreset(
  db: LearningNotesDB,
  id: string,
  name: string,
): Promise<OwnPreset[]> {
  const next = (await loadPresets(db)).map((p) =>
    p.id === id ? { ...p, name: name.slice(0, 40) || p.name } : p,
  )
  await store(db, next)
  return next
}

export async function deletePreset(
  db: LearningNotesDB,
  id: string,
): Promise<OwnPreset[]> {
  const next = (await loadPresets(db)).filter((p) => p.id !== id)
  await store(db, next)
  return next
}

export const loadNewBoxStyle = async (db: LearningNotesDB) =>
  cleanStyle(await getSetting(db, newBoxStyleSetting))

export const setNewBoxStyle = (
  db: LearningNotesDB,
  style: BoxStyle | undefined,
) => setSetting(db, newBoxStyleSetting, (cleanStyle(style) ?? {}) as JsonValue)

/**
 * Sets the new-box style as one Undo / Redo step (the Box card with no box
 * selected, and "Use for new boxes"). `show` tells an open screen the value
 * that is now in place. Why: a setting is not a page row, so the page history
 * does not see it; without this step Undo skipped the change.
 */
export function changeNewBoxStyle(
  db: LearningNotesDB,
  before: BoxStyle | undefined,
  after: BoxStyle | undefined,
  show: (style: BoxStyle | undefined) => void,
): Promise<void> {
  const put = (s: BoxStyle | undefined) => {
    show(cleanStyle(s))
    return setNewBoxStyle(db, s)
  }
  pushStep({
    label: t('boxStyle.useNew'),
    kind: 'newBoxStyle',
    undo: () => put(before),
    redo: () => put(after),
  })
  return put(after)
}
