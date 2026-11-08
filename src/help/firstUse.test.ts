// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { showHelp } from '../settings/builtinSettings'
import { writeDeviceSetting } from '../settings/settingsService'
import {
  dismissFirstUse,
  firstUseTip,
  seenTips,
  triggerFirstUse,
} from './firstUse'

describe('first-use tips', () => {
  beforeEach(() => {
    localStorage.clear()
    seenTips.clearCache()
    firstUseTip.set(null)
    writeDeviceSetting(showHelp, 'on')
  })

  it('shows a tip once and remembers it', () => {
    triggerFirstUse('lasso')
    expect(firstUseTip.get()).toBe('lasso')
    dismissFirstUse()
    triggerFirstUse('lasso')
    expect(firstUseTip.get()).toBeNull()
    seenTips.clearCache() // read again from storage, as after a reload
    expect(seenTips.get()).toEqual(['lasso'])
  })

  it('keeps tips apart', () => {
    triggerFirstUse('lasso')
    triggerFirstUse('writePad')
    expect(firstUseTip.get()).toBe('writePad')
    expect(seenTips.get()).toEqual(['lasso', 'writePad'])
  })

  it('shows nothing when Show help is off', () => {
    writeDeviceSetting(showHelp, 'off')
    triggerFirstUse('layers')
    expect(firstUseTip.get()).toBeNull()
  })
})
