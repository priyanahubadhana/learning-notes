import { describe, expect, it } from 'vitest'
import { buildRows, rowMatches } from '../app/tools/controlRows'

describe('Account items in "Search all features"', () => {
  const rows = buildRows().filter((r) => r.key.startsWith('setting:account.'))

  it('has every item, under Settings › Account', () => {
    expect(rows.map((r) => r.key).sort()).toEqual(
      [
        'aiKeys',
        'driveLasting',
        'newCode',
        'pinLock',
        'signIn',
        'signOut',
        'signOutAll',
        'signOutForget',
        'syncNow',
      ].map((k) => `setting:account.${k}`),
    )
    for (const r of rows) expect(r.where).toBe('Settings › Account')
  })

  it.each([
    ['all devices', 'signOutAll'],
    ['recovery code', 'newCode'],
    ['lasting connection', 'driveLasting'],
    ['pin', 'pinLock'],
    ['ai keys', 'aiKeys'],
    ['sync now', 'syncNow'],
  ])('finds "%s"', (query, id) => {
    const hit = rows.find((r) => r.key === `setting:account.${id}`)!
    expect(rowMatches(hit.haystack, query)).toBe(true)
  })
})
