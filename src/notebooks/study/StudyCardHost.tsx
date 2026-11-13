import { useContext, useEffect, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import type { LearningNotesDB } from '../../core/db'
import { onCardMade, onCardOpen } from '../../app/studyCardEvents'
import { t } from '../../i18n/t'
import { CardEditorSheet } from './CardEditorSheet'

/**
 * Lives next to a page's editor (slice 15, flag study.v2): shows the toast
 * with Undo after "Make card" (ST3, ST4) and opens the card editor after
 * "/card" (ST5).
 */
export default function StudyCardHost({ db }: { db: LearningNotesDB }) {
  const { toast } = useContext(AppUiContext)
  const [open, setOpen] = useState<string | null>(null)
  useEffect(
    () =>
      onCardMade(({ undo }) =>
        toast(t('st3.made'), { label: t('annot.undo'), onSelect: undo }),
      ),
    [toast],
  )
  useEffect(() => onCardOpen(setOpen), [])
  if (!open) return null
  return (
    <CardEditorSheet db={db} blockId={open} onClose={() => setOpen(null)} />
  )
}
