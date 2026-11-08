import { useEffect, useRef, useState, type ClipboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { Icon, type IconName } from '../app/tools/icons'
import { t } from '../i18n/t'
import {
  closePictureChooser,
  firstImageFile,
  readClipboardPicture,
  type PictureAsk,
} from './pictureChooserStore'

const row =
  'flex min-h-14 w-full items-center gap-3 rounded-xl px-3 text-left hover:bg-hover'

/**
 * The small chooser: Photos, Files, Camera and Paste. Each of the three file
 * choices is a hidden file input clicked straight from the tap (iPad only
 * allows that), so on an iPad "Photos" offers Photo Library, Take Photo and
 * Choose File. Nothing is added until a picture is chosen.
 */
export default function PictureChooser({ ask }: { ask: PictureAsk }) {
  const dialog = useRef<HTMLDivElement>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})
  const [hint, setHint] = useState<string | null>(null)

  useEffect(() => {
    const back = document.activeElement
    dialog.current?.querySelector<HTMLElement>('button')?.focus()
    return () => {
      if (back instanceof HTMLElement && back.isConnected) back.focus()
    }
  }, [])

  const pick = (file: File | null | undefined) => {
    if (!file) return
    closePictureChooser()
    ask.onPick(file)
  }
  const fromInput = (el: HTMLInputElement) => {
    pick(el.files?.[0])
    el.value = ''
  }
  const paste = async () => {
    const file = await readClipboardPicture()
    if (file) pick(file)
    else setHint(t('pic.add.pasteHint'))
  }
  const onPaste = (e: ClipboardEvent) => {
    const file = firstImageFile(e.clipboardData.files)
    if (!file) return
    e.preventDefault()
    pick(file)
  }

  const run = (id: string) =>
    id === 'paste' ? void paste() : inputs.current[id]?.click()
  const items: [string, IconName, string, string][] = [
    ['photos', 'image', t('pic.add.photos'), t('pic.add.photos.sub')],
    ['files', 'filePlus', t('pic.add.files'), t('pic.add.files.sub')],
    ['camera', 'camera', t('pic.add.camera'), t('pic.add.camera.sub')],
    ['paste', 'paste', t('pic.add.paste'), t('pic.add.paste.sub')],
  ]

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 p-4"
      onClick={(e) => e.target === e.currentTarget && closePictureChooser()}
    >
      <div
        ref={dialog}
        role="dialog"
        aria-modal="true"
        aria-label={t('pic.add.title')}
        data-testid="picture-chooser"
        onPaste={onPaste}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.preventDefault()
            closePictureChooser()
          }
        }}
        className="grid w-full max-w-sm gap-1 rounded-2xl border border-line bg-bg p-3 text-ink shadow-[0_24px_64px_rgba(0,0,0,0.3)]"
      >
        <h2 className="px-3 pb-1 pt-2 text-base font-semibold">
          {t('pic.add.title')}
        </h2>
        {items.map(([id, icon, label, sub]) => (
          <button
            key={id}
            type="button"
            data-testid={`picture-${id}`}
            className={row}
            onClick={() => run(id)}
          >
            <Icon name={icon} size={22} />
            <span className="grid">
              <span className="text-sm font-medium">{label}</span>
              <span className="text-xs text-muted">{sub}</span>
            </span>
          </button>
        ))}
        {hint && (
          <input
            readOnly
            autoFocus
            aria-label={hint}
            placeholder={hint}
            data-testid="picture-paste-hint"
            className="mx-3 mb-1 min-h-11 rounded-lg border border-line bg-soft px-3 text-sm"
          />
        )}
        <button
          type="button"
          className={`${row} justify-center text-sm text-muted`}
          onClick={closePictureChooser}
        >
          {t('pic.add.cancel')}
        </button>
        {(
          [
            ['photos', {}],
            ['files', {}],
            ['camera', { capture: 'environment' }],
          ] as const
        ).map(([id, extra]) => (
          <input
            key={id}
            ref={(el) => {
              inputs.current[id] = el
            }}
            type="file"
            hidden
            data-testid={`picture-input-${id}`}
            accept={
              id === 'files'
                ? '.png,.jpg,.jpeg,.webp,.gif,.heic,image/*'
                : 'image/*'
            }
            {...extra}
            onChange={(e) => fromInput(e.currentTarget)}
          />
        ))}
      </div>
    </div>,
    document.body,
  )
}
