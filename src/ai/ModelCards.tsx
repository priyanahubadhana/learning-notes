import { useRef, useState, type PointerEvent } from 'react'
import { Tip } from '../help/Help'
import { t } from '../i18n/t'
import type { MessageKey } from '../i18n/t'
import type { AiKey } from './keyStore'
import { MODELS_CHECKED, moveItem, orderedModels } from './models'

/**
 * Settings › AI › Models: one card per model. Drag a card (finger, Pencil or
 * mouse) or use Move up / Move down to order them. The first card that has a
 * key is the default; the order after it is the fallback order when a key
 * fails or reaches its cap.
 */
export function ModelCards({
  keys,
  order,
  keyFor,
  onOrder,
  onKeyFor,
}: {
  keys: readonly AiKey[]
  order: readonly string[]
  keyFor: Readonly<Record<string, string>>
  onOrder: (ids: string[]) => void
  onKeyFor: (modelId: string, keyId: string) => void
}) {
  const list = orderedModels(order)
  const ids = list.map((m) => m.id)
  const [drag, setDrag] = useState<{ id: string; to: number } | null>(null)
  const items = useRef(new Map<string, HTMLLIElement>())

  // The cards stay where they are while one is dragged (a moved element would
  // lose the pointer); a line shows where the card would land.
  const shown = ids
  const others = drag ? ids.filter((x) => x !== drag.id) : []
  const lineBefore = drag ? others[drag.to] : undefined
  const lineAtEnd = !!drag && drag.to >= others.length
  const byId = new Map(list.map((m) => [m.id, m]))
  const firstWithKey = shown.find((id) =>
    keys.some((k) => k.provider === byId.get(id)?.provider),
  )

  const target = (e: PointerEvent, id: string): number => {
    // The card's new place: how many other cards sit above the pointer.
    let n = 0
    for (const other of shown) {
      if (other === id) continue
      const r = items.current.get(other)?.getBoundingClientRect()
      if (r && r.top + r.height / 2 < e.clientY) n++
    }
    return n
  }

  return (
    <div data-testid="ai-models" className="flex flex-col gap-2">
      <h3 className="flex items-center gap-1 text-sm font-medium">
        <Tip id="ai.modelOrder">{t('ai.models.title')}</Tip>
      </h3>
      <p className="text-sm text-muted">{t('ai.models.intro')}</p>
      <ul className="flex flex-col gap-2">
        {shown.map((id, i) => {
          const m = byId.get(id)
          if (!m) return null
          const own = keys.filter((k) => k.provider === m.provider)
          const chosen =
            own.find((k) => k.id === keyFor[m.id]) ?? own[0] ?? undefined
          const dragging = drag?.id === id
          const label = m.label
          return (
            <li
              key={id}
              ref={(el) => {
                if (el) items.current.set(id, el)
                else items.current.delete(id)
              }}
              data-testid="ai-model-card"
              data-model={id}
              className={`flex gap-2 rounded-lg border p-3 text-sm ${
                dragging ? 'border-accent bg-hover' : 'border-line'
              } ${own.length ? '' : 'opacity-70'} ${
                id === lineBefore ? 'border-t-4 border-t-accent' : ''
              } ${
                lineAtEnd && id === others[others.length - 1]
                  ? 'border-b-4 border-b-accent'
                  : ''
              }`}
            >
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button
                  type="button"
                  data-testid="ai-model-grip"
                  aria-label={t('ai.models.drag', { name: label })}
                  className="flex min-h-11 min-w-11 cursor-grab touch-none select-none items-center justify-center rounded-lg border border-line hover:bg-hover"
                  onPointerDown={(e) => {
                    if (e.pointerType === 'mouse' && e.button !== 0) return
                    e.currentTarget.setPointerCapture(e.pointerId)
                    setDrag({ id, to: i })
                  }}
                  onPointerMove={(e) => {
                    if (drag?.id === id) setDrag({ id, to: target(e, id) })
                  }}
                  onPointerUp={() => {
                    if (drag?.id === id)
                      onOrder(moveItem(ids, ids.indexOf(id), drag.to))
                    setDrag(null)
                  }}
                  onPointerCancel={() => setDrag(null)}
                >
                  ⠿
                </button>
                <button
                  type="button"
                  data-testid="ai-model-up"
                  disabled={i === 0}
                  aria-label={t('ai.models.up', { name: label })}
                  className="min-h-11 min-w-11 rounded-lg border border-line hover:bg-hover disabled:opacity-40"
                  onClick={() => onOrder(moveItem(ids, i, i - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  data-testid="ai-model-down"
                  disabled={i === shown.length - 1}
                  aria-label={t('ai.models.down', { name: label })}
                  className="min-h-11 min-w-11 rounded-lg border border-line hover:bg-hover disabled:opacity-40"
                  onClick={() => onOrder(moveItem(ids, i, i + 1))}
                >
                  ↓
                </button>
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{label}</strong>
                  <span className="text-muted">
                    {t(`ai.provider.${m.provider}`)}
                  </span>
                  <span
                    data-testid="ai-model-rank"
                    className="rounded-full border border-line px-2 text-xs"
                  >
                    {id === firstWithKey
                      ? t('ai.models.default')
                      : t('ai.models.place', { n: i + 1 })}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span
                    data-testid="ai-model-cost"
                    className="rounded-full border border-line px-2"
                  >
                    {t(`ai.cost.${m.cost}`)}
                  </span>
                  <span className="rounded-full border border-line px-2">
                    {t(`ai.speed.${m.speed}`)}
                  </span>
                  {m.vision && (
                    <span
                      data-testid="ai-model-vision"
                      className="rounded-full border border-line px-2"
                    >
                      {t('ai.vision')}
                    </span>
                  )}
                  <span className="text-muted">
                    {t('ai.models.price', {
                      about: m.unverified ? '~' : '',
                      in: m.price.in,
                      out: m.price.out,
                    })}
                  </span>
                </div>
                <p>
                  <span className="text-muted">{t('ai.models.pro')}</span>{' '}
                  {t(`ai.m.${m.slug}.pro` as MessageKey)}
                </p>
                <p>
                  <span className="text-muted">{t('ai.models.con')}</span>{' '}
                  {t(`ai.m.${m.slug}.con` as MessageKey)}
                </p>
                {m.freeTier && (
                  <p className="text-xs text-muted">
                    {t('ai.models.freeNote')}
                  </p>
                )}
                {own.length === 0 ? (
                  <p className="text-xs text-muted">
                    {t('ai.models.noKey', {
                      provider: t(`ai.provider.${m.provider}`),
                    })}
                  </p>
                ) : (
                  own.length > 1 && (
                    <label className="flex items-center gap-2 text-xs">
                      {t('ai.models.useKey')}
                      <select
                        value={chosen?.id}
                        data-testid="ai-model-key"
                        onChange={(e) => onKeyFor(m.id, e.target.value)}
                        className="min-h-11 rounded-lg border border-line bg-bg px-2 text-sm"
                      >
                        {own.map((k) => (
                          <option key={k.id} value={k.id}>
                            {k.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="text-xs text-muted">
        {t('ai.models.checked', { date: MODELS_CHECKED })}
      </p>
    </div>
  )
}
