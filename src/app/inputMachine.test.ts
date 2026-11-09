import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AGE_LIMIT_MS,
  inputMachine,
  installInputMachine,
  resetInputMachineForTests,
} from './inputMachine'
import { resetGestures, resetWatchdogForTests } from './gestureReset'

/** A document that only keeps listeners, so a test can send events to it. */
function fakeDoc() {
  const map = new Map<string, Set<(e: Event) => void>>()
  return {
    addEventListener: (t: string, fn: (e: Event) => void) => {
      if (!map.has(t)) map.set(t, new Set())
      map.get(t)!.add(fn)
    },
    removeEventListener: (t: string, fn: (e: Event) => void) => {
      map.get(t)?.delete(fn)
    },
    send: (type: string, pointerId = 1) => {
      for (const fn of [...(map.get(type) ?? [])])
        fn({ type, pointerId } as unknown as Event)
    },
    count: () => [...map.values()].reduce((n, s) => n + s.size, 0),
  }
}

describe('inputMachine', () => {
  let doc: ReturnType<typeof fakeDoc>
  let stop: () => void
  beforeEach(() => {
    vi.useFakeTimers()
    resetWatchdogForTests()
    resetInputMachineForTests()
    doc = fakeDoc()
    stop = installInputMachine(doc)
  })
  afterEach(() => {
    stop()
    resetInputMachineForTests()
    vi.useRealTimers()
  })

  it('is idle until a gesture begins, and idle again after a lift', () => {
    expect(inputMachine.state()).toBe('idle')
    inputMachine.begin({ pointerId: 1 }, 'ink', undefined, 'selecting')
    expect(inputMachine.state()).toBe('selecting')
    expect(inputMachine.isDown('ink', 1)).toBe(true)
    doc.send('pointerup')
    expect(inputMachine.state()).toBe('idle')
    expect(inputMachine.current()).toBeNull()
  })

  it('a cancel also ends it, and does not reset the owner', () => {
    const reset = vi.fn()
    inputMachine.begin({ pointerId: 2 }, 'ink', reset)
    doc.send('pointercancel', 2)
    expect(inputMachine.isDown()).toBe(false)
    expect(reset).not.toHaveBeenCalled()
  })

  it('a lift of another pointer leaves the gesture alone', () => {
    inputMachine.begin({ pointerId: 1 }, 'ink')
    doc.send('pointerup', 9)
    expect(inputMachine.isDown('ink', 1)).toBe(true)
  })

  it('a lost capture while still down resets the owner', () => {
    const reset = vi.fn()
    inputMachine.begin({ pointerId: 3 }, 'ink', reset)
    doc.send('lostpointercapture', 3)
    expect(reset).toHaveBeenCalledWith('lost')
    expect(inputMachine.state()).toBe('idle')
  })

  it('a lost capture after a normal lift does nothing', () => {
    const reset = vi.fn()
    inputMachine.begin({ pointerId: 3 }, 'ink', reset)
    doc.send('pointerup', 3)
    doc.send('lostpointercapture', 3)
    expect(reset).not.toHaveBeenCalled()
  })

  it('drops a pointer that has not moved for the age limit', () => {
    const reset = vi.fn()
    inputMachine.begin({ pointerId: 1 }, 'ink', reset)
    vi.advanceTimersByTime(AGE_LIMIT_MS - 1000)
    expect(inputMachine.isDown()).toBe(true)
    vi.advanceTimersByTime(1500)
    expect(reset).toHaveBeenCalledWith('timeout')
    expect(inputMachine.state()).toBe('idle')
  })

  it('movement keeps the pointer alive past the age limit', () => {
    const reset = vi.fn()
    inputMachine.begin({ pointerId: 1 }, 'ink', reset)
    for (let i = 0; i < 4; i++) {
      vi.advanceTimersByTime(3000)
      doc.send('pointermove')
    }
    expect(reset).not.toHaveBeenCalled()
    expect(inputMachine.isDown()).toBe(true)
  })

  it('a tool change drops the gesture with reason toolchange', () => {
    const reset = vi.fn()
    inputMachine.setTool('lasso')
    inputMachine.begin({ pointerId: 1 }, 'ink', reset)
    inputMachine.setTool('lasso')
    expect(reset).not.toHaveBeenCalled()
    inputMachine.setTool('text')
    expect(reset).toHaveBeenCalledWith('toolchange')
  })

  it('an app switch (the watchdog) forgets everything without a second reset', () => {
    const reset = vi.fn()
    inputMachine.begin({ pointerId: 1 }, 'ink', reset)
    resetGestures('hidden')
    expect(inputMachine.state()).toBe('idle')
    expect(reset).not.toHaveBeenCalled()
  })

  it('begin twice for one owner and pointer keeps one entry', () => {
    inputMachine.begin({ pointerId: 1 }, 'ink')
    inputMachine.begin({ pointerId: 1 }, 'ink')
    inputMachine.end({ pointerId: 1 }, 'ink')
    expect(inputMachine.isDown()).toBe(false)
  })

  it('stopping removes its listeners', () => {
    stop()
    expect(doc.count()).toBe(0)
  })
})
