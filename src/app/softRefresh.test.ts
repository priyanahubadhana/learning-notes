// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import {
  AUTO_CAP_MS,
  RESTORE_MAX_AGE_MS,
  autoAllowed,
  placeFresh,
  requestSoftRefresh,
  resetSoftRefreshForTests,
  restoreSoftRefresh,
  safeNow,
  sheetHasInput,
} from './softRefresh'
import { inputMachine, resetInputMachineForTests } from './inputMachine'

describe('softRefresh', () => {
  afterEach(() => {
    sessionStorage.clear()
    resetSoftRefreshForTests()
    resetInputMachineForTests()
    document.body.innerHTML = ''
  })

  it('an automatic refresh is allowed once, then not for 10 minutes', () => {
    expect(autoAllowed(1000, null)).toBe(true)
    expect(autoAllowed(1000 + AUTO_CAP_MS - 1, 1000)).toBe(false)
    expect(autoAllowed(1000 + AUTO_CAP_MS, 1000)).toBe(true)
    // A clock that moved back does not block it for ever.
    expect(autoAllowed(500, 1000)).toBe(true)
  })

  it('requestSoftRefresh starts one and refuses the second inside the cap', () => {
    // A busy machine keeps it from reloading while the test runs.
    inputMachine.begin({ pointerId: 1 }, 'ink')
    expect(requestSoftRefresh('test', () => 5000)).toBe(true)
    expect(requestSoftRefresh('test', () => 5000 + 60_000)).toBe(false)
    expect(sessionStorage.getItem('ln.softRefresh.auto')).toBe('5000')
  })

  it('a remembered place is used for a minute, no longer', () => {
    expect(placeFresh({ at: 1000 }, 1000 + RESTORE_MAX_AGE_MS - 1)).toBe(true)
    expect(placeFresh({ at: 1000 }, 1000 + RESTORE_MAX_AGE_MS)).toBe(false)
    expect(placeFresh({ at: 5000 }, 1000)).toBe(false)
  })

  it('is safe only when nothing is half done', () => {
    expect(safeNow(document)).toBe(true)
    inputMachine.begin({ pointerId: 1 }, 'ink')
    expect(safeNow(document)).toBe(false)
    inputMachine.end({ pointerId: 1 })
    expect(safeNow(document)).toBe(true)
  })

  it('an open sheet with typed input is not safe', () => {
    document.body.innerHTML =
      '<div role="dialog"><input value="" /><textarea></textarea></div>'
    expect(sheetHasInput(document)).toBe(false)
    document.querySelector('textarea')!.value = 'half a sentence'
    expect(sheetHasInput(document)).toBe(true)
    expect(safeNow(document)).toBe(false)
    // Typing outside a sheet does not count here (autosave handles it).
    document.body.innerHTML = '<input value="x" />'
    expect(sheetHasInput(document)).toBe(false)
  })

  it('restores once, only when fresh, and says which kind', () => {
    const put = (o: object) =>
      sessionStorage.setItem('ln.softRefresh', JSON.stringify(o))
    const base = { hash: '#x', pageId: 'p', top: 0, tool: 'text' }
    put({ ...base, at: Date.now() - 5000, auto: true })
    expect(restoreSoftRefresh()).toBe('auto')
    expect(restoreSoftRefresh()).toBeNull() // used up
    put({ ...base, at: Date.now() - 5000, auto: false })
    expect(restoreSoftRefresh()).toBe('manual')
    put({ ...base, at: Date.now() - 2 * RESTORE_MAX_AGE_MS, auto: true })
    expect(restoreSoftRefresh()).toBeNull()
    sessionStorage.setItem('ln.softRefresh', 'not json')
    expect(restoreSoftRefresh()).toBeNull()
  })
})
