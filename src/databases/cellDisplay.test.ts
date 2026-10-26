import { describe, expect, it } from 'vitest'
import type { DbColumn } from '../core/types'
import { cellText } from './cellDisplay'

const column = (type: string, config = {}): DbColumn =>
  ({ id: 'c', databaseId: 'd', name: 'C', type, config }) as DbColumn

describe('cellText', () => {
  it('shows blanks, text, yes/no and lists', () => {
    expect(cellText(null)).toBe('')
    expect(cellText('')).toBe('')
    expect(cellText('Hi')).toBe('Hi')
    expect(cellText(true)).toBe('✓')
    expect(cellText(false)).toBe('')
    expect(cellText(['a', null, 'b'])).toBe('a, b')
  })

  it('formats numbers per column format', () => {
    expect(cellText(1234.5, column('number'))).toMatch(/1.?234\.5/)
    expect(cellText(0.5, column('number', { format: 'percent' }))).toMatch(
      /50\s?%/,
    )
    expect(cellText(3, column('number', { format: 'stars', max: 5 }))).toBe(
      '★★★☆☆',
    )
    expect(
      cellText(10, column('number', { format: 'currency', currency: 'INR' })),
    ).toContain('10')
    expect(
      cellText(10, column('number', { format: 'currency', currency: '??' })),
    ).toBe('10')
  })

  it('shows a day as that day, whatever the time zone', () => {
    expect(cellText({ date: '2026-03-01' })).toMatch(/1|Mar/)
    expect(cellText({ date: '2026-03-01' })).toContain('2026')
  })

  it('turns errors into messages', () => {
    expect(cellText({ error: 'unknownColumn', detail: 'Dose' })).toBe(
      'No column called [Dose]',
    )
    expect(cellText({ error: 'divZero' })).toBe('Division by zero')
  })
})
