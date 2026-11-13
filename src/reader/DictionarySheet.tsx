import { useEffect, useState } from 'react'
import { t } from '../i18n/t'

interface Entry {
  word: string
  phonetic?: string
  phonetics?: { text?: string; audio?: string }[]
  meanings?: {
    partOfSpeech?: string
    definitions?: { definition?: string; example?: string }[]
  }[]
}

type Result =
  | { kind: 'loading' }
  | { kind: 'found'; entry: Entry }
  | { kind: 'none' }
  | { kind: 'offline' }

/** The word said aloud with the device's own voice (works offline). */
function speakWord(word: string) {
  try {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(word)
    u.lang = document.documentElement.lang || 'en'
    window.speechSynthesis.speak(u)
  } catch {
    // No speech on this device: nothing to do.
  }
}

/**
 * The Dictionary sheet (item 38): meanings of the held word from the free
 * dictionaryapi.dev service (English; only the word leaves the device, on
 * this tap). Offline or unreachable: a short message, and Pronounce still
 * works with the device voice.
 */
export default function DictionarySheet({
  word,
  onClose,
  pronounce: canPronounce = true,
}: {
  word: string
  onClose: () => void
  /** Reader v2: Pronounce comes with reader.selExtras (RD-P13). */
  pronounce?: boolean
}) {
  const [result, setResult] = useState<Result>({ kind: 'loading' })
  useEffect(() => {
    const ctl = new AbortController()
    const timer = window.setTimeout(() => ctl.abort(), 7000)
    void (async () => {
      try {
        const res = await fetch(
          `https://api.dictionaryapi.dev/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
          { signal: ctl.signal },
        )
        if (res.status === 404) return setResult({ kind: 'none' })
        if (!res.ok) return setResult({ kind: 'offline' })
        const list = (await res.json()) as Entry[]
        setResult(
          Array.isArray(list) && list[0]
            ? { kind: 'found', entry: list[0] }
            : { kind: 'none' },
        )
      } catch {
        setResult({ kind: 'offline' })
      } finally {
        window.clearTimeout(timer)
      }
    })()
    return () => {
      window.clearTimeout(timer)
      ctl.abort()
    }
  }, [word])
  const entry = result.kind === 'found' ? result.entry : null
  const audio = entry?.phonetics?.find((p) => p.audio)?.audio
  const pronounce = () => {
    if (audio?.startsWith('https://')) {
      const a = new Audio(audio)
      a.onerror = () => speakWord(word)
      void a.play().catch(() => speakWord(word))
    } else speakWord(word)
  }
  return (
    <div
      data-chrome
      role="dialog"
      aria-label={t('dict.title')}
      data-testid="dictionary-sheet"
      className="fixed inset-x-0 bottom-0 z-[70] mx-auto max-h-[60vh] max-w-xl overflow-y-auto rounded-t-2xl border border-line bg-bg p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] shadow-2xl"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-semibold break-words">{word}</h2>
          {entry && (entry.phonetic || entry.phonetics?.[0]?.text) && (
            <p className="text-sm text-muted">
              {entry.phonetic ?? entry.phonetics?.[0]?.text}
            </p>
          )}
        </div>
        {canPronounce && (
          <button
            type="button"
            data-testid="dict-pronounce"
            onClick={pronounce}
            className="min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover"
          >
            {t('dict.pronounce')}
          </button>
        )}
        <button
          type="button"
          aria-label={t('dict.close')}
          data-testid="dict-close"
          onClick={onClose}
          className="min-h-11 min-w-11 rounded-lg hover:bg-hover"
        >
          ✕
        </button>
      </div>
      {result.kind === 'loading' && (
        <p className="mt-3 text-sm text-muted">{t('dict.loading')}</p>
      )}
      {result.kind === 'offline' && (
        <p className="mt-3 text-sm" data-testid="dict-offline">
          {t('dict.offline')}
        </p>
      )}
      {result.kind === 'none' && (
        <p className="mt-3 text-sm" data-testid="dict-none">
          {t('dict.none')}
        </p>
      )}
      {entry?.meanings?.slice(0, 4).map((m, i) => (
        <div key={i} className="mt-3">
          <p className="text-xs font-semibold text-accent uppercase">
            {m.partOfSpeech}
          </p>
          <ol className="ms-5 list-decimal text-sm">
            {m.definitions?.slice(0, 3).map((d, j) => (
              <li key={j} className="mt-1">
                {d.definition}
                {d.example && (
                  <span className="block text-muted italic">{d.example}</span>
                )}
              </li>
            ))}
          </ol>
        </div>
      ))}
      <p className="mt-3 text-xs text-muted">{t('dict.source')}</p>
    </div>
  )
}
