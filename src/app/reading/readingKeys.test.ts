import { describe, expect, it } from 'vitest'
import { en } from '../../i18n/en'
import { enO } from '../../i18n/enO'
import { es } from '../../i18n/es'
import { hi } from '../../i18n/hi'
import { settingsRegistry } from '../../settings/builtinSettings'
import '../../settings/readingSettings'
import '../../settings/lockSettings'
import { TOOLS } from '../tools/toolRegistry'
import { aloudSupported } from './aloudController'

/** Texts built from a name at run time must all exist, in every language. */
const all = { en: { ...en, ...enO }, hi, es } as Record<string, Record<string, string>>

const keysFor = () => {
  const keys: string[] = []
  for (const s of settingsRegistry.inCategory('reading')) {
    keys.push(s.labelKey, s.descriptionKey)
    if (s.control.kind === 'segmented' || s.control.kind === 'select') {
      const id = s.id.replace('reading.', '')
      for (const o of s.control.options) {
        keys.push(`reading.opt.${id}.${o.value}`)
      }
    }
  }
  for (const kind of ['page', 'notebook', 'database']) {
    keys.push(
      `lock.kind.${kind}`,
      `lock.locked.${kind}`,
      `lock.menu.lock.${kind}`,
      `lock.menu.remove.${kind}`,
    )
  }
  for (const state of ['idle', 'playing', 'paused']) {
    keys.push(`reading.aloud.state.${state}`)
  }
  for (const id of ['readerFull', 'outline', 'hideBlanks', 'lockSettings']) {
    keys.push(`tool.${id}`)
  }
  return keys
}

describe('batch 3 texts', () => {
  for (const [lang, texts] of Object.entries(all)) {
    it(`${lang} has every text built by name`, () => {
      const missing = keysFor().filter((k) => !(k in texts))
      expect(missing).toEqual([])
    })
  }

  it('the idle choices and plural texts exist', () => {
    for (const texts of Object.values(all)) {
      expect(texts['lock.idle.minutes_one']).toBeTruthy()
      expect(texts['lock.idle.minutes_other']).toBeTruthy()
      expect(texts['reading.timeLeft_other']).toBeTruthy()
      expect(texts['reading.streak_other']).toBeTruthy()
    }
  })

  it('every Reading and Lock tool is real, none waits for a later update', () => {
    const ids = [
      'readingMode',
      'readerFull',
      'lineFocus',
      'readAloud',
      'outline',
      'hideBlanks',
      'lockReading',
      'exitReading',
      'font',
      'textSize',
      'zoom',
      'lockPage',
      'lockNotebook',
    ]
    for (const id of ids) {
      const tool = TOOLS.find((x) => x.id === id)
      expect(tool, id).toBeDefined()
      expect(tool?.coming, id).toBeUndefined()
      expect(tool?.run, id).toBeTypeOf('function')
    }
  })

  it('read aloud reports that it is missing where speech is missing (Node)', () => {
    expect(aloudSupported()).toBe(false)
  })
})
