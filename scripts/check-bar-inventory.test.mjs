import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import {
  SPEC,
  checkPicture,
  parsePicture,
  parseTable,
  parseTools,
} from './check-bar-inventory.mjs'

const table = parseTable(readFileSync(SPEC, 'utf8'))
const row = (state) => table.find((r) => r.state === state)

/** Builds a picture fragment that matches a table row exactly. */
function bar(state, { drop, swap, flagOff } = {}) {
  const r = row(state)
  let tools = r.bar.filter((t) => t.name !== drop)
  if (swap) {
    const [a, b] = swap
    const i = tools.findIndex((t) => t.name === a)
    const j = tools.findIndex((t) => t.name === b)
    tools = tools.map((t, k) => (k === i ? tools[j] : k === j ? tools[i] : t))
  }
  const btn = (t) =>
    `<button data-tool="${t.name}"${t.flag && t.name !== flagOff ? ` data-flag="${t.flag}"` : ''}></button>`
  const more = r.more.map((t) => `<li data-tool="${t.name}"></li>`).join('')
  return `<div data-bar-state="${state}">${tools.map(btn).join('')}<ul data-bar-more>${more}</ul></div>`
}

const allStage1 = () =>
  table
    .filter((r) => r.stage === 1)
    .map((r) => bar(r.state))
    .join('\n')

describe('check-bar-inventory (AB-02)', () => {
  it('reads the tool table: the five stage-1 states, each starting with ⠿ and the pin', () => {
    const s1 = table.filter((r) => r.stage === 1).map((r) => r.state)
    expect(s1).toEqual([
      'Caret in text',
      'Words selected',
      'A box',
      'A picture',
      'Pinned, nothing selected',
    ])
    expect(
      row('A box')
        .bar.slice(0, 2)
        .map((t) => t.name),
    ).toEqual(['⠿', 'pin'])
    expect(row('Pinned, nothing selected').bar.map((t) => t.name)).toEqual([
      '⠿',
      'pin',
      '⋯▾',
    ])
    expect(row('Pinned, nothing selected').bar[1].flag).toBe('filled')
  })

  it('parses flags like "Cut (grey)"', () => {
    expect(parseTools('Cut (grey), Paste ▾')).toEqual([
      { name: 'Cut', flag: 'grey' },
      { name: 'Paste ▾' },
    ])
  })

  it('passes a picture that draws every stage-1 state in order', () => {
    expect(checkPicture(table, parsePicture(allStage1()))).toEqual([])
  })

  it('fails a bar that misses one element', () => {
    const html = allStage1().replace(
      bar('A box'),
      bar('A box', { drop: 'Box style' }),
    )
    expect(checkPicture(table, parsePicture(html))).toEqual([
      'A box, on the bar: missing Box style',
    ])
  })

  it('fails a bar whose order differs from the table', () => {
    const html = allStage1().replace(
      bar('A box'),
      bar('A box', { swap: ['Cut', 'Copy'] }),
    )
    const problems = checkPicture(table, parsePicture(html))
    expect(problems).toHaveLength(1)
    expect(problems[0]).toMatch(/^A box, on the bar: order is/)
  })

  it('fails a grey tool drawn as live, and a missing stage-1 state', () => {
    const html = allStage1()
      .replace(bar('Caret in text'), bar('Caret in text', { flagOff: 'Cut' }))
      .replace(bar('A picture'), '')
    const problems = checkPicture(table, parsePicture(html))
    expect(problems).toContain('Caret in text, on the bar: missing Cut (grey)')
    expect(problems).toContain('Caret in text, on the bar: extra Cut')
    expect(problems).toContain('A picture: not drawn (stage 1 row)')
  })

  it('checks a drawn stage-2 bar but does not require it', () => {
    const html = allStage1() + bar('A drawing', { drop: 'Thickness' })
    expect(checkPicture(table, parsePicture(html))).toEqual([
      'A drawing, on the bar: missing Thickness',
    ])
  })
})
