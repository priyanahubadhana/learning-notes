import { useContext, type CSSProperties } from 'react'
import { useDeviceSetting } from '../../settings/useSetting'
import {
  readingBlanksSetting,
  readingFlowSetting,
  readingFontSetting,
  readingMarginSetting,
  readingRulerSetting,
  readingSizeSetting,
  readingSpacingSetting,
  readingThemeSetting,
  readingWidthSetting,
  readingAwakeSetting,
} from '../../settings/readingSettings'
import { ThemeContext } from '../themeContext'
import { memStore } from '../tools/store'
import {
  colorsFor,
  fontStack,
  MARGIN_PX,
  WIDTH_PX,
  type BlankMode,
  type Flow,
  type Margin,
  type ReadingColors,
  type ReadingFont,
  type ReadingThemeName,
  type Ruler,
  type Width,
} from './readingPrefs'

/** Which panel of Reading mode is open (the tools open these). */
export type ReadingPanelName = 'settings' | 'aloud' | 'outline' | null
export const readingPanel = memStore<ReadingPanelName>(null)
/** The full-screen reader's controls are showing (a tap in the middle toggles). */
export const readerControls = memStore(true)

export interface ReadingSettings {
  theme: ReadingThemeName
  font: ReadingFont
  size: number
  spacing: number
  margin: Margin
  width: Width
  flow: Flow
  ruler: Ruler
  blanks: BlankMode
  awake: boolean
  colors: ReadingColors
  set: {
    theme: (v: ReadingThemeName) => void
    font: (v: ReadingFont) => void
    size: (v: number) => void
    spacing: (v: number) => void
    margin: (v: Margin) => void
    width: (v: Width) => void
    flow: (v: Flow) => void
    ruler: (v: Ruler) => void
    blanks: (v: BlankMode) => void
  }
}

/** All Reading settings of this device, with their setters. */
export function useReadingSettings(): ReadingSettings {
  const appTheme = useContext(ThemeContext)
  const [theme, setTheme] = useDeviceSetting(readingThemeSetting)
  const [font, setFont] = useDeviceSetting(readingFontSetting)
  const [size, setSize] = useDeviceSetting(readingSizeSetting)
  const [spacing, setSpacing] = useDeviceSetting(readingSpacingSetting)
  const [margin, setMargin] = useDeviceSetting(readingMarginSetting)
  const [width, setWidth] = useDeviceSetting(readingWidthSetting)
  const [flow, setFlow] = useDeviceSetting(readingFlowSetting)
  const [ruler, setRuler] = useDeviceSetting(readingRulerSetting)
  const [blanks, setBlanks] = useDeviceSetting(readingBlanksSetting)
  const [awake] = useDeviceSetting(readingAwakeSetting)
  return {
    theme,
    font,
    size,
    spacing,
    margin,
    width,
    flow,
    ruler,
    blanks,
    awake: awake === 'on',
    colors: colorsFor(theme, appTheme),
    set: {
      theme: setTheme,
      font: setFont,
      size: setSize,
      spacing: setSpacing,
      margin: setMargin,
      width: setWidth,
      flow: setFlow,
      ruler: setRuler,
      blanks: setBlanks,
    },
  }
}

/** CSS variables of the reading surface (read by the rules in index.css). */
export function surfaceStyle(s: ReadingSettings): CSSProperties {
  const family = s.font === 'app' ? undefined : fontStack(s.font)
  return {
    '--rd-bg': s.colors.bg,
    '--rd-fg': s.colors.fg,
    '--rd-soft': s.colors.soft,
    '--rd-mark': s.colors.mark,
    '--rd-mark-text': s.colors.markText,
    '--rd-size': `${s.size / 100}`,
    '--rd-line': `${s.spacing / 100}`,
    '--rd-margin': `${MARGIN_PX[s.margin]}px`,
    '--rd-width': `${WIDTH_PX[s.width]}px`,
    ...(family ? { '--rd-font': family } : {}),
  } as CSSProperties
}
