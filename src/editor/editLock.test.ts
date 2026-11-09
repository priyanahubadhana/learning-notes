// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { applyPageMode, pageMode } from './editPolicy'
import {
  brokenLocks,
  clearLocks,
  lock,
  lockCount,
  reapplyLocks,
  resetEditLocksForTests,
  unlock,
} from './editLock'
import { resetGestures } from '../app/gestureReset'

const page = () => {
  const el = document.createElement('div')
  el.setAttribute('data-page-content', '')
  el.setAttribute('contenteditable', 'true')
  document.body.append(el)
  return el
}
const attr = (el: HTMLElement) => el.getAttribute('contenteditable')

describe('editLock', () => {
  afterEach(() => {
    resetEditLocksForTests()
    pageMode.set('edit')
    document.body.innerHTML = ''
  })

  it('locks the page and puts it right from the page mode, not from a memory', () => {
    const el = page()
    pageMode.set('edit')
    lock('ink', el)
    expect(attr(el)).toBe('false')
    unlock('ink')
    expect(attr(el)).toBe('true')
  })

  it('a tool change during the lock is honoured: ink mode comes back non-editable, Text editable', () => {
    const el = page()
    pageMode.set('select')
    lock('ink', el)
    pageMode.set('ink')
    unlock('ink')
    expect(attr(el)).toBe('false')
    // The old bug: a stale snapshot ("false") written back after Text was chosen.
    pageMode.set('select')
    lock('ink', el)
    pageMode.set('edit')
    unlock('ink')
    expect(attr(el)).toBe('true')
  })

  it('two owners: the page stays locked until the last lets go', () => {
    const el = page()
    lock('ink', el)
    lock('penSelect', el)
    unlock('ink')
    expect(attr(el)).toBe('false')
    unlock('penSelect')
    expect(attr(el)).toBe('true')
    expect(lockCount()).toBe(0)
  })

  it('applying the page mode again keeps a locked page locked', () => {
    const el = page()
    lock('ink', el)
    el.setAttribute('contenteditable', 'true') // the editor wrote it
    reapplyLocks()
    expect(attr(el)).toBe('false')
    expect(brokenLocks()).toBe(0)
    const editor = { isEditable: false }
    applyPageMode('edit', { editor, content: el, title: null })
    expect(attr(el)).toBe('false')
    unlock('ink')
    expect(attr(el)).toBe('true')
  })

  it('the watchdog clears every lock', () => {
    const el = page()
    lock('ink', el)
    lock('penSelect', el)
    resetGestures('hidden')
    expect(lockCount()).toBe(0)
    expect(attr(el)).toBe('true')
  })

  it('another element gets back what it had at the first lock', () => {
    const el = document.createElement('div')
    el.setAttribute('contenteditable', 'true')
    document.body.append(el)
    lock('grip0:0', el)
    lock('grip1:0', el)
    unlock('grip0:0')
    expect(attr(el)).toBe('false')
    unlock('grip1:0')
    expect(attr(el)).toBe('true')
  })

  it('locking twice with one owner counts once; clearLocks lets go', () => {
    const el = page()
    lock('ink', el)
    lock('ink', el)
    expect(lockCount()).toBe(1)
    clearLocks()
    expect(attr(el)).toBe('true')
  })
})
