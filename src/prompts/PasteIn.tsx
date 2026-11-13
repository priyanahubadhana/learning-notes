import { useRef, useState } from 'react'
import { runTask } from '../app/errors'
import { useFlag } from '../app/flags'
import { t, type MessageKey } from '../i18n/t'
import { copyTextFor } from './pasteText'
import type { PromptItem } from './promptModel'
import type { FormatProblem } from './skillFormat'

/** Largest file read (bytes): 400,000 characters of any language fit. */
const MAX_FILE_BYTES = 2_000_000

const btn =
  'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-50'

/**
 * The free way: copy the prompt with its exact answer format, run it in any
 * AI chat, paste the answer back. `onImport` returns a problem name when the
 * answer is refused (nothing is kept then), or null when it was taken.
 */
export function PasteIn({
  item,
  input,
  onImport,
}: {
  item: PromptItem
  input: string
  onImport: (raw: string) => FormatProblem | null
}) {
  const [raw, setRaw] = useState('')
  const [problem, setProblem] = useState<FormatProblem | null>(null)
  const v2 = useFlag('study.v2')
  const fileRef = useRef<HTMLInputElement>(null)
  /** A .lnskill.json (or .json/.txt) file: read as text, then the same checks as a paste. */
  const takeFile = (file: File | undefined) => {
    if (!file) return
    if (file.size > MAX_FILE_BYTES) return setProblem('tooLong')
    runTask(
      file.text().then((text) => {
        const p = onImport(text)
        setProblem(p)
        if (!p) setRaw('')
      }),
    )
  }
  return (
    <details
      className="rounded-lg border border-line p-2 text-sm"
      data-testid="paste-in"
      open={v2 || undefined}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        takeFile(e.dataTransfer.files[0])
      }}
    >
      <summary className="min-h-11 cursor-pointer leading-[44px] font-medium">
        {t('prompts.paste.title')}
      </summary>
      <div className="flex flex-col gap-2 pb-1">
        <p className="text-muted">{t('prompts.paste.help')}</p>
        <button
          type="button"
          data-testid="paste-copy"
          className={`${btn} self-start`}
          onClick={() =>
            runTask(navigator.clipboard.writeText(copyTextFor(item, input)))
          }
        >
          {v2 ? t('st13.copy') : t('prompts.paste.copy')}
        </button>
        <label className="flex flex-col gap-1">
          <span className="text-muted">{t('prompts.paste.answerLabel')}</span>
          <textarea
            data-testid="paste-answer"
            className="min-h-28 rounded-lg border border-line bg-bg p-2"
            value={raw}
            onChange={(e) => {
              setRaw(e.target.value)
              setProblem(null)
            }}
          />
        </label>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,text/plain"
          hidden
          data-testid="paste-file"
          onChange={(e) => {
            takeFile(e.target.files?.[0])
            e.target.value = ''
          }}
        />
        <button
          type="button"
          data-testid="paste-file-pick"
          className={`${btn} self-start`}
          onClick={() => fileRef.current?.click()}
        >
          {t('prompts.paste.file')}
        </button>
        <p className="text-xs text-muted">{t('prompts.paste.fileHint')}</p>
        {problem && (
          <p role="alert" className="text-danger" data-testid="paste-problem">
            {t(`prompts.paste.${problem}` as MessageKey)}
          </p>
        )}
        <button
          type="button"
          data-testid="paste-import"
          className={`${btn} self-start`}
          disabled={!raw.trim()}
          onClick={() => {
            const p = onImport(raw)
            setProblem(p)
            if (!p) setRaw('')
          }}
        >
          {t('prompts.paste.import')}
        </button>
      </div>
    </details>
  )
}
