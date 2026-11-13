// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import {
  closeAction,
  isTypingTarget,
  progressMark,
  visibleToolCount,
} from './toolFrameLogic'

describe('Tool frame close rule', () => {
  it('S3-03 clean closes at once', () => {
    expect(closeAction({ dirty: false, busy: false, canStop: false })).toBe(
      'close',
    )
  })
  it('S3-04 dirty asks first', () => {
    expect(closeAction({ dirty: true, busy: false, canStop: false })).toBe(
      'ask',
    )
  })
  it('S3-08 busy stops the job, or does nothing without a Stop', () => {
    expect(closeAction({ dirty: true, busy: true, canStop: true })).toBe('stop')
    expect(closeAction({ dirty: true, busy: true, canStop: false })).toBe(
      'none',
    )
  })
})

describe('tools row fold (S3-09)', () => {
  const w = [80, 80, 80, 80, 80]
  it('shows all when they fit', () => {
    expect(visibleToolCount(w, 420, 4, 44)).toBe(5)
  })
  it('folds the last ones and keeps room for "…"', () => {
    // 3 tools = 248, + gap 4 + 44 = 296 <= 300; 4 tools would be 332 + 48
    expect(visibleToolCount(w, 300, 4, 44)).toBe(3)
  })
  it('caps at 5 on a phone and never scrolls', () => {
    const many = Array(8).fill(44)
    expect(visibleToolCount(many, 2000, 4, 44, 5)).toBe(5)
    expect(visibleToolCount(many, 10, 4, 44, 5)).toBe(0)
  })
})

describe('busy progress announcements', () => {
  it('announces only 25 / 50 / 75 / 100', () => {
    expect(progressMark(10, 0)).toBeNull()
    expect(progressMark(26, 0)).toBe(25)
    expect(progressMark(30, 25)).toBeNull()
    expect(progressMark(100, 75)).toBe(100)
  })
})

describe('typing target', () => {
  it('knows fields', () => {
    expect(isTypingTarget(document.createElement('input'))).toBe(true)
    expect(isTypingTarget(document.createElement('div'))).toBe(false)
    expect(isTypingTarget(null)).toBe(false)
  })
})
