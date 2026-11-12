import { t } from '../i18n/t'
import { isOnOff, type OnOff } from '../app/deviceMode'
import { FLAG_IDS, isOn, setFlag, type FlagId } from '../app/flags'
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

for (const id of FLAG_IDS) {
  settingsRegistry.register(flagSetting(id) as SettingDefinition)
}
