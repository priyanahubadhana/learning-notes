import { useAiTick } from '../../ai/aiOffStore'
import { listKeys } from '../../ai/keyStore'
import { t, type MessageKey } from '../../i18n/t'
import { aiListOrder } from './aiListOrder'
import { tv } from './tv'

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
