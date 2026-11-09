import { useContext } from 'react'
import { AppUiContext } from '../app/appUi'
import { t } from '../i18n/t'
import { listKeys } from './keyStore'
import { readAiConfig } from './route'
import { turnOnAi, useAiTick } from './aiOffStore'

/**
 * The calm card every AI place shows while AI is off (or has no key):
 * "AI is off" with Turn on AI (in place) and Add a key (when none). One look
 * everywhere, so the owner always knows why AI is not answering.
 */

const btn =
  'inline-flex min-h-11 items-center rounded-lg border border-line px-3 text-sm hover:bg-hover'

export function AiOffCard({
  onTurnOn = turnOnAi,
  here = false,
}: {
  /** Turns AI on; Settings › AI passes its own switch state. */
  onTurnOn?: () => void
  /** True inside Settings › AI itself (no "Open Settings" button). */
  here?: boolean
}) {
  const { openSettings } = useContext(AppUiContext)
  useAiTick()
  const config = readAiConfig()
  const keys = listKeys().length
  if (config.enabled && config.candidates.length > 0) return null
  const off = !config.enabled
  const goAi = () => openSettings('category:ai')
  return (
    <div
      data-testid="ai-off-card"
      role="status"
      className="flex flex-col gap-2 rounded-lg border border-line bg-hover/40 p-3 text-sm"
    >
      <p className="font-semibold">
        {off ? t('ai.off.title') : t('ai.off.noKeyTitle')}
      </p>
      <p className="text-muted">
        {off
          ? keys > 0
            ? t('ai.off.haveKeys', { count: keys })
            : t('ai.off.body')
          : t('ai.off.noKeyBody')}
      </p>
      <div className="flex flex-wrap gap-2">
        {off && (
          <button
            type="button"
            data-testid="ai-off-turn-on"
            className="inline-flex min-h-11 items-center rounded-lg bg-accent px-4 text-sm font-medium text-white hover:opacity-90"
            onClick={onTurnOn}
          >
            {t('ai.off.turnOn')}
          </button>
        )}
        {keys === 0 && !here && (
          <button
            type="button"
            data-testid="ai-off-add-key"
            className={btn}
            onClick={goAi}
          >
            {t('ai.off.addKey')}
          </button>
        )}
        {keys > 0 && off && !here && (
          <button type="button" className={btn} onClick={goAi}>
            {t('ai.off.openAi')}
          </button>
        )}
      </div>
    </div>
  )
}
