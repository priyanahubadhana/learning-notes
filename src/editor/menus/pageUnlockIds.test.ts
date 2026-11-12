import { describe, expect, it } from 'vitest'
import { PRO_FEATURES } from '../../settings/proFeatures.gen'
import { PAGE_MENU_UNLOCK_IDS } from './pageUnlockIds'

describe('page menu unlock ids', () => {
  it('are still local only (remove the local list once level.ts has them)', () => {
    const known = new Set<string>(PRO_FEATURES.map((f) => f.id))
    for (const id of PAGE_MENU_UNLOCK_IDS) expect(known.has(id)).toBe(false)
  })
})
