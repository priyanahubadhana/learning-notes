// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { $, byLabel, cleanDom, mount } from '../../design/parts/testHelpers'
import { HistoryButtons } from '../tools/HistoryButtons'
import { historyTip, showHistoryPair } from './historyTips'
import { statusFor } from './status'
import { ShellTopBar } from './ShellTopBar'
import { vi } from 'vitest'
import { showUndoRedoSetting } from '../../settings/builtinSettings'
import { writeDeviceSetting } from '../../settings/settingsService'

afterEach(() => {
  cleanDom()
  writeDeviceSetting(showUndoRedoSetting, 'on')
})

describe('Undo / Redo tooltips and visibility (SH-05)', () => {
  it('names the keys', () => {
    expect(historyTip('undo', 'Undo', false)).toBe('Undo (Ctrl Z)')
    expect(historyTip('redo', 'Redo', false)).toBe('Redo (Ctrl Y)')
    expect(historyTip('undo', 'Undo', true)).toBe('Undo (Cmd Z)')
    expect(historyTip('redo', 'Redo', true)).toBe('Redo (Cmd Shift Z)')
  })

  it('hides only on a computer with the setting off', () => {
    expect(showHistoryPair('computer', 'off')).toBe(false)
    expect(showHistoryPair('computer', 'on')).toBe(true)
    expect(showHistoryPair('touch', 'off')).toBe(true)
    expect(showHistoryPair('pencil', 'off')).toBe(true)
  })

  it('only the shell top bar adds tooltips', () => {
    mount(h(HistoryButtons, { tips: true }))
    expect(byLabel('Undo')?.getAttribute('title')).toMatch(
      /^Undo \((Ctrl|Cmd) Z\)$/,
    )
    cleanDom()
    mount(h(HistoryButtons, {}))
    expect(byLabel('Undo')?.hasAttribute('title')).toBe(false)
  })

  it('the top bar drops the pair on a computer when the setting is off', () => {
    const base = {
      space: 'notebooks' as const,
      title: null,
      sidebarHidden: false,
      drawerOpen: false,
      onOpenDrawer: vi.fn(),
      onToggleSidebar: vi.fn(),
      onSelectSpace: vi.fn(),
      onSearch: vi.fn(),
      onSlot: vi.fn(),
    }
    mount(h(ShellTopBar, base))
    expect(byLabel('Undo')).not.toBeNull()
    cleanDom()
    writeDeviceSetting(showUndoRedoSetting, 'off')
    mount(h(ShellTopBar, base))
    expect(byLabel('Undo')).toBeNull()
    expect($('[data-slot="history"]')).toBeNull()
  })
})

describe('Saved status (SH-04)', () => {
  it('shows a failed save first, then sync, then Saved while editing', () => {
    expect(
      statusFor({ unsaved: true, syncLabel: 'Offline', editing: true }),
    ).toBe('Not saved yet')
    expect(
      statusFor({ unsaved: false, syncLabel: 'Offline', editing: true }),
    ).toBe('Offline')
    expect(statusFor({ unsaved: false, syncLabel: null, editing: true })).toBe(
      'Saved',
    )
    expect(
      statusFor({ unsaved: false, syncLabel: null, editing: false }),
    ).toBeNull()
  })
})
