import { useContext, useRef, useState } from 'react'
import { AppUiContext } from '../../app/appUi'
import { runTask } from '../../app/errors'
import { Icon } from '../../app/tools/icons'
import { db } from '../../core/db'
import {
  FileError,
  downloadAttachment,
  looksReadable,
  saveAttachment,
} from '../../core/attachments'
import { fileRef, parseFileRef, sizeText } from '../../core/fileRef'
import { t } from '../../i18n/t'
import { EditorContext } from '../editorContext'

/** Props of the `file` block. */
export interface FileProps {
  url: string
  name: string
  size: number
  caption: string
}

/** What the view needs from the editor. */
export interface FileHostApi {
  isEditable: boolean
  updateBlock: (block: unknown, update: unknown) => unknown
}

const btn =
  'inline-flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-sm text-ink hover:bg-hover disabled:opacity-40'

export function FileView({
  block,
  editor,
}: {
  block: { props: FileProps }
  editor: FileHostApi
}) {
  const { toast } = useContext(AppUiContext)
  const ctx = useContext(EditorContext)
  const p = block.props
  const editable = editor.isEditable
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const id = parseFileRef(p.url)

  const choose = (file: File | undefined) => {
    if (!file || !ctx) return
    setBusy(true)
    runTask(
      (async () => {
        try {
          const saved = await saveAttachment(db, ctx.pageId, file)
          editor.updateBlock(block, {
            props: {
              url: fileRef(saved.id),
              name: saved.name,
              size: saved.size,
            },
          })
        } catch (e) {
          if (e instanceof FileError) toast(e.message)
          else throw e
        } finally {
          setBusy(false)
        }
      })(),
    )
  }

  if (!id) {
    return (
      <div
        data-chrome
        data-file
        contentEditable={false}
        className="w-full rounded-lg border border-line bg-soft p-3"
      >
        {editable ? (
          <>
            <button
              type="button"
              className={btn}
              disabled={busy}
              onClick={() => input.current?.click()}
            >
              <Icon name="filePlus" size={18} />
              {t('file.choose')}
            </button>
            <input
              ref={input}
              type="file"
              hidden
              data-testid="file-input"
              aria-label={t('file.choose')}
              onChange={(e) => {
                choose(e.target.files?.[0])
                e.target.value = ''
              }}
            />
          </>
        ) : (
          <p className="text-sm text-muted">{t('file.empty.view')}</p>
        )}
      </div>
    )
  }

  const save = () =>
    runTask(
      downloadAttachment(db, id).then((ok) => {
        if (!ok) toast(t('file.missing'))
      }),
    )

  return (
    <div
      data-chrome
      data-file
      contentEditable={false}
      className="flex w-full flex-wrap items-center gap-2 rounded-lg border border-line bg-soft p-3"
    >
      <Icon name="fileText" size={22} className="text-muted" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium" data-file-name>
          {p.name || t('file.untitled')}
        </p>
        <p className="text-xs text-muted">{sizeText(p.size)}</p>
      </div>
      {looksReadable(p.name) && ctx?.openAttachment && (
        <button
          type="button"
          className={btn}
          onClick={() => ctx.openAttachment?.(id)}
        >
          <Icon name="bookOpen" size={18} />
          {t('file.openReader')}
        </button>
      )}
      <button type="button" className={btn} onClick={save}>
        {t('file.save')}
      </button>
    </div>
  )
}
