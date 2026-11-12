import { getLevel, isProFeatureId, isUnlocked } from '../../../settings/level'
import type { ProFeatureId } from '../../../settings/proFeatures.gen'
import { isIconName, type IconName } from '../icons'
import { metaOf, type ToolLevel } from '../toolRegistryMeta'

/**
 * The tools of the new tool bar (toolbar.v8), in bar order. Only ids live
 * here; level, unlock, favourite and icon are read from toolRegistryMeta.ts,
 * and "is it unlocked" from settings/level.ts, so nothing is copied.
 */
export const V8_TOOL_IDS = [
  'text',
  'pen',
  'eraser',
  'shapes',
  'lasso',
  'insert',
] as const
export type V8ToolId = (typeof V8_TOOL_IDS)[number]

export interface V8Tool {
  id: V8ToolId
  icon: IconName
  level: ToolLevel
  /** Professional switch id, when `level` is 'professional'. */
  unlock?: ProFeatureId
  favourite: boolean
}

const FALLBACK_ICON: IconName = 'more'

/** The icon to draw: the tool's own, or the neutral one (with a warning). */
export function v8Icon(id: string, icon: string | undefined): IconName {
  if (icon !== undefined && isIconName(icon)) return icon
  console.warn(`toolbar v8: tool "${id}" has no icon, using the fallback`)
  return FALLBACK_ICON
}

export function v8Tools(): V8Tool[] {
  return V8_TOOL_IDS.map((id) => {
    const meta = metaOf(id)
    const unlock =
      meta?.unlock !== undefined && isProFeatureId(meta.unlock)
        ? meta.unlock
        : undefined
    return {
      id,
      icon: v8Icon(id, meta?.icon),
      level: meta?.level ?? 'professional',
      ...(unlock ? { unlock } : {}),
      favourite: meta?.favourite ?? false,
    }
  })
}

/** Beginner sees a Professional tool only once its switch is on. */
export const v8Available = (tool: V8Tool): boolean =>
  tool.unlock !== undefined
    ? isUnlocked(tool.unlock)
    : tool.level === 'beginner' || getLevel() === 'professional'
