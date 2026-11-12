import { useLiveQuery } from 'dexie-react-hooks'
import type { LearningNotesDB } from '../../core/db'
import { settingsRegistry } from '../builtinSettings'
import type { SettingDefinition } from '../registry'
import { getSetting } from '../settingsService'
import { rowShown, useGateVersion } from './experience'
import { sectionIdsOf } from './sections'

/**
 * The settings Settings v3 lists: the same registry as today's screen, minus
 * `searchOnly` ones and those hidden by `shownWhen` (hidden while loading).
 */
export function useVisibleSettings(
  db: LearningNotesDB,
  withSearchOnly = false,
  /** Keep rows the level or the experience hides (to count them). */
  includeHidden = false,
): SettingDefinition[] {
  useGateVersion() // re-render when the level or the experience changes
  const all = settingsRegistry
    .list()
    .filter((s) => withSearchOnly || !s.searchOnly)
    .filter((s) => includeHidden || rowShown(s.id))
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
  return visible.filter((s) => sectionIdsOf(s).includes(sectionId))
}
