import {
  ALIGNS,
  BAR_MODES,
  BLANK_MODES,
  DIM_LEVELS,
  GLIDE_MS,
  ENTRIES,
  FLOWS,
  LINE_SPACINGS,
  MARGINS,
  ON_OFF,
  READING_FONTS,
  READING_THEMES,
  RULERS,
  SPEEDS,
  TEXT_SIZES,
  WIDTHS,
  isAlign,
  isBarMode,
  isBlankMode,
  isDimLevel,
  isGlideMs,
  isEntry,
  isFlow,
  isLineSpacing,
  isMargin,
  isOnOffValue,
  isReadingFont,
  isReadingTheme,
  isRuler,
  isSpeed,
  isTextSize,
  isWidth,
  type Align,
  type BarMode,
  type BlankMode,
  type Entry,
  type Flow,
  type Margin,
  type OnOffValue,
  type ReadingFont,
  type ReadingThemeName,
  type Ruler,
  type Width,
} from '../app/reading/readingPrefs'
import {
  isOrient,
  ORIENT_CHOICES,
  type OrientChoice,
} from '../reader/extras/orientation'
import { t, type MessageKey } from '../i18n/t'
import { settingsRegistry } from './builtinSettings'
import type { SettingDefinition } from './registry'

/**
 * Settings › Reading: how Reading mode looks and behaves. Every value is a
 * device setting (kept in this browser), so an iPad and a computer can read
 * differently. The same values are changed from the Read tools while reading.
 */

settingsRegistry.registerCategory({
  id: 'reading',
  labelKey: 'settings.category.reading',
  descriptionKey: 'settings.category.reading.hint',
  order: 40,
})

const KEYWORDS = 'reading read book reader kindle'

const key = (id: string, part: string) =>
  `settings.reading.${id}.${part}` as MessageKey
const opt = (id: string, value: string | number) =>
  (() => t(`reading.opt.${id}.${value}` as MessageKey)) as () => string

/** A device setting with a fixed list of choices. */
function choice<T extends string | number>(
  id: string,
  values: readonly T[],
  defaultValue: T,
  isValid: (v: unknown) => v is T,
  extra: { keywords?: string; select?: boolean } = {},
): SettingDefinition<T> {
  return {
    id: `reading.${id}`,
    labelKey: key(id, 'label'),
    descriptionKey: key(id, 'description'),
    category: 'reading',
    keywords: `${KEYWORDS} ${extra.keywords ?? ''}`.trim(),
    scope: 'device',
    defaultValue,
    isValid,
    control: {
      kind: extra.select ? 'select' : 'segmented',
      options: values.map((value) => ({ value, label: opt(id, value) })),
    },
  }
}

export const readingEntrySetting: SettingDefinition<Entry> = choice(
  'entry',
  ENTRIES,
  'inPlace',
  isEntry,
  { keywords: 'read switch full screen reader open in place' },
)
export const readingThemeSetting: SettingDefinition<ReadingThemeName> = choice(
  'theme',
  READING_THEMES,
  'app',
  isReadingTheme,
  {
    keywords: 'theme day night sepia paper dark contrast colour',
    select: true,
  },
)
export const readingFontSetting: SettingDefinition<ReadingFont> = choice(
  'font',
  READING_FONTS,
  'app',
  isReadingFont,
  { keywords: 'font dyslexia dyslexic typeface serif' },
)
export const readingSizeSetting = choice('size', TEXT_SIZES, 100, isTextSize, {
  keywords: 'text size bigger smaller zoom',
  select: true,
}) as unknown as SettingDefinition<number>
export const readingSpacingSetting = choice(
  'spacing',
  LINE_SPACINGS,
  155,
  isLineSpacing,
  { keywords: 'line spacing height' },
) as unknown as SettingDefinition<number>
export const readingMarginSetting: SettingDefinition<Margin> = choice(
  'margin',
  MARGINS,
  'medium',
  isMargin,
  { keywords: 'margin side space' },
)
export const readingWidthSetting: SettingDefinition<Width> = choice(
  'width',
  WIDTHS,
  'medium',
  isWidth,
  { keywords: 'width column line length' },
)
export const readingFlowSetting: SettingDefinition<Flow> = choice(
  'flow',
  FLOWS,
  'scroll',
  isFlow,
  { keywords: 'scroll paged pages turn swipe' },
)
export const readingRulerSetting: SettingDefinition<Ruler> = choice(
  'ruler',
  RULERS,
  'off',
  isRuler,
  { keywords: 'line focus ruler guide' },
)
export const readingBlanksSetting: SettingDefinition<BlankMode> = choice(
  'blanks',
  BLANK_MODES,
  'soft',
  isBlankMode,
  { keywords: 'blanks hidden recall self test hide' },
)
export const readingAlignSetting: SettingDefinition<Align> = choice(
  'align',
  ALIGNS,
  'left',
  isAlign,
  { keywords: 'align justify left text' },
)
export const readingBarSetting: SettingDefinition<BarMode> = choice(
  'bar',
  BAR_MODES,
  'mini',
  isBarMode,
  { keywords: 'reader bar top close exit controls scroll' },
)
/** A PDF: one long scroll, or one whole page at a time. */
const PDF_FLOWS = ['scrolled', 'paged'] as const
type PdfFlow = (typeof PDF_FLOWS)[number]
const isPdfFlow = (v: unknown): v is PdfFlow =>
  v === 'scrolled' || v === 'paged'
export const readingPdfFlowSetting: SettingDefinition<PdfFlow> = choice(
  'pdfFlow',
  PDF_FLOWS,
  'scrolled',
  isPdfFlow,
  { keywords: 'pdf page by page paged continuous scroll swipe turn' },
)
export const readingBarPinSetting: SettingDefinition<OnOffValue> = choice(
  'barPin',
  ON_OFF,
  'off',
  isOnOffValue,
  { keywords: 'reader bar pin always show keep visible' },
)
export const readingDimSetting = choice('dim', DIM_LEVELS, 0, isDimLevel, {
  keywords: 'dim brightness dark screen',
  select: true,
}) as unknown as SettingDefinition<number>
export const readingGlideSetting = choice('glide', GLIDE_MS, 1200, isGlideMs, {
  keywords: 'jump glide scroll speed animation heading bookmark',
  select: true,
}) as unknown as SettingDefinition<number>
export const readingSpeedSetting = choice('speed', SPEEDS, 100, isSpeed, {
  keywords: 'read aloud speech voice speed',
  select: true,
}) as unknown as SettingDefinition<number>
export const readingAwakeSetting: SettingDefinition<OnOffValue> = choice(
  'awake',
  ON_OFF,
  'on',
  isOnOffValue,
  { keywords: 'screen awake sleep wake lock' },
)

/** Lock the screen direction while reading a book (C5). */
export const readingOrientSetting: SettingDefinition<OrientChoice> = choice(
  'orient',
  ORIENT_CHOICES,
  'off',
  isOrient,
  { keywords: 'orientation rotate rotation lock portrait landscape sideways' },
)

for (const definition of [
  readingEntrySetting,
  readingThemeSetting,
  readingFontSetting,
  readingSizeSetting,
  readingSpacingSetting,
  readingMarginSetting,
  readingWidthSetting,
  readingFlowSetting,
  readingRulerSetting,
  readingBlanksSetting,
  readingAlignSetting,
  readingBarSetting,
  readingPdfFlowSetting,
  readingDimSetting,
  readingGlideSetting,
  readingSpeedSetting,
  readingAwakeSetting,
  readingOrientSetting,
]) {
  settingsRegistry.register(definition as unknown as SettingDefinition)
}
