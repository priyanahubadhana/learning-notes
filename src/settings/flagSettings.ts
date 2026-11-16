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
import {
  TAP_SPEEDS,
  TAP_SPEED_KEY,
  tapSpeed,
  type TapSpeed,
} from '../app/tapTiming'
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

/**
 * C14, preview only (manager OK, 16 Nov): how far apart taps may be and
 * still add up (Quick 350, Normal 500, Relaxed 700 ms; tapTiming.ts). The
 * owner tries them on the iPad; the pick becomes the default and this row
 * is removed before release.
 */
const tapSpeedSetting: SettingDefinition<string> = {
  id: 'tryNew.tapSpeed',
  labelKey: 'flags.tapSpeed.name' as MessageKey,
  descriptionKey: 'flags.tapSpeed.desc' as MessageKey,
  category: 'tryNew',
  keywords: 'tap speed double triple tap pencil timing try new features',
  scope: 'device',
  defaultValue: 'normal',
  isValid: (v): v is string => typeof v === 'string' && v in TAP_SPEEDS,
  control: {
    kind: 'segmented',
    options: (Object.keys(TAP_SPEEDS) as TapSpeed[]).map((value) => ({
      value,
      label: () => t(`flags.tapSpeed.${value}` as MessageKey),
    })),
  },
  derived: {
    read: tapSpeed,
    write: (value) => {
      try {
        localStorage.setItem(TAP_SPEED_KEY, JSON.stringify(value))
      } catch {
        // Private mode: Normal stays.
      }
    },
  },
}

settingsRegistry.register(phaseSetting as SettingDefinition)
settingsRegistry.register(phaseSwitch as SettingDefinition)
settingsRegistry.register(tapSpeedSetting as SettingDefinition)

for (const id of FLAG_IDS) {
  settingsRegistry.register(flagSetting(id) as SettingDefinition)
}
