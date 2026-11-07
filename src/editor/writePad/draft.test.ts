// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { loadDraft, saveDraft } from './draft'

describe('pad drafts (R6-15)', () => {
  beforeEach(() => localStorage.clear())

  it('keeps unsent text per page and survives a fresh read', () => {
    saveDraft('a', 'first page text')
    saveDraft('b', 'other page')
    expect(loadDraft('a')).toBe('first page text')
    expect(loadDraft('b')).toBe('other page')
    expect(loadDraft('c')).toBe('')
  })

  it('empty text removes the draft', () => {
    saveDraft('a', 'x')
    saveDraft('a', '')
    expect(loadDraft('a')).toBe('')
    expect(localStorage.length).toBe(0)
  })
})
