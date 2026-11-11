import type { MessageKey } from '../i18n/t'

/**
 * Settings that follow you: the groups on the "What syncs" panel and which
 * group each setting belongs to. A setting in a group travels to the
 * person's other devices; a setting in no group stays on this device.
 * Kept apart from the registry so the list can be read in one place and
 * checked by a test. See docs/features/sync.md.
 */

export type SyncGroupId =
  'general' | 'appearance' | 'review' | 'reading' | 'ai' | 'lock' | 'aiKeys'

export interface SyncGroup {
  id: SyncGroupId
  labelKey: MessageKey
  /** One line naming what the group holds. */
  listKey: MessageKey
  defaultOn: boolean
  /** Secret groups travel only end to end, only when the person opts in. */
  secret?: boolean
}

export const SYNC_GROUPS: readonly SyncGroup[] = [
  {
    id: 'general',
    labelKey: 'syncGroup.general',
    listKey: 'syncGroup.general.list',
    defaultOn: true,
  },
  {
    id: 'appearance',
    labelKey: 'syncGroup.appearance',
    listKey: 'syncGroup.appearance.list',
    defaultOn: true,
  },
  {
    id: 'review',
    labelKey: 'syncGroup.review',
    listKey: 'syncGroup.review.list',
    defaultOn: true,
  },
  {
    id: 'reading',
    labelKey: 'syncGroup.reading',
    listKey: 'syncGroup.reading.list',
    defaultOn: true,
  },
  {
    id: 'ai',
    labelKey: 'syncGroup.ai',
    listKey: 'syncGroup.ai.list',
    defaultOn: true,
  },
  {
    id: 'lock',
    labelKey: 'syncGroup.lock',
    listKey: 'syncGroup.lock.list',
    defaultOn: true,
  },
  {
    id: 'aiKeys',
    labelKey: 'syncGroup.aiKeys',
    listKey: 'syncGroup.aiKeys.list',
    defaultOn: true,
    secret: true,
  },
]

/** Setting id -> group. Anything not listed stays on this device. */
export const SETTING_GROUPS: Readonly<Record<string, SyncGroupId>> = {
  'general.language': 'general',
  'general.dateStyle': 'general',
  'general.dayStartHour': 'general',
  'general.showHelp': 'general',
  'general.pathStyle': 'general',
  'general.openNotebookAt': 'general',
  'general.newPageStudy': 'general',
  'general.newPageChooser': 'general',
  'general.defaultPaper': 'general',
  'general.pasteMode': 'general',
  'advanced.showRefresh': 'general',
  'general.theme': 'appearance',
  'general.reduceGlass': 'appearance',
  'review.reviseLabels': 'review',
  'review.newPerDay': 'review',
  'review.maxPerDay': 'review',
  'review.againMinutes': 'review',
  'review.goodSteps': 'review',
  'review.scheduler': 'review',
  'review.targetMemory': 'review',
  'review.nestedCard': 'review',
  'review.practiceOrder': 'review',
  'reading.theme': 'reading',
  'reading.font': 'reading',
  'reading.size': 'reading',
  'reading.spacing': 'reading',
  'reading.margin': 'reading',
  'reading.width': 'reading',
  'reading.align': 'reading',
  'ai.enabled': 'ai',
  'ai.modelOrder': 'ai',
  'ai.modelKeys': 'ai',
  'ai.cap': 'ai',
  'ai.privacyOk': 'ai',
  'ai.currency': 'ai',
  'lock.idleMinutes': 'lock',
}

export const groupOfId = (id: string): SyncGroupId | undefined =>
  SETTING_GROUPS[id]
