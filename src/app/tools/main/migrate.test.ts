// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PINNED } from '../../deviceMode'
import {
  DEFAULT_SET_TOOLS,
  resetToolbarState,
  writeSetTools,
} from '../toolbarState'
import { clearPinnedCache } from '../../../settings/deviceModeSettings'
import { extraTools, mainList, pillLists, resetMainState } from './mainTools'
import { migrateToMainBarOnce, resetMigration } from './migrateApply'
import { migrateLists } from './migrate'

const defaults = {
  write: DEFAULT_PINNED,
  draw: DEFAULT_SET_TOOLS.draw,
  read: DEFAULT_SET_TOOLS.read,
}

beforeEach(() => {
  localStorage.clear()
  resetToolbarState()
  resetMainState()
  resetMigration()
  clearPinnedCache()
})

describe('moving an old custom bar to the new one', () => {
  it('leaves people on the standard bar alone', () => {
    expect(migrateLists(defaults, defaults)).toBeNull()
  })

  it('keeps the Text pill buttons the person had, in their order', () => {
    const result = migrateLists(
      {
        ...defaults,
        write: ['italic', 'bold', 'checklist', 'highlight', 'strike'],
      },
      defaults,
    )
    expect(result?.pills.text).toEqual([
      'style',
      'italic',
      'bold',
      'list',
      'highlightColor',
    ])
    // A button with no place in a pill stays on the bar as an extra.
    expect(result?.extras).toEqual(['strike'])
  })

  it('"Colors" becomes both colour buttons', () => {
    const result = migrateLists({ ...defaults, write: ['color'] }, defaults)
    expect(result?.pills.text).toEqual(['style', 'textColor', 'highlightColor'])
  })

  it('hides the ink tools the Draw set did not have', () => {
    const result = migrateLists(
      { ...defaults, draw: ['pen', 'eraser', 'newLine'] },
      defaults,
    )
    expect(result?.main).toEqual([
      'text',
      'pen',
      'eraser',
      'newLine',
      'insert',
      'read',
    ])
  })

  it('hides New line only if no set had it', () => {
    const none = migrateLists(
      { write: ['bold'], draw: ['pen'], read: ['theme'] },
      defaults,
    )
    expect(none?.main).not.toContain('newLine')
    const some = migrateLists(
      { write: ['bold', 'newLine'], draw: ['pen'], read: [] },
      defaults,
    )
    expect(some?.main).toContain('newLine')
  })

  it('applies once, and never touches the old lists', () => {
    writeSetTools('write', ['bold', 'strike'])
    expect(migrateToMainBarOnce()).toBe(true)
    expect(pillLists.get().text).toEqual(['style', 'bold'])
    expect(extraTools.get()).toEqual(['strike'])
    expect(mainList.get().length).toBeGreaterThan(0)
    // Changing the pills later is not undone by another start.
    pillLists.set({})
    expect(migrateToMainBarOnce()).toBe(false)
    expect(pillLists.get()).toEqual({})
    expect(
      JSON.parse(localStorage.getItem('learning-notes:formatBar.pinned')!),
    ).toEqual(['bold', 'strike'])
  })
})
