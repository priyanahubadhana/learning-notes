import { afterEach, describe, expect, it } from 'vitest'
import { resetFlags, setFlag } from '../app/flags'
import { FLAG_GATED_SETTINGS, shownByFlags } from './flagGate'

describe('settings gated by a feature switch', () => {
  afterEach(() => resetFlags())

  it('Show Undo and Redo is listed only while foundation.shell is on', () => {
    expect(FLAG_GATED_SETTINGS['general.showUndoRedo']).toBe('foundation.shell')
    expect(shownByFlags('general.showUndoRedo')).toBe(false)
    setFlag('foundation.shell', true)
    expect(shownByFlags('general.showUndoRedo')).toBe(true)
  })

  it('a setting that is not gated is always listed', () => {
    expect(shownByFlags('general.theme')).toBe(true)
  })
})
