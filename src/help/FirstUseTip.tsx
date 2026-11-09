import { useEffect } from 'react'
import { t, type MessageKey } from '../i18n/t'
import { activeTool, openCard } from '../app/tools/main/mainTools'
import { dismissFirstUse, firstUseTip, triggerFirstUse } from './firstUse'
import { Icon } from '../app/tools/icons'

/** The small line for a first-use tip (it also watches the tools that raise one). */
export function FirstUseTip() {
  const id = firstUseTip.useValue()
  const tool = activeTool.useValue()
  const card = openCard.useValue()

  useEffect(() => {
    if (tool === 'lasso') triggerFirstUse('lasso')
  }, [tool])
  useEffect(() => {
    if (card?.page === 'layers') triggerFirstUse('layers')
  }, [card])
  // A tip goes by itself after a while.
  useEffect(() => {
    if (!id) return
    const timer = window.setTimeout(dismissFirstUse, 12_000)
    return () => window.clearTimeout(timer)
  }, [id])

  if (!id) return null
  return (
    <div
      role="status"
      data-first-use={id}
      className="flex max-w-sm items-center gap-2 rounded-[10px] border border-line bg-bg py-1.5 pr-1.5 pl-3 text-[13px] text-ink shadow-[0_8px_24px_rgba(0,0,0,0.14)]"
    >
      <span>{t(`firstUse.${id}` as MessageKey)}</span>
      <button
        type="button"
        onClick={dismissFirstUse}
        aria-label={t('popup.close')}
        className="grid min-h-11 min-w-11 shrink-0 place-items-center rounded-md text-ink-soft hover:bg-hover"
      >
        <Icon name="close" size={18} />
      </button>
    </div>
  )
}
