import { Suspense, lazy } from 'react'
import type { LearningNotesDB } from '../../core/db'
import { AiSection } from '../../ai/AiSection'
import { ConnectionsSection } from '../../ai/ConnectionsSection'
import { LockSection } from '../../app/lock/LockSection'
import { AboutSection } from '../AboutSection'
import { DeviceSection } from '../DeviceSection'
import type { AreaId } from './sections'

// Same lazy chunks as today's screen, so the first load stays small.
const PermissionsSection = lazy(() =>
  import('../../ai/PermissionsSection').then((m) => ({
    default: m.PermissionsSection,
  })),
)
const ClaudeArea = lazy(() =>
  import('../../connector/ClaudeArea').then((m) => ({ default: m.ClaudeArea })),
)
const AccountSection = lazy(() =>
  import('../../sync/AccountSection').then((m) => ({
    default: m.AccountSection,
  })),
)
const SyncSection = lazy(() =>
  import('../../sync/SyncSection').then((m) => ({ default: m.SyncSection })),
)

/**
 * The screens today's Settings shows above a category's rows (Account, Sync,
 * Lock, AI, Connections, Permissions, Claude, This device, About). They are
 * today's own components, with the same props and the same database, shown
 * inside the new section frame (nothing is copied).
 */
export function AreaSection({
  area,
  db,
  onGo,
}: {
  area: AreaId
  db: LearningNotesDB
  onGo(section: string): void
}) {
  return (
    <div className="sv3-area" data-area={area}>
      <Suspense fallback={null}>
        {area === 'device' && <DeviceSection db={db} />}
        {area === 'about' && <AboutSection />}
        {area === 'lock' && <LockSection db={db} />}
        {area === 'ai' && <AiSection db={db} onGo={onGo} />}
        {area === 'apis' && <ConnectionsSection onGo={onGo} />}
        {area === 'permissions' && <PermissionsSection db={db} />}
        {area === 'claude' && <ClaudeArea db={db} />}
        {area === 'account' && <AccountSection db={db} />}
        {area === 'sync' && <SyncSection db={db} />}
      </Suspense>
    </div>
  )
}
