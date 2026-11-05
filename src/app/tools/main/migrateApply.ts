import { isBoolean } from '../../uiPrefs'
import { DEFAULT_PINNED } from '../../deviceMode'
import { readPinned } from '../../../settings/deviceModeSettings'
import { prefStore } from '../store'
import { DEFAULT_SET_TOOLS, readSetTools } from '../toolbarState'
import { extraTools, mainList, pillLists } from './mainTools'
import { migrateLists } from './migrate'

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
