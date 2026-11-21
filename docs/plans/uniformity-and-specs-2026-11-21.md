# Uniformity, reuse and the spec system (Fable with the owner, 21 Nov 2026, evening)

The owner paused the build to ask five things: (1) which features are built again and again instead of reused, (2) how a bug that changes a spec stays easy to find, (3) how a spec changes after it was signed, (4) one uniform spec format that the owner can read on the tablet anywhere, with a copy in the system, (5) whether GitHub Spec Kit would help. This page holds the facts found and the proposal. Nothing here is decided until the owner answers the questions at the end.

## 1. What is built again and again (code audit of build/next 49024c35, 21 Nov)

The owner sees three bars. The code has these families, each with its own copy of the same building blocks:

| Bar or strip       | Main code (lines)                                                                                                |
| ------------------ | ---------------------------------------------------------------------------------------------------------------- |
| Top tool bar v8    | ToolbarV8 263, ToolBar 883, ToolRow 406, toolbarV8.css 648; the old Ribbon 354 and DockedBar 776 are still there |
| Text box bar v2    | OneBar 509, oneBarPops 359, oneBarOps 344, BoxBarV2 202, PinnedBoxBar 158, own css 333                           |
| Mini and micro bar | MiniToolbar 744, MicroBar 322, KeyboardBar 180                                                                   |
| Selection bar      | SelectionBarV8 455, SelectionToolbar 125, SelectionMenu 153                                                      |
| Lasso bar          | MixedMenu 166, lassoMenu 109, LassoMenuSheet 36, LassoRowParts 79 and cards about 300                            |
| Hold strip         | design/parts/ContextStrip 620 and css 353; a second HoldMenu 109; a third older ContextStrip 125                 |

Shared for real (one implementation, several bars): the icon set, the grip-drag core (not on the box bar), the font tiles, the size strip.

Rebuilt per bar:

| Building block               | How many copies                     | Evidence                                                                                                                                                          |
| ---------------------------- | ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button drawing               | one per bar                         | `button()` in MiniToolbar:446 and MicroBar:140 is the same text; OneBar, SelectionBarV8, MixedMenu inline their own                                               |
| Where the bar goes           | 5                                   | miniBarPlace (gap 8 above, 28 below), objectBarPlace (12, 12), oneBarPlace (SAFE 12, SIDE 8, ABOVE 72, BELOW 24), contextStripPlace (12, 8), MicroBar inline (34) |
| Keep inside the screen       | 3                                   | clampInArea (8 px, from the centre), clampInside (from the corner), oneBarGrip inline                                                                             |
| ⋯ overflow                   | 4                                   | splitActions (46 px per button), splitStripItems (label estimate), foldRow, hard-coded lists in Mini, Micro, SelectionBarV8                                       |
| Colour picker                | 5, with 3 different palettes        | colorData TEXT_HEX, inkSettings PEN_COLOURS, boxes BOX_COLOURS                                                                                                    |
| Size scale                   | 2                                   | SizeStrip 6 to 200 px; Mini, Micro, KeyboardBar, SelectionBarV8 use NOTE_SIZES 90 to 150 %                                                                        |
| Names on hover               | 2 systems                           | HoverName (app-wide, 400 ms, needs `data-bar-btn`, which OneBar, Mini, Micro, SelectionBarV8, MixedMenu, ContextStrip do not set); ToolBar's private NameTip      |
| Docking                      | 2                                   | pillPlace (zone 56) and oneBarDockModel (zone 64)                                                                                                                 |
| Customiser                   | 3                                   | BarEditParts (v8), EditListSheet (mini bar, Lasso sheet), EditBarPanel (DockedBar)                                                                                |
| Cut, Copy, Duplicate, Delete | 6 lists, 3 sets of translation keys | MiniToolbar, SelectionMenu, lassoModel, stripItems, pageStrip, selectionBarModel                                                                                  |
| Show and hide motion         | partial                             | motionMs used by Card, CommandList, ContextStrip, Sheet only; OneBar, Mini, Micro, MixedMenu have none                                                            |
| Keyboard and Pencil handling | partial                             | roving focus only in ObjectBar, CardParts, OnOff; no shared Pencil helper                                                                                         |

Same values typed again and again: the 44 px target in 8 stylesheets; one long shadow string in 9 files; one button class string 14 times in 8 files; radii 26, 28, 22, 16, 14 px, one per sheet.

**The shared part exists on paper, not in the bars.** docs/features/shared-parts.md SP-09 "Object bar" was written as the one bar for box, text, picture, table, node, rows, with placement, ⋯ overflow, states and motion. It is used only by the parts gallery and PagesTabV2. docs/features/toolbar-v8.md says the selection bar uses it; it does not. docs/features/textbox-v2.md says the box bar is the Object bar; it is OneBar. The registry file toolRegistryMeta says in its own header "nothing reads it yet"; only the v8 top bar reads it. The box bar, the hold strip and the Lasso menu read neither registry.

Why it happened (honest reading):

1. Each bar got its own spec with its own numbers. Nobody wrote one spec for "a floating bar" that the others point to, so each builder picked gaps, radii and timings again.
2. The rules said "uses only shared parts" (builder.md line 33) but nothing checked it: no test, no lint count, no review line.
3. The phases came one bar at a time (tool bar in 2A, text box in 2B, selection bar now). Each builder saw only its own task and the quickest way was a new file.
4. The specs' "Shared parts used" lists were written before the code and never checked against it after.

**What this does not mean:** we do not throw the bars away. The smart bar plan (parts B3 to B9) already replaces six pieces with one. The fix is to build that one bar on the shared pieces, and to make the shared pieces first.

## 2. Spec formats in use today

90 files in docs/features/. The template file _TEMPLATE.md still has the old five headings (Purpose, How it works, Edge cases, Security check, Tests). METHOD.md section 2 describes the newer format (story, rules, scenarios, assumptions, done when, detail lines, not in this part, OPEN). Only 4 specs have a Rules section and 4 have Scenarios; 6 use the "When I do X → Y" lines; the rest use the old template or a free form. So a builder meets four shapes.

Bug and finding ids today: US, TB, P, F, BUG, C0, Q, C1A, LS, TS, SB and more, spread over docs/PENDING.md, docs/design/owner-decisions.md, docs/plans/user-stories-2b.md and the finding pages. A bug that changed a spec is not marked in the spec.

## 3. Proposal

### 3a. One spec shape (template v2)

Update _TEMPLATE.md to the METHOD format and add three things:

- A **header block**: status (Draft, Confirmed by owner on date, Built, Live), switch name, phase and parts, pictures, last change.
- A **"Built from" table**: the shared pieces this feature uses, by part card name (see 3b). A feature may not describe a gap, radius, timing or placement rule that a part card already owns; it points to it.
- A **"Changes" section** at the end: one line per change after sign-off, newest first: date, bug id, which rule or scenario changed, who confirmed.

Old specs are not rewritten in a sweep. A spec moves to the new shape when its feature is next touched. Specs for the current phase (selection-bar, text-select, lasso, textbox-v2, toolbar-v8) get the header and the two sections now; the body stays.

### 3b. Part cards: one spec per shared piece

One short page each in docs/features/parts/ (one screen long): Floating bar (buttons, states, 44 px, ⋯ overflow rule), Bar placement (the five-place order the owner chose on 21 Nov, the clamp, the safe zones), Hover names, Colour picker (one palette source per kind), Size strip, Font strip, Customiser, Hold strip, Drag and dock. Each card names its one code file. Every bar spec points to the cards. A builder who needs a change in a card changes the card, not a private copy.

### 3c. One bug register

docs/BUGS.md, one table, one id family `B-001`, `B-002` ... Columns: id, date, where found (iPad check C1b, test, owner), what was seen, what was expected, part, spec line it changed (for example SB-N3), test name, state (open, in spec, in test, fixed, verified on iPad, closed). The old families stay as they are for history; new findings get a B id and the old id in brackets.

How a bug changes a spec: finding, then a B row, then the rule or scenario in the spec changes first, with `(B-012, 23 Nov)` after it, and a line in the spec's Changes section, then the test, then the code. A change to the top part of a spec (story, rules, scenarios) needs the owner's yes; a change to a detail line is only logged. A bug never changes a spec silently.

### 3d. A reuse gate

- builder.md: before writing a new component, grep for the part card's file; a new file for a job a card owns is a review fail.
- reviewer.md: one line, "every building block comes from its part card".
- One test counts bar-like components outside src/design/parts and may only go down (a ratchet, as the lint count already works).

### 3e. Reading on the tablet, and a copy in the system

Facts: the repo is public on GitHub, so github.com already renders every spec on the iPad in a browser, always current, no cost, no work. Notion is not connected in this chat either (the tools did not load). Google Drive and Claude Docs are connected.

Options:

| Option                                    | Pros                                                                               | Cons                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| GitHub website on the iPad (now)          | free, zero work, always the true copy, history for free                            | plain look, read only, the folder tree takes taps                       |
| Notion mirror, synced on the owner's word | the owner can write, database views for bugs and checks, the look the owner wanted | tokens per sync, a second copy that can age, Notion must be reconnected |
| Google Drive or Claude Docs               | connected today                                                                    | a third copy; no views for bugs; same ageing problem                    |

Fable's pick: GitHub for the specs and plan (true copy, free, today) and one Notion database for bugs and checks plus the plain-words plan, filled from docs/BUGS.md on the owner's word, as the owner already asked on 21 Nov. A one-page docs/READ-ME-ON-THE-IPAD.md with the ten links the owner opens most.

### 3f. GitHub Spec Kit

What it is: GitHub's open-source kit for spec-driven development with coding agents. A `specify init` command puts a `.specify/` folder of templates in the repo and adds slash commands to Claude Code: constitution (the project's rules), specify (write the spec), clarify (questions), plan, tasks, analyze (check spec, plan and tasks against each other), checklist, implement.

What we already have of it: METHOD.md is the same idea (spec, then plan, then tasks tied to spec lines, tests named after spec lines). CLAUDE.md plus rules/ is the constitution.

What it would add: fixed templates every time, a per-feature tasks list with ids, and an analyze step that catches a spec line with no task and a task with no spec line.

What it would cost: a fifth spec shape next to the four we have; its commands write long documents, which costs tokens; it is made for one new feature per branch and says nothing about reuse, bugs or the owner's iPad checks; adopting a tool mid-phase breaks our own rule.

Fable's pick: not the tool now. Borrow two steps into our template: the checklist before sign-off, and the analyze step (every rule has a scenario, every scenario has a test, every detail line has a task). Look at the tool itself when the next phase is planned, as docs/IDEAS.md already says.

## 4. Questions for the owner

Asked in the chat of 21 Nov (five questions: reuse path, bug register, tablet access, public repo, Spec Kit). Answers go to docs/DECISIONS.md and this page.

## 5. Cost (estimate, not measured)

Part cards and template v2 for the current phase's specs: about one day of Opus and Sonnet. Bug register and the reuse gate: half a day. Building the smart bar on the part cards instead of on new code: no extra time expected; the parts B3 to B9 were already going to write placement, ⋯ and the customiser once. Rewriting the existing text box bar and mini bar onto the parts before the smart bar: 2 to 4 days more and is not recommended; they are replaced by the smart bar in stage 3.
