import { describe, expect, it } from 'vitest'
import type { Page } from '../core/types'
import { dropIntent, planPageMove, planStep } from './pageDrag'

const page = (id: string, parentId: string | null, order: string): Page =>
  ({ id, parentId, order, notebookId: 'n' }) as unknown as Page

const pages = [
  page('a', null, 'a'),
  page('b', null, 'b'),
  page('c', null, 'c'),
  page('b1', 'b', 'a'),
]

describe('page drag plans', () => {
  it('reads the pointer height', () => {
    expect(dropIntent(2, 36)).toBe('before')
    expect(dropIntent(18, 36)).toBe('inside')
    expect(dropIntent(34, 36)).toBe('after')
  })

  it('places before, after and inside', () => {
    expect(planPageMove(pages, 'c', 'a', 'before')).toEqual({
      parentId: null,
      index: 0,
    })
    expect(planPageMove(pages, 'a', 'b', 'after')).toEqual({
      parentId: null,
      index: 1,
    })
    expect(planPageMove(pages, 'a', 'c', 'inside')).toEqual({
      parentId: 'c',
      index: 0,
    })
  })

  it('refuses a move into itself or its own sub-pages', () => {
    expect(planPageMove(pages, 'b', 'b1', 'inside')).toBeNull()
    expect(planPageMove(pages, 'b', 'b', 'after')).toBeNull()
  })

  it('steps one place', () => {
    expect(planStep(pages, 'a', 1)).toEqual({ parentId: null, index: 1 })
    expect(planStep(pages, 'c', -1)).toEqual({ parentId: null, index: 1 })
    expect(planStep(pages, 'a', -1)).toBeNull()
    expect(planStep(pages, 'c', 1)).toBeNull()
  })
})
