import { readPref, writePref } from '../app/uiPrefs'
import { getAppActions } from '../app/tools/toolRuntime'
import { t } from '../i18n/t'
import { SYNC_GROUPS } from './syncGroups'
import { groupOn, setGroupSwitch } from './syncPrefs'

/**
 * Item 23: everything syncs by default, AI keys included (end-to-end
 * encrypted, never in backups). Once per device, groups that were switched
 * off in the old days are turned on, and a notice says so and where to change
 * it. A person who later switches a group off keeps their choice.
 */
const KEY = 'settings.syncAllDefault.v1'
const isTrue = (v: unknown): v is true => v === true

export function runSyncAllMigration(): void {
  if (readPref(KEY, isTrue, false as unknown as true)) return
  writePref(KEY, true)
  let turnedOn = 0
  for (const g of SYNC_GROUPS) {
    if (!groupOn(g.id)) {
      setGroupSwitch(g.id, true)
      turnedOn++
    }
  }
  if (turnedOn === 0) return
  // The app may not be up yet: try for half a minute.
  let tries = 0
  const timer = window.setInterval(() => {
    const app = getAppActions()
    if (app) {
      window.clearInterval(timer)
      app.toast(t('sync.allOn.notice'), {
        label: t('sync.allOn.change'),
        onSelect: () => app.openSettings('category:sync'),
      })
    } else if (++tries > 60) window.clearInterval(timer)
  }, 500)
}
