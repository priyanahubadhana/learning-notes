import { isOnOff, MODE_PRESETS, type OnOff } from '../app/deviceMode'
import { DEFAULT_PINNED } from '../app/deviceMode'
import { freeTip, resetFreePos } from '../app/tools/freeBar'
import { resetRibbonOptions } from '../app/tools/ribbonDefaults'
import {
  DEFAULT_SET_TOOLS,
  keepSet,
  hiddenTabs,
  ribbonExpanded,
  ribbonMode,
  ribbonOpen,
  ribbonPlace,
  ribbonSize,
  RIBBON_MODES,
  RIBBON_SIZES,
  stayOpen,
  writeSetTools,
  type RibbonPlace,
} from '../app/tools/toolbarState'
import {
  isToolBarOn,
  requestHideToolBar,
  showToolBar,
} from '../app/tools/toolbarVisibility'
import { currentRunner } from '../app/tools/toolRuntime'
import { t, type MessageKey } from '../i18n/t'
import {
  applyModePreset,
  deviceModeSetting,
  settingsRegistry,
} from './builtinSettings'
import { readDeviceSetting } from './settingsService'
import { isOneOf, type SettingDefinition } from './registry'

/**
 * Settings › Tool bar: everything about the bar in one place, so it can be
 * found by searching "tool bar", "toolbar", "ribbon" or "bar" (and so Show
 * tool bar is always reachable). The values live in the bar's own state; the
 * settings here read and write them. Position, size, auto switch and device
 * mode are the same settings that also appear in General and Advanced.
 */

const KEYWORDS = 'tool bar toolbar ribbon bar'

const onOff = () =>
  (['on', 'off'] as const).map((value) => ({
    value,
    label: () => t(`settings.onOff.${value}` as MessageKey),
  }))

/** Is the tool bar showing? Turning it off asks first (and offers Undo). */
export const showToolBarSetting: SettingDefinition<OnOff> = {
  id: 'toolbar.show',
  labelKey: 'settings.toolbarShow.label',
  descriptionKey: 'settings.toolbarShow.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' show hide on off',
  scope: 'device',
  defaultValue: 'on',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOff() },
  derived: {
    read: () => (isToolBarOn() ? 'on' : 'off'),
    write: (value) => {
      if (value === 'on') showToolBar()
      else void requestHideToolBar()
    },
  },
}

type Layout = 'short' | 'ribbon'
const LAYOUTS = ['short', 'ribbon'] as const

export const toolbarLayoutSetting: SettingDefinition<Layout> = {
  id: 'toolbar.layout',
  labelKey: 'settings.toolbarLayout.label',
  descriptionKey: 'settings.toolbarLayout.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' layout short bar all tools',
  scope: 'device',
  defaultValue: 'short',
  isValid: isOneOf(LAYOUTS),
  control: {
    kind: 'segmented',
    options: LAYOUTS.map((value) => ({
      value,
      label: () => t(`settings.toolbarLayout.${value}` as MessageKey),
    })),
  },
  derived: {
    read: () => (ribbonOpen.get() ? 'ribbon' : 'short'),
    write: (value) => {
      ribbonOpen.set(value === 'ribbon')
      ribbonExpanded.set(false)
    },
  },
}

type Behaviour = 'close' | 'stay'
const BEHAVIOURS = ['close', 'stay'] as const

export const ribbonBehaviourSetting: SettingDefinition<Behaviour> = {
  id: 'toolbar.ribbonBehaviour',
  labelKey: 'settings.ribbonBehaviour.label',
  descriptionKey: 'settings.ribbonBehaviour.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' behaviour tools close stay open pin',
  scope: 'device',
  defaultValue: 'close',
  isValid: isOneOf(BEHAVIOURS),
  control: {
    kind: 'segmented',
    options: BEHAVIOURS.map((value) => ({
      value,
      label: () => t(`ribbon.${value === 'close' ? 'close' : 'stay'}`),
    })),
  },
  derived: {
    read: () => (stayOpen.get() ? 'stay' : 'close'),
    write: (value) => stayOpen.set(value === 'stay'),
  },
}

type Mode = (typeof RIBBON_MODES)[number]
export const ribbonModeSetting: SettingDefinition<Mode> = {
  id: 'toolbar.ribbonMode',
  labelKey: 'settings.ribbonMode.label',
  descriptionKey: 'settings.ribbonMode.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' ribbon replaces short bar both at once',
  scope: 'device',
  defaultValue: 'replace',
  isValid: isOneOf(RIBBON_MODES),
  control: {
    kind: 'select',
    options: RIBBON_MODES.map((value) => ({
      value,
      label: () => t(`ribbon.mode.${value}` as MessageKey),
    })),
  },
  derived: {
    read: () => ribbonMode.get(),
    write: (value) => ribbonMode.set(value),
  },
}

type Size = (typeof RIBBON_SIZES)[number]
export const ribbonSizeSetting: SettingDefinition<Size> = {
  id: 'toolbar.ribbonSize',
  labelKey: 'settings.ribbonSize.label',
  descriptionKey: 'settings.ribbonSize.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' ribbon size full slim icons',
  scope: 'device',
  defaultValue: 'full',
  isValid: isOneOf(RIBBON_SIZES),
  control: {
    kind: 'segmented',
    options: RIBBON_SIZES.map((value) => ({
      value,
      label: () => t(`ribbon.size.${value}` as MessageKey),
    })),
  },
  derived: {
    read: () => ribbonSize.get(),
    write: (value) => ribbonSize.set(value),
  },
}

const RIBBON_PLACES = ['same', 'top', 'bottom', 'free'] as const
export const ribbonPlaceSetting: SettingDefinition<RibbonPlace> = {
  id: 'toolbar.ribbonPlacement',
  labelKey: 'settings.ribbonPlacement.label',
  descriptionKey: 'settings.ribbonPlacement.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' ribbon position top bottom floating',
  scope: 'device',
  defaultValue: 'same',
  isValid: isOneOf(RIBBON_PLACES),
  control: {
    kind: 'select',
    options: RIBBON_PLACES.map((value) => ({
      value,
      label: () => t(`ribbon.place.${value}` as MessageKey),
    })),
  },
  derived: {
    read: () => ribbonPlace.get(),
    write: (value) => {
      ribbonPlace.set(value)
      if (value === 'free') freeTip.set(true)
    },
  },
}

/** Opens Edit bar (the Write · Draw · Read tool lists) on the open page. */
export const toolSetsSetting: SettingDefinition<'idle'> = {
  id: 'toolbar.sets',
  labelKey: 'settings.toolbarSets.label',
  descriptionKey: 'settings.toolbarSets.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' write draw read sets edit bar tools',
  scope: 'device',
  defaultValue: 'idle',
  isValid: isOneOf(['idle'] as const),
  control: {
    kind: 'action',
    buttonKey: 'settings.toolbarSets.button',
    run: () => {
      const { bar, app } = currentRunner()
      if (bar) bar.openPanel('edit')
      else app?.toast(t('settings.toolbarSets.needsPage'))
    },
  },
  derived: { read: () => 'idle', write: () => {} },
}

/** Back to the defaults of this device's mode: tools, tabs, position. */
export function resetToolBar(): void {
  applyModePreset(readDeviceSetting(deviceModeSetting))
  writeSetTools('write', DEFAULT_PINNED)
  writeSetTools('draw', DEFAULT_SET_TOOLS.draw)
  writeSetTools('read', DEFAULT_SET_TOOLS.read)
  hiddenTabs.set([])
  keepSet.set(false)
  stayOpen.set(false)
  ribbonOpen.set(false)
  ribbonExpanded.set(false)
  resetFreePos()
  resetRibbonOptions()
  // Touch and Pencil always get the bar back; Computer's preset has none.
  if (
    MODE_PRESETS[readDeviceSetting(deviceModeSetting)].placement !== 'floating'
  ) {
    showToolBar()
  }
}

export const resetToolBarSetting: SettingDefinition<'idle'> = {
  id: 'toolbar.reset',
  labelKey: 'settings.toolbarReset.label',
  descriptionKey: 'settings.toolbarReset.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' reset default restore',
  scope: 'device',
  defaultValue: 'idle',
  isValid: isOneOf(['idle'] as const),
  control: {
    kind: 'action',
    buttonKey: 'settings.toolbarReset.button',
    run: () => {
      resetToolBar()
      currentRunner().app?.toast(t('settings.toolbarReset.done'))
    },
  },
  derived: { read: () => 'idle', write: () => {} },
}

for (const definition of [
  showToolBarSetting,
  toolbarLayoutSetting,
  ribbonBehaviourSetting,
  ribbonModeSetting,
  ribbonSizeSetting,
  ribbonPlaceSetting,
  toolSetsSetting,
  resetToolBarSetting,
]) {
  settingsRegistry.register(definition as SettingDefinition)
}
