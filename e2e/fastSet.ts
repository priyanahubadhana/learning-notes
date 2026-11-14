/**
 * The fast set (Phase 0 task 0.8): the spec files that guard every merge.
 * They cover the key flows and take about 10 minutes on the test computer
 * together with the unit tests. Every other spec still runs in the full set:
 * every night and before each release.
 *
 * Projects `fast-chromium` and `fast-ipad` in playwright.config.ts are built
 * from this list; `fast-ipad` runs the files that are also in the
 * `ipad-webkit` list. scripts/fastSet.test.mjs fails when a file here is
 * missing or the list drops below 25 files, so the set cannot shrink
 * silently. Seconds are from the full run of 14 Nov 2026 (2 workers): about
 * 860 s on Chrome and 735 s on the iPad stand-in. Keep the total near that
 * when adding a file.
 *
 * Not here on purpose: tests that measure real time (freezeWatch), because
 * a busy computer makes them fail without a fault; they run every night.
 *
 * `file` is a name inside e2e/ (no folders); `why` is the flow it guards.
 */
export const FAST_SET: readonly { file: string; why: string }[] = [
  // The app starts and its frame holds.
  {
    file: 'shell.spec.ts',
    why: 'the frame: rail, top bar, sidebar, Undo and Redo',
  },
  {
    file: 'navigation.spec.ts',
    why: 'Back, Forward and a refresh keep the screen and the page',
  },
  { file: 'startSpeed.spec.ts', why: 'first start is ready fast' },
  {
    file: 'foundationInput.spec.ts',
    why: 'the app loads with the shared input layer',
  },
  {
    file: 'deviceSafety.spec.ts',
    why: 'a database that will not open is never shown as an empty app',
  },
  { file: 'welcome.spec.ts', why: 'a first visit shows the welcome once' },

  // Signing in.
  {
    file: 'staySignedIn.spec.ts',
    why: 'stay signed in, also after a reload',
  },
  {
    file: 'accountGate.spec.ts',
    why: 'the account gate: read-only until signed in',
  },

  // Notebooks and pages.
  { file: 'nameSheet.spec.ts', why: 'create and name a notebook and a page' },
  { file: 'emptyStates2.spec.ts', why: 'no notebooks: Create notebook' },
  {
    file: 'openNotebook.spec.ts',
    why: 'a notebook reopens the page you left in it',
  },
  { file: 'pages.spec.ts', why: 'move a page; kept changes come back' },
  { file: 'trash.spec.ts', why: 'delete a page and restore it with its text' },

  // Typing is kept.
  {
    file: 'insertBlocks.spec.ts',
    why: 'typed text is still there after a reload',
  },
  {
    file: 'saveFailure.spec.ts',
    why: 'a failed save is shown and the typing survives',
  },
  {
    file: 'offline.spec.ts',
    why: 'the app and its notes open with no internet',
  },
  {
    file: 'upgradeBackup.spec.ts',
    why: 'an upgrade keeps every row and makes a backup',
  },

  // Text boxes, the pen and Undo.
  {
    file: 'textBoxV2.spec.ts',
    why: 'text box basics: frame, handles, wrapping',
  },
  {
    file: 'paperPage.spec.ts',
    why: 'a tap on the paper makes a box; it moves and locks',
  },
  { file: 'ink.spec.ts', why: 'a pen stroke is drawn and saved' },
  {
    file: 'inkScrollNative.spec.ts',
    why: 'ink scrolls with the page and stays on its words',
  },
  {
    file: 'fingerAfterPen.spec.ts',
    why: 'finger taps work right after the Pencil',
  },
  {
    file: 'undoPictures.spec.ts',
    why: 'Undo and Redo bring back deleted text and pictures',
  },
  {
    file: 'ipadKeyboard.spec.ts',
    why: 'the top bar stays put with the keyboard up; Undo from the bar',
  },

  // Search.
  { file: 'search.spec.ts', why: 'search opens a result at its block' },
  {
    file: 'paperSearchJump.spec.ts',
    why: 'a search hit far down the page is opened',
  },

  // Settings and Try new features (flags).
  { file: 'settingsV3.spec.ts', why: 'Settings v3 opens on every device size' },
  {
    file: 'settingsV3Search.spec.ts',
    why: 'Settings search finds and opens a setting',
  },
  {
    file: 'settingsV3SearchF9.spec.ts',
    why: 'the Settings search bar stays at the top',
  },
  {
    file: 'tryNewFeatures.spec.ts',
    why: 'Try new features: a switch turns on and stays on',
  },
  {
    file: 'settingsV3TryNew.spec.ts',
    why: 'Try new features in Settings v3; Turn all off',
  },
  {
    file: 'scrollHints.spec.ts',
    why: 'long lists show the slim scroll bar',
  },

  // Review.
  {
    file: 'review.spec.ts',
    why: 'review a card: show the answer, rate it, see the gaps',
  },
  { file: 'cards.spec.ts', why: 'make a card from a block; Ctrl+Z undoes it' },

  // Notices that protect the notes.
  {
    file: 'updateV2.spec.ts',
    why: 'the update notice, its countdown and install',
  },
  {
    file: 'storageSafety.spec.ts',
    why: 'the storage safety notice and the lost-database banner',
  },
]
