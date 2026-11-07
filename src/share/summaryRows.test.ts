import { describe, expect, it } from 'vitest'
import { checkedRow } from './checkRows'

const row = {
  id: 's1',
  createdAt: 1,
  updatedAt: 1,
  deletedAt: null,
  pageId: 'p1',
  notebookId: 'n1',
  order: 'a0',
  text: 'Key point',
}

describe('Summary lines in a backup file', () => {
  it('accepts a good line and drops unknown fields', () => {
    const clean = checkedRow('summaryItems', {
      ...row,
      sourceBlockId: 'b1',
      href: '#/read/p1?at=3',
      where: 'p. 3',
      extra: 'x',
    })
    expect(clean).toMatchObject({ pageId: 'p1', href: '#/read/p1?at=3' })
    expect(clean).not.toHaveProperty('extra')
  })

  it('refuses unsafe links, long text and missing fields', () => {
    expect(
      checkedRow('summaryItems', { ...row, href: 'javascript:alert(1)' }),
    ).toBeNull()
    expect(
      checkedRow('summaryItems', { ...row, text: 'x'.repeat(2001) }),
    ).toBeNull()
    expect(checkedRow('summaryItems', { ...row, pageId: undefined })).toBeNull()
  })
})
