/**
 * @vitest-environment jsdom
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { writePref } from '../app/uiPrefs'
import type { LearningNotesDB } from '../core/db'
import { createTestDb } from '../core/testing'
import {
  changeRate,
  chooseCurrency,
  currencyChoices,
  formatCost,
  readCostCurrency,
  rateOf,
  startCurrencyMirror,
  toCurrency,
} from './costCurrency'

let db: LearningNotesDB
beforeEach(() => {
  localStorage.clear()
  db = createTestDb()
})

describe('cost currency', () => {
  it('defaults to INR at 90', () => {
    const c = readCostCurrency()
    expect(c.code).toBe('INR')
    expect(rateOf(c)).toBe(90)
    expect(toCurrency(2)).toBe(180)
    expect(formatCost(0.00001)).toContain('under')
  })

  it('migrates the old ai.inrPerUsd pref', () => {
    writePref('ai.inrPerUsd', 100)
    expect(rateOf(readCostCurrency())).toBe(100)
  })

  it('other currencies start at 1 until edited, each keeps its own rate', async () => {
    await chooseCurrency(db, 'EUR')
    expect(rateOf(readCostCurrency())).toBe(1)
    await changeRate(db, 0.92)
    expect(toCurrency(10)).toBeCloseTo(9.2, 8)
    expect(formatCost(10)).toContain('9.20')
    expect(readCostCurrency().changedAt).not.toBeNull()
    await chooseCurrency(db, 'INR')
    expect(rateOf(readCostCurrency())).toBe(90)
    await chooseCurrency(db, 'EUR')
    expect(rateOf(readCostCurrency())).toBe(0.92)
    const row = await db.settings.get('ai.currency')
    expect(row?.value).toMatchObject({ code: 'EUR' })
  })

  it('lists currencies with names, and mirrors a synced row into this browser', async () => {
    const list = currencyChoices()
    expect(list.find((c) => c.code === 'USD')?.name).toMatch(/dollar/i)
    await db.settings.put({
      id: 'ai.currency',
      value: { code: 'JPY', rates: { JPY: 150 }, changedAt: 1 },
      updatedAt: 1,
    })
    const stop = startCurrencyMirror(db)
    await vi.waitFor(() => expect(readCostCurrency().code).toBe('JPY'))
    stop()
    expect(formatCost(1)).toContain('150')
  })
})
