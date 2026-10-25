import { describe, expect, it } from 'vitest'
import { createBlockTypeRegistry } from '../core/blockTypes'
import { blockTypes, builtinBlockTypes } from './builtinBlockTypes'

describe('block type registry', () => {
  it('registers, finds and lists types in order', () => {
    const registry = createBlockTypeRegistry()
    registry.register({ type: 'a', label: 'A', createContent: () => ({}) })
    registry.register({ type: 'b', label: 'B', createContent: () => ({}) })

    expect(registry.has('a')).toBe(true)
    expect(registry.get('b')?.label).toBe('B')
    expect(registry.get('missing')).toBeUndefined()
    expect(registry.list().map((d) => d.type)).toEqual(['a', 'b'])
  })

  it('rejects duplicate type names', () => {
    const registry = createBlockTypeRegistry()
    const def = { type: 'a', label: 'A', createContent: () => ({}) }
    registry.register(def)
    expect(() => registry.register(def)).toThrow('already registered')
  })

  it('accepts a new custom type without core changes', () => {
    const registry = createBlockTypeRegistry(builtinBlockTypes)
    registry.register({
      type: 'flashcard',
      label: 'Flashcard',
      createContent: () => ({ front: '', back: '' }),
    })
    expect(registry.get('flashcard')?.createContent()).toEqual({
      front: '',
      back: '',
    })
  })
})

describe('built-in block types', () => {
  it('includes every built-in block type', () => {
    expect(blockTypes.list().map((d) => d.type)).toEqual([
      'paragraph',
      'heading',
      'bulletListItem',
      'numberedListItem',
      'checkListItem',
      'quote',
      'divider',
      'codeBlock',
      'image',
      'callout',
      'card',
      'pageLink',
    ])
  })

  it('creates a fresh content object each time', () => {
    const heading = blockTypes.get('heading')!
    const first = heading.createContent()
    first.level = 3
    expect(heading.createContent()).toEqual({ text: [], level: 1 })
  })
})
