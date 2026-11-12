import { t, type MessageKey } from '../../i18n/t'
import { enPartsMenus } from '../../i18n/en/parts/menus'

type Strip<K> = K extends `${infer B}_${'one' | 'other'}` ? B : K
export type MenusKey = Strip<keyof typeof enPartsMenus>

/**
 * Text for the Context strip and Command list. Goes through `t()`; until
 * `enPartsMenus` is registered in the i18n index, `t()` hands back the key,
 * so the English text is used here (placeholders filled, `count` plural).
 */
export function tm(
  key: MenusKey,
  params?: Record<string, string | number>,
): string {
  const out = t(key as MessageKey, params)
  if (out !== key) return out
  const table = enPartsMenus as Record<string, string>
  const count = params?.count
  const form =
    typeof count === 'number' && count !== 1 ? `${key}_other` : `${key}_one`
  const raw = table[form] ?? table[key] ?? key
  return raw.replace(/\{(\w+)\}/g, (m, n: string) =>
    params?.[n] === undefined ? m : String(params[n]),
  )
}
