import { BlockNoteContext } from '@blocknote/react'
import { useEffect, useState } from 'react'
import FormatCard from '../../app/tools/v8/cards/text/FormatCard'
import { usePhone } from '../../design/parts/useAnchoredCard'
import { Card } from '../../design/parts/Card'
import { t } from '../../i18n/t'
import { activeBox } from '../activeBox'
import { editorOf } from './oneBarOps'
import '../../app/tools/v8/cards/toolCards.css'
import '../../app/tools/v8/cards/text/textCards.css'

/** The selected box's frame: the card hangs around it and never covers it. */
const boxRect = (boxId: string) => () => {
  const r = document
    .querySelector(`[data-paper-box="${CSS.escape(boxId)}"]`)
    ?.getBoundingClientRect()
  if (!r) return null
  const pad = 24
  return {
    left: r.left - pad,
    top: r.top - pad,
    width: r.width + 2 * pad,
    height: r.height + 2 * pad,
  }
}

/**
 * ⋯ › Text options… (box bar part A): the Text tool's own Format card, with
 * Toggle heading and Toggle list first, opened beside the selected box. It is
 * the same card, not a copy; it works on this box's editor.
 */
export default function TextOptionsHost({
  pageId,
  boxId,
  onClose,
}: {
  pageId: string
  boxId: string
  onClose: () => void
}) {
  const phone = usePhone()
  const ed = editorOf(pageId, boxId)
  // Where the box was when the card opened (the card is placed around it).
  const [anchor] = useState(() => boxRect(boxId)() ?? undefined)
  // The tool registry acts on the box the page's toolbar follows.
  useEffect(() => {
    activeBox.set(pageId, boxId)
  }, [pageId, boxId])
  if (!ed) return null
  return (
    <Card
      anchor={anchor ?? null}
      size="panel"
      title={t('onebar.text.title')}
      testId="onebar-text-card"
      around={phone ? undefined : boxRect(boxId)}
      clearTop={() => 12}
      fitInside
      onClose={onClose}
    >
      <BlockNoteContext.Provider value={{ editor: ed as never }}>
        <FormatCard startTab="style" />
      </BlockNoteContext.Provider>
    </Card>
  )
}
