import { describe, expect, it } from 'vitest'
import { baseHash, parseHash, routeToHash, type Route } from './router'

const routes: Route[] = [
  { kind: 'home' },
  { kind: 'page', id: 'p 1/x' },
  { kind: 'notebook', id: 'n1', parts: [] },
  { kind: 'notebook', id: 'n1', parts: ['revise', 'lesson-9'] },
  { kind: 'database', id: 'd1', parts: ['view1'] },
  { kind: 'databases' },
  { kind: 'cards' },
  { kind: 'data' },
  { kind: 'calendar' },
  { kind: 'settings', parts: [] },
  { kind: 'settings', parts: ['review'] },
  { kind: 'notebook', id: 'n1', parts: ['database', 'd2', 'v3'] },
  { kind: 'read', pageId: 'p1' },
  { kind: 'read', pageId: 'p1', at: 'pdf:3:0.25' },
  { kind: 'read', pageId: 'p1', at: 'epub:epubcfi(/6/4!/4/2)' },
  { kind: 'capture' },
  { kind: 'capture', url: 'https://example.com/a?b=1&c=2' },
  { kind: 'capture', title: 'A & B', text: 'Line one\nLine two ?#' },
  { kind: 'search' },
  { kind: 'search', savedId: 's1' },
  { kind: 'search', query: { text: 'a&b ?#', type: 'card', filters: {} } },
  { kind: 'review', scope: { kind: 'all' } },
  { kind: 'review', scope: { kind: 'wrong' } },
  { kind: 'review', scope: { kind: 'notebook', notebookId: 'n1' } },
  {
    kind: 'review',
    scope: { kind: 'page', pageId: 'p1', includeSubpages: true },
  },
  {
    kind: 'review',
    scope: { kind: 'page', pageId: 'p1', includeSubpages: false },
  },
]

describe('router', () => {
  it.each(routes)('round trip %j', (route) => {
    expect(parseHash(routeToHash(route))).toEqual(route)
  })

  it('treats empty, unknown and damaged addresses as home', () => {
    for (const hash of [
      '',
      '#',
      '#/',
      '#/nope',
      '#/review/custom',
      '#/page',
      '#/page/%E0%A4%A',
    ]) {
      expect(parseHash(hash)).toEqual({ kind: 'home' })
    }
  })

  it('survives a damaged search query', () => {
    expect(parseHash('#/search?q=%7Bbad')).toEqual({ kind: 'search' })
    expect(parseHash('#/search?q=%5B1%5D')).toEqual({ kind: 'search' })
  })

  it('keeps at most three own levels', () => {
    expect(parseHash('#/notebook/n/a/b/c/d')).toEqual({
      kind: 'notebook',
      id: 'n',
      parts: ['a', 'b', 'c'],
    })
  })

  it('baseHash drops the own levels only', () => {
    expect(baseHash('#/notebook/n/revise/x')).toBe('#/notebook/n')
    expect(baseHash('#/database/d/v')).toBe('#/database/d')
    expect(baseHash('#/settings/review')).toBe('#/settings')
    expect(baseHash('#/page/p')).toBe('#/page/p')
  })
})
