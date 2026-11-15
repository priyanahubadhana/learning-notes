// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { orderItems, setToolOrder, toolOrder } from './toolOrder'

const items = [{ id: 'type' }, { id: 'size' }, { id: 'colour' }, { id: 'feel' }]
const DEFAULT = items.map((i) => i.id)

describe('toolOrder', () => {
  beforeEach(() => {
    localStorage.clear()
    toolOrder.clearCache()
  })

  it('shows the default order when nothing is saved', () => {
    expect(orderItems(items, undefined)).toBe(items)
  })

  it('follows the saved order, drops unknown ids and puts new items last', () => {
    const ids = orderItems(items, ['feel', 'gone', 'type']).map((i) => i.id)
    expect(ids).toEqual(['feel', 'type', 'size', 'colour'])
  })

  it('saves per tool, is read again after a reload, and the default order saves as nothing', () => {
    setToolOrder('pen', ['size', 'type', 'colour', 'feel'], DEFAULT)
    toolOrder.clearCache()
    expect(toolOrder.get().pen).toEqual(['size', 'type', 'colour', 'feel'])
    setToolOrder('pen', DEFAULT, DEFAULT)
    expect(toolOrder.get().pen).toBeUndefined()
    setToolOrder('pen', ['size', 'type', 'colour', 'feel'], DEFAULT)
    setToolOrder('pen', undefined)
    expect(toolOrder.get()).toEqual({})
  })

  it('ignores a saved value of the wrong shape', () => {
    localStorage.setItem('learning-notes:toolbar.v9.toolOrder', '{"pen":5}')
    toolOrder.clearCache()
    expect(toolOrder.get()).toEqual({})
  })
})
