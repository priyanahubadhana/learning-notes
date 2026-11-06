import { describe, expect, it } from 'vitest'
import { parseQuickAdd } from './quickAdd'

// 7 Nov 2026 is a Saturday.
const TODAY = '2026-11-07'

describe('quick add', () => {
  it('reads a day word at the end or the start', () => {
    expect(parseQuickAdd('Call Sam tomorrow', TODAY)).toEqual({
      title: 'Call Sam',
      plannedDay: '2026-11-08',
    })
    expect(parseQuickAdd('today Pay rent', TODAY)).toEqual({
      title: 'Pay rent',
      plannedDay: TODAY,
    })
    expect(parseQuickAdd('Read chapter 3 mon', TODAY)).toEqual({
      title: 'Read chapter 3',
      plannedDay: '2026-11-09',
    })
  })

  it('knows Spanish and Hindi words', () => {
    expect(parseQuickAdd('comprar pan mañana', TODAY).plannedDay).toBe(
      '2026-11-08',
    )
    expect(parseQuickAdd('hoy estudiar', TODAY).plannedDay).toBe(TODAY)
    expect(parseQuickAdd('पढ़ाई सोमवार', TODAY).plannedDay).toBe('2026-11-09')
    expect(parseQuickAdd('काम आज', TODAY).title).toBe('काम')
  })

  it('leaves words in the middle and a lone word alone', () => {
    expect(parseQuickAdd('Plan monday meeting notes', TODAY)).toEqual({
      title: 'Plan monday meeting notes',
    })
    expect(parseQuickAdd('tomorrow', TODAY)).toEqual({ title: 'tomorrow' })
    expect(parseQuickAdd('   ', TODAY)).toEqual({ title: '' })
  })

  it('a weekday that is today means next week', () => {
    expect(parseQuickAdd('Gym sat', TODAY).plannedDay).toBe('2026-11-14')
  })
})
