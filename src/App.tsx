import { centreEl } from './app/centreEl'
import { useFlag } from './app/flags'
import { setActiveScope } from './core/historySteps'
import { useLiveQuery } from 'dexie-react-hooks'
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type CSSProperties,
} from 'react'
import {
  AppUiContext,
  type AppUi,
  type ChoiceRequest,
  type PickerMode,
  PHONE_SCREEN,
  TopBarSlotContext,
  TopStackSlotContext,
} from './app/appUi'
import { ErrorBoundary } from './app/ErrorBoundary'
import { FirstUseTip } from './help/FirstUseTip'
import { handwritingChooser } from './app/tools/handwriting'
import { onboardingGuide } from './app/signInGuideState'
import { welcomeNeeded, welcomeOpen } from './onboarding/onboardingState'
import { lassoSheetOpen } from './ink/lassoMenu'
import { SaveNotice } from './app/SaveNotice'
import { onStorageFull, reportError, runTask } from './app/errors'
import { FileError } from './core/attachments'
import { labPageId } from './app/lab/labPage'
import { baseHash, parseHash, routeToHash, type Route } from './app/router'
import { installDeepLinks } from './reader/annotations/deepLink'
import { locatorOf } from './reader/annotations/annotationService'
import { THEMES, applyTheme } from './app/theme'
import { setGlassLite, startGlassProbe } from './design/glass'
import { ThemeContext } from './app/themeContext'
import type { ToastAction } from './app/appUi'
import { toggleFavourite } from './app/favourites'
import { SpaceStrip } from './app/spaces/SpaceStrip'
import { QuietCorner } from './app/spaces/QuietCorner'
import {
  isSpace,
  spaceForRoute,
  usableSpace,
  visibleSpaces,
  type Space,
} from './app/spaces/spaces'
import { useHiddenSpaces } from './settings/spaceSettings'
import { DatabaseGate, LockGate, PageGate } from './app/lock/LockScreen'
import { toggleLock } from './app/lock/lockMenu'
import { useAutoRelock } from './app/lock/useLock'
import { useReadingSync } from './app/reading/useReadingSync'
import { devicePickerDone } from './app/tools/deviceKind'
import { setAppActions } from './app/tools/toolRuntime'
import { SidebarResizer } from './app/SidebarResizer'
import { SIDEBAR_DEFAULT, isSidebarWidth } from './app/sidebarWidth'
import { Toast, ChoiceDialog, EmptyState } from './app/ui'
import { onUpdateOffer } from './app/updates'
import { UpdateRiskBar } from './app/UpdateBar'
import { mandatoryUpdate } from './app/mandatoryState'
import { AttentionGate } from './app/attention/AttentionGate'
import { SignedOutGate } from './sync/SignedOutGate'
import { AccountGate } from './sync/AccountGate'
import {
  checkStorage,
  loadBackupFailures,
  setSignals,
  watchFailures,
} from './app/attention/attentionSignals'
import { subscribeSync } from './sync/syncStatus'
import { restoreAfterUpdate, updateRisk } from './app/autoUpdate'
import { updateStatus } from './app/updateStatus'
import { getSyncStatus } from './sync/syncStatus'
import { NowPlayingGate } from './app/reading/NowPlayingGate'
import { TOAST_AFTER_HOLD_MS, toastDuration } from './app/toastTiming'
import { isStringOrNull } from './app/uiPrefs'
import { usePref } from './app/usePref'
import { outlineRequest } from './app/panel/outlineRequest'
import { applyLanguage } from './i18n/languages'
import { setDateStyle, t } from './i18n/t'
import { useTreeState } from './app/useTreeState'
import { db } from './core/db'
import type {
  Annotation,
  JsonObject,
  Page,
  SavedSearch,
  Workspace,
} from './core/types'
import { getOrCreateDefaultWorkspace } from './core/workspaceService'
import { ensureSearchIndex } from './search/searchService'
import { appendJournalNotes, openJournalDay } from './journal/journalService'
import { Sidebar } from './notebooks/Sidebar'
import { LeftPanel } from './app/panel/LeftPanel'
import { TimerChip } from './home/TimerChip'
import {
  createNotebook,
  listNotebooks,
  renameNotebook,
} from './notebooks/notebookService'
import {
  createPage,
  setPageInkBg,
  getPage,
  getPagePath,
  renamePage,
} from './pages/pageService'
import { choiceToBg } from './pages/paperStyles'
import { pageForNotebook, rememberNotebookPage } from './notebooks/lastPage'
import { touchNotebookOpened } from './notebooks/notebookLook'
import { LazyNameSheet } from './app/LazyNameSheet'
import { touchUi } from './app/touchUi'
import { BackupReminder } from './share/ReminderBar'
import { saveEverythingLazy as saveEverything } from './share/saveEverythingLazy'
import {
  noteFirstUse,
  reminderDue,
  snoozeReminder,
} from './share/backupReminder'
import type { ReviewScope } from './recall/reviewService'
import { countDue } from './recall/reviewLazy'
import {
  autoUpdateSetting,
  dateStyleSetting,
  languageSetting,
  newPageStudySetting,
  defaultPaperSetting,
  openNotebookAtSetting,
  reviseLabelsSetting,
  theme as themeSetting,
  reduceGlassSetting,
} from './settings/builtinSettings'
import { getSetting, readDeviceSetting } from './settings/settingsService'
import { setMarkLabels } from './revise/reviseMarks'
import {
  useAutoDeviceMode,
  usePencilOfferTrigger,
} from './settings/deviceModeSettings'
import { useDeviceSetting, useSyncedSetting } from './settings/useSetting'
import { revealBlock } from './editor/revealBlock'
import { rememberPage } from './search/recentPages'
import { pushEntry, replaceEntry } from './app/navHistory'
import { TopBar } from './app/TopBar'
import { isBoolean, readPref, writePref } from './app/uiPrefs'
import {
  DEFAULT_FILTERS,
  describeHits,
  runSearch,
  type SearchHit,
  type SearchQuery,
} from './search/searchQuery'
import { getSavedSearch, readSavedQuery } from './search/savedSearchService'
import { restorePage } from './trash/trashService'
import {
  createPageFromTemplate,
  createTemplate,
  ensureTemplates,
  getStudyTemplate,
} from './templates/templateService'

// Screens load when first opened, so the app itself starts fast.
// Home is a lazy screen. Once it has loaded it is used directly (no extra
// Suspense step), so opening it stays instant.
let HomeLoaded: typeof import('./home/HomeScreen').HomeScreen | null = null
const loadHome = () =>
  import('./home/HomeScreen').then((m) => (HomeLoaded = m.HomeScreen))
const HomeLazy = lazy(() => loadHome().then((c) => ({ default: c })))
const SignInGuide = lazy(() =>
  import('./sync/SignInGuide').then((m) => ({ default: m.SignInGuide })),
)
const SignInPanel = lazy(() =>
  import('./sync/SignInPanel').then((m) => ({ default: m.SignInPanel })),
)
const Welcome = lazy(() =>
  import('./onboarding/Welcome').then((m) => ({ default: m.Welcome })),
)
const PencilOffer = lazy(() =>
  import('./settings/PencilOffer').then((m) => ({ default: m.PencilOffer })),
)
const LassoMenuSheet = lazy(() =>
  import('./ink/LassoMenuSheet').then((m) => ({ default: m.LassoMenuSheet })),
)
const HandwritingChooser = lazy(() =>
  import('./app/tools/HandwritingChooser').then((m) => ({
    default: m.HandwritingChooser,
  })),
)
const SearchPopup = lazy(() =>
  import('./search/SearchPopup').then((m) => ({ default: m.SearchPopup })),
)
const TemplatePicker = lazy(() =>
  import('./templates/TemplatePicker').then((m) => ({
    default: m.TemplatePicker,
  })),
)
const DevicePicker = lazy(() =>
  import('./app/tools/DevicePicker').then((m) => ({ default: m.DevicePicker })),
)
const SaveSearchActions = lazy(() =>
  import('./search/SaveSearchActions').then((m) => ({
    default: m.SaveSearchActions,
  })),
)
const NotebookScreen = lazy(() =>
  import('./notebooks/NotebookScreen').then((m) => ({
    default: m.NotebookScreen,
  })),
)
const PageView = lazy(() =>
  import('./pages/PageView').then((m) => ({ default: m.PageView })),
)
const LibraryScreen = lazy(() =>
  import('./library/LibraryScreen').then((m) => ({
    default: m.LibraryScreen,
  })),
)
const NotebooksHome = lazy(() =>
  import('./notebooks/NotebooksHome').then((m) => ({
    default: m.NotebooksHome,
  })),
)
const ReviewHome = lazy(() =>
  import('./notebooks/ReviewHome').then((m) => ({ default: m.ReviewHome })),
)
const AudioDock = lazy(() =>
  import('./audio/AudioDock').then((m) => ({ default: m.AudioDock })),
)
const UpdatePill = lazy(() => import('./app/UpdatePill'))
const MandatoryUpdate = lazy(() => import('./app/MandatoryUpdate'))
const BookReader = lazy(() =>
  import('./reader/BookReader').then((m) => ({ default: m.BookReader })),
)
const CaptureScreen = lazy(() =>
  import('./capture/CaptureScreen').then((m) => ({
    default: m.CaptureScreen,
  })),
)
const LibrarySidebar = lazy(() =>
  import('./library/LibrarySidebar').then((m) => ({
    default: m.LibrarySidebar,
  })),
)
const PageAiActions = lazy(() =>
  import('./capture/PageAiActions').then((m) => ({
    default: m.PageAiActions,
  })),
)
const DailyHighlights = lazy(() =>
  import('./reader/annotations/DailyHighlights').then((m) => ({
    default: m.DailyHighlights,
  })),
)
const AiActions = lazy(() =>
  import('./ai/AiActions').then((m) => ({ default: m.AiActions })),
)
const BookHeader = lazy(() =>
  import('./library/BookHeader').then((m) => ({ default: m.BookHeader })),
)
const PencilLabEntry = lazy(() =>
  import('./app/lab/PencilLab').then((m) => ({ default: m.PencilLabEntry })),
)
const PencilLabPanel = lazy(() =>
  import('./app/lab/PencilLab').then((m) => ({ default: m.PencilLabPanel })),
)
const AppSummary = lazy(() =>
  import('./app/summary/AppSummary').then((m) => ({ default: m.AppSummary })),
)
const NotesOverview = lazy(() =>
  import('./app/summary/NotesOverview').then((m) => ({
    default: m.NotesOverview,
  })),
)
const AllCardsScreen = lazy(() =>
  import('./recall/AllCardsScreen').then((m) => ({
    default: m.AllCardsScreen,
  })),
)
const DataScreen = lazy(() =>
  import('./share/DataScreen').then((m) => ({ default: m.DataScreen })),
)
const DatabaseScreen = lazy(() =>
  import('./databases/DatabasesHub').then((m) => ({
    default: m.DatabaseScreen,
  })),
)
const DatabasesScreen = lazy(() =>
  import('./databases/DatabasesHub').then((m) => ({
    default: m.DatabasesScreen,
  })),
)
const ReviewScreen = lazy(() =>
  import('./recall/ReviewScreen').then((m) => ({ default: m.ReviewScreen })),
)
const ReviewV2 = lazy(() =>
  import('./review/v2/ReviewV2').then((m) => ({ default: m.ReviewV2 })),
)
const SettingsScreen = lazy(() =>
  import('./settings/SettingsScreen').then((m) => ({
    default: m.SettingsScreen,
  })),
)
const CalendarScreen = lazy(() =>
  import('./databases/CalendarScreen').then((m) => ({
    default: m.CalendarScreen,
  })),
)
const SearchScreen = lazy(() =>
  import('./search/SearchScreen').then((m) => ({ default: m.SearchScreen })),
)

/** A file block's "Open in reader": the Library code loads only when used. */
async function openAttachment(workspaceId: string, fileId: string) {
  const [{ openAttachmentInReader }, { inspectBook }] = await Promise.all([
    import('./library/attachmentReader'),
    import('./library/inspect'),
  ])
  return openAttachmentInReader(db, workspaceId, fileId, inspectBook)
}

/** The Search screen state for a search address. */
function searchOf(r: Extract<Route, { kind: 'search' }>) {
  return {
    query: r.query
      ? readSavedQuery(r.query as JsonObject)
      : { text: '', type: 'all' as const, filters: DEFAULT_FILTERS },
    key: Date.now(),
    savedId: r.savedId,
    /** A saved search from an address: its query still has to be read. */
    fromAddress: !!r.savedId,
  }
}

// Cached so React StrictMode's double effect cannot create things twice.
let workspacePromise: Promise<Workspace> | undefined

/** An open question (AppUi.choose), waiting for the user's answer. */
interface ChoiceState {
  request: ChoiceRequest
  resolve: (value: string | null) => void
}

/** An open template picker, waiting for the user's choice. */
interface PickerRequest {
  mode: PickerMode
  resolve: (result: string | null) => void
}

/**
 * App shell: sidebar + open page, template picker and toasts.
 * Keyboard: Alt+N, Alt+Shift+N, Alt+T (README).
 */
function App() {
  const [workspace, setWorkspace] = useState<Workspace>()
  const [openFailed, setOpenFailed] = useState(false)
  // An address in the browser wins over what was open last time.
  const [boot] = useState<Route | null>(() =>
    location.hash.length > 1 ? parseHash(location.hash) : null,
  )
  const [currentPageId, setCurrentPageId] = usePref(
    'currentPage',
    isStringOrNull,
    null,
    () =>
      boot?.kind === 'page'
        ? boot.id
        : boot?.kind === 'home'
          ? null
          : undefined,
  )
  // An open notebook (its tabs) replaces the open page the same way.
  const [notebookId, setNotebookId] = usePref(
    'currentNotebook',
    isStringOrNull,
    null,
    () => (boot ? (boot.kind === 'notebook' ? boot.id : null) : undefined),
  )
  // Settings replaces the open page in the main area until a page is opened.
  const [showSettings, setShowSettings] = useState(boot?.kind === 'settings')
  // Setting to scroll to and highlight when Settings opens (e.g. from a dialog).
  const [settingsFocus, setSettingsFocus] = useState<string | null>(null)
  const openSettings = (settingId?: string) => {
    setHub(null)
    setReviewScope(null)
    setSearch(null)
    setNotebookId(null)
    setSettingsFocus(settingId ?? null)
    setShowSettings(true)
  }
  // "All cards", "All databases" and one open database replace the page too.
  const [hub, setHub] = useState<
    | { kind: 'cards' }
    | { kind: 'databases' }
    | { kind: 'database'; id: string }
    | { kind: 'data' }
    | { kind: 'calendar' }
    | { kind: 'lab' }
    | { kind: 'read'; pageId: string; at?: string }
    | { kind: 'capture'; url?: string; title?: string; text?: string }
    | null
  >(() =>
    boot?.kind === 'database'
      ? { kind: 'database', id: boot.id }
      : boot?.kind === 'read' || boot?.kind === 'capture'
        ? boot
        : boot?.kind === 'databases' ||
            boot?.kind === 'cards' ||
            boot?.kind === 'data' ||
            boot?.kind === 'calendar' ||
            boot?.kind === 'lab'
          ? { kind: boot.kind }
          : null,
  )
  // The whole-app Notes · Summary · Review views share the "All cards" screen.
  const [studyTab, setStudyTab] = useState<'notes' | 'summary' | 'review'>(
    'review',
  )
  const reviewV2 = useFlag('review.v2')
  // Review replaces the open page the same way (null = not reviewing).
  const [reviewScope, setReviewScope] = useState<ReviewScope | null>(() =>
    boot?.kind === 'review' && boot.scope.kind !== 'custom' ? boot.scope : null,
  )
  // The Search screen replaces the open page the same way. `key` starts
  // it afresh each time a search is opened from outside it.
  const [search, setSearch] = useState<{
    query: SearchQuery
    key: number
    /** Set when a saved search is open. */
    savedId?: string
    fromAddress?: boolean
  } | null>(() => (boot?.kind === 'search' ? searchOf(boot) : null))
  const [searchPopup, setSearchPopup] = useState(false)
  // "Search all features" opens the one Search on its Features chip.
  const [searchChip, setSearchChip] = useState<'all' | 'feature'>('all')
  const openSearchPopup = (chip: 'all' | 'feature' = 'all') => {
    setSearchChip(chip)
    setSearchPopup(true)
  }
  // The spaces: which one the sidebar shows (remembered per device). An
  // address that belongs to a space wins over the remembered one.
  const hiddenSpaces = useHiddenSpaces()
  const [lastSpace, setLastSpace] = usePref<Space>(
    'space',
    isSpace,
    'notebooks',
    () => (boot ? (spaceForRoute(boot) ?? undefined) : undefined),
  )
  const space = usableSpace(lastSpace, hiddenSpaces)
  const handwritingOpen = handwritingChooser.useValue()
  const lassoSheet = lassoSheetOpen.useValue()
  // The first-run welcome (it takes the place of the device picker).
  // A boolean snapshot: re-renders only when sign-in flips, not on every sync tick.
  const isSignedIn = useSyncExternalStore(
    subscribeSync,
    () => getSyncStatus().phase !== 'signedOut',
  )
  const [welcomeAtStart, setWelcomeAtStart] = useState(welcomeNeeded)
  const welcomeAgain = welcomeOpen.useValue()
  const signInGuide = onboardingGuide.useValue()
  // The device picker.
  const [devicePicker, setDevicePicker] = useState(
    () => !devicePickerDone.get() && !welcomeNeeded(),
  )
  /** Opens a notebook's tabs (Notes · Database · Cards). */
  const openNotebookTabs = (id: string) => {
    touchNotebookOpened(id)
    setHub(null)
    setShowSettings(false)
    setReviewScope(null)
    setSearch(null)
    setNotebookId(id)
  }
  /**
   * R6-12: a notebook opens at its last page (or first page) with the tree
   * unfolded to it, as the setting says; "tabs" or an empty notebook opens
   * the notebook screen.
   */
  const openNotebook = (
    id: string,
    mode = readDeviceSetting(openNotebookAtSetting),
  ) => {
    if (mode === 'tabs') return openNotebookTabs(id)
    void pageForNotebook(db, id, mode).then(async (page) => {
      if (!page) return openNotebookTabs(id)
      tree.expandNotebook(id)
      for (const p of await getPagePath(db, page.id)) {
        if (p.id !== page.id) tree.expandPage(p.id)
      }
      openPage(page.id)
    })
  }
  const openPage = (id: string | null) => {
    setHub(null)
    setShowSettings(false)
    setReviewScope(null)
    setSearch(null)
    setNotebookId(null)
    setCurrentPageId(id)
    if (id) rememberPage(id)
  }
  /** Opens the reader at a highlight (daily review, a card's source line). */
  const openAnnotation = (a: Pick<Annotation, 'pageId' | 'anchor'>) => {
    const at = locatorOf(a.anchor)
    if (!at) return openPage(a.pageId)
    setReviewScope(null)
    setShowSettings(false)
    setSearch(null)
    setNotebookId(null)
    setHub({ kind: 'read', pageId: a.pageId, at })
  }
  const openReview = (scope: ReviewScope) => {
    setHub(null)
    setShowSettings(false)
    setSearch(null)
    setNotebookId(null)
    setReviewScope(scope)
  }
  const openSearch = (query: SearchQuery, savedId?: string) => {
    setHub(null)
    setShowSettings(false)
    setReviewScope(null)
    setSearchPopup(false)
    setNotebookId(null)
    setSearch({ query, key: Date.now(), savedId })
  }
  /** Search screen showing everything with a tag. */
  const openTag = (tagId: string) =>
    openSearch({
      text: '',
      type: 'all',
      filters: { ...DEFAULT_FILTERS, tagId },
    })
  /** The Calendar screen (dated rows and journal days). */
  const openCalendar = () => {
    openPage(null)
    setHub({ kind: 'calendar' })
  }
  const savedSearch = useLiveQuery(
    async () =>
      search?.savedId ? getSavedSearch(db, search.savedId) : undefined,
    [search?.savedId],
  )
  /** Reviews the cards a saved search finds (a deck). */
  const reviewSavedSearch = async (saved: SavedSearch) => {
    const { hits } = await runSearch(db, readSavedQuery(saved.query))
    const blockIds = hits.flatMap((h) =>
      h.type === 'card' && h.blockId ? [h.blockId] : [],
    )
    openReview({ kind: 'blocks', blockIds, name: saved.name })
  }
  /** Opens a search result at its block; one in the Trash offers Restore. */
  const openHit = async (hit: SearchHit) => {
    if (hit.deleted) {
      const name = (await describeHits(db, [hit])).get(hit.id)?.pageTitle
      appUi.toast(t('search.trashed', { name: name || t('review.untitled') }), {
        label: t('search.restore'),
        onSelect: () =>
          runTask(
            (async () => {
              await restorePage(db, hit.pageId)
              openPage(hit.pageId)
              if (hit.blockId) revealBlock(hit.blockId)
            })(),
          ),
      })
      return
    }
    openPage(hit.pageId)
    if (hit.blockId) revealBlock(hit.blockId)
  }
  // ---- Browser history: every screen has an address (app/router.ts) ----
  const route: Route = showSettings
    ? { kind: 'settings', parts: [] }
    : reviewScope
      ? {
          kind: 'review',
          scope:
            reviewScope.kind === 'blocks'
              ? { kind: 'custom' }
              : reviewScope.kind === 'page'
                ? {
                    kind: 'page',
                    pageId: reviewScope.pageId,
                    includeSubpages: !!reviewScope.includeSubpages,
                  }
                : reviewScope,
        }
      : hub
        ? hub.kind === 'database'
          ? { kind: 'database', id: hub.id, parts: [] }
          : hub.kind === 'read' || hub.kind === 'capture'
            ? hub
            : { kind: hub.kind }
        : search
          ? search.savedId
            ? { kind: 'search', savedId: search.savedId }
            : { kind: 'search', query: { ...search.query } }
          : notebookId
            ? { kind: 'notebook', id: notebookId, parts: [] }
            : currentPageId
              ? { kind: 'page', id: currentPageId }
              : { kind: 'home' }
  const routeHash = routeToHash(route)
  // Undo works on the open page (or database): one history for each.
  const historyScope =
    route.kind === 'page'
      ? `page:${route.id}`
      : route.kind === 'read'
        ? `page:${route.pageId}`
        : route.kind === 'database'
          ? `db:${route.id}`
          : null
  useEffect(() => setActiveScope(historyScope), [historyScope])
  const routeHashRef = useRef(routeHash)
  useEffect(() => {
    routeHashRef.current = routeHash
  })
  const historyReady = useRef(false)
  // The address when the app first drew: if it differs by the first effect, a
  // link was opened while the app was starting (see the route effect below).
  const firstHash = useRef(location.hash)
  const replaceNext = useRef(false)
  const checkAddress = useRef(true)

  /** Shows the screen an address points to (no history entry is added). */
  const applyRoute = (r: Route) => {
    setShowSettings(false)
    setSettingsFocus(null)
    setReviewScope(null)
    setSearch(null)
    setHub(null)
    setNotebookId(null)
    switch (r.kind) {
      case 'home':
        setCurrentPageId(null)
        break
      case 'page':
        setCurrentPageId(r.id)
        rememberPage(r.id)
        break
      case 'notebook':
        setNotebookId(r.id)
        break
      case 'database':
        setHub({ kind: 'database', id: r.id })
        break
      case 'settings':
        setShowSettings(true)
        break
      case 'search':
        setSearch(searchOf(r))
        break
      case 'review':
        setReviewScope(r.scope.kind === 'custom' ? null : r.scope)
        break
      case 'read':
      case 'capture':
        setHub(r)
        break
      default:
        setHub({ kind: r.kind })
    }
  }

  // Cost currency: keep this browser's copy equal to the synced setting.
  useEffect(() => {
    let stop: (() => void) | undefined
    void import('./ai/costCurrency').then((m) => {
      stop = m.startCurrencyMirror(db)
    })
    return () => stop?.()
  }, [])

  // Back / Forward: show the screen of the address (unless only the
  // notebook's tab or the database's view changed; those listen themselves).
  useEffect(() => {
    const onPop = () => {
      if (baseHash(location.hash) === routeHashRef.current) return
      checkAddress.current = true
      applyRoute(parseHash(location.hash))
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // A new screen adds a history entry; the first write and the fix-up for a
  // missing page only replace the entry they are on.
  useEffect(() => {
    if (!historyReady.current && location.hash !== firstHash.current) {
      // Opened while starting: follow the new address, never overwrite it with
      // the screen the app began on.
      historyReady.current = true
      checkAddress.current = true
      replaceNext.current = true
      applyRoute(parseHash(location.hash))
      return
    }
    if (baseHash(location.hash) === routeHash) {
      historyReady.current = true
      replaceNext.current = false // nothing to replace: do not carry it over
      return
    }
    const replace = !historyReady.current || replaceNext.current
    historyReady.current = true
    replaceNext.current = false
    if (replace) replaceEntry(routeHash)
    else pushEntry(routeHash)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeHash])
  const [renamingNotebookId, setRenamingNotebookId] = useState<string | null>(
    null,
  )
  const tree = useTreeState()
  const [theme, setTheme] = useDeviceSetting(themeSetting)
  // Dates follow this setting everywhere; changing it re-draws the app.
  const [dateStyle] = useDeviceSetting(dateStyleSetting)
  setDateStyle(dateStyle)
  // The app's texts follow this setting; a language file loads when needed.
  // The labels for marking words (Settings › Review); notes use them live.
  const labelSetting = useSyncedSetting(db, reviseLabelsSetting)
  useEffect(() => {
    if (labelSetting) setMarkLabels(labelSetting)
  }, [labelSetting])
  const [language] = useDeviceSetting(languageSetting)
  const [, setTextsVersion] = useState(0)
  useEffect(() => {
    let current = true
    applyLanguage(language).then(
      () => current && setTextsVersion((v) => v + 1),
      (error: unknown) => console.error('Could not load the language', error),
    )
    return () => {
      current = false
    }
  }, [language])
  useEffect(() => applyTheme(theme), [theme])
  // Glass: the person's choice, else a frame-time probe switches it to solid.
  const [glassChoice] = useDeviceSetting(reduceGlassSetting)
  useEffect(() => {
    setGlassLite(glassChoice === 'reduce')
    if (glassChoice === 'reduce') return
    return startGlassProbe(() => setGlassLite(true))
  }, [glassChoice])

  useEffect(() => {
    workspacePromise ??= (async () => {
      const ws = await getOrCreateDefaultWorkspace(db)
      await ensureTemplates(db, ws.id) // starter templates on first run
      await noteFirstUse(db) // the backup reminder counts from here
      // Indexes notes saved before search existed; runs in the background.
      ensureSearchIndex(db).catch((error: unknown) =>
        console.error('Could not build the search index', error),
      )
      return ws
    })()
    workspacePromise.then(setWorkspace, (error: unknown) => {
      console.error('Could not open workspace', error)
      setOpenFailed(true)
    })
  }, [])

  // Live data. undefined = still loading.
  const notebooks = useLiveQuery(
    () => workspace && listNotebooks(db, workspace.id),
    [workspace],
  )
  const openNotebookRecord = notebooks?.find(
    (n) => n.id === notebookId && !n.kind,
  )
  const currentPage = useLiveQuery(
    async () =>
      currentPageId ? ((await getPage(db, currentPageId)) ?? null) : null,
    [currentPageId],
  )

  // R6-12: each notebook remembers the page last open in it (this device).
  useEffect(() => {
    if (currentPage && !currentPage.databaseId) {
      rememberNotebookPage(currentPage.notebookId, currentPage.id)
      touchNotebookOpened(currentPage.notebookId)
    }
  }, [currentPage?.id, currentPage?.notebookId]) // eslint-disable-line react-hooks/exhaustive-deps

  // No backup file for a week: a gentle reminder (not while reviewing).
  const backupDue = useLiveQuery(() => reminderDue(db), [])

  // On a phone the sidebar slides in over the page. It is open for the
  // screen it was opened on, so any move to another screen closes it.
  const [drawerAt, setDrawerAt] = useState<string | null>(null)
  const drawerOpen = drawerAt === routeHash
  // Choosing the screen already open moves nowhere, so choices close it too.
  const choose = (run: () => void) => {
    setDrawerAt(null)
    run()
  }
  // The strip: Home and Library show their own page; Notebooks and Review
  // show their list (on a phone the list is the drawer).
  const chooseSpace = (next: Space) => {
    setLastSpace(next)
    if (next === 'home' || next === 'library') {
      setDrawerAt(null)
      openPage(null)
    } else if (
      next === 'notebooks' &&
      (space === 'notebooks' || !matchMedia(PHONE_SCREEN).matches)
    ) {
      // The Notebooks icon opens the shelf (on a phone, from another space it opens the list).
      setDrawerAt(null)
      openPage(null)
    } else if (next === 'review' && !matchMedia(PHONE_SCREEN).matches) {
      // The Review icon opens the Review space itself, not the page that was open.
      setDrawerAt(null)
      openPage(null)
    } else if (matchMedia(PHONE_SCREEN).matches) setDrawerAt(routeHash)
  }
  // Opening something that belongs to a space (a page, Review …) by any
  // way, a link, Back or a search, moves the sidebar to that space.
  useEffect(() => {
    const next = spaceForRoute(route)
    if (next) setLastSpace(next)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeHash])
  useEffect(() => {
    if (!drawerOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerAt(null)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawerOpen])

  // Hiding the sidebar is remembered on this device.
  const [sidebarWidth, setSidebarWidth] = usePref(
    'sidebarWidth',
    isSidebarWidth,
    SIDEBAR_DEFAULT,
  )
  const [sidebarHidden, setSidebarHidden] = useState(() =>
    readPref('sidebarHidden', isBoolean, false),
  )
  const [panelOpen, setPanelOpen] = usePref('leftPanel.open', isBoolean, false)
  const outlineAsk = outlineRequest.useValue()
  useEffect(() => {
    if (outlineAsk.n > 0) setPanelOpen(true)
  }, [outlineAsk.n, setPanelOpen])
  const toggleSidebar = () => {
    setSidebarHidden(!sidebarHidden)
    writePref('sidebarHidden', !sidebarHidden)
  }
  const [barSlot, setBarSlot] = useState<HTMLElement | null>(null)
  const labPage = labPageId.useValue()
  const [stackSlot, setStackSlot] = useState<HTMLElement | null>(null)

  // ---- App-wide UI: template picker and toasts ----
  const [picker, setPicker] = useState<PickerRequest | null>(null)
  const [choice, setChoice] = useState<ChoiceState | null>(null)
  const [toastMessage, setToastMessage] = useState<{
    message: string
    action?: ToastAction
  } | null>(null)
  // A new version waiting for the user's OK (its own bar, so messages and
  // their Undo never replace it, or the other way round).
  const [applyUpdate, setApplyUpdate] = useState<(() => void) | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)
  // Hovering or tapping a toast keeps it open; leaving lets it close soon.
  const holdToast = () => clearTimeout(toastTimer.current)
  const releaseToast = () => {
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(
      () => setToastMessage(null),
      TOAST_AFTER_HOLD_MS,
    )
  }
  const appUi: AppUi = {
    chooseTemplate: (mode) =>
      new Promise((resolve) => setPicker({ mode, resolve })),
    choose: (request) =>
      new Promise((resolve) => setChoice({ request, resolve })),
    askName: (title, initial) =>
      new Promise((resolve) => setNameAsk({ title, initial, resolve })),
    openSettings,
    toast: (message, action) => {
      // Choosing the action also closes the toast.
      const closing = action && {
        ...action,
        onSelect: () => {
          setToastMessage(null)
          action.onSelect()
        },
      }
      setToastMessage({ message, action: closing })
      clearTimeout(toastTimer.current)
      // Longer messages and ones with an action stay longer.
      toastTimer.current = setTimeout(
        () => setToastMessage(null),
        toastDuration(message, !!action),
      )
    },
  }

  const showToast = appUi.toast
  useAutoDeviceMode(showToast)
  const [pencilOffer, closePencilOffer] = usePencilOfferTrigger()
  // Home is a lazy screen; fetch it quietly once the app is up.
  useEffect(() => {
    const id = setTimeout(() => void loadHome(), 1000)
    return () => clearTimeout(id)
  }, [])
  const showToastRef = useRef(showToast)
  useEffect(() => {
    showToastRef.current = showToast
  })
  // A new version is ready: it starts only when the user says so. Unsaved
  // text is safe, because the editor keeps it when the page reloads.
  useEffect(() => onUpdateOffer((apply) => setApplyUpdate(() => apply)), [])
  // Automatic updates: the bar below shows only when the setting is off; a
  // question shows only when an update could lose data.
  const [autoUpdate] = useDeviceSetting(autoUpdateSetting)
  const updateQuestion = updateRisk.useValue()
  const updatePhase = updateStatus.useValue().phase
  const mandatory = mandatoryUpdate.useValue() !== null
  // The alerts banner (one spot at the top) shows the waiting update.
  useEffect(() => {
    setSignals({
      updateReady: !!applyUpdate && autoUpdate !== 'on',
      applyUpdate: applyUpdate
        ? () => {
            applyUpdate()
          }
        : null,
    })
  }, [applyUpdate, autoUpdate])
  useEffect(() => {
    loadBackupFailures()
    const stopWatch = watchFailures()
    void checkStorage()
    // Say so once when Google lets Drive in again.
    let tapped = !!getSyncStatus().needsDriveTap
    const stop = subscribeSync(() => {
      const now = !!getSyncStatus().needsDriveTap
      if (tapped && !now) showToastRef.current(t('attention.fixed'))
      tapped = now
    })
    return () => {
      stop()
      stopWatch()
    }
  }, [])
  // After a restart by an update: keep the scroll and say so, once.
  useEffect(() => {
    if (!restoreAfterUpdate()) return
    // The late-loaded texts must be in before the words are looked up.
    void applyLanguage(readDeviceSetting(languageSetting)).then(() =>
      showToastRef.current(
        t('upd.updated', { version: __APP_COMMIT__.slice(0, 7) }),
      ),
    )
  }, [])

  // After a soft refresh (stuck tool): put the place back; say so when it was automatic.
  useEffect(() => {
    // Only after a refresh: the module is not in the first download.
    if (!sessionStorage.getItem('ln.softRefresh')) return
    void import('./app/softRefresh').then(async (m) => {
      if (m.restoreSoftRefresh() !== 'auto') return
      await applyLanguage(readDeviceSetting(languageSetting))
      showToastRef.current(t('refresh.auto.done'))
    })
  }, [])

  // No space left: say so, at most once a minute. Other background
  // failures are logged too.
  useEffect(() => {
    let lastShown = 0
    const stop = onStorageFull(() => {
      if (Date.now() - lastShown < 60_000) return
      lastShown = Date.now()
      showToastRef.current(t('storage.full'))
    })
    const onRejection = (e: PromiseRejectionEvent) =>
      reportError(e.reason as unknown)
    window.addEventListener('unhandledrejection', onRejection)
    return () => {
      stop()
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  // A saved search opened from an address: read its query.
  useEffect(() => {
    if (!search?.fromAddress || !search.savedId) return
    const { key, savedId } = search
    getSavedSearch(db, savedId).then((saved) => {
      setSearch((s) =>
        s?.key === key
          ? {
              query: saved ? readSavedQuery(saved.query) : s.query,
              key: Date.now(),
              savedId,
            }
          : s,
      )
    }, console.error)
  }, [search])

  // An address can point to a page or notebook that is gone: show Home.
  // The check says which page it looked at: after a move, `currentPage` can
  // still hold the previous answer for a moment.
  const pageCheck = useLiveQuery(
    async () => ({
      id: currentPageId,
      found: !!currentPageId && !!(await getPage(db, currentPageId)),
    }),
    [currentPageId],
  )
  useEffect(() => {
    if (!notebooks || pageCheck?.id !== currentPageId) return
    if (!checkAddress.current) return
    checkAddress.current = false
    const missing =
      (!!notebookId && !openNotebookRecord && !showSettings) ||
      (!!currentPageId && !pageCheck.found)
    if (!missing) return
    queueMicrotask(() => {
      replaceNext.current = true
      openPage(null)
      appUi.toast(t('nav.gone'))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notebooks, notebookId, currentPageId, pageCheck])

  // A newly created page whose title should get the cursor.
  // Bumped when a tag merge/delete rewrites the open page's notes.
  const [notesVersion, setNotesVersion] = useState(0)
  const [focusTitlePageId, setFocusTitlePageId] = useState<string | null>(null)
  const [startOfferPageId, setStartOfferPageId] = useState<string | null>(null)
  // Touch and Pencil: a new page is named in the Name it sheet.
  const [nameAsk, setNameAsk] = useState<{
    title: string
    initial: string
    resolve: (name: string | null) => void
  } | null>(null)

  /** Shows a just-created page: reveal it in the sidebar and open it. */
  const openNewPage = (page: Page, focusTitle = true) => {
    tree.expandNotebook(page.notebookId)
    if (page.parentId) tree.expandPage(page.parentId)
    setFocusTitlePageId(focusTitle ? page.id : null)
    openPage(page.id)
  }

  const createPageIn = async (
    notebookId: string,
    parentId: string | null,
    focusTitle = true,
    templateId?: string,
  ): Promise<Page> => {
    // N2: with "Always start new pages as Study" on, a plain new page is filled
    // from the Study template (quietly: no toast).
    const studyId =
      !templateId &&
      workspace &&
      (await getSetting(db, newPageStudySetting)) === 'on'
        ? (await getStudyTemplate(db, workspace.id))?.id
        : undefined
    const fillId = templateId ?? studyId
    const page = fillId
      ? await createPageFromTemplate(db, notebookId, parentId, fillId)
      : await createPage(db, notebookId, parentId)
    // Settings › Default paper style: a page that came with no paper of its
    // own (a template's own paper wins) starts on the chosen one.
    const paper = choiceToBg(await getSetting(db, defaultPaperSetting))
    if (paper && !page.inkBg) {
      await setPageInkBg(db, page.id, paper)
      page.inkBg = paper
    }
    const sheet = focusTitle && touchUi() && !fillId
    openNewPage(page, focusTitle && !sheet)
    if (sheet) {
      void appUi
        .askName(t('nameSheet.newPage'), '')
        .then((name) => name && runTask(renamePage(db, page.id, name)))
    }
    if (templateId) {
      const template = await getPage(db, templateId)
      appUi.toast(
        t('app.newPageFromTemplate', {
          name: template?.title || t('app.templateWord'),
        }),
      )
    }
    return page
  }

  const createNotebookAndOpen = async () => {
    if (!workspace) return
    const notebook = await createNotebook(
      db,
      workspace.id,
      t('notebook.newName'),
    )
    // The notebook name field (or sheet) keeps the cursor, not the page title.
    if (touchUi()) {
      void appUi
        .askName(t('nameSheet.newNotebook'), notebook.title)
        .then((name) => name && runTask(renameNotebook(db, notebook.id, name)))
    } else setRenamingNotebookId(notebook.id)
    const first = await createPageIn(notebook.id, null, false)
    setStartOfferPageId(first.id)
  }

  const closeWelcome = () => {
    setWelcomeAtStart(false)
    welcomeOpen.set(false)
  }
  /** "Start here" (polish 2, item 2): makes the sample notebook and opens its first page. */
  const startHere = async () => {
    if (!workspace) return
    const { loadStartHere } = await import('./onboarding/startHere')
    const { notebook } = await loadStartHere(db, workspace.id)
    openNotebook(notebook.id, 'first')
  }

  /** "New page from this template": in the first normal notebook. */
  const newPageFromTemplate = async (templateId: string) => {
    if (!workspace) return
    const target =
      notebooks?.find((n) => !n.kind) ??
      (await createNotebook(db, workspace.id, t('notebook.firstName')))
    await createPageIn(target.id, null, true, templateId)
  }

  const openToday = async () => {
    if (!workspace) return
    const { page, created } = await openJournalDay(db, workspace.id)
    openNewPage(page, false)
    if (created) {
      appUi.toast(t('app.journalCreated'))
    }
  }

  /** Opens (or starts) the journal page of a "YYYY-MM-DD" day. */
  const openJournalOn = async (day: string) => {
    if (!workspace) return
    const [y, m, d] = day.split('-').map(Number)
    const { page } = await openJournalDay(
      db,
      workspace.id,
      new Date(y, m - 1, d),
    )
    openNewPage(page, false)
  }

  const newTemplate = async () => {
    if (!workspace) return
    openNewPage(await createTemplate(db, workspace.id))
  }

  // Keyboard shortcuts (handler kept in a ref so it always sees fresh state).
  const onShortcut = useRef<(e: KeyboardEvent) => void>(() => {})
  useEffect(() => {
    onShortcut.current = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.code === 'Backslash') {
        // Ctrl+\: hide or show the menu
        e.preventDefault()
        if (matchMedia(PHONE_SCREEN).matches) {
          setDrawerAt(drawerOpen ? null : routeHash)
        } else toggleSidebar()
        return
      }
      if (!e.altKey || e.ctrlKey || e.metaKey) return
      if (e.code === 'KeyR' && !e.shiftKey) {
        // Alt+R: review the open page
        if (!currentPage) return
        if (!notebooks?.some((n) => n.id === currentPage.notebookId)) return
        e.preventDefault()
        openReview({ kind: 'page', pageId: currentPage.id })
        return
      }
      if (e.code === 'KeyT' && !e.shiftKey) {
        // Alt+T: today's journal page
        e.preventDefault()
        runTask(openToday())
        return
      }
      if (e.code !== 'KeyN') return
      e.preventDefault()
      if (e.shiftKey) {
        // Alt+Shift+N: new sub-page of the open page
        if (currentPage)
          runTask(createPageIn(currentPage.notebookId, currentPage.id))
        return
      }
      // Alt+N: new page in the current (or first) notebook
      const notebookId = currentPage?.notebookId ?? notebooks?.[0]?.id
      runTask(
        notebookId ? createPageIn(notebookId, null) : createNotebookAndOpen(),
      )
    }
  })
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onShortcut.current(e)
    window.addEventListener('keydown', listener)
    // Ctrl+K / ⌘K: search, from anywhere. Caught before the editor sees it.
    const searchKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        !e.altKey &&
        !e.shiftKey &&
        e.code === 'KeyK'
      ) {
        e.preventDefault()
        e.stopPropagation()
        setSearchChip('all')
        setSearchPopup(true)
      }
    }
    window.addEventListener('keydown', searchKey, { capture: true })
    // Ctrl/Cmd+Shift+K opens the same Search (the control panel is part of it).
    const panelKey = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        !e.altKey &&
        e.code === 'KeyK'
      ) {
        e.preventDefault()
        e.stopPropagation()
        setSearchChip('all')
        setSearchPopup(true)
      }
    }
    window.addEventListener('keydown', panelKey, { capture: true })
    return () => {
      window.removeEventListener('keydown', panelKey, { capture: true })
      window.removeEventListener('keydown', listener)
      window.removeEventListener('keydown', searchKey, { capture: true })
    }
  }, [])

  // Locked things lock again when you leave them, hide the app or stop using it.
  const placeIsPage =
    !showSettings && !reviewScope && !hub && !search && !openNotebookRecord
  useAutoRelock(db, {
    pageId: placeIsPage ? (currentPage?.id ?? undefined) : undefined,
    notebookId:
      !showSettings && !reviewScope && !hub && !search
        ? (openNotebookRecord?.id ?? undefined)
        : undefined,
    databaseId: !showSettings && hub?.kind === 'database' ? hub.id : undefined,
  })

  // What the control panel, ribbon and bar can ask the app to do. Registered
  // on every draw, so the actions always see the current screen.
  useEffect(() => {
    setAppActions({
      toast: appUi.toast,
      openSettings: (id) => openSettings(id),
      openData: () => {
        openPage(null)
        setHub({ kind: 'data' })
      },
      openAllCards: () => {
        openPage(null)
        setStudyTab('review')
        setHub({ kind: 'cards' })
      },
      openDatabases: () => {
        openPage(null)
        setHub({ kind: 'databases' })
      },
      openCalendar,
      openToday: () => runTask(openToday()),
      openSearch: () => setSearchPopup(true),
      openReview: (scope) =>
        openReview(
          scope === 'page' && currentPage
            ? { kind: 'page', pageId: currentPage.id }
            : { kind: 'all' },
        ),
      openControlPanel: () => openSearchPopup('feature'),
      choose: appUi.choose,
      openDevicePicker: () => setDevicePicker(true),
      showSidebar: () => {
        if (matchMedia(PHONE_SCREEN).matches) setDrawerAt(routeHash)
        else if (sidebarHidden) toggleSidebar()
      },
      openNotebookTab: (tab) => {
        if (!currentPage) {
          appUi.toast(t('tool.needsPage'))
          return
        }
        location.hash = routeToHash({
          kind: 'notebook',
          id: currentPage.notebookId,
          parts: [tab],
        })
      },
      setTheme,
      cycleTheme: () =>
        setTheme(THEMES[(THEMES.indexOf(theme) + 1) % THEMES.length]),
      lockCurrent: (kind) => {
        if (!currentPage) {
          appUi.toast(t('tool.needsPage'))
          return
        }
        runTask(
          toggleLock(
            db,
            kind,
            kind === 'page' ? currentPage.id : currentPage.notebookId,
            appUi.toast,
          ),
        )
      },
      toggleFavourite: () => {
        if (!currentPage) {
          appUi.toast(t('tool.needsPage'))
          return
        }
        appUi.toast(
          t(toggleFavourite(currentPage.id) ? 'fav.added' : 'fav.removed'),
        )
      },
      currentPageId: () => currentPage?.id ?? null,
    })
  })
  useEffect(() => () => setAppActions(null), [])
  // Links to the app's own addresses (saved highlights) open inside the app.
  useEffect(() => installDeepLinks(), [])

  // The top bar's name for the open screen (pages put their own path there).
  const barTitle = showSettings
    ? t('settings.title')
    : reviewScope
      ? t('review.sidebar')
      : hub?.kind === 'cards'
        ? t('sidebar.allCards')
        : hub?.kind === 'data'
          ? t('sidebar.data')
          : hub?.kind === 'calendar'
            ? t('calendar.screen')
            : hub?.kind === 'capture'
              ? t('capture.title')
              : hub?.kind === 'read'
                ? null
                : hub
                  ? t('sidebar.allDatabases')
                  : search
                    ? (savedSearch?.name ?? t('search.title'))
                    : (openNotebookRecord?.title ?? null)

  // Never shown as an empty app: the notes are most likely still there.
  if (openFailed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-bg p-4 text-ink">
        <div role="alert" className="w-[min(30rem,100%)] text-center">
          <h1 className="mb-2 text-lg font-semibold">
            {t('open.failed.title')}
          </h1>
          <p className="mb-5 text-sm leading-relaxed text-muted">
            {t('open.failed.message')}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="min-h-10 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            {t('open.failed.retry')}
          </button>
        </div>
      </main>
    )
  }

  if (!workspace || !notebooks) return null // loading (a split second)

  const reviewV2Screen = (scope: ReviewScope | null) => (
    <ReviewV2
      key={JSON.stringify(scope)}
      db={db}
      scope={scope}
      keysPaused={drawerOpen}
      onOpenNote={(pageId, blockId) => {
        openPage(pageId)
        revealBlock(blockId)
      }}
      onOpenAnnotation={(id) =>
        runTask(db.annotations.get(id).then((a) => a && openAnnotation(a)))
      }
      onOpenNotebooks={() => chooseSpace('notebooks')}
      onClose={() => setReviewScope(null)}
    />
  )

  return (
    <ThemeContext value={theme}>
      <AppUiContext value={appUi}>
        <TopBarSlotContext value={barSlot}>
          <TopStackSlotContext value={stackSlot}>
            <div
              data-app-shell
              className="bg-wash flex h-screen h-dvh gap-[var(--frame-gap)] px-[var(--frame-gap)] pb-[var(--frame-gap)] phone:pb-[calc(56px+env(safe-area-inset-bottom))]"
              style={
                {
                  '--sidebar-width': `${sidebarWidth}px`,
                  paddingTop: 'calc(var(--attn-h, 0px) + var(--frame-gap))',
                } as CSSProperties
              }
            >
              <SpaceStrip
                spaces={visibleSpaces(hiddenSpaces)}
                current={space}
                onSelect={chooseSpace}
                corner={
                  <QuietCorner
                    db={db}
                    workspaceId={workspace.id}
                    theme={theme}
                    onThemeChange={setTheme}
                    settingsOpen={showSettings}
                    dataOpen={hub?.kind === 'data' && !showSettings}
                    onOpenSettings={() => choose(() => openSettings())}
                    onOpenData={() =>
                      choose(() => {
                        openPage(null)
                        setHub({ kind: 'data' })
                      })
                    }
                    onOpenHelp={() =>
                      choose(() => openSettings('general.showHelp'))
                    }
                  />
                }
              />
              <Sidebar
                db={db}
                workspaceId={workspace.id}
                notebooks={notebooks}
                currentPage={currentPage ?? null}
                tree={tree}
                space={space}
                renamingNotebookId={renamingNotebookId}
                onRenamingChange={setRenamingNotebookId}
                onOpenPage={(id) => choose(() => openPage(id))}
                drawerOpen={drawerOpen}
                hidden={sidebarHidden}
                onCloseDrawer={() => setDrawerAt(null)}
                openNotebookId={openNotebookRecord?.id ?? null}
                onOpenNotebook={(id) => choose(() => openNotebook(id))}
                onOpenToday={() => choose(() => runTask(openToday()))}
                libraryPanel={
                  <Suspense fallback={null}>
                    <LibrarySidebar
                      db={db}
                      workspaceId={workspace.id}
                      currentPageId={currentPage?.id ?? null}
                      onOpenPage={(id) => choose(() => openPage(id))}
                      onCapture={() =>
                        choose(() => {
                          openPage(null)
                          setHub({ kind: 'capture' })
                        })
                      }
                    />
                  </Suspense>
                }
                onCreateNotebook={() => runTask(createNotebookAndOpen())}
                onCreatePage={(notebookId, parentId, templateId) =>
                  runTask(createPageIn(notebookId, parentId, true, templateId))
                }
                onCreateTemplate={() => runTask(newTemplate())}
                reviewOpen={
                  reviewScope?.kind === 'all' || reviewScope?.kind === 'wrong'
                }
                onOpenReview={(scope) => choose(() => openReview(scope))}
                onOpenAllCards={() =>
                  choose(() => {
                    openPage(null)
                    setStudyTab('review')
                    setHub({ kind: 'cards' })
                  })
                }
                allCardsOpen={
                  hub?.kind === 'cards' &&
                  studyTab !== 'summary' &&
                  !showSettings &&
                  !reviewScope
                }
                onOpenSummaries={() =>
                  choose(() => {
                    openPage(null)
                    setStudyTab('summary')
                    setHub({ kind: 'cards' })
                  })
                }
                summariesOpen={
                  hub?.kind === 'cards' &&
                  studyTab === 'summary' &&
                  !showSettings &&
                  !reviewScope
                }
                onOpenAllDatabases={() =>
                  choose(() => {
                    openPage(null)
                    setHub({ kind: 'databases' })
                  })
                }
                allDatabasesOpen={
                  (hub?.kind === 'databases' || hub?.kind === 'database') &&
                  !showSettings &&
                  !reviewScope
                }
                searchOpen={
                  !!search && !search.savedId && !showSettings && !reviewScope
                }
                onOpenSearch={() => choose(() => setSearchPopup(true))}
                onOpenCalendar={() => choose(openCalendar)}
                calendarOpen={
                  hub?.kind === 'calendar' && !showSettings && !reviewScope
                }
                savedSearchId={
                  search && !showSettings && !reviewScope
                    ? (search.savedId ?? null)
                    : null
                }
                onOpenSavedSearch={(saved) =>
                  choose(() =>
                    openSearch(readSavedQuery(saved.query), saved.id),
                  )
                }
                onReviewSavedSearch={(saved) =>
                  choose(() => runTask(reviewSavedSearch(saved)))
                }
                onOpenTag={(tagId) => choose(() => openTag(tagId))}
                onNotesRewritten={(pageIds) => {
                  // The open page's editor still shows the old tags: reload it.
                  if (currentPage && pageIds.includes(currentPage.id)) {
                    setNotesVersion((v) => v + 1)
                  }
                }}
              />
              {!sidebarHidden && (
                <SidebarResizer
                  width={sidebarWidth}
                  onChange={setSidebarWidth}
                />
              )}
              {panelOpen && (currentPage || hub?.kind === 'read') && (
                <LeftPanel
                  db={db}
                  notebookId={currentPage?.notebookId ?? ''}
                  pageId={currentPage?.id ?? ''}
                  onOpenPage={(id) => openPage(id)}
                  onClose={() => setPanelOpen(false)}
                />
              )}
              {drawerOpen && (
                // A second way to close for fingers; the sidebar's button is the
                // one for keyboards and screen readers.
                <button
                  type="button"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setDrawerAt(null)}
                  className="fixed inset-0 z-30 hidden bg-black/30 phone:bottom-14 phone:block"
                />
              )}
              <div className="flex min-w-0 flex-1 flex-col gap-[var(--frame-gap)]">
                {/* One glass layer for the top bar and the tool bar (blur budget). The
                    glass is a sibling layer behind the bars: a backdrop-filter on
                    the wrapper itself would trap the floating bar and the tray
                    (position: fixed) inside it. */}
                <div
                  data-frame-bars
                  className="relative shrink-0 rounded-[var(--r-lg)]"
                >
                  <div
                    aria-hidden
                    className="glass pointer-events-none absolute inset-0 rounded-[inherit] phone:rounded-none phone:border-x-0 phone:border-t-0 phone:shadow-none"
                  />
                  <TopBar
                    title={barTitle}
                    sidebarHidden={sidebarHidden}
                    drawerOpen={drawerOpen}
                    onOpenDrawer={() => setDrawerAt(routeHash)}
                    onToggleSidebar={toggleSidebar}
                    panel={
                      currentPage || hub?.kind === 'read'
                        ? {
                            open: panelOpen,
                            onToggle: () => setPanelOpen(!panelOpen),
                          }
                        : undefined
                    }
                    onSlot={setBarSlot}
                  />
                  <div
                    ref={setStackSlot}
                    data-chrome
                    data-bar-slot
                    className="relative pb-1 empty:p-0"
                  />
                </div>
                {currentPage && currentPage.id === labPage && (
                  <Suspense fallback={null}>
                    <PencilLabPanel />
                  </Suspense>
                )}
                <main
                  data-page-scroller
                  className="mb-[var(--dock-bottom,0px)] min-h-0 flex-1 overflow-auto rounded-[var(--r-lg)] border border-line bg-bg pt-[var(--page-top-gap,0px)] shadow-[var(--elev-1)] phone:rounded-none phone:border-0 phone:shadow-none"
                >
                  <ErrorBoundary
                    resetKey={`${routeHash}:${notesVersion}:${currentPage?.id}`}
                    onHome={() => openPage(null)}
                    onSaveAll={saveEverything}
                  >
                    <Suspense fallback={null}>
                      {showSettings ? (
                        <SettingsScreen
                          key={settingsFocus ?? ''}
                          db={db}
                          focusId={settingsFocus ?? undefined}
                        />
                      ) : reviewV2 && reviewScope ? (
                        reviewV2Screen(reviewScope)
                      ) : reviewScope ? (
                        <ReviewScreen
                          key={JSON.stringify(reviewScope)}
                          db={db}
                          scope={reviewScope}
                          keysPaused={drawerOpen}
                          onScopeChange={setReviewScope}
                          onOpenNote={(pageId, blockId) => {
                            openPage(pageId)
                            revealBlock(blockId)
                          }}
                          onOpenAnnotation={(id) =>
                            runTask(
                              db.annotations
                                .get(id)
                                .then((a) => a && openAnnotation(a)),
                            )
                          }
                          onClose={() => setReviewScope(null)}
                        />
                      ) : hub?.kind === 'read' ? (
                        <BookReader
                          key={hub.pageId}
                          db={db}
                          pageId={hub.pageId}
                          at={hub.at}
                          onOpenPage={openPage}
                        />
                      ) : hub?.kind === 'capture' ? (
                        <CaptureScreen
                          key={routeHash}
                          db={db}
                          workspaceId={workspace.id}
                          draft={hub}
                          onOpenPage={openPage}
                          onClose={() => {
                            setHub(null)
                            setLastSpace('library')
                          }}
                        />
                      ) : hub?.kind === 'lab' ? (
                        <PencilLabEntry
                          db={db}
                          workspaceId={workspace.id}
                          onOpenPage={openPage}
                        />
                      ) : hub?.kind === 'cards' ? (
                        <AllCardsScreen
                          db={db}
                          onOpenHit={(hit) => runTask(openHit(hit))}
                          onReview={openReview}
                          onClose={() => setHub(null)}
                          tab={studyTab}
                          onTab={setStudyTab}
                          summary={
                            <Suspense fallback={null}>
                              <AppSummary
                                db={db}
                                workspaceId={workspace.id}
                                onOpenPage={openPage}
                              />
                            </Suspense>
                          }
                          notes={
                            <Suspense fallback={null}>
                              <NotesOverview
                                db={db}
                                workspaceId={workspace.id}
                                onOpenNotebook={openNotebook}
                                onOpenPage={openPage}
                              />
                            </Suspense>
                          }
                          highlights={
                            <DailyHighlights db={db} onOpen={openAnnotation} />
                          }
                        />
                      ) : hub?.kind === 'data' ? (
                        <DataScreen
                          db={db}
                          workspaceId={workspace.id}
                          onClose={() => setHub(null)}
                        />
                      ) : hub?.kind === 'calendar' ? (
                        <CalendarScreen
                          db={db}
                          workspaceId={workspace.id}
                          onOpenPage={openPage}
                          onOpenDay={(day) => runTask(openJournalOn(day))}
                          onClose={() => setHub(null)}
                        />
                      ) : hub?.kind === 'databases' ? (
                        <DatabasesScreen
                          db={db}
                          workspaceId={workspace.id}
                          onOpenDatabase={(id) =>
                            setHub({ kind: 'database', id })
                          }
                          onClose={() => setHub(null)}
                        />
                      ) : hub?.kind === 'database' ? (
                        <DatabaseGate db={db} databaseId={hub.id}>
                          <DatabaseScreen
                            key={hub.id}
                            db={db}
                            databaseId={hub.id}
                            onOpenPage={openPage}
                            onBack={() => setHub({ kind: 'databases' })}
                            onOpenDatabase={(id) =>
                              setHub({ kind: 'database', id })
                            }
                          />
                        </DatabaseGate>
                      ) : search ? (
                        <SearchScreen
                          key={search.key}
                          db={db}
                          initial={search.query}
                          title={savedSearch?.name}
                          // Typing changes the address in place (no new Back step).
                          onChange={(query) =>
                            setSearch((s) => {
                              if (!s || s.savedId) return s
                              if (
                                JSON.stringify(s.query) ===
                                JSON.stringify(query)
                              ) {
                                return s
                              }
                              replaceNext.current = true
                              return { ...s, query }
                            })
                          }
                          actions={(query) => (
                            <SaveSearchActions
                              db={db}
                              query={query}
                              saved={savedSearch}
                              onSaved={(saved) =>
                                setSearch(
                                  (s) => s && { ...s, savedId: saved.id },
                                )
                              }
                            />
                          )}
                          onOpenHit={(hit) => runTask(openHit(hit))}
                          onReview={(blockIds, name) =>
                            openReview({ kind: 'blocks', blockIds, name })
                          }
                          onClose={() => setSearch(null)}
                        />
                      ) : openNotebookRecord ? (
                        <LockGate
                          db={db}
                          rootId={
                            openNotebookRecord.locked
                              ? openNotebookRecord.id
                              : null
                          }
                          title={openNotebookRecord.title}
                          kind="notebook"
                        >
                          <NotebookScreen
                            key={openNotebookRecord.id}
                            db={db}
                            notebook={openNotebookRecord}
                            onOpenPage={openPage}
                            onCreatePage={(id) =>
                              runTask(createPageIn(id, null))
                            }
                            onOpenHit={(hit) => runTask(openHit(hit))}
                            onReview={openReview}
                            onClose={() => setNotebookId(null)}
                          />
                        </LockGate>
                      ) : currentPage ? (
                        <PageGate db={db} page={currentPage}>
                          <PageView
                            key={`${currentPage.id}:${notesVersion}`}
                            db={db}
                            page={currentPage}
                            autoFocusTitle={focusTitlePageId === currentPage.id}
                            offerStart={startOfferPageId === currentPage.id}
                            onOpenPage={openPage}
                            onOpenNewPage={openNewPage}
                            onReview={(includeSubpages) =>
                              openReview({
                                kind: 'page',
                                pageId: currentPage.id,
                                includeSubpages,
                              })
                            }
                            onNewPageFromTemplate={(id) =>
                              runTask(newPageFromTemplate(id))
                            }
                            onOpenTag={openTag}
                            onReload={() => setNotesVersion((v) => v + 1)}
                            onOpenBackup={() => {
                              openPage(null)
                              setHub({ kind: 'data' })
                            }}
                            onOpenDatabase={(id) => {
                              openPage(null)
                              setHub({ kind: 'database', id })
                            }}
                            onOpenAttachment={(fileId) =>
                              runTask(
                                openAttachment(workspace.id, fileId).then(
                                  (book) =>
                                    setHub({ kind: 'read', pageId: book.id }),
                                  (e: unknown) => {
                                    if (e instanceof FileError) {
                                      appUi.toast(e.message)
                                    } else throw e
                                  },
                                ),
                              )
                            }
                            header={
                              currentPage.source ? (
                                <BookHeader
                                  db={db}
                                  page={currentPage}
                                  onRead={(pageId, at) =>
                                    setHub({ kind: 'read', pageId, at })
                                  }
                                  onOpenPage={openPage}
                                  actions={
                                    <>
                                      <AiActions
                                        db={db}
                                        workspaceId={workspace.id}
                                        page={currentPage}
                                        onChanged={() =>
                                          setNotesVersion((v) => v + 1)
                                        }
                                      />
                                      <PageAiActions
                                        db={db}
                                        workspaceId={workspace.id}
                                        page={currentPage}
                                        onChanged={() =>
                                          setNotesVersion((v) => v + 1)
                                        }
                                      />
                                    </>
                                  }
                                />
                              ) : undefined
                            }
                          />
                        </PageGate>
                      ) : space === 'library' ? (
                        <LibraryScreen
                          db={db}
                          workspaceId={workspace.id}
                          onOpenPage={openPage}
                          onRead={(pageId, at) =>
                            setHub({ kind: 'read', pageId, at })
                          }
                          onCapture={(draft) =>
                            setHub({ kind: 'capture', ...draft })
                          }
                        />
                      ) : space === 'home' ? (
                        <HomeScreenSwitch
                          db={db}
                          deps={{
                            openToday: () => runTask(openToday()),
                            openPage: (id) => openPage(id),
                            countCardsDue: () => countDue(db, Date.now()),
                            openReview: () => openReview({ kind: 'all' }),
                            appendJournal: async (entries) => {
                              await appendJournalNotes(
                                db,
                                workspace.id,
                                entries,
                              )
                            },
                          }}
                        />
                      ) : notebooks.length === 0 && currentPage === null ? (
                        <EmptyState
                          testId="no-notebooks"
                          className="mx-auto mt-[24vh] max-w-md"
                          icon="📓"
                          text={t('app.empty.intro')}
                          action={t('app.empty.create')}
                          onAction={() => runTask(createNotebookAndOpen())}
                        />
                      ) : reviewV2 &&
                        space === 'review' &&
                        currentPage === null ? (
                        reviewV2Screen(null)
                      ) : space === 'review' && currentPage === null ? (
                        <ReviewHome
                          db={db}
                          notebooks={notebooks}
                          onReview={(scope) => openReview(scope)}
                          onAllCards={() => {
                            openPage(null)
                            setStudyTab('review')
                            setHub({ kind: 'cards' })
                          }}
                        />
                      ) : currentPage === null ? (
                        <NotebooksHome
                          db={db}
                          notebooks={notebooks}
                          onOpen={(id) => openNotebook(id)}
                          onCreate={() => runTask(createNotebookAndOpen())}
                        />
                      ) : null}
                    </Suspense>
                  </ErrorBoundary>
                </main>
              </div>
            </div>

            {picker && (
              <Suspense fallback={null}>
                <TemplatePicker
                  db={db}
                  workspaceId={workspace.id}
                  mode={picker.mode}
                  onDone={(result) => {
                    setPicker(null)
                    picker.resolve(result)
                  }}
                />
              </Suspense>
            )}
            {searchPopup && (
              <Suspense fallback={null}>
                <SearchPopup
                  db={db}
                  onClose={() => setSearchPopup(false)}
                  onOpenMenu={() => {
                    setSearchPopup(false)
                    setDrawerAt(routeHash)
                  }}
                  onOpenHit={(hit) => {
                    setSearchPopup(false)
                    runTask(openHit(hit))
                  }}
                  onOpenPage={(id) => {
                    setSearchPopup(false)
                    openPage(id)
                  }}
                  onOpenTask={() => {
                    writePref('home.tab', 'tasks')
                    chooseSpace('home')
                  }}
                  onSeeAll={openSearch}
                  initialChip={searchChip}
                />
              </Suspense>
            )}
            {pencilOffer && (
              <Suspense fallback={null}>
                <PencilOffer onDone={closePencilOffer} />
              </Suspense>
            )}
            {signInGuide && (
              <Suspense fallback={null}>
                <SignInGuide db={db} />
              </Suspense>
            )}
            {(welcomeAtStart || welcomeAgain) && !signInGuide && (
              <Suspense fallback={null}>
                <Welcome
                  onSkip={closeWelcome}
                  renderSignIn={(p) => (
                    <Suspense fallback={null}>
                      <SignInPanel {...p} />
                    </Suspense>
                  )}
                  signedIn={isSignedIn}
                  onFinish={(sample) => {
                    closeWelcome()
                    if (sample) runTask(startHere())
                  }}
                />
              </Suspense>
            )}
            {lassoSheet && (
              <Suspense fallback={null}>
                <LassoMenuSheet />
              </Suspense>
            )}
            {handwritingOpen && (
              <Suspense fallback={null}>
                <HandwritingChooser />
              </Suspense>
            )}
            {devicePicker && (
              <Suspense fallback={null}>
                <DevicePicker onClose={() => setDevicePicker(false)} />
              </Suspense>
            )}
            {choice && (
              <ChoiceDialog
                request={choice.request}
                onDone={(value) => {
                  setChoice(null)
                  choice.resolve(value)
                }}
                onOpenSetting={openSettings}
              />
            )}
            {backupDue && !reviewScope && hub?.kind !== 'data' && (
              <BackupReminder
                onSave={() => {
                  openPage(null)
                  setHub({ kind: 'data' })
                }}
                onLater={() => runTask(snoozeReminder(db))}
              />
            )}
            <ReadingSync />
            <AttentionGate db={db} />
            <SignedOutGate />
            <AccountGate />
            <NowPlayingGate onOpenPage={(id) => openPage(id)} />
            <TimerChip db={db} onOpenHome={() => chooseSpace('home')} />
            <Suspense fallback={null}>
              <AudioDock db={db} pageId={currentPage?.id ?? null} />
            </Suspense>
            {mandatory && (
              <Suspense fallback={null}>
                <MandatoryUpdate />
              </Suspense>
            )}
            {updatePhase !== 'idle' && !mandatory && (
              <Suspense fallback={null}>
                <UpdatePill />
              </Suspense>
            )}
            <div
              ref={centreEl}
              className="fixed bottom-16 left-1/2 z-40 flex w-max max-w-[calc(100vw-32px)] flex-col items-center gap-2"
            >
              <SaveNotice />
              <FirstUseTip />
              {updateQuestion && (
                <UpdateRiskBar
                  risk={updateQuestion.risk}
                  onUpdate={updateQuestion.apply}
                  onClose={() => updateRisk.set(null)}
                />
              )}
            </div>
            {nameAsk && (
              <LazyNameSheet
                title={nameAsk.title}
                initial={nameAsk.initial}
                onCancel={() => {
                  setNameAsk(null)
                  nameAsk.resolve(null)
                }}
                onDone={(name) => {
                  setNameAsk(null)
                  nameAsk.resolve(name)
                }}
              />
            )}
            {toastMessage && (
              <Toast
                message={toastMessage.message}
                action={toastMessage.action}
                onHold={holdToast}
                onRelease={releaseToast}
              />
            )}
          </TopStackSlotContext>
        </TopBarSlotContext>
      </AppUiContext>
    </ThemeContext>
  )
}

function HomeScreenSwitch(props: ComponentProps<typeof HomeLazy>) {
  const Screen = HomeLoaded ?? HomeLazy
  return <Screen {...props} />
}

/** Keeps the Write · Draw · Read switch and Reading mode in step. */
function ReadingSync() {
  useReadingSync()
  return null
}

export default App
