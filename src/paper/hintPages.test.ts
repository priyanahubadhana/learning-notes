// @vitest-environment jsdom
import { beforeEach, expect, test } from 'vitest'
import { hintPageOk } from './hintPages'

beforeEach(() => localStorage.clear())

test('only the first three pages get the hint; they keep it', () => {
  expect(['a', 'b', 'c', 'd'].map(hintPageOk)).toEqual([
    true,
    true,
    true,
    false,
  ])
  expect(hintPageOk('a')).toBe(true)
  expect(hintPageOk('d')).toBe(false)
})
