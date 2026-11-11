import { mkdtemp, readFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { dpapiStore } from '../src/secrets'

describe.skipIf(process.platform !== 'win32')(
  'DPAPI file fallback (Windows)',
  () => {
    it('round-trips secrets and never writes them in plain text', async () => {
      const dir = await mkdtemp(join(tmpdir(), 'ln-mcp-'))
      const file = join(dir, 'secrets.dpapi')
      const s = dpapiStore(file)
      expect(await s.get('master')).toBeNull()
      await s.set('master', 'SUPER-SECRET-KEY')
      await s.set('refresh', 'tok')
      expect(await s.get('master')).toBe('SUPER-SECRET-KEY')
      expect(await readFile(file, 'utf8')).not.toContain('SUPER-SECRET-KEY')
      await s.remove('master')
      expect(await s.get('master')).toBeNull()
      expect(await s.get('refresh')).toBe('tok')
      await s.remove('refresh')
      expect(await s.get('refresh')).toBeNull()
    }, 30_000)
  },
)
