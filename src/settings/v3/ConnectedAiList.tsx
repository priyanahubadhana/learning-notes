import { useAiTick } from '../../ai/aiOffStore'
import { listKeys } from '../../ai/keyStore'
import type { ProviderId } from '../../ai/provider'
import { t, type MessageKey } from '../../i18n/t'
import { tv } from './tv'

/** Claude first, then every other AI that has a saved key (SET-B25). */
export function aiListOrder(providers: ProviderId[]): string[] {
  const others = [...new Set(providers)].filter((p) => p !== 'anthropic')
  return ['claude', ...others]
}

/** "Let AI use my notebooks": which AIs are connected; Claude is listed first. */
export function ConnectedAiList() {
  useAiTick()
  const order = aiListOrder(listKeys().map((k) => k.provider))
  return (
    <section className="sv3-row" data-testid="sv3-ai-list">
      <h3 className="sv3-row-name">{tv('sv3.aiList.title')}</h3>
      <ul className="sv3-line-help">
        {order.map((id) => (
          <li key={id} data-ai={id}>
            {id === 'claude'
              ? tv('sv3.aiList.claude')
              : t(`ai.provider.${id}` as MessageKey)}
          </li>
        ))}
      </ul>
    </section>
  )
}
