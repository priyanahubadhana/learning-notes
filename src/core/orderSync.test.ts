import { describe, expect, it } from 'vitest'
import { stableId } from './ids'
import { assignOrders, byOrder, isOrderKey, orderBetween } from './order'

describe('order keys for sync (L1)', () => {
  it('breaks a key tie by id, the same on every device', () => {
    const a = { id: 'b-id', order: 'a0V' }
    const b = { id: 'a-id', order: 'a0V' }
    expect([a, b].sort(byOrder).map((x) => x.id)).toEqual(['a-id', 'b-id'])
    expect([b, a].sort(byOrder).map((x) => x.id)).toEqual(['a-id', 'b-id'])
  })

  it('does not throw between equal or crossed neighbours', () => {
    const k = orderBetween('a0V', 'a0V')
    expect(k > 'a0V').toBe(true)
    expect(isOrderKey(k)).toBe(true)
    expect(orderBetween('a2', 'a1') > 'a2').toBe(true)
  })

  it('keeps keys between their neighbours and valid', () => {
    for (let i = 0; i < 500; i++) {
      const k = orderBetween('a0', 'a1')
      expect(k > 'a0' && k < 'a1').toBe(true)
      expect(isOrderKey(k)).toBe(true)
      expect(k.endsWith('0')).toBe(false)
    }
    const end = orderBetween('a0', null)
    expect(end > 'a0' && isOrderKey(end)).toBe(true)
    const start = orderBetween(null, 'a0')
    expect(start < 'a0' && isOrderKey(start)).toBe(true)
  })

  it('makes same-spot inserts on two devices differ almost always', () => {
    let same = 0
    for (let i = 0; i < 200; i++) {
      if (orderBetween('a0', 'a1') === orderBetween('a0', 'a1')) same++
    }
    expect(same).toBeLessThan(5)
  })

  it('assignOrders repairs a tie', () => {
    const keys = assignOrders(['a0V', 'a0V', 'a1'])
    expect(keys[0] < keys[1] && keys[1] < keys[2]).toBe(true)
  })
})

describe('stableId (L1)', () => {
  it('is fixed per name and shaped like a UUID', () => {
    const id = stableId('workspace:default')
    expect(id).toBe(stableId('workspace:default'))
    expect(id).not.toBe(stableId('workspace:other'))
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-8[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    )
  })
})
