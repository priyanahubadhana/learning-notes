import { t } from '../i18n/t'
import { answerPencilOffer } from './deviceModeSettings'
import { applyDeviceMode } from './builtinSettings'

/**
 * R8-2: the one-time, non-blocking offer of Pencil mode. A small card at the
 * bottom of the screen; the page stays usable. Lazy loaded.
 */
export function PencilOffer({ onDone }: { onDone: () => void }) {
  const answer = (yes: boolean) => {
    answerPencilOffer(yes ? 'yes' : 'no')
    if (yes) applyDeviceMode('pencil')
    onDone()
  }
  return (
    <div
      role="region"
      aria-label={t('pencilOffer.title')}
      data-pencil-offer
      className="fixed inset-x-3 bottom-20 z-50 mx-auto flex max-w-md flex-col gap-2 rounded-2xl border border-ink-soft bg-bg p-3 text-ink shadow-lg"
    >
      <p className="font-medium">{t('pencilOffer.title')}</p>
      <p className="text-sm text-ink-soft">{t('pencilOffer.body')}</p>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          data-pencil-offer-no
          onClick={() => answer(false)}
          className="min-h-11 rounded-xl px-4 text-ink-soft hover:bg-hover"
        >
          {t('pencilOffer.no')}
        </button>
        <button
          type="button"
          data-pencil-offer-yes
          onClick={() => answer(true)}
          className="min-h-11 rounded-xl bg-accent px-4 text-white"
        >
          {t('pencilOffer.yes')}
        </button>
      </div>
    </div>
  )
}
