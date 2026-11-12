import { describe, expect, it } from 'vitest'
import {
  groupVoices,
  onDeviceVoices,
  pinsFor,
  togglePin,
  type ListenVoice,
} from './voices'

const v = (name: string, lang: string, localService: boolean): ListenVoice => ({
  name,
  lang,
  localService,
  voiceURI: `u-${name}`,
})

const all = [
  v('Zoe (Premium)', 'en-US', true),
  v('Alex (Enhanced)', 'en-US', true),
  v('Daniel', 'en-GB', true),
  v('Amelie', 'fr-FR', true),
  v('Google US English', 'en-US', false),
  v('Samantha', 'en-US', true),
]

describe('Listen voices (RD-B44)', () => {
  it('never lists or uses a network voice', () => {
    const local = onDeviceVoices(all)
    expect(local.map((x) => x.name)).not.toContain('Google US English')
    const names = groupVoices(all, 'en', []).flatMap((g) =>
      g.voices.map((x) => x.name),
    )
    expect(names).not.toContain('Google US English')
    // A voice that does not say where it runs is treated as a network voice.
    expect(
      onDeviceVoices([{ name: 'X', lang: 'en', voiceURI: 'x' }]),
    ).toHaveLength(0)
  })

  it('groups by type: Premium, Enhanced, On-device, Other, in that order', () => {
    const g = groupVoices(all, 'en', [])
    expect(g.map((x) => x.id)).toEqual([
      'premium',
      'enhanced',
      'device',
      'other',
    ])
    expect(g[2].voices.map((x) => x.name)).toEqual(['Daniel', 'Samantha'])
    expect(g[3].voices.map((x) => x.name)).toEqual(['Amelie'])
  })

  it('leaves out empty groups', () => {
    const g = groupVoices([v('Daniel', 'en-GB', true)], 'en', [])
    expect(g.map((x) => x.id)).toEqual(['device'])
  })

  it('a pinned voice stays at the top of its group', () => {
    const g = groupVoices(all, 'en', ['u-Samantha'])
    expect(g[2].voices.map((x) => x.name)).toEqual(['Samantha', 'Daniel'])
  })

  it('pins are remembered per language and toggle off again', () => {
    let m = togglePin({}, 'en-GB', 'u-Daniel')
    expect(pinsFor(m, 'en-US')).toEqual(['u-Daniel'])
    expect(pinsFor(m, 'fr')).toEqual([])
    m = togglePin(m, 'fr-FR', 'u-Amelie')
    m = togglePin(m, 'en', 'u-Daniel')
    expect(pinsFor(m, 'en')).toEqual([])
    expect(m).toEqual({ fr: ['u-Amelie'] })
  })
})
