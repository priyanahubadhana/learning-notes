import { useFlag } from '../../app/flags'
import { isUnlocked, useLevelVersion, useUnlocked } from '../../settings/level'
import type { ProFeatureId } from '../../settings/proFeatures.gen'

/**
 * The 32 Reader Professional switches (docs/features/reader-v2.md, RD-P01 to
 * RD-P32; Settings › Professional features › Reader lists them from the
 * generated list). `spec` is the spec line, `rIds` the inventory ids it
 * covers. With the flag off every switch reads as on, so today's reader is
 * untouched. Beginner sees a part only when its switch is on; Professional
 * reads all as on. Switching off hides the part and keeps the data.
 */
export interface ReaderSwitch {
  id: ProFeatureId
  spec: string
  rIds: readonly string[]
}

const s = (
  id: ProFeatureId,
  spec: string,
  ...rIds: string[]
): ReaderSwitch => ({ id, spec, rIds })

export const READER_SWITCHES: readonly ReaderSwitch[] = [
  s('reader.readLock', 'RD-P01', 'R18', 'R82'),
  s('reader.historyBtns', 'RD-P02', 'R05'),
  s('reader.fullScreen', 'RD-P03', 'R19'),
  s('reader.flipBack', 'RD-P04', 'R11'),
  s('reader.askBook', 'RD-P05', 'R16'),
  s('reader.penBarStyle', 'RD-P06', 'R21'),
  s('reader.syncFurthest', 'RD-P07', 'R23'),
  s('reader.progressStyle', 'RD-P08', 'R25', 'R26'),
  s('reader.dim', 'RD-P09', 'R27'),
  s('reader.layout', 'RD-P10', 'R31', 'R34', 'R35'),
  s('reader.presets', 'RD-P11', 'R36', 'R37'),
  s('reader.selMenu', 'RD-P12', 'R38'),
  s(
    'reader.selExtras',
    'RD-P13',
    'R43',
    'R44',
    'R45',
    'R46',
    'R47',
    'R48',
    'R49',
  ),
  s('reader.noteFilters', 'RD-P14', 'R50'),
  s('reader.exportMd', 'RD-P15', 'R53'),
  s('reader.bulkCards', 'RD-P16', 'R54'),
  s('reader.dailyHighlight', 'RD-P17', 'R55'),
  s('reader.inkTools', 'RD-P18', 'R58', 'R59', 'R66'),
  s('reader.inkLook', 'RD-P19', 'R61', 'R63', 'R64'),
  s('reader.pagesTab', 'RD-P20', 'R68'),
  s('reader.resourcesTab', 'RD-P21', 'R71'),
  s('reader.aloudSkip', 'RD-P22', 'R73'),
  s('reader.aloudVoice', 'RD-P23', 'R75', 'R76'),
  s('reader.sleepTimer', 'RD-P24', 'R78'),
  s('reader.gestures', 'RD-P25', 'R79', 'R80', 'R81'),
  s('reader.barScroll', 'RD-P26', 'R83'),
  s('reader.lockDirection', 'RD-P27', 'R84'),
  s('reader.liquid', 'RD-P28', 'R85'),
  s('reader.lineFocus', 'RD-P29', 'R86', 'R87', 'R88'),
  s('reader.hideBlanks', 'RD-P30', 'R89'),
  s('reader.keepAwake', 'RD-P31', 'R90'),
  s('reader.tapCounts', 'RD-P32', 'R92'),
]

/** Flag off: always on (today's reader). Flag on: Professional, or unlocked one by one. */
export const readerSwitchOn = (v2: boolean, id: ProFeatureId): boolean =>
  !v2 || isUnlocked(id)

/** A reader that re-renders when any switch or the level changes. */
export function useReaderSwitches(v2: boolean): (id: ProFeatureId) => boolean {
  useLevelVersion()
  return (id) => readerSwitchOn(v2, id)
}

/** One switch, for a part deep in the reader: on when the flag is off. */
export function useReaderSwitch(id: ProFeatureId): boolean {
  const v2 = useFlag('reader.v2')
  const unlocked = useUnlocked(id)
  return !v2 || unlocked
}
