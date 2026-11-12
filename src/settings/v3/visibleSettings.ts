import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { settingsRegistry } from '../builtinSettings'
import type { SettingDefinition } from '../registry'
import { getSetting } from '../settingsService'

/**
 * The settings Settings v3 lists: the same registry as today's screen, minus
 * `searchOnly` ones and those hidden by `shownWhen` (hidden while loading).
 */
export function useVisibleSettings(
  db: LearningNotesDB,
  withSearchOnly = false,
): SettingDefinition[] {
  const all = settingsRegistry
    .list()
    .filter((s) => withSearchOnly || !s.searchOnly)
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

/** Visible settings of one section (home or "also in"). */
export function inSection(
  visible: SettingDefinition[],
  sectionId: string,
): SettingDefinition[] {
  const ids = new Set(settingsRegistry.inCategory(sectionId).map((s) => s.id))
  return visible.filter((s) => ids.has(s.id))
}
