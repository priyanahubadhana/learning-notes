// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { WizardSteps } from './WizardSteps'
import { $, $$, cleanDom, click, key, mount } from './testHelpers'

afterEach(cleanDom)

const S = [
  { id: 'a', label: 'File' },
  { id: 'b', label: 'Check' },
  { id: 'c', label: 'Look' },
  { id: 'd', label: 'Done' },
]
const strip = (extra = {}) => {
  const onChange = vi.fn()
  const onBlocked = vi.fn()
  mount(h(WizardSteps, { steps: S, value: 'b', onChange, onBlocked, ...extra }))
  return { onChange, onBlocked }
}

describe('WizardSteps', () => {
  it('S3-13 marks done, current and upcoming steps', () => {
    strip()
    const st = (id: string) => $(`[data-testid="wizard-step-${id}"]`)
    expect(st('a')?.dataset.state).toBe('done')
    expect(st('a')?.querySelector('svg')).not.toBeNull()
    expect(st('b')?.getAttribute('aria-current')).toBe('step')
    expect(st('c')?.dataset.state).toBe('upcoming')
    expect(st('d')?.dataset.state).toBe('upcoming')
  })
  it('S3-14 a done step goes back', () => {
    const { onChange } = strip()
    click($('[data-testid="wizard-step-a"]'))
    expect(onChange).toHaveBeenCalledWith('a')
  })
  it('S3-15 the next step stays shut while the current one is not valid', () => {
    const { onChange, onBlocked } = strip({ valid: false })
    click($('[data-testid="wizard-step-c"]'))
    expect(onChange).not.toHaveBeenCalled()
    expect(onBlocked).toHaveBeenCalledWith('c')
  })
  it('S3-16 a step two ahead is not available', () => {
    const { onChange } = strip({ value: 'a' })
    const d = $('[data-testid="wizard-step-c"]')
    expect(d?.getAttribute('aria-disabled')).toBe('true')
    click(d)
    expect(onChange).not.toHaveBeenCalled()
  })
  it('S3-17 compact shows "Step 2 of 4 · name" with arrows and a progress line', () => {
    strip({ compact: true })
    expect($('.wz-compact-text')?.textContent).toBe('Step 2 of 4 · Check')
    expect($('.wz-progress-fill')?.getAttribute('style')).toContain('50%')
    expect($$('.wz-arrow')).toHaveLength(2)
  })
  it('S3-18 arrows move focus without changing the step', () => {
    const host = strip()
    const b = $<HTMLButtonElement>('[data-testid="wizard-step-b"]')
    b?.focus()
    key(b, 'ArrowLeft')
    expect(document.activeElement).toBe($('[data-testid="wizard-step-a"]'))
    expect(host.onChange).not.toHaveBeenCalled()
  })
  it('S3-19 an error step says so in words and shows "!"', () => {
    strip({
      steps: [S[0], { ...S[1], state: 'error' }, S[2]],
      value: 'a',
    })
    const e = $('[data-testid="wizard-step-b"]')
    expect(e?.getAttribute('aria-label')).toBe('Check, needs a fix')
    expect(e?.querySelector('.wz-circle')?.textContent).toBe('!')
  })
})
