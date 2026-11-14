import { t } from '../i18n/t'
import { isOnOff, type OnOff } from '../app/deviceMode'
import {
  FLAG_IDS,
  PHASE_PRESETS,
  applyPreset,
  isOn,
  matchingPreset,
  resetFlags,
  setFlag,
  type FlagId,
  type PresetId,
} from '../app/flags'
import type { MessageKey } from '../i18n/t'
import type { SettingDefinition } from './registry'
import { settingsRegistry } from './builtinSettings'

/**
 * Settings › Try new features: one on/off switch per new feature (see
 * app/flags.ts). Every switch starts off and only changes this device.
 */
const onOff = () =>
  (['on', 'off'] as const).map((value) => ({
    value,
    label: () => t(`settings.onOff.${value}`),
  }))

const flagSetting = (id: FlagId): SettingDefinition<OnOff> => ({
  id: `tryNew.${id}`,
  labelKey: `flags.${id}.name` as MessageKey,
  descriptionKey: `flags.${id}.desc` as MessageKey,
  category: 'tryNew',
  keywords: `try new feature experiment beta ${id}`,
  scope: 'device',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOff() },
  derived: {
    read: () => (isOn(id) ? 'on' : 'off'),
    write: (value) => setFlag(id, value === 'on'),
  },
})

/**
 * Test a phase (task 0.6). Two rows at the top of Try new features: a phase
 * list and one On/Off switch. The switch reads On only while this device's
 * switches equal the chosen phase's set exactly, so nothing extra is stored:
 * change one single switch below and it reads Off by itself.
 */
let chosenPhase: PresetId = 'phase1'
const shownPhase = (): PresetId => matchingPreset() ?? chosenPhase

const phaseSetting: SettingDefinition<string> = {
  id: 'tryNewPreset.phase',
  labelKey: 'flags.preset.phase.name' as MessageKey,
  descriptionKey: 'flags.preset.phase.desc' as MessageKey,
  category: 'tryNew',
  keywords: 'test a phase preset try new features phase one two three',
  scope: 'device',
  defaultValue: 'phase1',
  isValid: (v): v is string => PHASE_PRESETS.some((p) => p.id === v),
  control: {
    kind: 'select',
    options: PHASE_PRESETS.map(({ id }) => ({
      value: id,
      label: () => t(`flags.preset.${id}` as MessageKey),
    })),
  },
  derived: {
    read: shownPhase,
    write: (value) => {
      chosenPhase = value as PresetId
      // While On, choosing another phase applies it at once.
      if (matchingPreset() !== null) applyPreset(chosenPhase)
    },
  },
}

const phaseSwitch: SettingDefinition<OnOff> = {
  id: 'tryNewPreset.on',
  labelKey: 'flags.preset.on.name' as MessageKey,
  descriptionKey: 'flags.preset.on.desc' as MessageKey,
  category: 'tryNew',
  keywords: 'test a phase preset switch on off try new features',
  scope: 'device',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOff() },
  derived: {
    read: () => (matchingPreset() !== null ? 'on' : 'off'),
    write: (value) => {
      if (value === 'on') applyPreset(shownPhase())
      else resetFlags()
    },
  },
}

settingsRegistry.register(phaseSetting as SettingDefinition)
settingsRegistry.register(phaseSwitch as SettingDefinition)

for (const id of FLAG_IDS) {
  settingsRegistry.register(flagSetting(id) as SettingDefinition)
}
