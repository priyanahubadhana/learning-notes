import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useState, useSyncExternalStore } from 'react'
import { db } from '../../../core/db'
import { frameCss, sameStyle, type BoxStyle } from '../../../core/boxStyle'
import { t } from '../../../i18n/t'
import { activeBox } from '../../../paper/activeBox'
import { boxesOf, MAIN_BOX } from '../../../paper/boxes'
import { loadNewBoxStyle } from '../../../paper/boxPresets'
import { openBoxStyle, openLayout } from '../../../paper/boxStyleBus'
import { Icon } from '../icons'
import { PillButton } from './pillParts'

/**
 * The box part of the Text strip (bug batch 2, item 8): the Box style swatch
 * (the next box's default when no box has the caret; a dot when this box
 * differs from it) and Layout. Loaded with the strip, not in the first download.
 */
export default function TextBoxExtras() {
  const at = useSyncExternalStore(activeBox.subscribe, activeBox.get)
  const page = useLiveQuery(
    () => (at ? db.pages.get(at.pageId) : undefined),
    [at?.pageId],
  )
  const [dflt, setDflt] = useState<BoxStyle | undefined>(undefined)
  useEffect(() => {
    void loadNewBoxStyle(db).then(setDflt)
  }, [at?.boxId])
  const box =
    page && at ? boxesOf(page).find((b) => b.id === at.boxId) : undefined
  const mine = !!box && box.id !== MAIN_BOX
  const style = mine ? box.style : dflt
  const differs = mine && !sameStyle(box.style, dflt)
  return (
    <>
      <PillButton
        id="boxStyle"
        label={t('textTool.boxStyle')}
        disabled={!mine}
        hint={differs ? t('boxStyle.differs') : undefined}
        onClick={() => mine && openBoxStyle(box.id)}
      >
        <span
          aria-hidden
          className="relative block size-6 rounded-md ring-1 ring-line-strong"
          style={frameCss({ ...style, radius: undefined, shadow: undefined })}
        >
          {differs && (
            <span className="absolute -top-1 -right-1 size-2 rounded-full bg-accent" />
          )}
        </span>
      </PillButton>
      <PillButton
        id="layout"
        label={t('layout.title')}
        disabled={!mine}
        onClick={() => mine && openLayout(box.id)}
      >
        <Icon name="grid" />
      </PillButton>
    </>
  )
}
