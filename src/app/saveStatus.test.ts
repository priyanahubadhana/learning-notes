import { describe, expect, it, vi } from 'vitest'
import {
  hasUnsaved,
  markSaved,
  markUnsaved,
  onUnsavedChange,
  retryUnsaved,
} from './saveStatus'

describe('the unsaved list', () => {
  it('stays unsaved until every saver has saved', () => {
    const a = {}
    const b = {}
    markUnsaved(a)
    markUnsaved(b)
    markSaved(a)
    expect(hasUnsaved()).toBe(true)
    markSaved(b)
    expect(hasUnsaved()).toBe(false)
  })

  it('tells listeners only when the list changes', () => {
    const token = {}
    const listener = vi.fn()
    const stop = onUnsavedChange(listener)
    markUnsaved(token)
    markUnsaved(token) // a second failure of the same saver
    expect(listener).toHaveBeenCalledTimes(1)
    markSaved(token)
    markSaved(token)
    expect(listener).toHaveBeenCalledTimes(2)
    stop()
  })

  it('trying again calls each saver', () => {
    const retry = vi.fn()
    const token = {}
    markUnsaved(token, retry)
    retryUnsaved()
    expect(retry).toHaveBeenCalledTimes(1)
    markSaved(token)
  })
})
