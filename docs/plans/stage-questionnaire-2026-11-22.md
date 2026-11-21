# The stage questionnaire: you choose the stage of every item (22 Nov 2026)

| Status                                 | Scope                                                                                        | Builds on                          | Last change               |
| -------------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------- | ------------------------- |
| Draft, waiting for the owner's answers | every item of the stage map, one question each, after the owner's scenario answers of 22 Nov | docs/plans/stage-map-2026-11-22.md | 22 Nov 2026, 03:30, Fable |

## Read this first

**The three stages, in the owner's words of 22 Nov.**

- **Stage 1, the working app, for you.** A basic notebook you use right now on the PC, with no bugs. Claude makes a notebook from your sources (you ask in Claude Code or VS Code; the local connector writes it). On Monday morning you open it, read it, and tidy it: fix a sentence, rewrite a paragraph, highlight, change colour and size, add a box beside Claude's text, paste a picture, move things. It lands as boxes on a paper page with headings, bullets, pictures, highlights, sticky-note boxes, a mind map and a database, and it looks great. The bars, the frame and the layout tools are in, because they will not change later. The iPad reads only.
- **Stage 2, the premium app, for you.** The polishing against our design principles, then the Pencil on the iPad, then the richer and more complex features.
- **Stage 3, for everyone.** What only other users or many users need: privacy and permission rules, AI inside the app with API keys, Settings for many devices, onboarding, languages, scale.

**How to answer on this page:** the buttons read A, B and Other: **A = Stage 1, B = Stage 2, Other = Stage 3.** Or answer in chat: "Q1 1, Q2 2, …". "Your answer" marks what you already decided tonight. My pick comes with one reason. The map is corrected from your answers and becomes the final plan.

## The stage questionnaire

### Claude makes the notebook

**Q1. The connector writes every block the app has.** What it is: today the connector makes plain pages (headings, lists, callouts, tables, maths, cards). It cannot make text boxes on a paper page, sticky looks, highlights and colours, pictures, mind maps, databases, tags or page tabs; you found this on 16 Nov. What it does for you: the notebook lands the way you described. State: new, about 3 days for the block gaps. Your answer: **Stage 1**.

**Q2. Boxes on a paper page, laid out page by page.** What it is: Claude places sections as boxes on A4 sheets, keeps a section with its picture on one page, splits long lists, uses a sticky for key points. What it does for you: it looks like a notebook, not a document. State: new, about 3 to 5 days on top of Q1; the paper page and the box looks exist. Your answer: **Stage 1**.

**Q3. A notebook skill for Claude.** What it is: a one-page style guide Claude follows every time it makes a notebook (structure, looks, when to use a sticky, a picture, a mind map, a database), approved by you once, with a picture. State: a skill spec exists (claude-skill.md). Your answer: **Stage 1**.

**Q4. Claude draws.** What it is: the connector can write ink strokes, so Claude can draw simple figures, arrows and diagrams onto a page, like the GoodNotes plugin you used. What it does for you: pictures without a photo. State: new; the ink model exists, the connector cannot write ink. Honest note: drawn figures will be simple; diagrams come out better as mind maps or shapes. Your answer: **Stage 1**, inside the connector work.

**Q5. Pictures you insert.** What it is: paste a picture into a box or page, resize it, place it. State: built. My pick: **Stage 1**, you do it daily.

**Q6. Pictures Claude fetches from the web.** What it is: Claude finds photos online and puts them in. Licence risk. My pick: **Stage 3, or never**; you give pictures, Claude draws the rest.

### Editing on the PC

**Q7. The text box and its looks.** What it is: boxes you type in, move, resize, style (Plain, Sticky, Callout, colours), several on a page, columns. State: built behind a switch. My pick: **Stage 1**, your notes live in boxes.

**Q8. Fonts, sizes, colours, highlight, bold, italic, links.** State: built. My pick: **Stage 1**, daily.

**Q9. Moving things around the page, layout assist and the box grid.** What it is: drag boxes, snap, align, two columns, six boxes. State: built. My pick: **Stage 1**, you move things daily; the finer polish in stage 2.

**Q10. The paper page.** What it is: fixed A4 or Letter sheets, backgrounds, zoom. State: built, ink at zoom not yet. Your answer: **Stage 1**, the page type Claude-made notebooks use.

**Q11. Mind maps.** What it is: a tree of ideas you type and rearrange, as a block in a page. State: built. Your answer: **Stage 1**, one of your three daily tools.

**Q12. Databases and their views.** What it is: tables inside notes where each row is a page, with Table, Board, Calendar, Gallery and List views. State: built. Your answer: **Stage 1**, one of your three daily tools.

**Q13. Dashboards and the study tracker.** What it is: pages of numbers and charts from your databases. State: partly built. My pick: **Stage 2**, after the three daily tools are bug-free.

**Q14. The Summary tab.** What it is: the short summary notes of a notebook. State: built. Your answer: **Stage 1**.

**Q15. Layers and the Tape.** What it is: up to two ink layers over the text that you can hide and show; the Tape hides what is under it until tapped. State: built, for the Pencil mostly. Your answer: **Stage 1, must not break on the PC; proper use with the Pencil in stage 2**.

**Q16. The pen tool with the mouse.** State: built. My pick: **Stage 1, must not break**; you rarely draw on the PC.

**Q17. Undo, page history, trash, templates, tags, links between pages.** State: built. My pick: **Stage 1**, daily safety.

**Q18. Notebooks, pages, sidebar, page tabs, page menus, Home, Library, Journal and Today, search.** What it is: the frame you start in. State: built. My pick: **Stage 1**, "the frame will not change later".

### The bars

**Q19. The eleven shared parts.** What it is: the building blocks every bar uses once (shell, placement, hover names, colour, size and font pickers, ⋯ menu, drag and dock, keys, hold menu), so bars are never rebuilt again. State: new. Your answer: **Stage 1**.

**Q20. The Action bar for text, box and picture, with the presets Edit and Study and Auto.** State: new, pictures approved. Your answer: **Stage 1**.

**Q21. The Action bar for drawings and mixed selections.** What it is: the same bar for ink, with Colour and Thickness. My pick: **Stage 1 too**, since you want the bars complete and unchanged later; it is about a day. Say 2 if you prefer it with the Pencil phase.

**Q22. Customise bar… with the full customiser, docking and pinning.** What it is: choose which buttons each kind of selection shows, their order; drag the bar to a screen edge and it stays. State: new; the Tool bar's customiser exists. My pick: **Stage 1**, same reason: the bars are finished once.

**Q23. The pickers at full polish.** What it is: colour, size and font pickers exactly as in pictures 21 and 22, with live samples and More fonts…. State: partly built. My pick: **Stage 1**, they are part of the Action bar.

**Q24. The Hold menu.** What it is: press and hold on empty paper opens a small menu. State: built, basic. My pick: **basic in Stage 1; its options and Settings in Stage 2**.

**Q25. Keyboard shortcuts.** What it is: every bar action has a key; a sheet lists them. State: partly built. My pick: **the keys in Stage 1, since the PC comes first; the sheet in Stage 2**.

**Q26. The Tool bar at the top (v9), fixed.** State: built. My pick: **Stage 1**.

**Q27. Settings › Bars and menus.** What it is: a small group to switch the Action bar presets and Auto, and the Hold menu. State: new. My pick: **Stage 1**.

### Install, safety, Settings

**Q28. The update flow.** What it is: check on open and first change, one tap, installs at once, 3-second restart with Cancel, never stuck; Update with the version near the top of Settings. State: built but broken on every release; U0 is running. My pick: **Stage 1**.

**Q29. Accounts, offline once signed in, local storage, sync, backup to Drive, the rolling browser backup.** State: built. My pick: **Stage 1**, your data.

**Q30. Export to Markdown, PDF, CSV.** State: built. My pick: **Stage 2**.

**Q31. Settings v5, the redesign of the Settings page.** What it is: the recount of 169 switches, a first page with starter cards, groups, search that changes a setting, changed by me, Reset. State: pictures approved 15 Nov, not built. Your answer: **Stage 3**. Note once: it is your own page too; say 2 if the long old page hurts daily.

**Q32. Settings for other users.** What it is: welcome and "my experience", this-device tags and what syncs, the big live preview, help and tours. My pick: **Stage 3**.

**Q33. Encryption, lock, remote sign-out, privacy and permission rules, AI permissions.** Your answer: **Stage 3**; you are the only user now.

### Study and reading

**Q34. Review and recall cards.** What it is: the cards and the due-card review. State: built. Your answer: **out of Stage 1 completely; Stage 2**, left working as it is meanwhile.

**Q35. The Reader, reading mode, book annotations.** State: built, parked, never seen by you. My pick: **Stage 2**.

**Q36. Reader presets, the Highlights database, study modes (summary layers, theme pages, quiz, teach-back).** State: new. My pick: **Stage 2**.

**Q37. Quick capture and Spaces.** State: partly built. My pick: **Stage 2**.

**Q38. Custom Views, box rotation, snapshot Lasso.** State: parked. My pick: **Stage 2**.

**Q39. Professional features, Beginner and Professional levels, the Pro colour unlock.** State: built; the unlock is new. My pick: **Stage 2**.

**Q40. Media, audio, maths, embeds, the files table.** State: partly built. My pick: **Stage 2**.

### The Pencil and the iPad

**Q41. Reading on the iPad.** What it is: open, read, navigate, scroll, zoom on the iPad, with the Lasso as it is for small edits. State: built. Your answer: **Stage 1**.

**Q42. Full Pencil use.** What it is: text selection with handles, circle a word, double tap, write over selected words, the hold strip tremor rework, Scribble flows, the paper page with ink at every zoom. State: half built, parked. Your answer: **Stage 2**, as its first phase after the polishing, or before it: say which in a note.

**Q43. The phone layout and phone presets.** My pick: **Stage 3**.

### AI, connectors, for everyone

**Q44. The hosted Claude connector.** What it is: Claude writes notebooks without your PC open, through a server; needs a Supabase step and an encryption design. Your answer: **Stage 2**.

**Q45. AI inside the app with API keys, the AI learning companion, paid AI features.** Your answer: **Stage 3**.

**Q46. Handwriting to text with AI.** My pick: **Stage 2 for English with the Pencil; Hindi Stage 3** (needs a paid model).

**Q47. Notion, NotebookLM and CSV import; Anki import and export.** Your answer for Anki: **Stage 3**. My pick for the rest: **Stage 3**.

**Q48. Voice replies and the mic in the text box.** Your answer: **Stage 2**.

**Q49. The in-app Project notebook (your specs and bugs inside the app).** My pick: **Stage 2**.

**Q50. Onboarding, help, tours, languages, accessibility pass, performance at scale, smart merge, passkeys, sign-up, custom domain, App Store wrap, store-like install.** My pick: **Stage 3**.

**Q51. Kindle, Apple Books, Play Books, Audible connections.** My pick: **Stage 3, maybe never**.

**Q52. The starter kit for other projects; Notion as a mirror.** My pick: **Stage 3**.

**Q53. The 152 entries of the ideas file.** My pick: **each gets its stage when picked for a phase**, not now. A to agree; Other to have them sorted now (about an hour of Opus).

**Q54. Phases 9 and 10 of the old plan: things inside a page; safety and the system layer; welcome and tours.** State: not built, pictures never shown to you. My pick: **things inside a page = Stage 2; system layer, welcome and tours = Stage 3**.

## What happens with your answers

Fable corrects the stage map, marks it Confirmed, and rewrites Phase PC-1 as the first phase of stage 1. From your answers so far, Phase PC-1 would hold: the set-up (running), the update flow (running), the connector that writes every block plus boxes on paper plus the notebook skill, the shared parts and the complete Action bar, and the bug-free pass over the editing path on the PC; reading on the iPad checked at the release. Settings v5, review and cards, the Pencil and AI inside the app leave the phase. The estimate is written after your answers, from the measured pace.

### Changes

- 22 Nov 2026, 03:30 · rewritten from the owner's thirteen scenario answers and six follow-ups · Fable.
- 22 Nov 2026 · draft · Fable, at the owner's request after the stage map audit.
