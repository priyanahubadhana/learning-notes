// @vitest-environment jsdom
import { createElement as h } from 'react'
import { afterEach, describe, expect, it } from 'vitest'
import { cleanDom, mount } from '../../design/parts/testHelpers'
import { SettingsV3 } from './SettingsV3'
import type { LearningNotesDB } from '../../core/db'

afterEach(cleanDom)

describe('SettingsV3 plumbing', () => {
  it('renders under its own marker, titled Settings', () => {
    const { host } = mount(
      h(SettingsV3, { db: {} as unknown as LearningNotesDB }),
    )
    expect(host.querySelector('[data-settings-v3]')).not.toBeNull()
    expect(host.querySelector('h1')?.textContent).toBe('Settings')
  })
})
