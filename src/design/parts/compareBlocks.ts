/** Pure compare of two versions of a page, block by block (S3-33 to S3-37). */

export type CompareBlock = {
  /** Same id on both sides = the same block (it may have moved or changed). */
  id?: string
  text: string
  /** A picture block: a different `picture` marks it "picture changed". */
  picture?: string
}
export type CompareDoc = { blocks: CompareBlock[] }

export type Word = { t: string; mark: 'same' | 'add' | 'del' }
export type RowKind = 'same' | 'added' | 'removed' | 'changed'

export type CompareRow = {
  kind: RowKind
  before?: CompareBlock
  after?: CompareBlock
  /** Word by word, for a changed block. */
  words?: { before: Word[]; after: Word[] }
  /** The block moved: its removed and added rows count as one change. */
  moved?: boolean
  /** Index of the change this row belongs to (null for unchanged rows). */
  change: number | null
}

export type CompareResult = {
  rows: CompareRow[]
  /** Distinct changes (a moved block counts once). */
  changes: number
}

const keyOf = (b: CompareBlock) => b.id ?? b.text
const sameBlock = (a: CompareBlock, b: CompareBlock) =>
  a.text === b.text && a.picture === b.picture

/** Longest common subsequence of two key lists: pairs of matching indexes. */
function lcs(a: string[], b: string[]): [number, number][] {
  const n = a.length
  const m = b.length
  let lo = 0
  while (lo < n && lo < m && a[lo] === b[lo]) lo++
  let hn = n
  let hm = m
  while (hn > lo && hm > lo && a[hn - 1] === b[hm - 1]) {
    hn--
    hm--
  }
  const pairs: [number, number][] = []
  for (let i = 0; i < lo; i++) pairs.push([i, i])
  const w = hm - lo + 1
  const dp = new Uint32Array((hn - lo + 1) * w)
  for (let i = hn - lo - 1; i >= 0; i--)
    for (let j = hm - lo - 1; j >= 0; j--)
      dp[i * w + j] =
        a[lo + i] === b[lo + j]
          ? dp[(i + 1) * w + j + 1] + 1
          : Math.max(dp[(i + 1) * w + j], dp[i * w + j + 1])
  let i = 0
  let j = 0
  while (i < hn - lo && j < hm - lo) {
    if (a[lo + i] === b[lo + j]) {
      pairs.push([lo + i, lo + j])
      i++
      j++
    } else if (dp[(i + 1) * w + j] >= dp[i * w + j + 1]) i++
    else j++
  }
  for (let k = 0; k < n - hn; k++) pairs.push([hn + k, hm + k])
  return pairs
}

const tokens = (s: string) => s.split(/(\s+)/).filter((t) => t !== '')

/** Word by word difference of two texts. */
export function diffWords(
  before: string,
  after: string,
): { before: Word[]; after: Word[] } {
  const a = tokens(before)
  const b = tokens(after)
  const pairs = lcs(a, b)
  const wb: Word[] = []
  const wa: Word[] = []
  let i = 0
  let j = 0
  for (const [pi, pj] of pairs) {
    while (i < pi) wb.push({ t: a[i++], mark: 'del' })
    while (j < pj) wa.push({ t: b[j++], mark: 'add' })
    wb.push({ t: a[i++], mark: 'same' })
    wa.push({ t: b[j++], mark: 'same' })
  }
  while (i < a.length) wb.push({ t: a[i++], mark: 'del' })
  while (j < b.length) wa.push({ t: b[j++], mark: 'add' })
  return { before: wb, after: wa }
}

export function compareBlocks(
  before: CompareDoc,
  after: CompareDoc,
): CompareResult {
  const A = before.blocks
  const B = after.blocks
  const pairs = lcs(A.map(keyOf), B.map(keyOf))
  const rows: CompareRow[] = []
  let ai = 0
  let bi = 0

  const gap = (aEnd: number, bEnd: number) => {
    const rem = A.slice(ai, aEnd)
    const add = B.slice(bi, bEnd)
    // blocks with ids are different blocks; only plain text lines pair up as an edit
    const plain =
      rem.every((x) => x.id === undefined) &&
      add.every((x) => x.id === undefined)
    const k = plain ? Math.min(rem.length, add.length) : 0
    for (let x = 0; x < k; x++)
      rows.push({
        kind: 'changed',
        before: rem[x],
        after: add[x],
        words: diffWords(rem[x].text, add[x].text),
        change: null,
      })
    for (let x = k; x < rem.length; x++)
      rows.push({ kind: 'removed', before: rem[x], change: null })
    for (let x = k; x < add.length; x++)
      rows.push({ kind: 'added', after: add[x], change: null })
    ai = aEnd
    bi = bEnd
  }

  for (const [pa, pb] of pairs) {
    gap(pa, pb)
    const x = A[pa]
    const y = B[pb]
    if (sameBlock(x, y))
      rows.push({ kind: 'same', before: x, after: y, change: null })
    else
      rows.push({
        kind: 'changed',
        before: x,
        after: y,
        words: diffWords(x.text, y.text),
        change: null,
      })
    ai = pa + 1
    bi = pb + 1
  }
  gap(A.length, B.length)

  // A block that was removed in one place and added in another is one move.
  const removed = new Map<string, CompareRow>()
  for (const r of rows)
    if (r.kind === 'removed' && r.before) removed.set(keyOf(r.before), r)
  const moveOf = new Map<CompareRow, CompareRow>()
  for (const r of rows)
    if (r.kind === 'added' && r.after) {
      const o = removed.get(keyOf(r.after))
      if (o && sameBlock(o.before!, r.after)) {
        moveOf.set(r, o)
        moveOf.set(o, r)
        removed.delete(keyOf(r.after))
      }
    }

  let changes = 0
  for (const r of rows) {
    if (r.kind === 'same') continue
    const partner = moveOf.get(r)
    if (partner) {
      if (partner.change === null) {
        r.moved = partner.moved = true
        r.change = partner.change = changes++
      }
    } else if (r.change === null) r.change = changes++
  }
  return { rows, changes }
}

export type CompareItem =
  | { type: 'row'; row: CompareRow; index: number }
  | { type: 'fold'; count: number; rows: CompareRow[]; index: number }

/** Unchanged runs longer than `min` fold into "12 lines the same". */
export function foldRuns(rows: CompareRow[], min = 6): CompareItem[] {
  const out: CompareItem[] = []
  let run: CompareRow[] = []
  const flush = () => {
    if (run.length > min)
      out.push({
        type: 'fold',
        count: run.length,
        rows: run,
        index: out.length,
      })
    else
      for (const row of run) out.push({ type: 'row', row, index: out.length })
    run = []
  }
  for (const row of rows) {
    if (row.kind === 'same') run.push(row)
    else {
      flush()
      out.push({ type: 'row', row, index: out.length })
    }
  }
  flush()
  return out
}
