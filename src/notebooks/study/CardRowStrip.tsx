import { useContext, useRef, useState, type ReactNode } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { useLongPress } from '../../app/useLongPress'
import type { LearningNotesDB } from '../../core/db'
import { ContextStrip, type StripItem } from '../../design/parts/ContextStrip'
import { t } from '../../i18n/t'
import { suspendCard, unsuspendCard } from '../../recall/reviewService'
import type { SearchHit } from '../../search/searchQuery'

/**
 * A card row that opens the Context menu strip on a long press or a right
 * click (ST22, `rev.sessionExtras`): Pause / Resume and Open note. Pause acts
 * on every card of the block and offers Undo.
 */
export function CardRowStrip({
  db,
  hit,
  enabled,
  onOpenNote,
  children,
  className,
  onOpen,
  onChanged,
}: {
  db: LearningNotesDB
  hit: SearchHit
  enabled: boolean
  onOpenNote: () => void
  onOpen: () => void
  /** The card's pause state changed: the list reads again. */
  onChanged: () => void
  className: string
  children: ReactNode
}) {
  const { toast } = useContext(AppUiContext)
  const [at, setAt] = useState<HTMLElement | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const press = useLongPress(() => setAt(ref.current))
  const paused = hit.status === 'suspended'
  const items: StripItem[] = [
    {
      id: 'pause',
      icon: paused ? 'play' : 'pause',
      label: paused ? t('st22.resume') : t('st22.pause'),
    },
    { id: 'open', icon: 'openNew', label: t('st22.openNote') },
  ]
  const flip = async (to: boolean) => {
    if (!hit.blockId) return
    const cards = await db.cards.where('blockId').equals(hit.blockId).toArray()
    for (const c of cards) {
      if (to) await suspendCard(db, c.id)
      else await unsuspendCard(db, c.id)
    }
  }
  const act = (id: string) => {
    setAt(null)
    if (id === 'open') return onOpenNote()
    const to = !paused
    runTask(
      flip(to).then(() => {
        onChanged()
        toast(to ? t('st22.paused') : t('st22.resumed'), {
          label: t('annot.undo'),
          onSelect: () => runTask(flip(!to).then(onChanged)),
        })
      }),
    )
  }
  if (!enabled) {
    return (
      <button type="button" className={className} onClick={onOpen}>
        {children}
      </button>
    )
  }
  return (
    <>
      <button
        type="button"
        className={className}
        onClick={onOpen}
        ref={ref}
        {...press}
        onContextMenu={(e) => {
          press.onContextMenu(e)
          e.preventDefault()
          setAt(e.currentTarget)
        }}
      >
        {children}
      </button>
      {at && (
        <ContextStrip
          items={items}
          allLevels
          phoneLabels
          target={() => {
            const r = at.getBoundingClientRect()
            return {
              left: r.left,
              top: r.top,
              width: r.width,
              height: r.height,
            }
          }}
          opener={at}
          testId="card-strip"
          onAction={act}
          onClose={() => setAt(null)}
        />
      )}
    </>
  )
}
