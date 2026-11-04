import { useContext, useEffect } from 'react'
import { t } from '../../i18n/t'
import { useDeviceSetting } from '../../settings/useSetting'
import { readingEntrySetting } from '../../settings/readingSettings'
import { AppUiContext } from '../appUi'
import { activeSet, changeSet } from '../tools/toolbarState'
import { readingView, startReading, stopReading } from './readingState'

/**
 * Keeps the Write · Draw · Read switch and Reading mode in step:
 * - choosing Read turns Reading mode on, in the way chosen in Settings ›
 *   Reading (in place, or the full-screen reader);
 * - choosing Write or Draw (or Exit reading) turns it off, unless "Lock to
 *   reading" is on, which keeps the Read set and says so;
 * - Reading mode started any other way (a tool, a page set to always open in
 *   Reading) moves the switch to Read.
 */
export function useReadingSync(): void {
  const { toast } = useContext(AppUiContext)
  const [entry] = useDeviceSetting(readingEntrySetting)
  const set = activeSet.useValue()
  const view = readingView.useValue()

  // The switch moved.
  useEffect(() => {
    if (set === 'read' && readingView.get() === 'off') {
      startReading(entry === 'reader' ? 'reader' : 'inPlace')
    } else if (set !== 'read' && readingView.get() !== 'off') {
      if (!stopReading()) {
        changeSet('read', 'user')
        toast(t('reading.lockedExit'))
      }
    }
    // Only when the switch moves.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [set])

  // Reading mode turned on or off by itself.
  useEffect(() => {
    if (view !== 'off' && activeSet.get() !== 'read') changeSet('read', 'user')
    else if (view === 'off' && activeSet.get() === 'read') {
      changeSet('write', 'user')
    }
  }, [view])
}
