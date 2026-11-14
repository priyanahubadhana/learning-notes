import { describe, expect, it } from 'vitest'
import { nameSheetResult } from './nameSheetLogic'

describe('nameSheetResult', () => {
  it('an empty box keeps the current name (cancel)', () => {
    expect(nameSheetResult('', '')).toBeNull()
    expect(nameSheetResult('   ', '')).toBeNull()
    expect(nameSheetResult('  ', 'Biology')).toBeNull()
  })
  it('an unchanged name is cancel', () => {
    expect(nameSheetResult(' Biology ', 'Biology')).toBeNull()
  })
  it('a new name is trimmed and returned', () => {
    expect(nameSheetResult('  Physics ', '')).toBe('Physics')
    expect(nameSheetResult('Physics', 'Biology')).toBe('Physics')
  })
})
