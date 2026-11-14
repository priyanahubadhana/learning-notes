import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import { StepError } from '../aitools/jobs/filler'
import { t } from '../i18n/t'
import { GrowArea } from './GrowArea'
import { toolName } from './names'
import { problemText } from './validatorText'
import type { PasteFiller, PasteRequest } from './pasteFiller'

const btn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm hover:bg-hover disabled:opacity-40'

/**
 * The copy-prompt / paste-answer path (AF-21). The pasted answer is checked
 * against the tool's inputs here; only an answer that fits is handed to the
 * step. The app makes no AI call.
 */
export function PasteBox({
  filler,
  request,
}: {
  filler: PasteFiller
  request: PasteRequest
}) {
  const [text, setText] = useState('')
  const [problems, setProblems] = useState<string[]>([])
  const [copied, setCopied] = useState(false)

  const copy = () => {
    void navigator.clipboard
      ?.writeText(request.prompt)
      .then(() => setCopied(true))
      .catch(() => setCopied(false))
  }
  const submit = () => {
    const r = filler.submit(text)
    if (r.ok) {
      setText('')
      setProblems([])
    } else setProblems(r.problems)
  }
  const area =
    'min-h-24 w-full rounded-lg border border-line bg-bg p-3 font-mono text-xs outline-none focus:border-accent'

  return (
    <div
      className="flex flex-col gap-2 rounded-lg border border-accent bg-soft p-3"
      data-testid="aifw-paste"
      data-step={request.stepId}
    >
      <h4 className="text-sm font-semibold">
        {t('aifw.paste.title')}: {toolName(request.tool.id)}
      </h4>
      <p className="text-xs text-muted">{t('aifw.paste.hint')}</p>
      {request.repair && (
        <p className="text-xs" data-testid="aifw-paste-repair">
          {t('aifw.paste.repair')}
        </p>
      )}
      <GrowArea
        readOnly
        value={request.prompt}
        aria-label={t('aifw.paste.prompt')}
        data-testid="aifw-prompt"
        className={area}
      />
      <button
        type="button"
        className={`${btn} self-start`}
        data-testid="aifw-copy"
        onClick={copy}
      >
        {copied ? (
          <Check size={18} strokeWidth={1.6} aria-hidden />
        ) : (
          <Copy size={18} strokeWidth={1.6} aria-hidden />
        )}
        {copied ? t('aifw.paste.copied') : t('aifw.paste.copy')}
      </button>
      <GrowArea
        value={text}
        aria-label={t('aifw.paste.label')}
        data-testid="aifw-answer"
        className={area}
        onChange={(e) => {
          setText(e.target.value)
          setProblems([])
        }}
      />
      {problems.length > 0 && (
        <div role="alert" className="text-xs" data-testid="aifw-paste-problems">
          <p className="font-semibold">{t('aifw.paste.bad')}</p>
          <ul className="ml-4 list-disc">
            {problems.slice(0, 5).map((p) => (
              <li key={p}>{problemText(p)}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          data-testid="aifw-submit"
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-accent px-4 text-sm font-semibold text-on-accent"
          onClick={submit}
        >
          {t('aifw.paste.submit')}
        </button>
        <button
          type="button"
          className={btn}
          data-testid="aifw-notnow"
          onClick={() =>
            filler.decline(
              new StepError('validation', t('aifw.paste.declined')),
            )
          }
        >
          {t('aifw.paste.notNow')}
        </button>
      </div>
    </div>
  )
}
