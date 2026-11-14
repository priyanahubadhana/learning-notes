import { describe, expect, it } from 'vitest'
import { failureNote } from './failureNote'

describe('failureNote', () => {
  it('says nothing without a failure', () => {
    expect(failureNote(null)).toBeNull()
  })
  it('names the download step and the seconds waited', () => {
    expect(failureNote({ what: 'download', waitedMs: 20400 })).toBe(
      'Preview note: the download failed after 20 s',
    )
  })
  it('names the restart step and the seconds waited', () => {
    expect(failureNote({ what: 'restart', waitedMs: 30000 })).toBe(
      'Preview note: the restart did not come after 30 s',
    )
  })
})
