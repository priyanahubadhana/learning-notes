import { GLASS_CHOICES, setGlassLite, type GlassChoice } from '../design/glass'
import {
  BAR_PLACEMENTS,
  BAR_SIZES,
  AUTO_SWITCHES,
  DEVICE_MODES,
  MODE_PRESETS,
  isBarPlacement,
  isBarSize,
  isAutoSwitch,
  isDeviceMode,
  isOnOff,
  type AutoSwitch,
  type BarPlacement,
  type BarSize,
  type DeviceMode,
  type OnOff,
} from '../app/deviceMode'
import { isTheme, THEME_PREF_KEY, THEMES, type Theme } from '../app/theme'
import { DEFAULT_DAY_START_HOUR } from '../core/time'
import {
  DEFAULT_LABELS,
  isLabelList,
  type LabelDef,
} from '../revise/reviseMarks'
import {
  isLanguage,
  LANGUAGE_NAMES,
  LANGUAGES,
  type Language,
} from '../i18n/languages'
import { dateLocale, t, type DateStyle, type MessageKey } from '../i18n/t'
import { freeTip } from '../app/tools/freeBar'
import { isPathStyle, PATH_STYLES, type PathStyle } from '../pages/pathStyle'
import {
  isOpenNotebookAt,
  OPEN_NOTEBOOK_AT,
  type OpenNotebookAt,
} from '../notebooks/lastPage'
import { writeDeviceSetting } from './settingsService'
import {
  createSettingsRegistry,
  isIntInRange,
  isOneOf,
  isRisingSteps,
  type SettingDefinition,
} from './registry'

/**
 * The app's built-in categories and settings (Phase 3 needs only these).
 * Each definition is exported so code can read it with full typing,
 * e.g. `getSetting(db, newCardsPerDay)`.
 */

export const settingsRegistry = createSettingsRegistry()

settingsRegistry.registerCategory({
  id: 'general',
  labelKey: 'settings.category.general',
  descriptionKey: 'settings.category.general.hint',
  order: 10,
})
settingsRegistry.registerCategory({
  id: 'review',
  labelKey: 'settings.category.review',
  descriptionKey: 'settings.category.review.hint',
  order: 20,
})
settingsRegistry.registerCategory({
  id: 'journal',
  labelKey: 'settings.category.journal',
  descriptionKey: 'settings.category.journal.hint',
  order: 30,
})
settingsRegistry.registerCategory({
  id: 'toolbar',
  labelKey: 'settings.category.toolbar',
  descriptionKey: 'settings.category.toolbar.hint',
  order: 70,
})
settingsRegistry.registerCategory({
  id: 'advanced',
  labelKey: 'settings.category.advanced',
  descriptionKey: 'settings.category.advanced.hint',
  order: 80,
})
settingsRegistry.registerCategory({
  id: 'apis',
  labelKey: 'settings.category.connections',
  descriptionKey: 'settings.category.connections.hint',
  order: 90,
})

/** Formats an hour of the day in the user's regional style (e.g. "4:00 AM" or "04:00"). */
const hourLabel = (hour: number) => () =>
  new Intl.DateTimeFormat(dateLocale(), {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(2000, 0, 1, hour))

const DAY_START_HOURS = [0, 1, 2, 3, 4, 5, 6] as const

export const theme: SettingDefinition<Theme> = {
  id: 'general.theme',
  labelKey: 'settings.theme.label',
  descriptionKey: 'settings.theme.description',
  category: 'general',
  scope: 'device',
  storageKey: THEME_PREF_KEY, // same key as before, so the saved theme is kept
  defaultValue: 'day',
  isValid: isTheme,
  control: {
    kind: 'segmented',
    options: THEMES.map((value) => ({
      value,
      label: () => t(`settings.theme.${value}`),
    })),
  },
}

/** The labels for marking words in notes (Revise tab). Saved with the notes. */
export const reviseLabelsSetting: SettingDefinition<LabelDef[]> = {
  id: 'review.reviseLabels',
  labelKey: 'settings.reviseLabels.label',
  descriptionKey: 'settings.reviseLabels.description',
  category: 'review',
  scope: 'synced',
  defaultValue: DEFAULT_LABELS.map((l) => ({ ...l })),
  isValid: isLabelList as (value: unknown) => value is LabelDef[],
  control: { kind: 'labels' },
}

/** The language of the app's texts on this device. */
export const languageSetting: SettingDefinition<Language> = {
  id: 'general.language',
  labelKey: 'settings.language.label',
  descriptionKey: 'settings.language.description',
  category: 'general',
  scope: 'device',
  defaultValue: 'en',
  isValid: isLanguage,
  control: {
    kind: 'segmented',
    options: LANGUAGES.map((value) => ({
      value,
      label: () => LANGUAGE_NAMES[value],
    })),
  },
}

/** Hover tips and help lines (this device). */
const HELP_CHOICES = ['on', 'off'] as const
export type HelpChoice = (typeof HELP_CHOICES)[number]

export const showHelp: SettingDefinition<HelpChoice> = {
  id: 'general.showHelp',
  labelKey: 'settings.showHelp.label',
  descriptionKey: 'settings.showHelp.description',
  category: 'general',
  scope: 'device',
  defaultValue: 'on',
  isValid: isOneOf<HelpChoice>(HELP_CHOICES),
  control: {
    kind: 'segmented',
    options: HELP_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.showHelp.${value}`),
    })),
  },
}

/** How dates are written on this device. */
const DATE_STYLES = ['auto', 'dayFirst', 'monthFirst'] as const

export const dateStyleSetting: SettingDefinition<DateStyle> = {
  id: 'general.dateStyle',
  labelKey: 'settings.dateStyle.label',
  descriptionKey: 'settings.dateStyle.description',
  category: 'general',
  scope: 'device',
  defaultValue: 'dayFirst',
  isValid: isOneOf<DateStyle>(DATE_STYLES),
  control: {
    kind: 'segmented',
    options: DATE_STYLES.map((value) => ({
      value,
      label: () => t(`settings.dateStyle.${value}`),
    })),
  },
}

export const dayStartHour: SettingDefinition<number> = {
  id: 'general.dayStartHour',
  labelKey: 'settings.dayStart.label',
  descriptionKey: 'settings.dayStart.description',
  category: 'general',
  alsoIn: ['review', 'journal'],
  scope: 'synced',
  defaultValue: DEFAULT_DAY_START_HOUR,
  isValid: isOneOf<number>(DAY_START_HOURS),
  control: {
    kind: 'select',
    options: DAY_START_HOURS.map((h) => ({ value: h, label: hourLabel(h) })),
  },
}

export const newCardsPerDay: SettingDefinition<number> = {
  id: 'review.newPerDay',
  labelKey: 'settings.newPerDay.label',
  descriptionKey: 'settings.newPerDay.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 20,
  isValid: isIntInRange(0, 9999),
  control: { kind: 'number', min: 0, max: 9999 },
}

/** null = no limit. */
export const reviewsPerDay: SettingDefinition<number | null> = {
  id: 'review.maxPerDay',
  labelKey: 'settings.maxPerDay.label',
  descriptionKey: 'settings.maxPerDay.description',
  category: 'review',
  scope: 'synced',
  defaultValue: null,
  isValid: (v): v is number | null => v === null || isIntInRange(1, 99999)(v),
  control: {
    kind: 'number',
    min: 1,
    max: 99999,
    emptyKey: 'settings.maxPerDay.empty',
  },
}

export const againMinutes: SettingDefinition<number> = {
  id: 'review.againMinutes',
  labelKey: 'settings.againMinutes.label',
  descriptionKey: 'settings.againMinutes.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 10,
  isValid: isIntInRange(1, 1440),
  control: { kind: 'number', min: 1, max: 1440, unitKey: 'unit.minutes' },
}

const STEP_LIMITS = { min: 1, max: 36500, maxCount: 20 }

export const goodSteps: SettingDefinition<number[]> = {
  id: 'review.goodSteps',
  labelKey: 'settings.goodSteps.label',
  descriptionKey: 'settings.goodSteps.description',
  category: 'review',
  scope: 'synced',
  defaultValue: [1, 3, 7, 14, 30, 60],
  isValid: isRisingSteps(
    STEP_LIMITS.min,
    STEP_LIMITS.max,
    STEP_LIMITS.maxCount,
  ),
  control: { kind: 'steps', ...STEP_LIMITS, unitKey: 'unit.days' },
  shownWhen: { settingId: 'review.scheduler', values: ['fixed'] },
}

/** How review gaps are picked (ids in `recall/scheduler.ts`). */
const SCHEDULER_CHOICES = ['fsrs', 'fixed'] as const
export type SchedulerChoice = (typeof SCHEDULER_CHOICES)[number]

export const schedulerChoice: SettingDefinition<SchedulerChoice> = {
  id: 'review.scheduler',
  labelKey: 'settings.scheduler.label',
  descriptionKey: 'settings.scheduler.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 'fsrs',
  isValid: isOneOf<SchedulerChoice>(SCHEDULER_CHOICES),
  control: {
    kind: 'select',
    options: SCHEDULER_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.scheduler.${value}`),
    })),
  },
}

export const targetMemory: SettingDefinition<number> = {
  id: 'review.targetMemory',
  labelKey: 'settings.targetMemory.label',
  descriptionKey: 'settings.targetMemory.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 90,
  isValid: isIntInRange(70, 97),
  control: { kind: 'number', min: 70, max: 97, unitKey: 'unit.percent' },
  shownWhen: { settingId: 'review.scheduler', values: ['fsrs'] },
}

/** Where "/card" puts a new card when typed inside a card's answer. */
const NESTED_CARD_CHOICES = ['ask', 'nextLine', 'inside'] as const
export type NestedCardChoice = (typeof NESTED_CARD_CHOICES)[number]

export const nestedCardPlacement: SettingDefinition<NestedCardChoice> = {
  id: 'review.nestedCard',
  labelKey: 'settings.nestedCard.label',
  descriptionKey: 'settings.nestedCard.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 'ask',
  isValid: isOneOf<NestedCardChoice>(NESTED_CARD_CHOICES),
  control: {
    kind: 'select',
    options: NESTED_CARD_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.nestedCard.${value}`),
    })),
  },
}

/** Order of a Practice anyway round. */
const PRACTICE_ORDERS = ['due', 'shuffle'] as const
export type PracticeOrder = (typeof PRACTICE_ORDERS)[number]

export const practiceOrder: SettingDefinition<PracticeOrder> = {
  id: 'review.practiceOrder',
  labelKey: 'settings.practiceOrder.label',
  descriptionKey: 'settings.practiceOrder.description',
  category: 'review',
  scope: 'synced',
  defaultValue: 'due',
  isValid: isOneOf<PracticeOrder>(PRACTICE_ORDERS),
  control: {
    kind: 'segmented',
    options: PRACTICE_ORDERS.map((value) => ({
      value,
      label: () => t(`settings.practiceOrder.${value}`),
    })),
  },
}

// ---- Device modes (Computer, Touch, Pencil) and the formatting bar ----

/** The mode of this device; choosing one sets the five bar settings below. */
export const deviceModeSetting: SettingDefinition<DeviceMode> = {
  id: 'general.deviceMode',
  labelKey: 'settings.deviceMode.label',
  descriptionKey: 'settings.deviceMode.description',
  category: 'general',
  alsoIn: ['advanced', 'toolbar'],
  keywords: 'tool bar toolbar ribbon bar device',
  scope: 'device',
  defaultValue: 'computer',
  isValid: isDeviceMode,
  control: {
    kind: 'segmented',
    options: DEVICE_MODES.map((value) => ({
      value,
      label: () => t(`mode.${value}`),
    })),
  },
  onChange: (mode) => applyModePreset(mode),
}

const onOffOptions = () =>
  (['on', 'off'] as const).map((value) => ({
    value,
    label: () => t(`settings.onOff.${value}` as MessageKey),
  }))

export const barPlacementSetting: SettingDefinition<BarPlacement> = {
  id: 'advanced.barPlacement',
  labelKey: 'settings.barPlacement.label',
  descriptionKey: 'settings.barPlacement.description',
  category: 'advanced',
  alsoIn: ['toolbar'],
  keywords: 'tool bar toolbar ribbon bar position floating top bottom',
  scope: 'device',
  defaultValue: MODE_PRESETS.computer.placement,
  isValid: isBarPlacement,
  control: {
    kind: 'segmented',
    // "Off" (the older `floating`) is the Show tool bar setting's job.
    options: BAR_PLACEMENTS.filter((value) => value !== 'floating').map(
      (value) => ({
        value,
        label: () => t(`settings.barPlacement.${value}`),
      }),
    ),
  },
  onChange: (value) => {
    // A short tip points at the bar that now floats.
    if (value === 'free') freeTip.set(true)
  },
}

export const barSizeSetting: SettingDefinition<BarSize> = {
  id: 'advanced.barSize',
  labelKey: 'settings.barSize.label',
  descriptionKey: 'settings.barSize.description',
  category: 'advanced',
  alsoIn: ['toolbar'],
  keywords: 'tool bar toolbar ribbon bar size',
  scope: 'device',
  defaultValue: MODE_PRESETS.computer.size,
  isValid: isBarSize,
  control: {
    kind: 'segmented',
    options: BAR_SIZES.map((value) => ({
      value,
      label: () => t(`settings.barSize.${value}`),
    })),
  },
}

export const hoverTipsSetting: SettingDefinition<OnOff> = {
  id: 'advanced.hoverTips',
  labelKey: 'settings.hoverTips.label',
  descriptionKey: 'settings.hoverTips.description',
  category: 'advanced',
  scope: 'device',
  defaultValue: MODE_PRESETS.computer.hoverTips,
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

export const shortcutHintsSetting: SettingDefinition<OnOff> = {
  id: 'advanced.shortcutHints',
  labelKey: 'settings.shortcutHints.label',
  descriptionKey: 'settings.shortcutHints.description',
  category: 'advanced',
  scope: 'device',
  defaultValue: MODE_PRESETS.computer.shortcutHints,
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/** Scroll hints (R5-13): edge fade and a slim indicator on scrolling lists. */
export const scrollHintsSetting: SettingDefinition<OnOff> = {
  id: 'general.scrollHints',
  labelKey: 'settings.scrollHints.label',
  descriptionKey: 'settings.scrollHints.description',
  category: 'general',
  keywords: 'scroll fade indicator scrollbar list hint',
  scope: 'device',
  defaultValue: 'on',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/** Update automatically: a new version is applied at a safe moment. */
export const autoUpdateSetting: SettingDefinition<OnOff> = {
  id: 'general.autoUpdate',
  labelKey: 'settings.autoUpdate.label',
  descriptionKey: 'settings.autoUpdate.description',
  category: 'general',
  keywords: 'update automatically new version restart reload upgrade',
  scope: 'device',
  defaultValue: 'on',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/** A Refresh button in the top bar (item 18); the gear menu always has Refresh app. */
export const showRefreshSetting: SettingDefinition<OnOff> = {
  id: 'advanced.showRefresh',
  labelKey: 'settings.showRefresh.label',
  descriptionKey: 'settings.showRefresh.description',
  category: 'advanced',
  keywords: 'refresh reload restart top bar button',
  scope: 'synced',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

export const barAutoHideSetting: SettingDefinition<OnOff> = {
  id: 'advanced.barAutoHide',
  labelKey: 'settings.barAutoHide.label',
  descriptionKey: 'settings.barAutoHide.description',
  category: 'advanced',
  scope: 'device',
  defaultValue: MODE_PRESETS.computer.autoHide,
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/**
 * Scribble (iPadOS handwriting to text). Off: a Pencil drag in the page only
 * selects, and handwriting never edits the text. On: the Pencil can write.
 */
export const pencilWritesSetting: SettingDefinition<OnOff> = {
  id: 'advanced.pencilWrites',
  labelKey: 'settings.pencilWrites.label',
  descriptionKey: 'settings.pencilWrites.description',
  category: 'advanced',
  keywords: 'scribble handwriting pencil write text ipad apple',
  scope: 'device',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/**
 * How long the Pencil rests on text before hold-to-select starts (ms).
 * Under the Text tool a quick stroke is handwriting; a still hold selects.
 */
const HOLD_SELECT_CHOICES = [300, 400, 500, 600, 800, 1000, 1500] as const
export const holdSelectSetting: SettingDefinition<number> = {
  id: 'advanced.holdSelect',
  labelKey: 'settings.holdSelect.label',
  descriptionKey: 'settings.holdSelect.description',
  category: 'advanced',
  keywords: 'pencil hold select long press text scribble',
  scope: 'device',
  defaultValue: 500,
  isValid: (v): v is number =>
    typeof v === 'number' &&
    (HOLD_SELECT_CHOICES as readonly number[]).includes(v),
  control: {
    kind: 'select',
    options: HOLD_SELECT_CHOICES.map((value) => ({
      value,
      label: () => t('settings.holdSelect.ms', { ms: value }),
    })),
  },
}

const TAP_TWICE_CHOICES = ['auto', 'on', 'off'] as const
export type TapTwice = (typeof TAP_TWICE_CHOICES)[number]
/**
 * Pencil: tap twice to start typing. The first Pencil tap on a block that has
 * words only marks it (an outline, no caret, no keyboard); the second tap in
 * it places the caret. Auto = on in Pencil mode. A finger always places the
 * caret with one tap; an empty block or blank space takes the caret at once.
 */
export const pencilTapTwiceSetting: SettingDefinition<TapTwice> = {
  id: 'advanced.pencilTapTwice',
  labelKey: 'settings.pencilTapTwice.label',
  descriptionKey: 'settings.pencilTapTwice.description',
  category: 'advanced',
  keywords: 'pencil tap twice double start typing caret block outline keyboard',
  scope: 'device',
  defaultValue: 'auto',
  isValid: (v): v is TapTwice =>
    (TAP_TWICE_CHOICES as readonly unknown[]).includes(v),
  control: {
    kind: 'segmented',
    options: TAP_TWICE_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.pencilTapTwice.${value}`),
    })),
  },
}

/** The Pencil can scroll the page (a flick, or a drag from the margins). */
const pencilScrollsSetting: SettingDefinition<OnOff> = {
  id: 'advanced.pencilScrolls',
  labelKey: 'settings.pencilScrolls.label',
  descriptionKey: 'settings.pencilScrolls.description',
  category: 'advanced',
  keywords: 'pencil scroll flick drag margin ipad apple',
  scope: 'device',
  defaultValue: 'on',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/** Whether a Pencil (or a finger) switches the device mode by itself. */
export const autoSwitchSetting: SettingDefinition<AutoSwitch> = {
  id: 'advanced.autoSwitch',
  labelKey: 'settings.autoSwitch.label',
  descriptionKey: 'settings.autoSwitch.description',
  category: 'advanced',
  alsoIn: ['toolbar'],
  keywords: 'tool bar toolbar ribbon bar auto switch pencil',
  scope: 'device',
  defaultValue: 'pen',
  isValid: isAutoSwitch,
  control: {
    kind: 'segmented',
    options: AUTO_SWITCHES.map((value) => ({
      value,
      label: () => t(`settings.autoSwitch.${value}`),
    })),
  },
}

/**
 * How the page path in the top bar shows, unless the notebook or the page has
 * its own choice (page, then notebook, then this).
 */
export const pathStyleSetting: SettingDefinition<PathStyle> = {
  id: 'general.pathStyle',
  labelKey: 'settings.pathStyle.label',
  descriptionKey: 'settings.pathStyle.description',
  category: 'general',
  keywords:
    'page address path breadcrumb folders location top bar short full name only',
  scope: 'device',
  defaultValue: 'simple',
  isValid: isPathStyle,
  control: {
    kind: 'segmented',
    options: PATH_STYLES.map((value) => ({
      value,
      label: () => t(`path.style.${value}` as MessageKey),
    })),
  },
}

/** R6-12: what tapping a notebook opens (this device). */
export const openNotebookAtSetting: SettingDefinition<OpenNotebookAt> = {
  id: 'general.openNotebookAt',
  labelKey: 'settings.openNotebookAt.label',
  descriptionKey: 'settings.openNotebookAt.description',
  category: 'general',
  keywords: 'open notebook last page first page tabs resume where i left off',
  scope: 'device',
  defaultValue: 'last',
  isValid: isOpenNotebookAt,
  control: {
    kind: 'segmented',
    options: OPEN_NOTEBOOK_AT.map((value) => ({
      value,
      label: () => t(`settings.openNotebookAt.${value}` as MessageKey),
    })),
  },
}

/** Sets the five bar settings to a mode's preset. */
export function applyModePreset(mode: DeviceMode): void {
  const preset = MODE_PRESETS[mode]
  writeDeviceSetting(barPlacementSetting, preset.placement)
  writeDeviceSetting(barSizeSetting, preset.size)
  writeDeviceSetting(hoverTipsSetting, preset.hoverTips)
  writeDeviceSetting(shortcutHintsSetting, preset.shortcutHints)
  writeDeviceSetting(barAutoHideSetting, preset.autoHide)
}

/** One-tap switch: remembers the mode and applies its preset. */
export function applyDeviceMode(mode: DeviceMode): void {
  writeDeviceSetting(deviceModeSetting, mode)
  applyModePreset(mode)
}

/**
 * N2: "Always start new pages as Study". On: a new page opens with the Study
 * notes template already filled in; off: it opens blank with the template
 * list below the cursor. Saved with the notes (synced).
 */
export const newPageStudySetting: SettingDefinition<OnOff> = {
  id: 'general.newPageStudy',
  labelKey: 'settings.newPageStudy.label',
  descriptionKey: 'settings.newPageStudy.description',
  category: 'general',
  keywords: 'new page start template study default always blank',
  scope: 'synced',
  defaultValue: 'off',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/**
 * Template chooser at start: the "Start with a template" list under the cursor
 * of a new page or notebook. Off: new pages just open blank. Synced.
 */
export const newPageChooserSetting: SettingDefinition<OnOff> = {
  id: 'general.newPageChooser',
  labelKey: 'settings.newPageChooser.label',
  descriptionKey: 'settings.newPageChooser.description',
  category: 'general',
  keywords: 'template chooser start new page notebook blank show again',
  scope: 'synced',
  defaultValue: 'on',
  isValid: isOnOff,
  control: { kind: 'segmented', options: onOffOptions() },
}

/** Paste chooser: ask on a rich paste, or always keep the format / paste plain text. */
export type PasteMode = 'ask' | 'keep' | 'plain'
const PASTE_MODES: readonly PasteMode[] = ['ask', 'keep', 'plain']
export const pasteModeSetting: SettingDefinition<PasteMode> = {
  id: 'general.pasteMode',
  labelKey: 'settings.pasteMode.label',
  descriptionKey: 'settings.pasteMode.description',
  category: 'general',
  keywords: 'paste keep format plain text ask each time chooser clipboard',
  scope: 'device',
  defaultValue: 'ask',
  isValid: (value): value is PasteMode =>
    PASTE_MODES.includes(value as PasteMode),
  control: {
    kind: 'segmented',
    options: PASTE_MODES.map((value) => ({
      value,
      label: () => t(`settings.pasteMode.${value}` as MessageKey),
    })),
  },
}

/** Glass (blurred frame) or solid: "auto" turns glass off by itself on slow devices. */
export const reduceGlassSetting: SettingDefinition<GlassChoice> = {
  id: 'general.reduceGlass',
  labelKey: 'settings.reduceGlass.label',
  descriptionKey: 'settings.reduceGlass.description',
  category: 'general',
  keywords: 'glass blur transparency solid slow reduce frosted',
  scope: 'device',
  defaultValue: 'auto',
  isValid: isOneOf<GlassChoice>(GLASS_CHOICES),
  onChange: (value) => setGlassLite(value === 'reduce'),
  control: {
    kind: 'segmented',
    options: GLASS_CHOICES.map((value) => ({
      value,
      label: () => t(`settings.reduceGlass.${value}` as MessageKey),
    })),
  },
}

for (const definition of [
  theme,
  reduceGlassSetting,
  deviceModeSetting,
  barPlacementSetting,
  barSizeSetting,
  hoverTipsSetting,
  shortcutHintsSetting,
  barAutoHideSetting,
  showRefreshSetting,
  scrollHintsSetting,
  autoUpdateSetting,
  autoSwitchSetting,
  pencilWritesSetting,
  holdSelectSetting,
  pencilScrollsSetting,
  pencilTapTwiceSetting,
  pathStyleSetting,
  openNotebookAtSetting,
  reviseLabelsSetting,
  languageSetting,
  showHelp,
  dateStyleSetting,
  dayStartHour,
  newCardsPerDay,
  reviewsPerDay,
  schedulerChoice,
  targetMemory,
  againMinutes,
  goodSteps,
  practiceOrder,
  nestedCardPlacement,
  newPageStudySetting,
  newPageChooserSetting,
  pasteModeSetting,
]) {
  settingsRegistry.register(definition as SettingDefinition)
}
