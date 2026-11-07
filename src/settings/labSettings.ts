import { isOneOf, type SettingDefinition } from './registry'
import { settingsRegistry } from './builtinSettings'

/** Settings › Advanced › Pencil lab: a test page for the iPad. */
const pencilLabSetting: SettingDefinition<'idle'> = {
  id: 'advanced.pencilLab',
  labelKey: 'settings.pencilLab.label',
  descriptionKey: 'settings.pencilLab.description',
  category: 'advanced',
  keywords: 'pencil lab scribble test pen ipad',
  scope: 'device',
  defaultValue: 'idle',
  isValid: isOneOf(['idle'] as const),
  control: {
    kind: 'action',
    buttonKey: 'settings.pencilLab.button',
    run: () => {
      location.hash = '#/lab/pencil'
    },
  },
  derived: { read: () => 'idle', write: () => {} },
}

settingsRegistry.register(pencilLabSetting as SettingDefinition)
