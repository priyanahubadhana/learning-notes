import { isBoolean } from '../../uiPrefs'
import { DEFAULT_PINNED } from '../../deviceMode'
import { readPinned } from '../../../settings/deviceModeSettings'
import { prefStore } from '../store'
import { DEFAULT_SET_TOOLS, readSetTools } from '../toolbarState'
import { extraTools, mainList, pillLists } from './mainTools'
import { addBackspace, dedupeMain, migrateLists } from './migrate'

const done = prefStore('toolbar.mainMigrated', isBoolean, false)

/**
 * Once per device: a person who had changed the old Write · Draw · Read
 * lists gets a main bar and Text pill that match them. Nobody else changes.
 * The old lists stay saved (nothing is deleted).
 */
export function migrateToMainBarOnce(): boolean {
  if (done.get()) return false
  done.set(true)
  const result = migrateLists(
    {
      write: readPinned(),
      draw: readSetTools('draw'),
      read: readSetTools('read'),
    },
    {
      write: DEFAULT_PINNED,
      draw: DEFAULT_SET_TOOLS.draw,
      read: DEFAULT_SET_TOOLS.read,
    },
  )
  if (!result) return false
  mainList.set(result.main)
  pillLists.set(result.pills)
  extraTools.set(result.extras)
  return true
}

/** Tests only. */
export const resetMigration = () => done.clearCache()

const tidied = prefStore('toolbar.dedupe1', isBoolean, false)

/** Once per device: removes duplicates from a saved bar and adds ⌫ (A3, A4). */
export function tidyBarOnce(): void {
  if (tidied.get()) return
  tidied.set(true)
  const tidy = dedupeMain(mainList.get(), extraTools.get())
  const main = addBackspace(tidy.main)
  // Only a list the person saved is rewritten; the standard bar already has ⌫.
  if (main.join() !== mainList.get().join()) mainList.set(main)
  if (tidy.extras.join() !== extraTools.get().join())
    extraTools.set(tidy.extras)
}

/** Tests only. */
export const resetTidy = () => tidied.clearCache()
