import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import './index.css'
import App from './App.tsx'
import { reloadOnFailedChunk } from './app/chunkReload'
import { ErrorBoundary } from './app/ErrorBoundary'
import { ScrollBarHost } from './design/parts/ScrollBarHost'
import { startNavHistory } from './app/navHistory'
import { installPenTap, penTapOptions } from './app/penTap'
import { fingerOnlyBars } from './app/tools/main/mainTools'
import { UpgradeGate } from './app/UpgradeGate'
import {
  noteChecked,
  offerUpdate,
  onUpdateOffer,
  onRequiredUpdate,
  isUpdateRequired,
  isOtherTabUpgrade,
  updateReason,
  triggerMustHave,
  updateWaiting,
  reloadWhenSafe,
  repeatUpdateOffer,
  setUpdateChecker,
  setUpdateFallback,
  lookForUpdate,
  watchControllerChange,
  watchForUpdates,
  watchUpdateTriggers,
} from './app/updates'
import {
  installGestureWatchdog,
  onGestureReset,
  resetGestures,
} from './app/gestureReset'
import { inputMachine, installInputMachine } from './app/inputMachine'
import { installListenerCount } from './app/listenerCount'
import { activeTool } from './app/tools/main/mainTools'
import { prepareUpdate, rememberPlace, startAutoUpdate } from './app/autoUpdate'
import { flushAllSaves, hasPendingSaves } from './editor/autosave'
import { writePad } from './editor/writePad/padState'
import { loadDraft } from './editor/writePad/draft'
import { backupGate, runAutoBackup } from './core/autoBackup'
import { penIsDown } from './app/palmGuard'
import { hasUnsaved } from './app/saveStatus'
import { requestPersistentStorage } from './core/storage'
import { db, DEFAULT_DB_NAME } from './core/db'
import { isOn } from './app/flags'
import type { UpdateReason } from './app/updateLevel'
import { hasStoredSession, isTracking, isWaitingForKey } from './sync/device'
import { startAccountGate } from './sync/gateRule'
import { writePref } from './app/uiPrefs'
import { initDeviceMode } from './settings/deviceModeSettings'
import { prefetchAfterIdle } from './app/idlePrefetch'
import { installScrollHints } from './app/scrollHints'
import {
  autoUpdateSetting,
  scrollHintsSetting,
} from './settings/builtinSettings'
import {
  readDeviceSetting,
  subscribeDeviceSettings,
} from './settings/settingsService'
import { saveEverythingLazy as saveEverything } from './share/saveEverythingLazy'
import { loadInter } from './design/loadInter'
import { isDesignTokensRoute } from './design/designRoute'
import { isConnectRoute } from './connector/connectRoute'
import { setSlowMomentsOn, slowMomentsWanted } from './perf/slowMomentsSwitch'

initDeviceMode()
startNavHistory()
reloadOnFailedChunk()
// R7-5: coming back from another app or tab forgets every half gesture
// (a pointer whose lift was lost) and arms the ink pad and tap counters again.
installGestureWatchdog()
// One state machine owns "a pointer is down" (tools robustness): a lift that
// never came is dropped after 4 s, and a tool change drops a half gesture.
installListenerCount() // the dump counts the document listeners
installInputMachine()
inputMachine.setTool(activeTool.get())
activeTool.subscribe(() => inputMachine.setTool(activeTool.get()))
installPenTap()
penTapOptions.fingerOnly = fingerOnlyBars.get()
fingerOnlyBars.subscribe(() => {
  penTapOptions.fingerOnly = fingerOnlyBars.get()
})
{
  const hints = installScrollHints(
    () => readDeviceSetting(scrollHintsSetting) === 'on',
    () => isOn('foundation.shell'),
  )
  subscribeDeviceSettings(hints.refresh)
}

// The app scrolls inside its page scroller, never the document: if something
// (a focus, the keyboard's pan) moves the document, put it back.
window.addEventListener(
  'scroll',
  () => {
    if (document.querySelector('[data-app-shell]') && window.scrollY !== 0)
      window.scrollTo(0, 0)
  },
  { passive: true },
)
window.visualViewport?.addEventListener('resize', () => {
  if (window.scrollY !== 0) window.scrollTo(0, 0)
})

// Ask the browser not to clear our notes database (fire and forget).
void requestPersistentStorage()

// Settings › Advanced › Record slow moments (R6-11): on only when chosen.
if (slowMomentsWanted()) setSlowMomentsOn(true)

// Sync (Phase L): loaded only when it is set up or a Google sign-in is
// coming back, so people who never sync download none of it.
// Settings that follow you start first, so a change made while signed out
// is ready to travel and sync never sees a half-set-up list.
const startSettings = (async () => {
  // Opening the database runs its upgrade: the silent backup comes first.
  await Promise.race([
    backupGate.ready,
    new Promise((resolve) => setTimeout(resolve, 8000)),
  ])
  const [mirror, migration, notice, noticeView] = await Promise.all([
    import('./settings/settingsMirror'),
    import('./settings/settingsMigration'),
    import('./settings/settingsNoticeState'),
    import('./settings/settingsNoticeMount'),
  ])
  if (await migration.migrateSettings(db)) notice.openSettingsNotice()
  void import('./settings/syncAllMigration').then((m) =>
    m.runSyncAllMigration(),
  )
  mirror.startSettingsMirror(db)
  notice.watchSettingsNotice()
  noticeView.mountSettingsNotice()
})().catch(() => undefined)
// Favourite stars sit on the page records (so they sync); this keeps the
// device's list in step with them. A small chunk, loaded after the database.
void startSettings
  .then(() => import('./app/favouriteSync'))
  .then((m) => m.startFavouriteSync(db))
  .catch(() => undefined)
if (
  isTracking() ||
  isWaitingForKey() ||
  hasStoredSession() ||
  new URLSearchParams(location.search).has('sync')
) {
  void startSettings
    .then(() => import('./sync/syncService'))
    .then((m) => m.startSync(db))
}

// Q3a: a device with no sign-in is read-only until the person signs in.
startAccountGate()

// A unique build name makes the silent backup due right now.
async function backupForUpdate(): Promise<'ok' | 'space' | 'error'> {
  const result = await runAutoBackup(
    DEFAULT_DB_NAME,
    db.verno,
    `update-${Date.now()}`,
  )
  return result.kind === 'failed' ? result.reason : 'ok'
}

// Automatic updates: a found version is applied at a safe moment (the
// setting "Update automatically"); with it off the "Update" bar is shown.
const autoUpdate = startAutoUpdate({
  enabled: () =>
    readDeviceSetting(autoUpdateSetting) === 'on' && !isUpdateRequired(),
  win: window,
  penDown: () => penIsDown(),
  hasPendingSaves,
  hasUnsaved,
  padDraft: () => {
    const session = writePad.get()
    return !!session && loadDraft(session.pageId) !== ''
  },
  flush: flushAllSaves,
  backup: backupForUpdate,
  onReset: (fn) => void onGestureReset(fn),
  hardRestart: () => void restartIntoNewFiles(),
  announce: () =>
    void import('./app/updateChannel').then((c) => c.announceApply()),
})
onUpdateOffer((apply) => void autoUpdate(apply))
// A REQUIRED update (storage change or data fix) uses the full-screen flow.
const startRequired = (
  apply: () => void,
  test?: { reason?: UpdateReason; unsaved?: boolean },
) =>
  void import('./app/mandatoryFlow').then((m) =>
    m.startMandatoryUpdate({
      v2: isOn('update.v2'),
      reason: test?.reason ?? updateReason(),
      apply: () => {
        resetGestures('manual')
        rememberPlace()
        apply()
      },
      // Another tab upgraded the notes: this tab must not touch the database.
      prepare: () =>
        test?.unsaved
          ? Promise.resolve({ kind: 'unsaved' as const })
          : isOtherTabUpgrade()
            ? Promise.resolve(null)
            : prepareUpdate({
                flush: flushAllSaves,
                hasUnsaved,
                backup: backupForUpdate,
              }),
      hardRestart: () => void restartIntoNewFiles(),
    }),
  )
onRequiredUpdate((apply) => startRequired(apply))
// update.v2: a tab older than the stored notes asks for the update at once.
if (isOn('update.v2'))
  void import('./app/otherTab').then((m) =>
    m.watchOtherTabUpgrade(db, () => triggerMustHave('storage')),
  )
// The About button ("real") runs the true ending: restart into the same page.
// Tests without it only set a marker (the page must stay).
window.addEventListener('learning-notes:test-required-update', (e) => {
  const detail =
    (
      e as CustomEvent<{
        reason?: UpdateReason
        unsaved?: boolean
        real?: boolean
      } | null>
    ).detail ?? undefined
  startRequired(() => {
    ;(window as unknown as { __requiredApplied?: boolean }).__requiredApplied =
      true
    if (detail?.real) void restartIntoNewFiles()
  }, detail)
})
subscribeDeviceSettings(() => {
  if (updateWaiting()) repeatUpdateOffer()
})
// Tests: pretend a new version was found (the restart is a plain reload).
window.addEventListener('learning-notes:test-update', () =>
  offerUpdate(() => {
    resetGestures('manual')
    location.reload()
  }),
)

// Keep the app on the device for offline use, and look for new versions at
// the start and whenever it comes to the front (an iPad rarely restarts it).
const update = registerSW({
  onNeedRefresh: () =>
    offerUpdate(() => {
      // Nothing half-way may be carried into the new version.
      resetGestures('manual')
      rememberPlace()
      void update(true)
    }),
  onRegisteredSW: (_url, registration) => {
    if (registration)
      void import('./app/updateProgress').then((m) =>
        m.trackInstalls(registration),
      )
    setUpdateChecker(async () => {
      await registration?.update()
    })
  },
})

// Looking works with or without a service worker: version.json is compared
// with this build, and a newer one is applied by the auto-update rule.
setUpdateFallback(() => {
  resetGestures('manual')
  rememberPlace()
  void restartIntoNewFiles()
})
const lookQuietly = () => {
  noteChecked()
  void lookForUpdate(4000).catch(() => {}) // offline: try next time
}
watchForUpdates(document, () => {
  repeatUpdateOffer()
  lookQuietly()
})
// R6-14: also on navigation, first typing or touch, and every 10 minutes.
watchUpdateTriggers(window, lookQuietly)

// Tools robustness: the health check, the soft refresh and the console hook
// load once the browser is idle (the first download stays small).
{
  const start = () =>
    void import('./app/robustness').then((m) => m.startRobustness(lookQuietly))
  if ('requestIdleCallback' in window) {
    window.requestIdleCallback(start, { timeout: 3000 })
  } else {
    setTimeout(start, 1500)
  }
}

/** Drops the saved copy of the old files, then restarts on the live ones. */
async function restartIntoNewFiles() {
  try {
    const regs = (await navigator.serviceWorker?.getRegistrations()) ?? []
    await Promise.all(regs.map((r) => r.unregister()))
    for (const key of (await caches?.keys()) ?? []) await caches.delete(key)
  } catch {
    // Restart anyway.
  }
  location.reload()
}

// R7-1: a new version took over this page without a restart (Update pressed
// in another window, or the restart was missed): the old code must not keep
// running on the new files. Restart at a safe moment (showing, no pen down,
// nothing unsaved), at the latest after 20 s.
watchControllerChange(navigator.serviceWorker, () =>
  reloadWhenSafe(
    () =>
      document.visibilityState === 'visible' && !penIsDown() && !hasUnsaved(),
    () => {
      rememberPlace()
      location.reload()
    },
  ),
)

// After the first screen: the screens people open next, one at a time.
prefetchAfterIdle([
  () => import('./notebooks/NotebooksHome'),
  () => import('./notebooks/NotebookScreen'),
  () => import('./pages/PageView'),
  () => import('./search/SearchPopup'),
  () => import('./share/saveEverything'),
])

/** The way out of a whole-app failure: start again with nothing open. */
function goHome() {
  writePref('currentPage', null)
  writePref('currentNotebook', null)
  location.hash = ''
  location.reload()
}

// Hidden review page for the design system (not linked from the app).
if (isConnectRoute(location.hash)) {
  // Consent screen of the online Claude connector (lazy: normal starts never load it).
  void import('./connector/ConnectPage').then((m) =>
    createRoot(document.getElementById('root')!).render(<m.default />),
  )
} else if (isDesignTokensRoute(location.hash)) {
  void import('./design/DesignTokensPage').then((m) =>
    createRoot(document.getElementById('root')!).render(
      <>
        <m.default />
        <ScrollBarHost />
      </>,
    ),
  )
} else {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <ErrorBoundary onHome={goHome} onSaveAll={saveEverything} fullScreen>
        <UpgradeGate>
          <App />
          <ScrollBarHost />
        </UpgradeGate>
      </ErrorBoundary>
    </StrictMode>,
  )
}

// Inter comes after the first paint (never in the critical path).
loadInter()
