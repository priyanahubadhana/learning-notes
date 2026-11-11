import { readFileSync } from 'node:fs'
import { generateKeyBetween } from 'fractional-indexing'
import { describe, expect, it } from 'vitest'
import { mcpWrite } from '../../scripts/sync-mcp-write.mjs'
import { keysAfter } from '../../mcp/src/writeTools'
import { parseConfig } from '../../mcp/src/config'

describe('local connector writes', () => {
  it('the generated record builder is current (run: node scripts/sync-mcp-write.mjs)', () => {
    const src = readFileSync(
      'supabase/functions/_shared/notesWrite.ts',
      'utf8',
    ).replace(/\r\n/g, '\n')
    const copy = readFileSync('mcp/src/gen/notesWrite.ts', 'utf8').replace(
      /\r\n/g,
      '\n',
    )
    expect(copy).toBe(mcpWrite(src))
  })

  it('appended order keys are valid for the app and sort after the last one', () => {
    for (const last of [null, 'a0', 'a9', 'b12', 'a0V5', 'c000']) {
      const keys = keysAfter(last, 200)
      let prev = last
      for (const k of keys) {
        expect(() => generateKeyBetween(k, null)).not.toThrow()
        if (prev !== null) {
          expect(k > prev).toBe(true)
          expect(() => generateKeyBetween(prev, k)).not.toThrow()
        }
        prev = k
      }
      expect(new Set(keys).size).toBe(200)
    }
  })

  it('the device id of this PC looks like the others', () => {
    expect(parseConfig(null, 'DESKTOP-ABC123').deviceId).toBe(
      'mcp-desktopabc123',
    )
  })
})
