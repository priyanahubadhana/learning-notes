/**
 * Mind map model (G0b). A mind map is an ordinary editable tree, never a
 * picture: `{ root, nodes[] }` where each node names its parent and the
 * array order is the order among siblings. Stored as JSON text in the
 * block's `data` prop. Pure functions, no DOM, so they are unit-tested and
 * the Markdown importer (CR2) can build the same tree from an indented list.
 */
import { createId } from '../../core/ids'

export interface MindNode {
  id: string
  text: string
  /** null for the root only. */
  parent: string | null
}

export interface MindMap {
  root: string
  nodes: MindNode[]
}

/** Themes: how the map is coloured. */
export const MIND_THEMES = ['calm', 'bold', 'paper'] as const
export type MindTheme = (typeof MIND_THEMES)[number]
export const isMindTheme = (v: unknown): v is MindTheme =>
  (MIND_THEMES as readonly unknown[]).includes(v)

/** Limits keep a damaged or huge file from freezing the page. */
export const MAX_NODES = 500
export const MAX_TEXT = 200

/** A new map with one central topic. */
export function newMindMap(topic = ''): MindMap {
  const id = createId()
  return { root: id, nodes: [{ id, text: topic, parent: null }] }
}

/** A copy that is safe to show: unknown shapes become a fresh map. */
export function parseMindMap(data: unknown): MindMap {
  if (typeof data !== 'string' || data === '') return newMindMap()
  try {
    const raw = JSON.parse(data) as unknown
    if (!raw || typeof raw !== 'object') return newMindMap()
    const { root, nodes } = raw as { root?: unknown; nodes?: unknown }
    if (typeof root !== 'string' || !Array.isArray(nodes)) return newMindMap()
    const seen = new Set<string>()
    const kept: MindNode[] = []
    for (const n of nodes.slice(0, MAX_NODES)) {
      if (!n || typeof n !== 'object') continue
      const { id, text, parent } = n as Record<string, unknown>
      if (typeof id !== 'string' || id === '' || seen.has(id)) continue
      if (typeof text !== 'string') continue
      if (parent !== null && typeof parent !== 'string') continue
      seen.add(id)
      kept.push({ id, text: text.slice(0, MAX_TEXT), parent })
    }
    const rootNode = kept.find((n) => n.id === root && n.parent === null)
    if (!rootNode) return newMindMap()
    // Nodes whose parent is missing hang under the root (nothing is lost).
    const ids = new Set(kept.map((n) => n.id))
    const fixed = kept.map((n) =>
      n.id !== root && (n.parent === null || !ids.has(n.parent))
        ? { ...n, parent: root }
        : n,
    )
    // Cycles (a node under its own descendant) also hang under the root.
    const safe = fixed.map((n) =>
      n.id !== root && isUnder(fixed, n.parent!, n.id)
        ? { ...n, parent: root }
        : n,
    )
    return { root, nodes: safe }
  } catch {
    return newMindMap()
  }
}

export const serializeMindMap = (map: MindMap): string => JSON.stringify(map)

const byId = (map: MindMap, id: string) => map.nodes.find((n) => n.id === id)

/** The children of a node, in order. */
export const childrenOf = (map: MindMap, id: string): MindNode[] =>
  map.nodes.filter((n) => n.parent === id)

/** True when `id` is `ancestor` or sits anywhere below it. */
function isUnder(
  nodes: readonly MindNode[],
  id: string,
  ancestor: string,
): boolean {
  let cur: string | null = id
  const guard = new Set<string>()
  while (cur !== null && !guard.has(cur)) {
    if (cur === ancestor) return true
    guard.add(cur)
    cur = nodes.find((n) => n.id === cur)?.parent ?? null
  }
  return false
}

/** Adds a child as the last one under `parentId`; returns the new id. */
export function addChild(
  map: MindMap,
  parentId: string,
  text = '',
): { map: MindMap; id: string } {
  if (!byId(map, parentId) || map.nodes.length >= MAX_NODES) {
    return { map, id: parentId }
  }
  const id = createId()
  // The last child: sibling order is the array order.
  return {
    map: { ...map, nodes: [...map.nodes, { id, text, parent: parentId }] },
    id,
  }
}

// Sibling order is the array order among nodes with the same parent, so
// every move below changes only where ONE node sits in the array.

/** Adds a sibling right after `id` (a child of the root if `id` is the root). */
export function addSibling(
  map: MindMap,
  id: string,
  text = '',
): { map: MindMap; id: string } {
  const node = byId(map, id)
  if (!node || node.parent === null) return addChild(map, map.root, text)
  if (map.nodes.length >= MAX_NODES) return { map, id }
  const fresh = createId()
  const nodes = [...map.nodes]
  nodes.splice(nodes.indexOf(node) + 1, 0, {
    id: fresh,
    text,
    parent: node.parent,
  })
  return { map: { ...map, nodes }, id: fresh }
}

/** Every id in the branch that starts at `id`. */
export function branchIds(map: MindMap, id: string): Set<string> {
  return new Set(
    map.nodes.filter((n) => isUnder(map.nodes, n.id, id)).map((n) => n.id),
  )
}

/** Removes a node and everything below it. The root cannot be removed. */
export function removeNode(map: MindMap, id: string): MindMap {
  if (id === map.root) return map
  const gone = branchIds(map, id)
  return { ...map, nodes: map.nodes.filter((n) => !gone.has(n.id)) }
}

export function renameNode(map: MindMap, id: string, text: string): MindMap {
  return {
    ...map,
    nodes: map.nodes.map((n) =>
      n.id === id ? { ...n, text: text.slice(0, MAX_TEXT) } : n,
    ),
  }
}

/**
 * Moves a branch to become the last child of `parentId` (drag onto a node).
 * Refused when it would put a branch under itself, or for the root.
 */
export function moveUnder(map: MindMap, id: string, parentId: string): MindMap {
  const node = byId(map, id)
  if (
    !node ||
    id === map.root ||
    id === parentId ||
    !byId(map, parentId) ||
    isUnder(map.nodes, parentId, id)
  ) {
    return map
  }
  return {
    ...map,
    nodes: [
      ...map.nodes.filter((n) => n.id !== id),
      { ...node, parent: parentId },
    ],
  }
}

/** Moves a branch up or down among its siblings. */
export function moveSibling(map: MindMap, id: string, dir: -1 | 1): MindMap {
  const node = byId(map, id)
  if (!node || node.parent === null) return map
  const sibs = childrenOf(map, node.parent)
  const other = sibs[sibs.findIndex((n) => n.id === id) + dir]
  if (!other) return map
  const nodes = [...map.nodes]
  const a = nodes.indexOf(node)
  const b = nodes.indexOf(other)
  ;[nodes[a], nodes[b]] = [nodes[b], nodes[a]]
  return { ...map, nodes }
}

/** Alt+Right: becomes the last child of the sibling just above. */
export function indent(map: MindMap, id: string): MindMap {
  const node = byId(map, id)
  if (!node || node.parent === null) return map
  const sibs = childrenOf(map, node.parent)
  const i = sibs.findIndex((n) => n.id === id)
  return i > 0 ? moveUnder(map, id, sibs[i - 1].id) : map
}

/** Alt+Left: becomes a sibling right after its parent. */
export function outdent(map: MindMap, id: string): MindMap {
  const node = byId(map, id)
  const parent = node?.parent ? byId(map, node.parent) : undefined
  if (!node || !parent || parent.parent === null) return map
  const rest = map.nodes.filter((n) => n.id !== id)
  const at = rest.findIndex((n) => n.id === parent.id)
  rest.splice(at + 1, 0, { ...node, parent: parent.parent })
  return { ...map, nodes: rest }
}

/** Depth-first order of the tree. */
export function walk(map: MindMap): { node: MindNode; depth: number }[] {
  const out: { node: MindNode; depth: number }[] = []
  const visit = (id: string, depth: number) => {
    const node = byId(map, id)
    if (!node) return
    out.push({ node, depth })
    for (const c of childrenOf(map, id)) visit(c.id, depth + 1)
  }
  visit(map.root, 0)
  return out
}

/** All the words on the map, for search. */
export function mindMapText(data: unknown): string {
  return parseMindMap(data)
    .nodes.map((n) => n.text)
    .join(' ')
}

/** An indented list ("- a" / "  - b"), the way Markdown writes a tree. */
export function toOutline(map: MindMap): string {
  return walk(map)
    .map(({ node, depth }) => `${'  '.repeat(depth)}- ${node.text}`)
    .join('\n')
}

/**
 * Builds a map from an indented bullet list (what an AI writes under
 * `## Mind map`). The first line is the central topic when it is the only
 * top-level item; otherwise the topics hang under an empty centre.
 */
export function fromOutline(outline: string, centre = ''): MindMap {
  const lines = outline
    .split(/\r?\n/)
    .map((raw) => {
      const m = /^(\s*)(?:[-*+•]|\d+[.)])?\s*(.*\S)\s*$/.exec(
        raw.replace(/\t/g, '  '),
      )
      return m ? { depth: Math.floor(m[1].length / 2), text: m[2] } : null
    })
    .filter((l): l is { depth: number; text: string } => l !== null)
  if (lines.length === 0) return newMindMap(centre)
  const base = Math.min(...lines.map((l) => l.depth))
  const tops = lines.filter((l) => l.depth === base)
  const single = tops.length === 1 && lines[0].depth === base
  const map = newMindMap(single ? lines[0].text : centre)
  const stack: { depth: number; id: string }[] = [
    { depth: single ? base : base - 1, id: map.root },
  ]
  let out = map
  for (const [i, l] of lines.entries()) {
    if (single && i === 0) continue
    while (stack.length > 1 && stack[stack.length - 1].depth >= l.depth)
      stack.pop()
    const added = addChild(out, stack[stack.length - 1].id, l.text)
    out = added.map
    stack.push({ depth: l.depth, id: added.id })
  }
  return out
}

// ---- Layout --------------------------------------------------------------

export interface Placed {
  id: string
  x: number
  y: number
  w: number
  h: number
  depth: number
  /** Index of the top-level branch it belongs to (colours). */
  branch: number
}

export interface Layout {
  nodes: Placed[]
  width: number
  height: number
}

export const NODE_H = 36
const ROW_GAP = 14
const COL_GAP = 56
const PAD = 16

/** Width of a node's box for its text (an estimate; the font is fixed). */
export const nodeWidth = (text: string, depth: number): number =>
  Math.min(280, Math.max(depth === 0 ? 96 : 64, text.length * 8 + 28))

/**
 * Left-to-right tree: a column per depth, leaves in rows, each parent
 * centred beside its children.
 */
export function layoutMindMap(map: MindMap): Layout {
  const placed = new Map<string, Placed>()
  let row = 0
  const colWidth: number[] = []
  const rootChildren = childrenOf(map, map.root).map((c) => c.id)

  const measure = (id: string, depth: number) => {
    const node = byId(map, id)
    if (!node) return
    colWidth[depth] = Math.max(
      colWidth[depth] ?? 0,
      nodeWidth(node.text, depth),
    )
    for (const c of childrenOf(map, id)) measure(c.id, depth + 1)
  }
  measure(map.root, 0)
  const colX: number[] = []
  colWidth.forEach((_w, i) => {
    colX[i] = i === 0 ? PAD : colX[i - 1] + colWidth[i - 1] + COL_GAP
  })

  const place = (id: string, depth: number, branch: number): number => {
    const node = byId(map, id)!
    const kids = childrenOf(map, id)
    let y: number
    if (kids.length === 0) {
      y = PAD + row * (NODE_H + ROW_GAP)
      row++
    } else {
      const ys = kids.map((c) =>
        place(
          c.id,
          depth + 1,
          depth === 0 ? rootChildren.indexOf(c.id) : branch,
        ),
      )
      y = (ys[0] + ys[ys.length - 1]) / 2
    }
    placed.set(id, {
      id,
      x: colX[depth],
      y,
      w: nodeWidth(node.text, depth),
      h: NODE_H,
      depth,
      branch: depth === 0 ? -1 : branch,
    })
    return y
  }
  place(map.root, 0, 0)
  const all = [...placed.values()]
  const last = colX.length - 1
  return {
    nodes: all,
    width: (colX[last] ?? PAD) + (colWidth[last] ?? 0) + PAD,
    height: Math.max(
      NODE_H + PAD * 2,
      PAD * 2 + row * (NODE_H + ROW_GAP) - ROW_GAP,
    ),
  }
}
