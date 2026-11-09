// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  registerProbe,
  resetHealthForTests,
  runHealth,
  setStuckHandler,
  staleFlags,
  wrongEditable,
} from './healthCheck'
import { inputMachine, resetInputMachineForTests } from './inputMachine'
import { resetWatchdogForTests, toolState } from './gestureReset'
import { pageMode } from '../editor/editPolicy'
import { lock, resetEditLocksForTests } from '../editor/editLock'

describe('healthCheck', () => {
  beforeEach(() => {
    resetWatchdogForTests()
    resetHealthForTests()
    resetInputMachineForTests()
    resetEditLocksForTests()
    pageMode.set('edit')
    document.body.innerHTML = ''
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('a "down" flag with an idle, quiet machine is stale; a live machine is not', () => {
    const dump = { penGuard: { down: true }, selectGesture: { active: false } }
    expect(staleFlags(dump)).toEqual(['penGuard.down'])
    inputMachine.begin({ pointerId: 1 }, 'penGuard')
    expect(staleFlags(dump)).toEqual([])
    inputMachine.end({ pointerId: 1 })
    expect(staleFlags({ ink: { gesture: 'lasso#7', captured: [] } })).toEqual([
      'ink.gesture',
    ])
    expect(staleFlags({ ink: { gesture: 'draw#7', captured: [] } })).toEqual([])
    expect(staleFlags({ ink: { gesture: 'none', captured: [3] } })).toEqual([
      'ink.captured',
    ])
  })

  it('finds a page whose contenteditable disagrees with the mode', () => {
    const el = document.createElement('div')
    el.setAttribute('data-page-content', '')
    el.setAttribute('contenteditable', 'false')
    document.body.append(el)
    expect(wrongEditable()).toEqual([el])
    runHealth()
    expect(el.getAttribute('contenteditable')).toBe('true')
    expect(wrongEditable()).toEqual([])
    // Ink mode wants false.
    pageMode.set('ink')
    expect(wrongEditable()).toEqual([el])
  })

  it('does not call a locked page wrong', () => {
    const el = document.createElement('div')
    el.setAttribute('data-page-content', '')
    document.body.append(el)
    lock('ink', el)
    expect(wrongEditable()).toEqual([])
  })

  it('logs a problem and its heal in the dump', () => {
    let bad = true
    registerProbe({
      name: 'thing',
      check: () => (bad ? 'broken' : null),
      heal: () => {
        bad = false
      },
    })
    expect(runHealth('test')).toEqual(['thing: broken'])
    expect(runHealth('test')).toEqual([])
  })

  it('the same heal failing twice within 60 s asks for a soft refresh', () => {
    vi.useFakeTimers()
    const stuck = vi.fn()
    setStuckHandler(stuck)
    registerProbe({ name: 'never', check: () => 'still bad', heal: () => {} })
    runHealth()
    expect(stuck).not.toHaveBeenCalled()
    vi.advanceTimersByTime(30_000)
    runHealth()
    expect(stuck).toHaveBeenCalledTimes(1)
    expect(stuck.mock.calls[0][0]).toContain('never')
  })

  it('failures more than 60 s apart do not add up', () => {
    vi.useFakeTimers()
    const stuck = vi.fn()
    setStuckHandler(stuck)
    registerProbe({ name: 'never', check: () => 'still bad', heal: () => {} })
    runHealth()
    vi.advanceTimersByTime(61_000)
    runHealth()
    expect(stuck).not.toHaveBeenCalled()
    void toolState
  })
})
