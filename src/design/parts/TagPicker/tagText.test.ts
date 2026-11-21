import { describe, expect, it } from 'vitest'
import { fold as searchFold } from '../../../search/searchText'
import { cleanTagName as tagsClean } from '../../../tags/tagNames'
import { cleanTagName, fold } from './tagText'

describe('tag picker text helpers match the app', () => {
  it('fold and cleanTagName agree with search and tags', () => {
    for (const s of [
      'Café',
      'İstanbul',
      ' Heart Sounds ',
      '#a/b c',
      'हिन्दी',
      'x'.repeat(80),
    ]) {
      expect(fold(s)).toBe(searchFold(s))
      expect(cleanTagName(s)).toBe(tagsClean(s))
    }
  })
})
