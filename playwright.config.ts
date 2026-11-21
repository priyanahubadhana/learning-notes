import { defineConfig, devices } from '@playwright/test'
import { defineBddConfig } from 'playwright-bdd'
import { FAST_SET } from './e2e/fastSet.ts'

/**
 * Playwright end-to-end tests: a real browser clicks through the app.
 * Each test gets a fresh browser context, so its IndexedDB starts empty.
 * Run with `npm run test:e2e`. The tests use the built app under the live
 * site's security rules, so they check what users actually get.
 */
const PORT = Number(process.env.PW_PORT ?? 5199)
/** GitHub's machine has 2 cores, so it gets longer limits. */
const SLOW = process.env.CI ? 2 : 1

/**
 * B0 scenarios (SC-02): the feature files in e2e/features, read through
 * playwright-bdd (a developer tool, never shipped). `npm run test:scenarios`
 * writes the tests into .features-gen first (bddgen), then runs them in the
 * two projects below.
 */
const scenarioDir = defineBddConfig({
  features: 'e2e/features/**/*.feature',
  steps: 'e2e/steps/**/*.ts',
  outputDir: '.features-gen',
})

const config = defineConfig({
  testDir: './e2e',
  timeout: 30_000 * SLOW,
  expect: { timeout: 5_000 * SLOW },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 1, // a test that passes on retry is reported as flaky
  workers: process.env.CI ? 2 : undefined,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
    // The device picker (first start) is answered already, so it does not
    // cover every test; devicePicker.spec.ts starts without this.
    storageState: {
      cookies: [],
      origins: [
        {
          origin: `http://localhost:${PORT}`,
          localStorage: [
            { name: 'learning-notes:devicePicker.done', value: 'true' },
            // Polish 2: the welcome and the first-use tips are answered already;
            // firstUse.spec.ts and welcome.spec.ts start without these.
            { name: 'learning-notes:onboarding.done', value: 'true' },
            { name: 'learning-notes:toolbar.lastToolOffered', value: 'true' },
            // Q3a: the sign-in gate (read-only until signed in) is off; accountGate.spec.ts turns it on.
            { name: 'learning-notes:accountGate.off', value: '1' },
            {
              name: 'learning-notes:firstUse.seen',
              value: '["lasso","writePad","layers","paperBox"]',
            },
            // A2 R1: LASSO_RECORDER_ON=1 runs the whole set with the Lasso recorder on.
            ...(process.env.LASSO_RECORDER_ON
              ? [
                  {
                    name: 'learning-notes:preview.circleRecorder',
                    value: '"on"',
                  },
                ]
              : []),
            // Most specs open a notebook's tabs by tapping it (R6-12).
            { name: 'learning-notes:general.pasteMode', value: '"keep"' },
            {
              name: 'learning-notes:general.openNotebookAt',
              value: '"tabs"',
            },
          ],
        },
      ],
    },
    actionTimeout: 10_000 * SLOW, // a stuck click names itself
    serviceWorkers: 'block', // offline.spec.ts turns it on
    trace: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      testIgnore: /visual\//,
      use: {
        ...devices['Desktop Chrome'],
        // 56 px wider than before: the strip of spaces takes that much.
        viewport: { width: 1336, height: 720 },
      },
    },
    {
      name: 'webkit',
      testIgnore: [/visual\//, /tb2-resize-phone-swipe/], // 2B.5b: a real swipe, chromium only
      use: {
        ...devices['Desktop Safari'],
        viewport: { width: 1336, height: 720 },
      },
      expect: { timeout: 15_000 }, // WebKit starts the app more slowly
    },
    {
      // Stand-in for the owner's iPad: WebKit, touch, iPad size. Only the
      // Pencil/Scribble/keyboard specs of Phase A run here (CI time).
      name: 'ipad-webkit',
      testIgnore: [/visual\//, /tb2-resize-phone-swipe/], // 2B.5b: a real swipe, chromium only
      testMatch: [
        /eraserShapes/,
        /toolRowStays/, // re-test 18 Nov bug 1
        /pencilV2/, // Pencil mode shows the v2 look (owner 18 Nov)
        /firstBoxTap/, // re-test 18 Nov F1-F4
        /c0-1BoxStyle/, // C0-1: every new box starts with the style
        /c0-7Hold/, // C0-7: the hold opens our strip
        /selectionBarButtons/, // B1: every button of the old selection bars
        /iosSelect/, // re-test 18 Nov F5-F7
        /circleRecorder/, // 19 Nov circle recorder + trace replay
        /quietRecorder/, // A2: the quiet recorder (RC-01 to RC-07, R1 to R4)
        /lassoFreeze/, // A0: the Lasso held still (S1-S5, LS lines)
        /c0Paste(Shots)?[.]spec/, // C0: Paste buttons (Pencil tap, bubble line, box bar)
        /caretSaveJump/, // B7: first letters keep their order
        /previewReload/, // re-test 18 Nov bug 2,
        /parts-gallery/,
        /updateStuck(Shots)?.spec.ts$/, // C22
        /c45-symbols-scribble/, // C4, C5, C14 (combined test 16 Nov)
        /pageMenusPaste/,
        /pasteButtons/,
        /b12OwnerRow/, // B12
        /b11TextNoInk/, // B11
        /pageMenusPlace/,
        /pencilIsolation/,
        /mainFramePolish.spec/,
        /c33c34/, // C33, C34 (and its pictures)
        /storageSafety.spec/,
        /updateV2/,
        /keyNames/,
        /toolbarV8Text/,
        /toolbarV8FormatOn/,
        /toolbarV8Favs/,
        /toolbarV8BarEdit.spec/,
        /toolbarV9Polish/,
        /toolbarV9Sheets/,
        /inkTools/,
        /toolbarV9Lasso/,
        /toolbarV9More/,
        /toolbarC36/,
        /cBoxes(C21|Shots)?.spec.ts$/,
        /duplicateBox/,
        /updateFailureNote/,
        /updateDownload/,
        /security-m1-/,
        /chromeIsolation/,
        /penTapChrome/,
        /scrollBarPen/,
        /pencilReal/,
        /p1FrameCovers/,
        /scrollBarLook/,
        /scrollBarHeader/,
        /ipadKeyboard/,
        /inkLayers/,
        /penSelect/,
        /penTapRules/,
        /ownSelection/,
        /fingerAfterPen/,
        /lassoUniversal/,
        /miniBar/,
        /miniKeys/,
        /rowActions/,
        /nameSheet/,
        /toggles/,
        /pencilFriction/,
        /writePad/,
        /lassoPencil/,
        /magnifier/,
        /aiPicker/,
        /openNotebook/,
        /startSpeed/,
        /p1-speed/, // P1 speed (17 Nov): tool and page switches on the iPad stand-in
        /startSeeding/,
        /tryNewFeatures/,
        /presetPhases/,
        /libraryV2/,
        /foundationInput/,
        /stripGear/,
        /foundationSelectionOverlay/,
        /barFixes/,
        /pencilTaps/,
        /tb2-select/,
        /tb2-taps/,
        /tb2-resize/,
        /tb2-bar/,
        /tb2-move/,
        /tb2-group/,
        /tb2-card/,
        /b10-9Toast/,
        /b10-3PhoneResize/,
        /b10-6JournalRename/,
        /b10-8PageMenu/,
        /b10-2ShadowTile/,
        /b10-11KeepLook/,
        /b10-10HandFont/,
        /tb2-pencil/,
        /tb2-boxchip/,
        /tb2-boxchip-shots/,
        /boxPills/,
        /microBar/,
        /tableGap/,
        /holdMenu/,
        /pageMenus(Strip|Sheet|Rows)/,
        /boxTaps/,
        /paperPage/,
        /paperInk/,
        /paperHint/,
        /paperStyle/,
        /pillFloat/,
        /toolBand/,
        /pencilOffer/,
        /lassoWords/,
        /penTools/,
        /pictureSelect/,
        /gestureWatchdog/,
        /lockToastStill/,
        /editToolbar/,
        /toolSearchSections/,
        /pinnedTools/,
        /barScroll/,
        /miniBarBounds/,
        /firstUse/,
        /pillScroll/,
        /lastTool/,
        /favourites/,
        /cardFromInk/,
        /welcome/,
        /emptyStates2/,
        /lassoMenuOrder/,
        /handwritingChooser/,
        /autoUpdate/,
        /paperBudget/,
        /inkScrollNative/,
        /paperSearchJump/,
        /paperPhone/,
        /paperExport/,
        /tools-machine/,
        /lassoLoops/,
        /toolsEditLock/,
        /toolsFlags/,
        /toolsHealth/,
        /toolsRefresh/,
        /resume/,
        /ownerLasso/,
        /ownerPlacement/,
        /undoHistory/,
        /gridRow/,
        /penUi/,
        /layoutAssist/,
        /textTool/,
        /textBoxFree/,
        /homeV2/,
        /scrollFrame/,
        /barRoom/,
        /lazyTapPaint/,
        /scrollSolid/,
        /r12Real/,
        /pagesBarFade/,
        /staySignedIn/,
        /freezeWatch/,
        /searchClose/,
        /settingsV3SearchF9/,
        // Toolbar v8 files. toolbarV8Paste needs the real clipboard permission, which WebKit lacks, so it
        // stays chromium only; toolbarV8PasteIpad covers the same behaviour here with a stubbed clipboard.
        /toolbarV8(Bar|Frame|Pen|Row|Tools|Text|Insert|Tuck|PasteIpad|Round5|Eraser).spec/,
        // 2A.cfg: the 2A specs also run on the iPad stand-in (toolbarV9 files match once they land).
        /toolbarV9(Names|Dark).spec/,
        /toolbarV8(Ninth|History).spec/,
        /settingsV3.spec/,
        /scenarioReportLink/, // B0 SC-05
        /toolbarMenuV(2|8)/,
        // Task H: the Journal and its month repair (manager OK, 15 Nov).
        /journalMonthRepair/,
        /noticeClose/,
        /sweep2b/, // bug sweep to Phase 2B (17 Nov)
      ],
      use: { ...devices['iPad Pro 11'], hasTouch: true },
      expect: { timeout: 15_000 },
      timeout: 60_000,
    },
    {
      // B0: the scenarios of e2e/features, on the Chrome stand-in ...
      name: 'bdd-chromium',
      testDir: scenarioDir,
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1024, height: 1000 },
        hasTouch: true,
      },
    },
    {
      // ... and on the iPad stand-in.
      name: 'bdd-ipad-webkit',
      testDir: scenarioDir,
      use: { ...devices['iPad Pro 11'], hasTouch: true },
      expect: { timeout: 15_000 },
      timeout: 60_000,
    },
    {
      // Pictures of the main screens (e2e/visual), one folder per operating
      // system. Not part of normal runs: `npm run test:visual`.
      name: 'visual',
      testDir: './e2e/visual',
      testMatch: /screens\.spec\.ts/,
      retries: 0,
      snapshotPathTemplate: '{testDir}/__screenshots__/{platform}/{arg}{ext}',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: `npm run build && npm run preview -- --port ${PORT} --strictPort`,
    url: `http://localhost:${PORT}`,
    env: { E2E: '1' },
    timeout: 300_000, // the build alone can take 80 s on a busy PC
  },
})

/**
 * The fast set (Phase 0 task 0.8): the key flows listed in e2e/fastSet.ts,
 * run on every merge. `fast-chromium` and `fast-ipad` are copies of
 * `chromium` and `ipad-webkit` above (same device, limits and settings, so
 * they cannot drift apart); only the list of files differs. `fast-ipad`
 * runs the fast files that are also in the `ipad-webkit` list.
 */
const projects = config.projects ?? []
const projectNamed = (name: string) => {
  const found = projects.find((project) => project.name === name)
  if (!found) throw new Error(`playwright.config.ts: no project "${name}"`)
  return found
}
const chromium = projectNamed('chromium')
const ipad = projectNamed('ipad-webkit')
const fastFiles = FAST_SET.map((entry) => entry.file)
const inIpadList = (file: string) =>
  [ipad.testMatch ?? []]
    .flat()
    .some((match) =>
      typeof match === 'string'
        ? match.endsWith(file)
        : match.test(`e2e/${file}`),
    )
/** One exact file in e2e/ (the path Playwright checks is absolute). */
const exactly = (file: string) =>
  new RegExp(`[\\\\/]e2e[\\\\/]${file.replaceAll('.', '\\.')}$`)
config.projects = [
  ...projects,
  { ...chromium, name: 'fast-chromium', testMatch: fastFiles.map(exactly) },
  {
    ...ipad,
    name: 'fast-ipad',
    testMatch: fastFiles.filter(inIpadList).map(exactly),
  },
]

export default config
