import { useState } from 'react'
import { usePref } from '../app/usePref'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import { AiOffCard } from './AiOffCard'
import { useAiTick } from './aiOffStore'
import { formatCap, formatCost } from './costCurrency'
import { listKeys, maskKey } from './keyStore'
import { PROVIDERS } from './provider'
import { AI_KEYS, readAiConfig, testKey } from './route'
import { readKeyUsage } from './usage'

/** Where to make a key for each company (a plain link, opened in a new tab). */
const GET_KEY: Record<string, string> = {
  anthropic: 'https://console.anthropic.com/settings/keys',
  gemini: 'https://aistudio.google.com/apikey',
  openai: 'https://platform.openai.com/api-keys',
}

const isBool = (v: unknown): v is boolean => typeof v === 'boolean'

/**
 * Settings › Connections: every AI key in one list with its company, status,
 * this month's use and a Test button, and links to make a key and to manage
 * them in Settings › AI. Read-only here: keys are added and changed in AI.
 */
export function ConnectionsSection({
  onGo,
}: {
  onGo: (category: string) => void
}) {
  useAiTick()
  const [enabled] = usePref(AI_KEYS.enabled, isBool, false)
  const [tests, setTests] = useState<Record<string, string>>({})
  const keys = listKeys()
  const config = readAiConfig()
  const on = enabled || config.enabled
  const btn =
    'min-h-11 rounded-lg border border-line px-3 text-sm hover:bg-hover'
  return (
    <section
      data-testid="connections-section"
      className="mb-6 flex flex-col gap-4"
    >
      <h2 className="text-base font-semibold">{t('conn.title')}</h2>
      <p className="text-sm text-muted">{t('conn.intro')}</p>
      <AiOffCard />
      {keys.length > 0 && (
        <ul className="flex flex-col gap-2">
          {keys.map((k) => (
            <li
              key={k.id}
              data-testid="conn-key"
              className="flex flex-col gap-1 rounded-lg border border-line p-3 text-sm"
            >
              <p className="font-medium">
                {k.name}{' '}
                <span className="font-normal text-muted">
                  · {t(`ai.provider.${k.provider}` as MessageKey)}
                </span>
              </p>
              <p className="text-xs text-muted">
                {PROVIDERS[k.provider].host} · {maskKey(k.key)}
              </p>
              <p className="text-xs" data-testid="conn-status">
                {on ? t('conn.ready') : t('conn.savedOff')}
              </p>
              <p className="text-xs text-muted">
                {t('ai.usageKey', {
                  name: t('conn.thisMonth'),
                  cost: formatCost(readKeyUsage(k.id).costUsd),
                  cap: formatCap(k.capUsd ?? config.capUsd),
                })}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className={btn}
                  data-testid="conn-test"
                  onClick={() =>
                    void testKey(k.id).then((r) =>
                      setTests((s) => ({
                        ...s,
                        [k.id]: r.ok
                          ? t('ai.keys.testOk')
                          : t('ai.keys.testFail', { reason: r.reason }),
                      })),
                    )
                  }
                >
                  {t('ai.keys.test')}
                </button>
                {tests[k.id] && (
                  <span role="status" className="text-xs">
                    {tests[k.id]}
                  </span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className={btn}
          data-testid="conn-manage"
          onClick={() => onGo('ai')}
        >
          {t('conn.manage')}
        </button>
        <button
          type="button"
          className={btn}
          onClick={() => onGo('permissions')}
        >
          {t('conn.permissions')}
        </button>
      </div>
      <div>
        <h3 className="mb-1 text-sm font-medium">{t('conn.getKey')}</h3>
        <ul className="text-sm">
          {Object.entries(GET_KEY).map(([p, href]) => (
            <li key={p}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex min-h-11 items-center text-accent underline"
              >
                {t(`ai.provider.${p}` as MessageKey)}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
