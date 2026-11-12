# Professional-only features (one switch each)

Owner rule: every Professional-only feature or setting has its own toggle, so a Beginner can turn on just that feature and stay in Beginner. The id is the key used by `data-pro="id"` in the mocks and by the Professional features list in Settings > Your experience.

Sources: Professional-only parts of home-mock-v2, notebooks-mock-v2, toolbar-mock-v5/v6, annotations-mock (reader), library-mock, review-mock, search-mock, settings-mock-v3 (rows tagged Pro), and the AI mode decisions in docs/plans/owner-ideas-batch-2-2026-11-10.md section 12 (no AI mode mock exists yet).

Total: 169 features.

## Home (2)

| id | Name | What it does |
|---|---|---|
| `home.builtFrom` | Built from | Shows which notes each Home card draws from, with a Built from: all switch. |
| `home.cardSizes` | Wide card sizes | Lets you stretch a Home card to the larger sizes (M and L). |

## Notebooks (20)

| id | Name | What it does |
|---|---|---|
| `nb.move` | Move up, down, to top | Menu items that reorder notebooks and pages without dragging. |
| `nb.dragGrip` | Drag handle | A grip to hold and drag a notebook or page to a new place. |
| `nb.addEmptyPage` | Add empty page | Adds a blank page from a notebook menu. |
| `nb.addFromTemplate` | Add from template | Adds a page from a template straight from a notebook menu. |
| `nb.reviewNotebook` | Review this notebook | Starts a review of only this notebook’s cards from its menu. |
| `nb.lockPage` | Lock this page | Locks or unlocks one page from its menu. |
| `nb.find` | Find a notebook | A search box above the shelf of notebooks. |
| `nb.tagBar` | Tag filter bar | A row of tags above the shelf to show only matching notebooks. |
| `nb.sideStudy` | Study section in the sidebar | All cards and the study shortcuts in the notebooks sidebar. |
| `nb.sideQuick` | Quick access in the sidebar | Favourites, Recent pages and other quick links. |
| `nb.sideTags` | Tags in the sidebar | A Tags list with a Manage tags shortcut. |
| `nb.sideTemplates` | Templates in the sidebar | Your templates, one tap to start a page from one. |
| `nb.sideSaved` | Saved searches in the sidebar | Searches you saved, listed for one-tap reuse. |
| `nb.outlineLevels` | Outline levels | Level 1, 1-2 or All, plus fold and number options for the Outline tab. |
| `nb.resourceScope` | Resource scope | Find a resource in this page, this notebook or everywhere. |
| `nb.viewSwitch` | Notebook view switch | Switch a notebook between Default, Shelf and Tabs views. |
| `nb.tabOptions` | Tab options | Rename, hide and colour the tabs of a notebook. |
| `nb.extraTabs` | Extra tabs for new notebooks | Choose which extra tabs every new notebook starts with. |
| `nb.shareLayers` | Share layers | Share the pen, text and picture layers separately. |
| `nb.managePanes` | Notebook settings panes | Tags, Templates and Organise panes of the notebooks settings sheet. |

## Toolbar/Text/Pen (20)

| id | Name | What it does |
|---|---|---|
| `tb.allTools` | All tools row | A slim extra row with every tool option the short bar leaves out. |
| `tb.pillCard` | Option cards (the ▾) | Every tool pill ends in a ▾ that opens one detail card. |
| `tb.penFeel` | Pen feel | Tip sharpness, flatness, stabilisation, pressure, tilt, speed thickness, latency. |
| `tb.penStroke` | Exact thickness and line style | Exact stroke width, three-size editing and line style. |
| `tb.highlighter` | Highlighter options | Opacity, snap to text lines, draw behind ink, highlight eraser, save to notes. |
| `tb.customColours` | Custom colours and favourites | Your own colours and pen favourites on the pill. |
| `tb.layers` | Pen layers and paper | Layers (add, merge, lock, order), paper style and size, zoom. |
| `tb.penAids` | Writing aids | Scribble to erase, circle to lasso, finger can draw, math assist. |
| `tb.shapesAids` | Shapes and aids | Draw as, shape help, ruler, magnifier and colour picker. |
| `tb.eraserOptions` | Eraser options | Precise, standard, whole stroke, highlights only, go back after one erase. |
| `tb.lassoOptions` | Lasso options | Free-hand or rectangle, what it picks, which actions sit in the menu row. |
| `tb.selectionMenu` | Full selection menu | The long menu for selected ink, text and pictures, with names under More. |
| `tb.pictureEdit` | Edit picture | Crop, turn, straighten, resize presets and shapes for a selected picture. |
| `tb.textBox` | Box style and layout | Looks, fill, border, corners, padding, shadow, presets and columns of a text box. |
| `tb.textFonts` | Fonts and line height | Font, size, line height and block types for text. |
| `tb.textMarks` | More text marks | Strikethrough, inline code, link, key point, callout, divider. |
| `tb.insertMore` | Insert: more kinds | File, audio, write pad, handwriting, mic, page links, database, mind map, templates. |
| `tb.miniToolbar` | Mini toolbar and hold menu | Selection bar with Dictate, and the hold-still menu (paste, select, insert). |
| `tb.layouts` | Bar layouts and customise | Save, switch and customise your own bar layouts. |
| `tb.proMap` | Professional map | A collapsible map of what lives where in the tool bar. |

## Reader (32)

| id | Name | What it does |
|---|---|---|
| `reader.historyBtns` | Undo and redo buttons | App-wide undo and redo at the start of the reader bar. |
| `reader.flipBack` | Page flip back | A “Back to p. N” button after scrubbing. |
| `reader.askBook` | Ask AI about the book | A question panel for the book (only when AI is on). |
| `reader.readLock` | Reading lock | Hide the bar and ignore taps; swipe turns pages; hold the icon 1.5 s to unlock. |
| `reader.fullScreen` | Full screen | Text only with a tiny title and progress line; Esc leaves. |
| `reader.penBarStyle` | Pen bar style | Simple, Compact or Full set of pen controls. |
| `reader.syncFurthest` | Sync to furthest page | Jump to the furthest page read on any device. |
| `reader.progressStyle` | Progress line style and clock | Location, chapter or book progress, plus a clock. |
| `reader.dim` | Dim the page | A black layer from 0 to 60 percent over the page. |
| `reader.layout` | Line spacing, alignment, margins | Line spacing 1.2 to 2.2, left or justified, small to large margins. |
| `reader.presets` | Theme presets and Custom look | Compact, Standard, Large, Low vision, and save your own. |
| `reader.selMenu` | Highlight menu on select | Turn the pop-up on text selection on or off. |
| `reader.selExtras` | Selection extras | Pronounce, look up on the web, save to, make card, ask AI, add to vocabulary. |
| `reader.noteFilters` | Notes panel filters | Narrow the notes list by type, colour or chapter. |
| `reader.exportMd` | Export Markdown | Copy or save highlights and notes as Markdown. |
| `reader.bulkCards` | Cards from all highlights | Make recall cards from every highlight at once. |
| `reader.dailyHighlight` | Daily highlights | Resurface an old highlight at the top of the notes panel. |
| `reader.inkTools` | Ink: eraser, lasso, redo | Remove strokes, select and move strokes, bring them back. |
| `reader.inkLook` | Ink: colour, size, pen type, opacity | Custom colour, thin to thick, pen feel and highlighter see-through level. |
| `reader.pagesTab` | Pages tab | Page pictures for PDFs and chapters for EPUBs in the left panel. |
| `reader.resourcesTab` | Resources tab | The book page’s recordings and other resources in the left panel. |
| `reader.aloudSkip` | Read aloud: skip | Sentence back and forward buttons. |
| `reader.aloudVoice` | Read aloud: speed and voice | 0.5x to 2x speed and a choice of device voices. |
| `reader.sleepTimer` | Sleep timer | Stop reading aloud by itself after a page or 10 to 60 minutes. |
| `reader.gestures` | Zoom and edge taps | Double-tap zoom, pinch zoom, and edge taps that turn the page. |
| `reader.barScroll` | Bar hides on scroll | The bar hides when you scroll down and returns when you scroll up; pin it. |
| `reader.lockDirection` | Lock screen direction | Try to keep the screen upright or sideways. |
| `reader.liquid` | Liquid mode (beta) | A reflowed text view for PDFs. |
| `reader.lineFocus` | Line focus and ruler | Dim all but about two lines, or mark one line; Alt+Up/Down moves it. |
| `reader.hideBlanks` | Hide blanks (self-test) | Hide recall words and tap to show them. |
| `reader.keepAwake` | Keep screen awake | Stops the screen sleeping while you read. |
| `reader.tapCounts` | Tap counts with Select | 2 taps a word, 3 a line, 4 a paragraph, 5 a page. |

## Library (6)

| id | Name | What it does |
|---|---|---|
| `lib.tagsTab` | Tags tab | A tag map plus Claude’s category suggestions for your tags. |
| `lib.tagCategories` | Tag categories | Group tags as Category, Tag, Sub-tag and filter by category. |
| `lib.listColumns` | List columns | Choose Progress, Last opened, Highlight count, Status, Tags columns. |
| `lib.savedFilters` | Saved filters | Save a Knowledge filter and manage the saved ones. |
| `lib.dailyStar` | Favour key highlights | Key-marked highlights come back more often in Daily Highlights. |
| `lib.mentions` | Mentioned in | Shows which notes mention a highlight. |

## Review (11)

| id | Name | What it does |
|---|---|---|
| `rev.moreSheet` | Review More sheet | One sheet with Decks, Browse, Editor, Make cards, Stats, Scheduler, Anki. |
| `rev.sessionExtras` | Open note, Suspend, Undo rating | Extra buttons under a card during a session. |
| `rev.keyHints` | Keyboard hints | A line that teaches the review keys. |
| `rev.decks` | Decks | Make decks from tags, states and saved searches. |
| `rev.browse` | Card browser | Search, sort and filter every card. |
| `rev.editor` | Card editor | Edit a card’s question, answer and tags. |
| `rev.makeCards` | Make cards | Bulk tools to make cards from highlights and notes. |
| `rev.stats` | Stats | Counts and charts of your reviews. |
| `rev.scheduler` | Scheduler | FSRS or fixed steps, target memory, daily limits, practice order. |
| `rev.anki` | Anki import | Bring in an Anki deck. |
| `rev.coverage` | Coverage | A list of every review feature with exists or added marks. |

## Search (12)

| id | Name | What it does |
|---|---|---|
| `search.scribble` | Write to search | Use the Pencil to write the search words. |
| `search.more` | More search options | A sheet for where, filters, order, view and saved searches. |
| `search.moreChips` | Books, Highlights, Tasks, Features chips | Extra result types beside All, Pages, Notes, Cards. |
| `search.activeFilters` | Active filter chips | Chips for the filters in use, each with a clear button. |
| `search.reviewThese` | Review these | Start a review of the cards that matched. |
| `search.filters` | Filters | Notebook, tag, card status, changed time and include options. |
| `search.sort` | Time and order | Sort results and limit by time. |
| `search.views` | View switch | Grouped or flat results. |
| `search.saved` | Saved searches | Save, rename, duplicate and undo delete. |
| `search.findInPage` | Find in page | Find x of y with previous, next and next page. |
| `search.tools` | Tools | Search all features and pin tools. |
| `search.handwriting` | Handwriting and more | Handwriting labels and drawing options. |

## AI mode (10)

| id | Name | What it does |
|---|---|---|
| `ai.space` | AI space | Its own AI space in the sidebar plus the AI button on every screen. |
| `ai.askNotes` | Ask my notes | Chat with your notes and get answers with citations. |
| `ai.tutor` | Tutor and quiz me | Claude teaches or quizzes you from your notes. |
| `ai.playground` | Playground | Try prompts freely on your own notes. |
| `ai.autoOrganise` | Auto-organise | Claude files and tags new items for you. |
| `ai.jobs` | Jobs | Turn captured sources into notes, cards, mind maps and tags. |
| `ai.destination` | Job destination | Choose where each job goes; the app remembers the path. |
| `ai.autoApply` | Apply automatically | Skip the preview once you trust the results. |
| `ai.prompts` | Prompt library | Recipes with ratings and a prompt checker that suggests updates. |
| `ai.capture` | Capture inbox and extension | Send a page from Chrome into the app’s Inbox for jobs. |

## Settings (56)

| id | Name | What it does |
|---|---|---|
| `general.newPageStudy` | Start new pages as | The template your first new page opens with. Pick any template, or Blank. You can still choose another per page. |
| `general.reduceGlass` | Reduce glass | Frosted bars. Auto turns blur off if the device gets slow. |
| `advanced.showRefresh` | Refresh button in the top bar | Saves first, then restarts the app on the same page. |
| `general.space.home` | Home space | Show or hide the Home tab. At least one always stays. |
| `general.space.library` | Library space | Show or hide the Library tab. At least one always stays. |
| `general.space.review` | Review space | Show or hide the Review tab. At least one always stays. |
| `device.backup` | Last backup | When this device last saved a backup copy. |
| `device.picker` | Choose this device again | Re-opens the Computer / iPad / Phone question. |
| `device.controlPanel` | Control panel | Shortcut Shift+K opens the control panel. |
| `device.install` | Install the app | Add it to the iPad Home Screen or install it on a computer. |
| `about.version` | Version | The version on this device. |
| `account.signOutForget` | Sign out and forget the key | Also forgets the unlock key on this device. |
| `account.signOutAll` | Sign out everywhere | Signs out every device. Notes stay safe. |
| `account.computers` | Your devices | The computers and tablets signed in. |
| `account.connected` | Connected apps | Apps allowed to use your account. |
| `account.pinLock` | PIN lock | Same setting as Lock › PIN. |
| `account.aiKeys` | AI keys on all devices | Same setting as AI & connections. |
| `sync.reconnectDrive` | Reconnect Drive | Fix a broken Google Drive link. |
| `sync.group.general` | Sync: General | Language, dates, day start, help. Follows you to other devices. |
| `sync.group.appearance` | Sync: Appearance | Theme and reduce glass. Follows you to other devices. |
| `sync.group.review` | Sync: Review | Daily limits, steps, scheduler. Follows you to other devices. |
| `sync.group.reading` | Sync: Reading | Reader theme, font, spacing. Follows you to other devices. |
| `sync.group.ai` | Sync: AI settings | Which notebooks use AI. Follows you to other devices. |
| `sync.group.lock` | Sync: Lock | How long before the app locks. Follows you to other devices. |
| `sync.group.aiKeys` | Sync: AI keys | Your keys, locked like your notes. Follows you to other devices. |
| `lock.methods` | What is locked | Pages, notebooks and databases you hid. |
| `lock.removeAll` | Remove all locks | Unlocks everything. Asks first. |
| `ai.nb.model` | Model per notebook | Use another model for one notebook. |
| `ai.perm.usage` | Everything AI sent this month | The list of AI requests. |
| `conn.test` | Test a key | Checks a key works. |
| `conn.getKey` | Get a key | Opens the page where you make a key. |
| `claude.apps` | Apps using AI access | See which apps are connected and remove any of them. |
| `claude.pass` | Sync passphrase for AI access | A connected AI needs it to open your synced notebooks. |
| `claude.privacy` | What AI can see | A plain list of what is shared with connected AI. |
| `claude.turnOff` | Turn AI access off | Stops all access and removes every link. |
| `toolbar.ribbonMode` | All tools display | Part of Style: choose Simple + All tools to show both. |
| `toolbar.newLineHold` | New line hold time | How long to hold before extras open. |
| `toolbar.pillReset` | Options pill position | Put the dragged pill back next to the bar. |
| `toolbar.reset` | Reset tool bar | Back to standard tools and positions. Notes are not touched. |
| `advanced.holdMenu` | Press-and-hold menu time | How long to hold before Paste / Select opens. |
| `reading.pdfFlow` | PDF pages | One long scroll, or one page at a time. |
| `reading.bar` | Reader bar | Hide on scroll, always show, or only at the top. |
| `reading.barPin` | Keep the reader bar showing | Pins the bar while you scroll. |
| `reading.glide` | Jump speed | How fast it glides to a heading or bookmark. |
| `reading.speed` | Read aloud speed | Half speed to double speed. |
| `reading.awake` | Keep the screen awake | Screen does not dim while reading. |
| `reading.orient` | Lock screen direction | Try to keep the screen upright or sideways. |
| `review.targetMemory` | Target memory | FSRS only: how sure you want to be. 90% is advised. |
| `review.nestedCard` | New card inside an answer | What /card does inside an answer. |
| `review.reviseLabels` | Revise labels | Names and colours of the labels you put on words. |
| `advanced.pencilLab` | Pencil lab | A test page recording what the iPad sends. Use it if text appears by itself. |
| `advanced.slowMoments` | Record slow moments | Keeps a note when the app stalls. Nothing is sent anywhere. |
| `advanced.slowMomentsCopy` | Slow-moments report | Copies the notes as text to paste into a message. |
| `advanced.toolStateCopy` | Tool state | Copies what the tools believe right now, for bug reports. |
| `help.firstLaunch` | Show the first-launch question again | Shows the New / Used a little / Experienced pop-up. |
| `help.resetMock` | Reset this mock-up | Clears the choices saved in this browser. |
