import { isOnOff, type OnOff } from '../app/deviceMode'
import { freeTip, resetFreePos } from '../app/tools/freeBar'
import { resetRibbonOptions } from '../app/tools/ribbonDefaults'
import {
  hiddenTabs,
  ribbonExpanded,
  ribbonMode,
  ribbonOpen,
  ribbonPlace,
  ribbonSize,
  RIBBON_MODES,
  RIBBON_SIZES,
  stayOpen,
  type RibbonPlace,
} from '../app/tools/toolbarState'
import {
  isToolBarOn,
  requestHideToolBar,
  showToolBar,
} from '../app/tools/toolbarVisibility'
import { currentRunner } from '../app/tools/toolRuntime'
import {
  HOLD_CHOICES,
  NEW_LINE_EXTRAS,
  newLineExtras,
  newLineHoldMs,
  penPicksPen,
  resetMainBar,
  showNames,
  type NewLineExtras,
} from '../app/tools/main/mainTools'
import { pillPlaceStore } from '../app/tools/main/pillPlace'
import { resetNoteStyle } from '../app/tools/main/textStyle'
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

export const newLineExtrasSetting: SettingDefinition<NewLineExtras> = {
  id: 'toolbar.newLineExtras',
  labelKey: 'settings.newLineExtras.label',
  descriptionKey: 'settings.newLineExtras.description',
  category: 'toolbar',
  keywords:
    KEYWORDS +
    ' new line hold press double tap extras heading checklist divider',
  scope: 'device',
  defaultValue: 'hold',
  isValid: isOneOf(NEW_LINE_EXTRAS),
  control: {
    kind: 'segmented',
    options: NEW_LINE_EXTRAS.map((value) => ({
      value,
      label: () => t(`settings.newLineExtras.${value}` as MessageKey),
    })),
  },
  derived: {
    read: () => newLineExtras.get(),
    write: (value) => newLineExtras.set(value),
  },
}

export const newLineHoldSetting: SettingDefinition<number> = {
  id: 'toolbar.newLineHold',
  labelKey: 'settings.newLineHold.label',
  descriptionKey: 'settings.newLineHold.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' new line hold duration how long press',
  scope: 'device',
  defaultValue: 600,
  isValid: (v): v is number =>
    typeof v === 'number' && (HOLD_CHOICES as readonly number[]).includes(v),
  control: {
    kind: 'select',
    options: HOLD_CHOICES.map((value) => ({
      value,
      label: () => t('settings.newLineHold.seconds', { seconds: value / 1000 }),
    })),
  },
  derived: {
    read: () => newLineHoldMs.get(),
    write: (value) => newLineHoldMs.set(value),
  },
}

export const penPicksPenSetting: SettingDefinition<OnOff> = {
  id: 'toolbar.penPicksPen',
  labelKey: 'settings.penPicksPen.label',
  descriptionKey: 'settings.penPicksPen.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' pencil pen picks selects tool automatic',
  scope: 'device',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOff() },
  derived: {
    read: () => (penPicksPen.get() ? 'on' : 'off'),
    write: (value) => penPicksPen.set(value === 'on'),
  },
}

export const showNamesSetting: SettingDefinition<OnOff> = {
  id: 'toolbar.showNames',
  labelKey: 'settings.showNames.label',
  descriptionKey: 'settings.showNames.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' names labels icons text under tooltip hover',
  scope: 'device',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOff() },
  derived: {
    read: () => (showNames.get() ? 'on' : 'off'),
    write: (value) => showNames.set(value === 'on'),
  },
}

export const pillPlaceSetting: SettingDefinition<'idle'> = {
  id: 'toolbar.pillReset',
  labelKey: 'settings.pillReset.label',
  descriptionKey: 'settings.pillReset.description',
  category: 'toolbar',
  keywords: KEYWORDS + ' options pill position snap edge reset',
  scope: 'device',
  defaultValue: 'idle',
  isValid: isOneOf(['idle'] as const),
  control: {
    kind: 'action',
    buttonKey: 'settings.pillReset.button',
    run: () => {
      pillPlaceStore.set(null)
      currentRunner().app?.toast(t('settings.pillReset.done'))
    },
  },
  derived: { read: () => 'idle', write: () => {} },
}

/** Back to the defaults of this device's mode: tools, tabs, position. */
export function resetToolBar(): void {
  applyModePreset(readDeviceSetting(deviceModeSetting))
  resetMainBar()
  pillPlaceStore.set(null)
  newLineExtras.set('hold')
  newLineHoldMs.set(600)
  penPicksPen.set(false)
  resetNoteStyle()
  hiddenTabs.set([])
  stayOpen.set(false)
  ribbonOpen.set(false)
  ribbonExpanded.set(false)
  resetFreePos()
  resetRibbonOptions()
  // Every mode's preset has a bar, so the bar always comes back.
  showToolBar()
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
  newLineExtrasSetting,
  newLineHoldSetting,
  penPicksPenSetting,
  showNamesSetting,
  pillPlaceSetting,
  resetToolBarSetting,
]) {
  settingsRegistry.register(definition as SettingDefinition)
}
