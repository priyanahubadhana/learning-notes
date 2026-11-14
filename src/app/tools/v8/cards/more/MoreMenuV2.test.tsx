import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import MoreMenuV2 from './MoreMenuV2'

const entry = (id: string, pressed: boolean) => ({
  id,
  label: id,
  pressed,
  onPick: () => {},
})

describe('v8 ⋯ card, redesigned (2A.2)', () => {
  it('keeps the active folded tool marked (aria-pressed), as the flat list did', () => {
    const html = renderToStaticMarkup(
      createElement(MoreMenuV2, {
        entries: [entry('pen', true), entry('eraser', false)],
        onAllTools: () => {},
        onClose: () => {},
      }),
    )
    const tile = (id: string) =>
      new RegExp(
        `<button[^>]*aria-pressed="(true|false)"[^>]*data-testid="v8-fold-${id}"`,
      ).exec(html)?.[1]
    expect(tile('pen')).toBe('true')
    expect(tile('eraser')).toBe('false')
  })
})
