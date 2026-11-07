import { currentRunner } from '../app/tools/toolRuntime'
import { t } from '../i18n/t'
import { isOnOff, type OnOff } from '../app/deviceMode'
import { isOneOf, type SettingDefinition } from './registry'
import { settingsRegistry } from './builtinSettings'
import { setSlowMomentsOn } from '../perf/slowMomentsSwitch'

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

/**
 * Settings › Advanced › Record slow moments (R6-11): a light log of stalls
 * on this device (see perf/slowMoments.ts). Off by default; nothing leaves
 * the device.
 */
const onOff = () =>
  (['on', 'off'] as const).map((value) => ({
    value,
    label: () => t(`settings.onOff.${value}`),
  }))

export const slowMomentsSetting: SettingDefinition<OnOff> = {
  id: 'advanced.slowMoments',
  labelKey: 'settings.slowMoments.label',
  descriptionKey: 'settings.slowMoments.description',
  category: 'advanced',
  keywords: 'slow freeze lag stall performance record log ipad',
  scope: 'device',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOff() },
  onChange: (value) => setSlowMomentsOn(value === 'on'),
}

const slowMomentsCopySetting: SettingDefinition<'idle'> = {
  id: 'advanced.slowMomentsCopy',
  labelKey: 'settings.slowMomentsCopy.label',
  descriptionKey: 'settings.slowMomentsCopy.description',
  category: 'advanced',
  keywords: 'slow freeze lag report copy performance',
  scope: 'device',
  defaultValue: 'idle',
  isValid: isOneOf(['idle'] as const),
  control: {
    kind: 'action',
    buttonKey: 'settings.slowMomentsCopy.button',
    run: () => {
      void import('../perf/slowMoments').then(async (m) => {
        const toast = (s: string) => currentRunner().app?.toast(s)
        const list = m.readSlowMoments()
        if (list.length === 0) return toast(t('settings.slowMomentsCopy.empty'))
        const text = m.slowMomentsReport(list)
        try {
          await navigator.clipboard.writeText(text)
          toast(t('settings.slowMomentsCopy.done'))
        } catch {
          console.info(text)
          toast(t('settings.slowMomentsCopy.failed'))
        }
      })
    },
  },
  derived: { read: () => 'idle', write: () => {} },
}

settingsRegistry.register(slowMomentsSetting as SettingDefinition)
settingsRegistry.register(slowMomentsCopySetting as SettingDefinition)
