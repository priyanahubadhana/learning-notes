import { describe, expect, it } from 'vitest'
import { BundleError } from './bundle'
import { encryptBytes } from './crypto'
import { PasswordNeeded, lockedFileName, readImportFile } from './fileIO'

const json = JSON.stringify({
  app: 'learning-notes',
  kind: 'notebook',
  formatVersion: 1,
  exportedAt: 1,
  notebooks: [{ id: 'n' }],
})

describe('readImportFile', () => {
  it('reads a plain file', async () => {
    const bundle = await readImportFile(new Blob([json]))
    expect(bundle.notebooks).toHaveLength(1)
  })

  it('asks for the password of a locked file, then reads it', async () => {
    const locked = new Blob([
      (await encryptBytes(
        new TextEncoder().encode(json),
        'password1',
        100_000,
      )) as BlobPart,
    ])
    await expect(readImportFile(locked)).rejects.toBeInstanceOf(PasswordNeeded)
    await expect(readImportFile(locked, 'nope-nope')).rejects.toBeInstanceOf(
      BundleError,
    )
    expect((await readImportFile(locked, 'password1')).notebooks).toHaveLength(
      1,
    )
  })

  it('names protected files', () => {
    expect(lockedFileName('Heart.learningnotes.json')).toBe(
      'Heart.learningnotes.locked',
    )
  })
})
