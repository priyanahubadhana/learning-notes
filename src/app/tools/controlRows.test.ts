import { describe, expect, it } from 'vitest'
import { settingsRegistry } from '../../settings/builtinSettings'
import { buildRows, rowMatches } from './controlRows'
import { allTools } from './toolRegistry'

describe('control panel rows', () => {
  const rows = buildRows()

  it('has a row for every tool and every setting', () => {
    expect(rows.filter((r) => r.key.startsWith('tool:'))).toHaveLength(
      allTools().length,
    )
    const settings = rows.filter((r) => r.key.startsWith('setting:'))
    expect(settings).toHaveLength(settingsRegistry.list().length)
  })

  it('the filter finds words in the name, the place and English', () => {
    expect(rowMatches('paste as plain text home › clipboard', 'paste')).toBe(
      true,
    )
    expect(
      rowMatches('paste as plain text home › clipboard', 'clip paste'),
    ).toBe(true)
    expect(rowMatches('paste as plain text', 'lock')).toBe(false)
    expect(rowMatches('anything', '')).toBe(true)
    const hits = rows.filter((r) => rowMatches(r.haystack, 'lock'))
    expect(hits.some((r) => r.key === 'tool:lockPage')).toBe(true)
  })

  it('only tools can be pinned, and each row says where it lives', () => {
    for (const row of rows) {
      expect(row.where, row.key).toBeTruthy()
      expect(Boolean(row.pinId), row.key).toBe(row.key.startsWith('tool:'))
    }
  })
})
