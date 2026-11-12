# Pictures, PDF, audio and reading (slice 14, flag `media.v2`)

Security rules: [rules/security.md](../../rules/security.md). Check them before building.

Sources: `docs/plans/app-audit-2026-11-12.md` §3.4 (P6–P19) and §5 batch 3; build-master-plan §2.3 row 3, §3.4 row 14, "Running principles" 2; [pictures](pictures.md), [audio](audio.md), [reading-mode](reading-mode.md), [views-and-layers](views-and-layers.md); owner ideas batch 2 items 4, 5, 7, 8 (layers, shrink a box, rotation, overlap); [textbox-v2](textbox-v2.md) (the box this slice extends). Design system: `docs/mockups/toolbar-v8/design-study.md` §3.

## Purpose

In plain words: this slice polishes everything that is not typed text: pictures (place, crop, rotate), PDF tools (scan, combine, make searchable, export), audio recordings, the paper "furniture" (zoom pill, page scroll bar) and Reading mode. Reading your own notes and reading a book become one experience with the same controls. It also adds four things the owner parked for later: layers (put text over a picture, bring to front, hide), shrinking a box to make its text smaller, a Lasso "snapshot" (turn a selected area into a picture), and rotating a text box.

## How it works

### Shared parts used (plan 3.2 row 0g)

| Part                                    | Used for                                                                                              |
| --------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Tool frame (step 3)                     | Edit picture, Scan, Combine, Make searchable, Organise pages: big preview, steps on top, ✓ / ✕ footer |
| Before / after view (step 3)            | hold to compare in Edit picture and Scan looks                                                        |
| Status pill stack (step 3)              | recording chip, "Now playing", zoom %, sync: one stack, never overlapping                             |
| Card / ▾ frame 304 / 376 px             | picture style, Aa sheet tabs on iPad, layer card, audio row menu                                      |
| Object bar                              | selected picture, selected box (rotation, layer), Lasso snapshot                                      |
| Drag with drop-line and ▲▼              | scan pages, organise pages, combine files, bookmarks                                                  |
| Sheet, Dialog set, Toast queue (step 2) | Aa sheet on phone, "Discard changes?", Undo                                                           |
| ✕ field                                 | recording rename, find field, font import name                                                        |
| Empty state                             | no recordings, no bookmarks, nothing found                                                            |

No new visual pattern beyond the step-3 parts already planned (Tool frame, Before / after, Status pill stack).

### Sizes, spacing, motion

- Tool frame: full screen; top step bar 52 px; footer 64 px with ✕ left, ✓ right (44 pt each); preview fills the rest with 16 px margins.
- Crop handles: corner L-marks 24 px visual, 44 pt targets; ratio tiles in a 304 px picker.
- Rotation handle: a round 28 px knob 24 px above the top-centre of the box on a 1 px stem, 44 pt target; snaps at 0 / 90 / 180 / 270° (± 4°), angle shown in a pill while turning.
- Status pill stack: bottom-right, 8 px gaps, above the keyboard and keyboard bar, never over the toolbar or a title.
- Zoom pill shows the % for 2 s then fades (200 ms); page scroll bar 6 px, 44 pt hit width, minimises like every bar.
- Reading mode: same bar and Aa sheet as the approved Reader mock (slice 7 `reader.v2`).
- Motion as design-study §3.6; rotation and scale follow the finger on every frame; reduced motion: instant.

### Unlock switches

Existing ids: `tb.pictureEdit`, `tb.layers`, `tb.lassoOptions`, `tb.selectionMenu`, `tb.textBox`, `reader.layout`, `reader.presets`, `reader.lineFocus`, `reader.aloudSkip`, `reader.aloudVoice`, `reader.keepAwake`, `reading.speed`. New ids to add to `docs/mockups/pro-features.md`:

| id                  | Name               | What it does                                                   |
| ------------------- | ------------------ | -------------------------------------------------------------- |
| `pic.placePlus`     | Picture placement  | Wrap, exact size, lock in place                                |
| `pdf.toolsPlus`     | More PDF tools     | Make searchable (OCR), a look per scan page, export choices    |
| `audio.plus`        | Audio extras       | Speed, rename, export, jump to the note written at that moment |
| `paper.furniture`   | Page scroll bar    | Page scroll bar and sheet thumbnails                           |
| `box.layers`        | Layers             | Overlap, bring to front / send to back, hide / show            |
| `box.scale`         | Shrink to scale    | Make a box smaller than its text; text and pictures scale down |
| `box.rotate`        | Rotate a box       | Turn a text box or picture with a knob                         |
| `lasso.snapshot`    | Snapshot           | Turn a Lasso selection into a picture                          |
| `reading.bookmarks` | Bookmarks and goal | Bookmarks panel, ribbons, daily goal and streak, font import   |

### When I do X → Y (one e2e test each)

**Pictures (P6, P7, P8)**

- MD-01 When I add a picture → a preview shows where it will land with ✓ and ✕; ✓ places it, ✕ removes it; nothing else reacts until I choose.
- MD-02 Placement, Beginner → three sizes (Small, Medium, Full width). **Pro `pic.placePlus`** adds Wrap, Exact size and Lock.
- MD-03 When I open Edit picture → the Tool frame opens full screen; Beginner shows Crop and Rotate; **Pro `tb.pictureEdit`** adds ratio tiles, Straighten, Adjustments and picture style presets.
- MD-04 When I hold the Before / after button → the original shows until I let go.
- MD-05 When I tap ✕ in Edit picture → "Discard changes?" asks only if I changed something; otherwise it closes.
- MD-06 When I tap Restore original → the first version of the picture comes back with Undo.
- MD-07 When I use the Camera tool → the camera opens; the photo goes through MD-01; no camera permission → a plain line "Allow the camera in Settings" with a how-to pop-up.

**PDF tools (P9, P10)**

- MD-08 When I open Scan → the camera steps: Capture → Corners → Look → Save. When I drag a scan corner → a magnifier shows the corner; the page straightens when I let go.
- MD-09 Beginner → one look for all pages; **Pro `pdf.toolsPlus`** a look per page; presets Whiteboard, Book page, Receipt.
- MD-10 When I reorder scan pages, combine files or organise PDF pages → hold and drag with a drop-line, or ▲▼ (fixes HTML-drag only, which fails on touch).
- MD-11 When I combine files → pick files, reorder, ✓ makes one PDF in the Library; `.heic` is either accepted and converted or not offered (fixes the mismatch).
- MD-12 **Pro `pdf.toolsPlus`** When I run Make searchable offline → it works for English; other languages show "Needs internet" before I start.
- MD-13 When I export a PDF → Beginner "With my marks"; **Pro `pdf.toolsPlus`** also "Clean copy" and page range.

**Audio (P11)**

- MD-14 When I tap Record → the recording chip joins the pill stack with the time; tap it to stop; the recording appears in the Audio panel.
- MD-15 When I play, pause or delete a recording → it happens at once; delete offers Undo.
- MD-16 **Pro `audio.plus`** Speed 0.5–2×, Rename (✕ field), Export as a file, and "Jump to note" moves the page to what I was writing at that moment.
- MD-17 When the microphone is blocked → a plain line with a how-to pop-up; nothing records silently.
- MD-18 The page "Audio & video" tab shows the same rows as the panel.

**Paper furniture (P13)**

- MD-19 When I pinch the page → zoom follows my fingers and springs back within limits; the zoom pill shows the % for 2 s.
- MD-20 **Pro `paper.furniture`** When I tap the page scroll bar track → the thumb jumps to the tapped spot (centred under the finger); dragging the thumb follows exactly.
- MD-21 The zoom pill and scroll bar minimise like every bar and never cover text.

**Reading (P17, P18, P19)**

- MD-22 When I open Reading mode on a note → the same bar and Aa sheet as the book Reader: Exit, Contents, Aa, Find, Listen, Edit.
- MD-23 Beginner Aa → text size and theme. **Pro `reader.layout`** spacing, margins, alignment, scroll or pages; **Pro `reader.presets`** saved looks as tiles with "+".
- MD-24 **Pro `reading.bookmarks`** bookmarks panel and ribbons, daily goal and streak, font import.
- MD-25 **Pro `reader.lineFocus`** line focus and ruler; Alt+Up/Down moves it.
- MD-26 When I select words in Reading mode → the bar shows Highlight, Look up, Read from here.
- MD-27 When I tap Read from here → Listen starts and "Now playing" joins the pill stack without covering other pills; **Pro `reader.aloudVoice`** speed and voice, **Pro `reader.aloudSkip`** sentence back / forward.
- MD-28 When I use Find → This page / This notebook / Everywhere; results jump with a glide.

**Layers, scale, snapshot, rotation (carry-overs)**

- MD-29 **Pro `box.layers`** When I drop a box or picture over another on blank paper → they may overlap; the Object bar shows Bring to front and Send to back; one Undo each.
- MD-30 **Pro `box.layers`** When I tap ⋯ › Hide → the box fades out and a small "1 hidden" chip appears; tap the chip → Show all.
- MD-31 **Pro `tb.layers`** The pen layers card keeps add, merge, lock, order (up to 2 ink layers today); "tools act on the active layer only".
- MD-32 **Pro `box.scale`** When I pull a resize dot past the box's content minimum → a warning shows once: "Text and pictures will get smaller"; going on scales them live; ⋯ › Reset size brings them back to 100 %.
- MD-33 **Pro `lasso.snapshot`** When I Lasso an area and tap Snapshot → a picture of it (ink, text, pictures) is made; I choose Copy, Place on the page (goes through MD-01) or Save to Files.
- MD-34 **Pro `box.rotate`** When I drag the rotation knob of a selected free box or picture → it turns live, snapping at 0 / 90 / 180 / 270°; one Undo; ⋯ › Straighten sets 0°.
- MD-35 A rotated box still edits normally: the caret, selection and Pencil writing follow the turned box.

### States

- **Empty:** no recordings ("Record a lecture to keep it with this page"), no bookmarks, nothing found in Find.
- **Error:** a picture or PDF that cannot be read → "Couldn't open this file" with the reason; a failed OCR keeps the original PDF untouched.
- **Offline:** all tools work on device; OCR other languages and remote pictures say so before starting.
- **Phone:** Tool frame full screen; Aa is a bottom sheet; the pill stack sits above the bottom bar; no rotation knob on a box narrower than 120 px (⋯ › Rotate 90° instead).
- **Dark / sepia:** preview backgrounds neutral grey so colours are judged fairly; pills and knobs keep 3:1 contrast.
- **Storage full:** recording stops cleanly and saves what it has; the shared storage notice shows.

### Pencil / touch rules

- All handles, knobs, corner marks, pills and footer buttons: 44 pt.
- Rotation and scale start only after a 120 ms hold with grow feedback; the gesture router locks everything else until lift; no ink mid-gesture.
- In the Tool frame the Pencil never draws; it moves handles only.
- A palm on a PDF page never turns the page or selects text (`palmGuard`).
- In Reading mode taps never place a caret; Edit is the only way back to typing.

## Nothing lost (inventory)

| Today's feature                                   | Where now (file:line)                                                                 | Where in the new design      |
| ------------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------- |
| Add a picture sheet                               | `src/images/PictureChooser.tsx:22`                                                    | MD-01 (v8 owns the sheet)    |
| Placement preview ✓ / ✕                           | `src/images/PicturePlacement.tsx:47`                                                  | MD-01, MD-02                 |
| Edit picture: crop, rotate, restore               | `src/images/CropSheet.tsx:69, 81-123`                                                 | MD-03–MD-06                  |
| Picture editor host, picture panel                | `src/images/pictureEditor.tsx:17`, `PicturePanel.tsx:20`                              | MD-03                        |
| Picture handles and size presets                  | `src/editor/PictureHandles.tsx:54`                                                    | MD-02, MD-34                 |
| Camera tool                                       | `src/editor/PageEditor.tsx:666`                                                       | MD-07                        |
| PDF menu, PDF tools shell                         | `src/reader/BookReader.tsx:795`, `src/reader/pdfTools/PdfTools.tsx:27`, `Shell.tsx:9` | MD-08–MD-13                  |
| Organise pages                                    | `src/reader/pdfTools/OrganiseSheet.tsx:85`                                            | MD-10                        |
| Combine files                                     | `src/reader/pdfTools/CombineSheet.tsx:24`                                             | MD-11                        |
| Scan to PDF, corners, looks                       | `src/reader/pdfTools/ScanSheet.tsx:163`                                               | MD-08, MD-09                 |
| Make searchable (OCR)                             | `src/reader/pdfTools/OcrSheet.tsx:32`, `pdfEdit.ts:200`                               | MD-12                        |
| Export with marks / clean                         | `src/reader/pdfTools/PdfTools.tsx:87`                                                 | MD-13                        |
| Audio panel, recording row                        | `src/audio/AudioDock.tsx:58, 306`                                                     | MD-14–MD-16                  |
| Start / stop recording, limits 3 h / 200 MB       | `src/audio/recorder.ts:71, 121`, `recordingService.ts:19-21`                          | MD-14, storage-full state    |
| Delete / restore recording                        | `src/audio/recordingService.ts:73, 83`                                                | MD-15                        |
| Audio & video tab                                 | `src/pages/tabs/AudioTab.tsx:21`                                                      | MD-18                        |
| Zoom pill, pinch zoom                             | `src/paper/PaperFrame.tsx:344-446`                                                    | MD-19                        |
| Page scroll bar with ▲▼                           | `src/paper/PageScrollBar.tsx:54`                                                      | MD-20, MD-21                 |
| Sheets and "continues" line, empty-page hint      | `src/paper/PaperFrame.tsx:1851-1895`                                                  | kept (MD-21 furniture rules) |
| Reading frame, reader controls                    | `src/app/reading/ReadingFrame.tsx:77`, `ReaderControls.tsx:69`                        | MD-22                        |
| Aa sheet (Text, Layout, Themes, More), font tiles | `src/app/reading/AaSheet.tsx:57`, `FontTiles.tsx:36`                                  | MD-23, MD-24                 |
| Bookmarks panel                                   | `src/app/reading/BookmarksPanel.tsx:28`                                               | MD-24                        |
| Find                                              | `src/app/reading/ReaderFind.tsx:52`                                                   | MD-28                        |
| Selection bar                                     | `src/app/reading/ReadingSelection.tsx:35`                                             | MD-26                        |
| Line focus / ruler                                | `src/app/reading/ReadingRuler.tsx:10`                                                 | MD-25                        |
| Read aloud panel, Now playing pill                | `src/reader/aloud/AloudPanel.tsx:27`, `src/app/reading/NowPlayingPill.tsx:18`         | MD-27                        |
| Ink layers (2), rename, hide, lock, order, merge  | `src/ink/layers.ts:8-119`, `LayersCard.tsx:31`                                        | MD-31                        |
| Hidden-layer chip                                 | `src/ink/InkSurface.tsx:1021`                                                         | MD-30 (same chip style)      |
| Lasso row actions                                 | `src/ink/lassoMenu.ts:10-34`                                                          | MD-33 adds "snapshot"        |
| Selection to picture, copy picture                | `src/ink/screenshot.ts:12, 42`                                                        | MD-33 (engine reused)        |

## Won't do

Video editing, drawing on pictures outside the ink layer, cloud OCR without the cost consent, more than 2 ink layers (separate decision), rotating the page's default (full-width) box, rotating tables or databases.

## Build order (sub-slices, one commit each, behind `media.v2`)

| #   | Sub-slice (audit ids)                | Files it owns                                                                                            |
| --- | ------------------------------------ | -------------------------------------------------------------------------------------------------------- |
| 14a | P6, P7, P8 pictures                  | `src/images/PicturePlacement.tsx`, `CropSheet.tsx`, `pictureEditor.tsx`, camera part of `PageEditor.tsx` |
| 14b | P9, P10 PDF tools in the Tool frame  | `src/reader/pdfTools/*`                                                                                  |
| 14c | P11 audio                            | `src/audio/*`, `src/pages/tabs/AudioTab.tsx`                                                             |
| 14d | P13 paper furniture                  | `src/paper/PageScrollBar.tsx`, zoom pill part of `PaperFrame.tsx`                                        |
| 14e | P17, P18, P19 one reading experience | `src/app/reading/*`, `src/reader/aloud/AloudPanel.tsx`                                                   |
| 14f | Layers (box / picture order, hide)   | new `src/paper/v2/boxLayers.ts`; `src/ink/LayersCard.tsx`                                                |
| 14g | Shrink to scale                      | `src/paper/v2/boxResize.ts` (from slice 2)                                                               |
| 14h | Snapshot Lasso                       | `src/ink/lassoMenu.ts`, `screenshot.ts`, `LassoMenuSheet.tsx`                                            |
| 14i | Box and picture rotation             | new `src/paper/v2/boxRotate.ts`; `src/editor/PictureHandles.tsx`                                         |

14f, 14g, 14i need slice 2 (`textbox.v2`) merged first; 14d and 14f–14i touch `src/paper/`: one at a time.

## Security check

Pictures, PDFs and audio files are untrusted: size caps kept (pictures and PDFs as in `pictures.md`, recordings 200 MB / 3 h); file type checked by content, not name; OCR runs on device only; remote pictures load only after the user allows (slice 11). Snapshot saves through the existing download path. New optional box fields (`rotation`, `z`, `hidden`, `scale`) are checked in `share/checkRows.ts` (numbers in range).

## Tests

- Unit: rotation snap and hit-testing in a turned box; scale keeps text readable (minimum 50 %); layer order with Undo; snapshot size of the selection; scan page reorder with ▲▼.
- e2e (Chromium and `ipad-webkit`): one per line MD-01 to MD-35; camera and microphone denied paths.
- Screenshots: Beginner / Professional × light / dark / sepia × iPad landscape / portrait / phone / PC for Tool frame, Audio panel, Reading mode, rotated box.
- "Nothing lost" probe: every inventory row. Flag OFF = today's screenshots. Old pages without the new fields open unchanged.
- Accessibility: Tool frame steps announced; knob and handles labelled; keyboard: R rotates a selected box 90°, [ ] change layer order.

## Owner iPad check (3 steps)

1. Add a picture, tap ✓, open Edit picture, crop it, hold Before / after, tap ✓.
2. Open a note in Reading mode, change text size in Aa, select a sentence and tap Read from here: the "Now playing" pill sits in the stack without covering anything.
3. Turn on "Rotate a box" and "Snapshot" in Professional features, turn a free box with the knob, then Lasso it and tap Snapshot › Place on the page.

## Decisions to review

1. **New unlock ids** (9, table above): `pro-features.md` has none for these; total 169 → 178 with slice 13's, 187 with these.
2. **Rotation only for free boxes and pictures**, not the default full-width box or boxes inside grid rows (a turned box in a row would break the row maths in `grid.ts`). Phone: ⋯ › Rotate 90° only.
3. **Layers = overlap + front / back + hide**, the owner's "start smaller" version; full GoodNotes layers (tools act only on one layer, export visible layers) stay with the existing 2 ink layers.
4. **Overlap is allowed only with `box.layers` on**; with it off, boxes keep today's no-overlap rule (owner parked "overlapping boxes").
5. **Shrink to scale has a floor of 50 %** and a one-time warning; Reset size restores 100 %.
6. **Snapshot defined as**: Lasso area → picture (Copy / Place / Save), reusing `selectionPng`; sources never define it, so this is my reading of "snapshot Lasso".
7. **New box fields** (`rotation`, `z`, `hidden`, `scale`) are added to the box JSON only (no Dexie version); this breaks the "keep the engine unchanged" rule of slice 2 slightly: `grid.ts` must skip hidden boxes and treat rotated boxes by their outer rectangle. Fable to confirm.
8. **Reading mode merge depends on slice 7 (`reader.v2`)**: 14e reuses its bar and Aa sheet; if slice 7 is not merged, 14e waits.
9. **`.heic`**: accept and convert on device where the browser can decode it, otherwise do not offer it (MD-11).
