import { describe, expect, it } from 'vitest'
import { settingsRegistry } from './builtinSettings'
import { SETTING_GROUPS, SYNC_GROUPS, groupOfId } from './syncGroups'
import '../ai/aiSettings'

describe('sync groups', () => {
  it('every synced setting has a group', () => {
    for (const s of settingsRegistry.list()) {
      if (s.scope === 'synced') expect(groupOfId(s.id), s.id).toBeTruthy()
    }
  })

  it('only device-wide choices stay out of every group', () => {
    const stay = [
      'general.deviceMode',
      'advanced.barPlacement',
      'advanced.barSize',
      'advanced.pencilWrites',
      'general.autoUpdate',
      'general.scrollHints',
    ]
    for (const id of stay) expect(groupOfId(id), id).toBeUndefined()
  })

  it('every group a setting names exists', () => {
    const ids = new Set(SYNC_GROUPS.map((g) => g.id))
    for (const g of Object.values(SETTING_GROUPS)) expect(ids.has(g)).toBe(true)
  })

  it('keys are off by default; the rest are on', () => {
    for (const g of SYNC_GROUPS) expect(g.defaultOn).toBe(!g.secret)
  })
})
