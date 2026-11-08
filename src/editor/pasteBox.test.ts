/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from 'vitest'
import { choicesFor, type PastePlan } from './pasteFlow'
import { toInput } from './pasteBox'

const plan = (p: Partial<PastePlan>): PastePlan => ({
  kind: 'html',
  text: 'x',
  rich: true,
  ...p,
})

describe('As text box', () => {
  it('is offered for a rich paste on paper only', () => {
    expect(choicesFor(plan({}), { box: true })).toContain('box')
    expect(choicesFor(plan({}))).not.toContain('box')
    expect(choicesFor(plan({ rich: false }), { box: true })).not.toContain(
      'box',
    )
  })
  it('is not offered for an address or a database', () => {
    expect(
      choicesFor(plan({ kind: 'url', url: 'https://youtu.be/abcdefghijk' }), {
        box: true,
      }),
    ).not.toContain('box')
    expect(
      choicesFor(plan({ kind: 'database', rows: [['a', 'b']] }), { box: true }),
    ).not.toContain('box')
  })
  it('turns editor blocks into storable input, with nesting', () => {
    const input = toInput({
      type: 'bulletListItem',
      props: { textColor: 'default' },
      content: [{ type: 'text', text: 'one', styles: {} }],
      children: [{ type: 'paragraph', content: [] }],
    })
    expect(input.type).toBe('bulletListItem')
    expect(input.content).toMatchObject({
      textColor: 'default',
      text: [{ type: 'text', text: 'one' }],
    })
    expect(input.children).toHaveLength(1)
  })
})
