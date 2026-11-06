import { describe, expect, it } from 'vitest'
import {
  addChild,
  addSibling,
  childrenOf,
  fromOutline,
  indent,
  layoutMindMap,
  mindMapText,
  moveSibling,
  moveUnder,
  newMindMap,
  outdent,
  parseMindMap,
  removeNode,
  renameNode,
  serializeMindMap,
  toOutline,
  walk,
  type MindMap,
} from './model'

/** Texts of the tree in reading order, indented by depth. */
const shape = (m: MindMap) =>
  walk(m).map(({ node, depth }) => `${'.'.repeat(depth)}${node.text}`)

function sample() {
  let m = renameNode(newMindMap(), newMindMap().root, '')
  m = renameNode(m, m.root, 'Root')
  const a = addChild(m, m.root, 'A')
  const b = addChild(a.map, m.root, 'B')
  const a1 = addChild(b.map, a.id, 'A1')
  const a2 = addChild(a1.map, a.id, 'A2')
  return { m: a2.map, root: m.root, a: a.id, b: b.id, a1: a1.id, a2: a2.id }
}

describe('mind map model', () => {
  it('round-trips through JSON and survives damaged data', () => {
    const { m } = sample()
    expect(parseMindMap(serializeMindMap(m))).toEqual(m)
    for (const bad of ['', 'nope', '{}', '[]', '{"root":1,"nodes":[]}', null]) {
      const fresh = parseMindMap(bad)
      expect(fresh.nodes).toHaveLength(1)
      expect(fresh.nodes[0].parent).toBeNull()
    }
  })

  it('hangs orphans and cycles under the root', () => {
    const data = JSON.stringify({
      root: 'r',
      nodes: [
        { id: 'r', text: 'R', parent: null },
        { id: 'x', text: 'X', parent: 'gone' },
        { id: 'p', text: 'P', parent: 'q' },
        { id: 'q', text: 'Q', parent: 'p' },
      ],
    })
    const m = parseMindMap(data)
    expect(m.nodes.every((n) => n.id === 'r' || n.parent !== null)).toBe(true)
    // Everything is reachable from the root.
    expect(walk(m)).toHaveLength(4)
  })

  it('adds children last and a sibling right after its node', () => {
    const { m, a, b } = sample()
    expect(shape(m)).toEqual(['Root', '.A', '..A1', '..A2', '.B'])
    const s = addSibling(m, a, 'A+')
    expect(shape(s.map)).toEqual(['Root', '.A', '..A1', '..A2', '.A+', '.B'])
    expect(childrenOf(s.map, b)).toEqual([])
    // A sibling of the centre becomes a branch of the centre.
    const r = addSibling(m, m.root, 'new')
    expect(childrenOf(r.map, m.root).at(-1)?.text).toBe('new')
  })

  it('removes a branch with everything below it, never the centre', () => {
    const { m, a, root } = sample()
    expect(shape(removeNode(m, a))).toEqual(['Root', '.B'])
    expect(removeNode(m, root)).toBe(m)
  })

  it('moves a branch under another, but never under itself', () => {
    const { m, a, b, a1 } = sample()
    expect(shape(moveUnder(m, b, a))).toEqual([
      'Root',
      '.A',
      '..A1',
      '..A2',
      '..B',
    ])
    expect(moveUnder(m, a, a1)).toBe(m)
    expect(moveUnder(m, a, a)).toBe(m)
    expect(moveUnder(m, m.root, a)).toBe(m)
  })

  it('reorders among siblings, indents and outdents', () => {
    const { m, a, b, a2 } = sample()
    expect(shape(moveSibling(m, b, -1))).toEqual([
      'Root',
      '.B',
      '.A',
      '..A1',
      '..A2',
    ])
    expect(moveSibling(m, a, -1)).toBe(m)
    expect(shape(indent(m, b))).toEqual(['Root', '.A', '..A1', '..A2', '..B'])
    expect(shape(outdent(m, a2))).toEqual(['Root', '.A', '..A1', '.A2', '.B'])
    // Cannot outdent a branch of the centre.
    expect(outdent(m, a)).toBe(m)
  })

  it('keeps sibling order when a child is added to an earlier node', () => {
    const { m, a, b } = sample()
    const more = addChild(m, b, 'B1')
    expect(shape(more.map)).toEqual([
      'Root',
      '.A',
      '..A1',
      '..A2',
      '.B',
      '..B1',
    ])
    expect(childrenOf(more.map, a).map((n) => n.text)).toEqual(['A1', 'A2'])
  })

  it('reads and writes an indented list', () => {
    const { m } = sample()
    const text = toOutline(m)
    expect(text).toBe('- Root\n  - A\n    - A1\n    - A2\n  - B')
    expect(shape(fromOutline(text))).toEqual(shape(m))
    // Several top-level items hang under a centre.
    const flat = fromOutline('- one\n- two\n  - deep', 'Topic')
    expect(shape(flat)).toEqual(['Topic', '.one', '.two', '..deep'])
  })

  it('lays out a tree left to right with parents beside their children', () => {
    const { m, a, a1, a2 } = sample()
    const lay = layoutMindMap(m)
    const at = (id: string) => lay.nodes.find((n) => n.id === id)!
    expect(at(m.root).x).toBeLessThan(at(a).x)
    expect(at(a).x).toBeLessThan(at(a1).x)
    // A leaf row never overlaps another.
    expect(at(a2).y).toBeGreaterThan(at(a1).y)
    // A parent sits halfway between its first and last child.
    expect(at(a).y).toBeCloseTo((at(a1).y + at(a2).y) / 2)
    expect(lay.width).toBeGreaterThan(at(a1).x)
    expect(lay.height).toBeGreaterThan(at(a2).y)
  })

  it('gives its words to search', () => {
    const { m } = sample()
    expect(mindMapText(serializeMindMap(m))).toContain('A2')
  })
})
