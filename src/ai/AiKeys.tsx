import { useState } from 'react'
import { t } from '../i18n/t'
import {
  addKey,
  deleteKey,
  keyUsable,
  maskKey,
  renameKey,
  replaceKey,
  setKeyCap,
  type AiKey,
} from './keyStore'
import { PROVIDER_IDS, type ProviderId } from './provider'
import { testKey } from './route'
import { isCap, readKeyUsage } from './usage'

const field =
  'min-h-11 w-full rounded-lg border border-line bg-bg px-3 text-sm outline-none focus:border-accent'
const btn = 'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover'

type Mode = 'rename' | 'edit' | 'delete' | null

/**
 * Settings › AI › Your keys: several keys, each with a name you chose.
 * Add, Rename, Replace key, Test (a tiny call) and Delete (with a confirm).
 * Keys stay on this device (localStorage), never in a backup or sync.
 */
export function AiKeys({
  keys,
  defaultCap,
  onChange,
}: {
  keys: AiKey[]
  defaultCap: number
  onChange: () => void
}) {
  const [provider, setProvider] = useState<ProviderId>('anthropic')
  const [name, setName] = useState('')
  const [secret, setSecret] = useState('')
  const [bad, setBad] = useState(false)

  return (
    <div data-testid="ai-keys" className="flex flex-col gap-3">
      <h3 className="text-sm font-medium">{t('ai.keys.title')}</h3>
      {keys.length === 0 && (
        <p className="text-sm text-muted">{t('ai.keys.none')}</p>
      )}
      <ul className="flex flex-col gap-2">
        {keys.map((k) => (
          <KeyRow
            key={k.id}
            k={k}
            defaultCap={defaultCap}
            onChange={onChange}
          />
        ))}
      </ul>
      <form
        className="flex flex-col gap-2 rounded-lg border border-line p-3"
        onSubmit={(e) => {
          e.preventDefault()
          if (addKey(provider, name, secret)) {
            setName('')
            setSecret('')
            setBad(false)
            onChange()
          } else setBad(true)
        }}
      >
        <label className="flex flex-col gap-1 text-sm">
          {t('ai.provider')}
          <select
            value={provider}
            data-testid="ai-provider"
            onChange={(e) => setProvider(e.target.value as ProviderId)}
            className={field}
          >
            {PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>
                {t(`ai.provider.${id}`)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('ai.keys.name')}
          <input
            value={name}
            maxLength={40}
            placeholder={t('ai.keys.namePlaceholder')}
            data-testid="ai-key-name"
            onChange={(e) => setName(e.target.value)}
            className={`${field} max-w-sm`}
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          {t('ai.key')}
          <input
            type="password"
            autoComplete="off"
            spellCheck={false}
            value={secret}
            data-testid="ai-key"
            onChange={(e) => {
              setSecret(e.target.value)
              setBad(false)
            }}
            className={`${field} max-w-sm`}
          />
        </label>
        <div>
          <button
            type="submit"
            data-testid="ai-key-save"
            className="min-h-11 rounded-lg bg-accent px-4 font-medium text-white hover:opacity-90"
          >
            {t('ai.keys.add')}
          </button>
        </div>
        {bad && (
          <p role="alert" className="text-sm text-red-600">
            {t('ai.keyBad')}
          </p>
        )}
      </form>
      <p className="text-xs text-muted">{t('ai.keyWarning')}</p>
    </div>
  )
}

function KeyRow({
  k,
  defaultCap,
  onChange,
}: {
  k: AiKey
  defaultCap: number
  onChange: () => void
}) {
  const [mode, setMode] = useState<Mode>(null)
  const [draft, setDraft] = useState('')
  const [bad, setBad] = useState(false)
  const [test, setTest] = useState<string | null>(null)
  const used = readKeyUsage(k.id).costUsd

  const done = () => {
    setMode(null)
    setDraft('')
    setBad(false)
    onChange()
  }
  const open = (m: Mode) => {
    setMode(m)
    setDraft(m === 'rename' ? k.name : '')
    setBad(false)
  }

  return (
    <li
      data-testid="ai-key-row"
      className="flex flex-col gap-2 rounded-lg border border-line p-3 text-sm"
    >
      <div className="flex flex-wrap items-center gap-2">
        <strong data-testid="ai-key-title">{k.name}</strong>
        <span className="text-muted">{t(`ai.provider.${k.provider}`)}</span>
        <span data-testid="ai-key-masked" className="text-muted">
          {t('ai.keyMasked', { masked: maskKey(k.key) })}
        </span>
      </div>
      {mode === 'rename' || mode === 'edit' ? (
        <form
          className="flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            const ok =
              mode === 'rename'
                ? renameKey(k.id, draft)
                : keyUsable(draft) && replaceKey(k.id, draft)
            if (ok) done()
            else setBad(true)
          }}
        >
          <input
            autoFocus
            type={mode === 'edit' ? 'password' : 'text'}
            autoComplete="off"
            spellCheck={false}
            maxLength={mode === 'edit' ? 300 : 40}
            value={draft}
            aria-label={t(mode === 'edit' ? 'ai.key' : 'ai.keys.name')}
            data-testid="ai-key-input"
            onChange={(e) => {
              setDraft(e.target.value)
              setBad(false)
            }}
            className={`${field} max-w-sm`}
          />
          <button
            type="submit"
            data-testid="ai-key-apply"
            className="min-h-11 rounded-lg bg-accent px-4 font-medium text-white hover:opacity-90"
          >
            {t('ai.keys.save')}
          </button>
          <button type="button" className={btn} onClick={() => setMode(null)}>
            {t('ai.keys.cancel')}
          </button>
          {bad && (
            <span role="alert" className="self-center text-red-600">
              {t('ai.keyBad')}
            </span>
          )}
        </form>
      ) : mode === 'delete' ? (
        <div
          role="alertdialog"
          aria-label={t('ai.keys.confirmDelete', { name: k.name })}
          className="flex flex-wrap items-center gap-2"
        >
          <span>{t('ai.keys.confirmDelete', { name: k.name })}</span>
          <button
            type="button"
            data-testid="ai-key-delete-yes"
            className="min-h-11 rounded-lg bg-red-600 px-4 font-medium text-white"
            onClick={() => {
              deleteKey(k.id)
              done()
            }}
          >
            {t('ai.keys.delete')}
          </button>
          <button type="button" className={btn} onClick={() => setMode(null)}>
            {t('ai.keys.cancel')}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={btn}
            data-testid="ai-key-rename"
            onClick={() => open('rename')}
          >
            {t('ai.keys.rename')}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="ai-key-edit"
            onClick={() => open('edit')}
          >
            {t('ai.keys.edit')}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="ai-key-test"
            onClick={() => {
              setTest(t('ai.keys.testing'))
              void testKey(k.id).then((r) => {
                setTest(
                  r.ok
                    ? t('ai.keys.testOk')
                    : t('ai.keys.testFail', { reason: r.reason }),
                )
                onChange()
              })
            }}
          >
            {t('ai.keys.test')}
          </button>
          <button
            type="button"
            className={btn}
            data-testid="ai-key-delete"
            onClick={() => open('delete')}
          >
            {t('ai.keys.delete')}
          </button>
        </div>
      )}
      {test && (
        <p role="status" data-testid="ai-key-test-result">
          {test}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3 text-muted">
        <label className="flex items-center gap-2">
          {t('ai.keys.cap')}
          <input
            type="number"
            min={0}
            max={10000}
            step={1}
            placeholder={String(defaultCap)}
            defaultValue={k.capUsd ?? ''}
            data-testid="ai-key-cap"
            onChange={(e) => {
              const raw = e.target.value
              if (raw === '') setKeyCap(k.id, undefined)
              else if (isCap(Number(raw))) setKeyCap(k.id, Number(raw))
              onChange()
            }}
            className="min-h-11 w-24 rounded-lg border border-line bg-bg px-2 text-sm outline-none focus:border-accent"
          />
        </label>
        <span data-testid="ai-key-used">
          {t('ai.keys.used', { cost: `$${used.toFixed(2)}` })}
        </span>
      </div>
    </li>
  )
}
