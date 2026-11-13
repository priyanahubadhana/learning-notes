import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useRef, useState } from 'react'
import { updateBlock } from '../../core/blockService'
import type { LearningNotesDB } from '../../core/db'
import { Sheet } from '../../design/parts/Sheet'
import { t } from '../../i18n/t'
import {
  isPlainQuestion,
  questionText,
  withQuestion,
} from '../../recall/cardEdit'
import { maskedText } from '../../recall/cardService'
import './CardEditorSheet.css'

type Save = 'idle' | 'saving' | 'saved' | 'failed'

/**
 * The Review card editor (slice 15, flag study.v2): a Sheet (376 px docked
 * right, bottom sheet on a phone). Question as plain text, the answer shown
 * from the note. A question with styling stays untouched (read-only here).
 */
export function CardEditorSheet({
  db,
  blockId,
  onClose,
  onOpenNote,
}: {
  db: LearningNotesDB
  blockId: string
  onClose: () => void
  onOpenNote: () => void
}) {
  const block = useLiveQuery(() => db.blocks.get(blockId), [db, blockId])
  const answers = useLiveQuery(
    async () =>
      (await db.blocks.where('parentId').equals(blockId).toArray())
        .filter((b) => b.deletedAt === null)
        .map((b) => maskedText(b.content.text))
        .filter(Boolean),
    [db, blockId],
  )
  const [draft, setDraft] = useState<string | null>(null)
  const [save, setSave] = useState<Save>('idle')
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const plain = !block || isPlainQuestion(block.content.text)
  const value = draft ?? (block ? questionText(block.content) : '')

  const write = async (text: string) => {
    setSave('saving')
    try {
      const live = await db.blocks.get(blockId)
      if (!live) throw new Error('gone')
      await updateBlock(db, blockId, {
        content: withQuestion(live.content, text),
      })
      setSave('saved')
    } catch {
      setSave('failed')
    }
  }
  const change = (text: string) => {
    setDraft(text)
    setSave('saving')
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => void write(text), 500)
  }

  return (
    <Sheet
      title={t('st2.editor.title')}
      onClose={onClose}
      data-testid="study-card-editor"
      footer={
        <div className="card-editor__foot">
          <span role="status" className="card-editor__status">
            {save === 'saving' && t('st2.editor.saving')}
            {save === 'saved' && t('st2.editor.saved')}
            {save === 'failed' && (
              <>
                {t('st2.editor.notSaved')} ·
                <button type="button" onClick={() => void write(value)}>
                  {t('rv2.tryAgain')}
                </button>
              </>
            )}
          </span>
          <button
            type="button"
            className="card-editor__open"
            onClick={onOpenNote}
          >
            {t('st2.editor.openNote')}
          </button>
        </div>
      }
    >
      <div className="card-editor">
        <label className="card-editor__label" htmlFor="card-editor-question">
          {t('st2.editor.question')}
        </label>
        <textarea
          id="card-editor-question"
          className="card-editor__field"
          rows={4}
          value={value}
          readOnly={!plain}
          onChange={(e) => change(e.target.value)}
        />
        {!plain && (
          <p className="card-editor__hint">{t('st2.editor.styled')}</p>
        )}
        <div className="card-editor__label">{t('st2.editor.answer')}</div>
        <div className="card-editor__answer">
          {answers && answers.length > 0 ? (
            answers.map((a, i) => <p key={i}>{a}</p>)
          ) : (
            <p className="card-editor__hint">{t('st2.editor.answerNone')}</p>
          )}
        </div>
      </div>
    </Sheet>
  )
}
