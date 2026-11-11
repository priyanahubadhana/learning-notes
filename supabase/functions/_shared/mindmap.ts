/**
 * A mind map from an indented outline, for Deno. A small copy of `fromOutline`
 * and `addChild` in src/editor/mindMap/model.ts: the same tree the app builds
 * when it imports an outline. Ids are given by the caller (so tests are exact).
 * parity.test.ts checks the shape against the app's own function.
 */
export interface MindNode {
  id: string
  text: string
  parent: string | null
}
export interface MindMap {
  root: string
  nodes: MindNode[]
}

const MAX_NODES = 500
const MAX_TEXT = 200

export function outlineToMap(
  outline: string,
  centre: string,
  newId: () => string,
): MindMap {
  const lines = outline
    .split(/\r?\n/)
    .map((raw) => {
      const m = /^(\s*)(?:[-*+•]|\d+[.)])?\s*(.*\S)\s*$/.exec(
        raw.replace(/\t/g, '  '),
      )
      return m ? { depth: Math.floor(m[1].length / 2), text: m[2] } : null
    })
    .filter((l): l is { depth: number; text: string } => l !== null)
  const rootId = newId()
  const fresh = (text: string): MindMap => ({
    root: rootId,
    nodes: [{ id: rootId, text, parent: null }],
  })
  if (lines.length === 0) return fresh(centre.slice(0, MAX_TEXT))
  const base = Math.min(...lines.map((l) => l.depth))
  const tops = lines.filter((l) => l.depth === base)
  const single = tops.length === 1 && lines[0].depth === base
  const map = fresh((single ? lines[0].text : centre).slice(0, MAX_TEXT))
  const stack: { depth: number; id: string }[] = [
    { depth: single ? base : base - 1, id: rootId },
  ]
  for (const [i, l] of lines.entries()) {
    if (single && i === 0) continue
    while (stack.length > 1 && stack[stack.length - 1].depth >= l.depth)
      stack.pop()
    if (map.nodes.length >= MAX_NODES) break
    const id = newId()
    map.nodes.push({
      id,
      text: l.text.slice(0, MAX_TEXT),
      parent: stack[stack.length - 1].id,
    })
    stack.push({ depth: l.depth, id })
  }
  return map
}
