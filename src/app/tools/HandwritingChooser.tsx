import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { t, type MessageKey } from '../../i18n/t'
import { pencilWritesSetting } from '../../settings/builtinSettings'
import {
  readDeviceSetting,
  writeDeviceSetting,
} from '../../settings/settingsService'
import { handwritingChooser } from './handwriting'
import { selectTool } from './main/selectTool'
import { runTool } from './toolRegistry'
import { currentRunner } from './toolRuntime'

/**
 * Three ways from handwriting to text, each in one line (polish 2, item 10).
 * The tools stay where they are; this only says which one to use and opens it.
 * A native modal dialog, like the Name it sheet: Esc closes, focus stays in.
 */

const CHOICES = ['pad', 'lasso', 'scribble'] as const
type Choice = (typeof CHOICES)[number]

function run(choice: Choice): void {
  const { app } = currentRunner()
  if (choice === 'pad') {
    runTool('writePad')
  } else if (choice === 'lasso') {
    selectTool('lasso')
    app?.toast(t('handwriting.lasso.toast'))
  } else {
    selectTool('text')
    if (readDeviceSetting(pencilWritesSetting) === 'on') {
      app?.toast(t('handwriting.scribble.toast'))
    } else {
      app?.toast(t('handwriting.scribble.off'), {
        label: t('handwriting.scribble.turnOn'),
        onSelect: () => writeDeviceSetting(pencilWritesSetting, 'on'),
      })
    }
  }
}

export function HandwritingChooser() {
  const ref = useRef<HTMLDialogElement>(null)
  const close = () => handwritingChooser.set(false)

  useEffect(() => {
    ref.current?.showModal()
  }, [])

  return createPortal(
    <dialog
      ref={ref}
      data-testid="handwriting-chooser"
      data-palm-guard
      aria-label={t('handwriting.title')}
      onCancel={(e) => {
        e.preventDefault()
        close()
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-2xl border border-line bg-surface-3 p-5 text-ink shadow-[var(--elev-3)] backdrop:bg-[var(--scrim)]"
    >
      <h2 className="text-lg font-semibold">{t('handwriting.title')}</h2>
      <p className="mt-1 text-sm text-ink-soft">{t('handwriting.intro')}</p>
      <div className="mt-3 grid gap-2">
        {CHOICES.map((choice) => (
          <button
            key={choice}
            type="button"
            data-choice={choice}
            onClick={() => {
              close()
              run(choice)
            }}
            className="min-h-14 rounded-xl border border-line px-4 py-2 text-left hover:bg-hover"
          >
            <span className="block text-sm font-semibold">
              {t(`handwriting.${choice}.name` as MessageKey)}
            </span>
            <span className="block text-sm text-ink-soft">
              {t(`handwriting.${choice}.line` as MessageKey)}
            </span>
          </button>
        ))}
      </div>
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={close}
          className="min-h-11 rounded-xl border border-line px-4 text-sm hover:bg-hover"
        >
          {t('popup.close')}
        </button>
      </div>
    </dialog>,
    document.body,
  )
}
