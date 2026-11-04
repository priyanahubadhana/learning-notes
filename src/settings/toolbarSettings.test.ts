import { beforeEach, describe, expect, it } from 'vitest'
import { buildRows, rowMatches } from '../app/tools/controlRows'
import {
  isToolBarOn,
  requestHideToolBar,
  resetToolbarVisibility,
  showToolBar,
} from '../app/tools/toolbarVisibility'
import { resetToolbarState, ribbonOpen } from '../app/tools/toolbarState'
import { setAppActions, type AppActions } from '../app/tools/toolRuntime'
import { barPlacementSetting, settingsRegistry } from './builtinSettings'
import {
  clearDeviceSettingsCache,
  readDeviceSetting,
  writeDeviceSetting,
} from './settingsService'
import {
  resetToolBar,
  showToolBarSetting,
  toolbarLayoutSetting,
} from './toolbarSettings'

/** The app's actions, with a scripted answer to the question and a toast log. */
function fakeApp(answer: string | null) {
  const toasts: { message: string; undo?: () => void }[] = []
  const questions: string[] = []
  const app = {
    toast: (message: string, action?: { onSelect: () => void }) =>
      toasts.push({ message, undo: action?.onSelect }),
    choose: async (request: { title: string; message: string }) => {
      questions.push(request.message)
      return answer
    },
  } as unknown as AppActions
  setAppActions(app)
  return { toasts, questions }
}

beforeEach(() => {
  clearDeviceSettingsCache()
  resetToolbarState()
  resetToolbarVisibility()
  writeDeviceSetting(barPlacementSetting, 'top')
  setAppActions(null)
})

describe('turning the tool bar off', () => {
  it('asks first, explains where to turn it back on, and Cancel changes nothing', async () => {
    const { questions, toasts } = fakeApp('cancel')
    expect(await requestHideToolBar()).toBe(false)
    expect(isToolBarOn()).toBe(true)
    expect(toasts).toHaveLength(0)
    expect(questions[0]).toContain('page ⋯ menu › Show tool bar')
    expect(questions[0]).toContain('Settings › Tool bar')
  })

  it('a dismissed question (Esc or a tap outside) changes nothing', async () => {
    fakeApp(null)
    expect(await requestHideToolBar()).toBe(false)
    expect(isToolBarOn()).toBe(true)
  })

  it('"Turn off" hides the bar and offers Undo, which brings it back where it was', async () => {
    writeDeviceSetting(barPlacementSetting, 'bottom')
    const { toasts } = fakeApp('off')
    expect(await requestHideToolBar()).toBe(true)
    expect(isToolBarOn()).toBe(false)
    expect(toasts).toHaveLength(1)
    expect(toasts[0].undo).toBeTypeOf('function')
    toasts[0].undo!()
    expect(isToolBarOn()).toBe(true)
    expect(readDeviceSetting(barPlacementSetting)).toBe('bottom')
  })

  it('Show tool bar (any way) brings it back at its last place', async () => {
    writeDeviceSetting(barPlacementSetting, 'free')
    fakeApp('off')
    await requestHideToolBar()
    showToolBar()
    expect(readDeviceSetting(barPlacementSetting)).toBe('free')
  })

  it('does nothing when the bar is already off', async () => {
    writeDeviceSetting(barPlacementSetting, 'floating')
    const { questions } = fakeApp('off')
    expect(await requestHideToolBar()).toBe(false)
    expect(questions).toHaveLength(0)
  })
})

describe('Settings › Tool bar', () => {
  it('has its own category with every setting asked for', () => {
    const ids = settingsRegistry.inCategory('toolbar').map((s) => s.id)
    for (const wanted of [
      'toolbar.show',
      'toolbar.layout',
      'toolbar.ribbonBehaviour',
      'toolbar.ribbonMode',
      'toolbar.ribbonSize',
      'toolbar.ribbonPlacement',
      'toolbar.sets',
      'general.deviceMode', // device
      'advanced.barPlacement', // position
      'advanced.autoSwitch', // auto switch
      'toolbar.reset',
    ]) {
      expect(ids, wanted).toContain(wanted)
    }
  })

  it('"Show tool bar" reads and writes the bar; off asks first', async () => {
    expect(readDeviceSetting(showToolBarSetting)).toBe('on')
    fakeApp('off')
    writeDeviceSetting(showToolBarSetting, 'off') // asks, then hides
    await Promise.resolve()
    await Promise.resolve()
    expect(readDeviceSetting(showToolBarSetting)).toBe('off')
    writeDeviceSetting(showToolBarSetting, 'on')
    expect(readDeviceSetting(showToolBarSetting)).toBe('on')
  })

  it('Layout reads and writes whether the ribbon shows', () => {
    expect(readDeviceSetting(toolbarLayoutSetting)).toBe('short')
    writeDeviceSetting(toolbarLayoutSetting, 'ribbon')
    expect(ribbonOpen.get()).toBe(true)
    expect(readDeviceSetting(toolbarLayoutSetting)).toBe('ribbon')
  })

  it('Reset tool bar puts back the tools, the ribbon and the bar', () => {
    writeDeviceSetting(toolbarLayoutSetting, 'ribbon')
    writeDeviceSetting(barPlacementSetting, 'bottom')
    writeDeviceSetting(
      settingsRegistry.get('general.deviceMode') as never,
      'touch',
    )
    resetToolBar()
    expect(ribbonOpen.get()).toBe(false)
    expect(readDeviceSetting(barPlacementSetting)).toBe('top') // Touch's preset
    expect(isToolBarOn()).toBe(true)
  })

  it('is found by searching "tool bar", "toolbar", "ribbon" and "bar" (also in the control panel)', () => {
    const rows = buildRows().filter((r) => r.key.startsWith('setting:'))
    for (const word of ['tool bar', 'toolbar', 'ribbon', 'bar']) {
      const found = rows
        .filter((r) => rowMatches(r.haystack, word))
        .map((r) => r.key)
      for (const wanted of [
        'setting:toolbar.show',
        'setting:toolbar.layout',
        'setting:toolbar.sets',
        'setting:toolbar.reset',
        'setting:advanced.autoSwitch',
        'setting:advanced.barPlacement',
      ]) {
        expect(found, `${word} → ${wanted}`).toContain(wanted)
      }
    }
    const byRibbon = rows
      .filter((r) => rowMatches(r.haystack, 'ribbon'))
      .map((r) => r.key)
    expect(byRibbon).toContain('setting:toolbar.ribbonMode')
    expect(byRibbon).toContain('setting:toolbar.ribbonSize')
    expect(byRibbon).toContain('setting:toolbar.ribbonPlacement')
  })

  it('the page path style is a setting found by "path" and "breadcrumb"', () => {
    const rows = buildRows().filter(
      (r) => r.key === 'setting:general.pathStyle',
    )
    expect(rows).toHaveLength(1)
    expect(rowMatches(rows[0].haystack, 'path')).toBe(true)
    expect(rowMatches(rows[0].haystack, 'breadcrumb')).toBe(true)
  })
})
