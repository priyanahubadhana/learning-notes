import { useState, type FormEvent, type ReactNode } from 'react'
import { t } from '../i18n/t'
import { ConfirmDialog } from './ui'

/**
 * One rule for dialogs where you type or choose something: a click outside
 * closes the dialog only if nothing was changed; otherwise it asks "Discard
 * your changes?". Spread `dirtyProps` on the <dialog>, call `requestClose`
 * for a click on its backdrop, and render `confirm` inside it.
 */
export function useDiscardGuard(onClose: () => void): {
  dirtyProps: { onInput: (e: FormEvent) => void }
  requestClose: () => void
  confirm: ReactNode
} {
  const [touched, setTouched] = useState(false)
  const [asking, setAsking] = useState(false)
  return {
    // Every box, list, tick box and file picker fires an input event.
    dirtyProps: { onInput: () => setTouched(true) },
    requestClose: () => (touched ? setAsking(true) : onClose()),
    confirm: asking && (
      <ConfirmDialog
        message={t('dialog.discard')}
        confirmLabel={t('dialog.discardButton')}
        cancelLabel={t('dialog.keepEditing')}
        onCancel={() => setAsking(false)}
        onConfirm={() => {
          setAsking(false)
          onClose()
        }}
      />
    ),
  }
}
