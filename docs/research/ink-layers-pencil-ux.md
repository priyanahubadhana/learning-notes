# Ink layers + Apple Pencil UX research (web, iPad Safari)

Date: 2026-11-06. Method: web searches only (search snippets, not full page reads). Marking: **[verified with link]** = a source I found says it; **[unverified]** = my inference or the source was secondary/old. Search could not reach app UIs, so competitor behaviour is from help pages and user forums. **Everything touching Safari/Pencil must be re-tested on a real iPad** (our own CLAUDE.md "owner checks" step) because most sources are iPadOS 14-era.

---

## Part A. How other apps do it

### GoodNotes 6

- Text Box tool snaps back to Lasso after one box. Top user complaint; users want tap-to-place repeatedly without re-picking the tool. [verified: [GoodNotes feedback: allow multiple text boxes without switching to lasso](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/50597972--lasso-stop-lasso-default-tool?page=4)]
- Pencil-to-text (Scribble) gets in the way of simply placing or moving a text box. [verified: same thread family, [Text Box Issues](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/50676059-text-box-issues)]
- Lasso over a text box moves the whole box even if only part was circled. [verified: [GoodNotes feedback](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/50597972--lasso-stop-making-lasso-the-default?page=6)]
- Toolbar redesign backlash: sits lower, eats workspace, overlaps text, "too many clicks". [verified: [techissuestoday](https://techissuestoday.com/goodnotes-faces-backlash-as-users-demand-the-goodnotes-6-ui-back), [GoodNotes feedback](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/50727617-support-request-critical-usability-issues-after)]
- Handwriting-to-text in text boxes is Apple's Scribble; lasso-based conversion is GoodNotes' own. [unverified, secondary Korean help mirror: [wikidocs](https://wikidocs.net/320291)]
- Pills, hover labels, selection bar, page-position stability: I found no sourced detail. [unverified]

Lessons: (1) a tool the user picked must stay picked until they change it ("sticky tools"); (2) never let Scribble/pencil conversion fight with placing or moving objects; (3) lasso must pick a whole object, or the exact thing circled, and say which; (4) keep the toolbar thin and out of the writing area.

### Notability

- Combines handwriting, typed text, images on one page; reviewers say switching between modes feels more natural than in GoodNotes. [verified: [App Store listing](https://apps.apple.com/us/app/id360593530), [MacStories](https://www.macstories.net/ios/ipad-diaries-apple-pencil-notability-and-the-joy-of-note-taking/)]
- Typed text on the page does not align well; text boxes can change length and shift surrounding ink. [verified, but old: [tech.mountdesales.net overview](https://tech.mountdesales.net/?p=1540)]
- Whether ink stays anchored when typed text reflows: not found. [unverified]

Lesson: the biggest design risk for us is exactly this: ink over reflowing text. Decide the rule up front (see R12).

### Notion

- Block editor; selection model is block-first (Esc selects a block, drag selects many). iPad keyboard behaviour: no sourced detail found. [unverified]
- Lesson from ProseMirror world: mobile Safari selection menu is hard to remove (Part B).

### OneNote on iPad

- Draw tab; lasso selects ink strokes, then cut/copy/delete/move. [verified: [Microsoft: lasso select ink on iPad](https://support.microsoft.com/en-us/onenote/onenote-for-ipad-or-iphone-help-and-learning/lasso-select-ink-strokes-in-onenote-for-ipad-or-iphone)]
- "Ink to Text" does not work on iPad (button does nothing); Microsoft states it is unsupported. [verified: [Microsoft Q&A](https://learn.microsoft.com/en-us/answers/questions/5840398/onenote-ios-ipados-ink-to-text-not-working-on-ipad)]
- Ink vs typed-text anchoring: not found. [unverified]

Lesson: do not show a button that does nothing on this platform. Hide or label "not available on iPad".

### Apple Notes / Freeform

- Scribble converts handwriting to typed text only when the Handwriting tool is selected (or inside a text field). A normal pen keeps the ink. [verified: [Apple: Enter text with Scribble on iPad](https://support.apple.com/guide/ipad/aside/ipad355ab2a7/ipados), [Switching to Mac](https://www.switchingtomac.com/how-to-use-scribble-on-ipad-with-apple-pencil/)]
- Apple's HIG-style advice for drawing apps: give the user a UI toggle between pencil modes (draw vs Scribble). [verified via secondary quote: [Nutrient blog](https://www.nutrient.io/blog/extending-the-scribble-user-experience/)]

Lesson: explicit modes win. Pen tool = ink always. Pointer/text tool = text, Scribble allowed. Never guess from context.

### Photoshop Layers (for our 2-layer UI)

- Beginners stumble on: eye (hidden is not deleted), several kinds of lock, Opacity vs Fill, and merge being permanent. Advice: duplicate before merging, name layers. [verified: [Photoshop tutorials roundup, e.g. psdvault](https://www.psdvault.com/basics/photoshop-layers-for-beginners/), [Adobe: understand layers](https://www.adobe.com/sg/learn/photoshop/web/understand-layers)]
- Alt-click eye isolates a layer. [verified: same sources]

Simple 2-layer version (our design, [unverified] until tested with the owner):

- Two rows only: "Ink 1", "Ink 2" (text page shown as a fixed, non-editable "Page" row at the bottom, so the stack is visible: Ink 2 / Ink 1 / Page).
- Per row: ONE eye (show/hide), ONE lock (one meaning: can't draw or select), no opacity slider in v1 (or a 3-step: 100/60/30 %).
- "Active layer" = highlighted row; new strokes go there. Show the active layer's name in the toolbar pill.
- Order: a single "swap" button, not drag. No merge in v1; if added, name it "Combine into Ink 1" with an undo toast and warning.
- Hidden layer must show a visible badge on the page (otherwise "my ink vanished" tickets).

---

## Part B. Technical: ink overlay on iPad Safari

### B1. What is known about Scribble and web pointer events

- iPadOS 14 report: with Scribble on, a page lost pointer events (3 of 4 pointerdowns) even with `touch-action: none`; reported workaround is a `touchmove` listener on the target that calls `preventDefault()`. Tracked as WebKit bug 217430. [verified: [Apple Developer Forums thread 662874](https://developer.apple.com/forums/thread/662874), [WebKit bug 217430](https://bugs.webkit.org/show_bug.cgi?id=217430)]. Community fix, not Apple-documented; may be fixed or changed in 2025-26. Test it.
- Turning Scribble off in iPad Settings fixes it, but we cannot ask every user to do that. [verified: [DEV: Scribble interfering with Pencil canvas](https://dev.to/skyjinxx/ipados-scribble-interfering-with-apple-pencil-canvas-drawing-in-web-browsers-3ba7)]
- An annotation-overlay developer found Scribble still stole events despite `touch-action` and `user-select`, and `pointer-events: none` was not an option. [verified: [yomotherboard Q&A](https://yomotherboard.com/question/how-can-i-disable-apples-scribble-feature-for-a-web-annotation-tool/)]
- No web API exists to opt out of Scribble per element (native has UIScribbleInteraction). I found nothing that shows `pointercancel` is specifically what fires; some canvas code maps `pointercancel` to the same handler as `pointerup`. [unverified for cancel; verified for the mapping idea: [DEV: Pencil pressure in the browser](https://dev.to/sendotltd/reading-apple-pencil-pressure-in-the-browser-pointerevent-getcoalescedevents-and-the-2e23)]
- Palm rejection: no public API. Touches can be cancelled while Pencil+palm are down; when a stylus touches, the OS may stop sending finger events. [verified: [Apple forums 847321](https://developer.apple.com/forums/thread/847321), [tldraw blog "A touchy subject"](https://tldraw.dev/blog/a-touchy-subject)]
- Safari touch events expose `touch.touchType` of `"stylus"` vs `"direct"`; Pointer Events carry `pointerType: "pen"`. [verified: [scrapbox: distinguishing Pencil touch](https://scrapbox.io/nishio-en/Distinguishing_between_direct_touch_and_Pencil_touch_on_the_iPad)]
- A proposed CSS `pen-action` never shipped as far as I found, so the pen is treated like a finger by `touch-action`. [verified draft only: [Edge explainer](https://www.github.com/hpsin/MSEdgeExplainers/blob/main/PenAction/explainer.md)]
- Excalidraw / tldraw / Rnote / Xournal++ web specifics: I did NOT find their iPad Pencil source handling. tldraw's blog is the only partial hit. [unverified; read their repos' `touch-action` and `pointer` code directly]

### B2. Recommended overlay recipe (all [unverified] until tested on a real iPad)

1. Overlay canvas: `position:absolute; inset:0; touch-action:none; user-select:none; -webkit-user-select:none; -webkit-touch-callout:none; -webkit-tap-highlight-color:transparent;`
2. Only enable the overlay (`pointer-events:auto`) while an ink tool is active. In text mode set `pointer-events:none` so typing/scroll work normally. This is the cleanest "mode" switch and is what Apple's mode-toggle advice implies.
3. Handle `pointerdown/move/up/cancel` and call `setPointerCapture(e.pointerId)`. Only start a stroke for `pointerType==="pen"` (finger = scroll/pan, optional "draw with finger" setting).
4. Also add non-passive `touchstart` and `touchmove` listeners (`{passive:false}`) on the overlay; call `preventDefault()` when `touch.touchType==="stylus"`. This is the reported Scribble workaround and also blocks the page scroll. Do not preventDefault for finger touches.
5. While an ink tool is active, make the editor inert: set `contenteditable="false"` on the ProseMirror root (BlockNote: `editor.isEditable=false`), plus `inert` on the editor wrapper if supported. Blur the active element first, so the keyboard closes and Scribble has no focused field to target. Restore editable on leaving the tool. A focused text field is what lets Scribble engage. [reasoning; Scribble requires a text field per [Wondershare guide](https://drfone.wondershare.com/what-is/what-is-scribble-on-ipad-handwriting-to-text-conversion.html), secondary]
6. Use `getCoalescedEvents()` for smooth lines and `getPredictedEvents()` if available. [verified concept: DEV Pencil pressure article above]
7. On `pointercancel`, do NOT silently drop the stroke: commit what you have, and show nothing. Log counts in a hidden diagnostics panel so the owner can report how often it happens.
8. Add a visible "Pencil mode" toggle (pen vs text/select) and optional "double-tap pencil = switch tool" if `pointerType` events allow. Keep tool choice sticky.
9. Hit-testing for lasso/selection must run against the ink layer first when an ink tool is active, and against the page when text tool is active. Never both.

Known unsolved: Pencil hover (M2+ iPads) in Safari does not fire pointer events reliably for hover labels. Don't depend on hover for any control; hover labels are a bonus only. [unverified]

### B3. Selection callout (Cut/Copy/Paste) in a contenteditable

- `-webkit-touch-callout:none` only stops the link/image long-press menu, not the text-selection menu. [verified: [ProseMirror forum](https://discuss.prosemirror.net/t/how-to-disable-the-mobile-safari-selection-menu/2581), [MDN](https://developer.mozilla.org/docs/Web/CSS/-webkit-touch-callout)]
- `user-select:none` removes it but also blocks editing; `contenteditable=false` removes it but breaks links and is wrong semantically. [verified: [Wikimedia T281771](https://phabricator.wikimedia.org/T281771)]
- Reports of the property failing on iOS 15+. [verified: [Apple forums 691021](https://developer.apple.com/forums/thread/691021)]
- Realistic approach: you cannot fully remove the native bar inside an editable region. Combine: touch-callout none on the container, a `contextmenu` preventDefault, and a custom floating bar placed so it does not cover the native one (above the selection, not below). [partly verified: [plannotator PR](https://github-users.yhajoa.workers.dev/backnotprop/plannotator/pull/281)]
- Better path for ink: the callout never appears over the ink canvas if the editor is inert (B2 #5). Only fight it for the text tool; there, accept the native bar and add ours in a different place. [unverified]
- Custom copy payloads fail on iOS paste (WebKit bug 184271). Do not rely on custom clipboard formats on iPad. [verified: [WebKit bug](https://bugs.webkit.org/show_bug.cgi?id=184271)]

### B4. Keyboard and page jumping

- iOS Safari resizes the visual viewport but not the layout viewport; `position:fixed` bars stay put and the keyboard covers them; the page may also scroll the whole viewport up. [verified: [Apple forums 824765](https://developer.apple.com/forums/thread/824765), [Quirksmode](https://www.quirksmode.org/blog/archives/2017/06/toolbars_keyboa.html)]
- `interactive-widget` meta: Chrome Android yes; Safari status unclear (was behind a Tech Preview flag), and ignored in standalone PWA mode in one report. [verified partly: [Modern Web Weekly #61](https://modernwebweekly.substack.com/p/modern-web-weekly-61?open=false), [DEV: standalone PWA keyboard bug](https://dev.to/cederhook/fixing-the-ios-standalone-pwa-keyboard-bug-that-shrinks-your-viewport-for-good-63d)]. Check caniuse before use. Do not rely on it.
- `visualViewport` resize/scroll listeners are the common approach but lag (updates after scrolling stops). [verified: DEV article above]
- Recommendation: (a) track `visualViewport.height/offsetTop` and set a CSS var `--vvh`; position the bottom toolbar from it with `transform`, not `bottom`; (b) keep the document non-scrollable (body `overflow:hidden`) and make our own scroll container, so Safari has nothing to scroll when focus happens; (c) after focus, don't use `scrollIntoView` (jumps); compute the caret rect and scroll only our container by the needed delta; (d) in ink mode the keyboard is closed anyway (B2 #5), which removes most jumping. Standalone PWA keyboard viewport can stay shrunk after close; test and listen for `visualViewport.resize` to reset. [reasoning, unverified]

### B5. Caret from pen coordinates

- ProseMirror `posAtCoords` calls `elementFromPoint`; had a Safari crash fix when it returns null; ambiguity at wrap points (end of line vs start of next); unpredictable near element edges. [verified: [prosemirror-view CHANGELOG](https://github.com/ProseMirror/prosemirror-view/blob/d01c420d9c087f7ba56fc4db2081823ff491dc9d/CHANGELOG.md), [PR #47](https://github.com/ProseMirror/prosemirror-view/pull/47), [forum](https://discuss.prosemirror.net/t/round-trip-posatcoords-and-coordsatpos/932)]
- CodeMirror fixed a Safari bug where extra empty client rects confused `posAtCoords` at wrap points, and added `posAndSideAtCoords`. [verified: [CodeMirror 6.39.17](https://github.com/codemirror/view/releases/tag/6.39.17)]
- `caretPositionFromPoint` vs `caretRangeFromPoint` on iPad: no source found. [unverified]
- Recommendation: always call `view.posAtCoords({left,top})`; if null, clamp the point inside the editor rect and retry; then verify with `view.coordsAtPos(pos)`: if the distance to the tap > ~line height, snap to the nearest block via `view.dom` children's rects. Offset the pen point by a few px up/right of the nib (the visible tip vs touch point) [unverified]. When the editor is inert, `elementFromPoint` still works, so compute the caret on tap, make editable, then set the selection with `TextSelection.near`.

### B6. Hit targets without overlap

- Apple HIG default 44x44 pt. WCAG 2.5.8 (AA) min 24x24 CSS px or a 24 px circle with no overlap; 2.5.5 (AAA) 44x44 CSS px. [verified via secondary: [frontendchecklist](https://frontendchecklist.io/rules/accessibility/touch-targets), [testparty WCAG guide](https://testparty.ai/blog/wcag-target-size-guide), [Deque](https://docs.deque.com/devtools-mobile/2024.9.18/en/ios-touch-target-spacing)]
- Recipe: keep the icon 20 px, make the button 44x44 via padding, space centres >= 44 px (so hit areas touch but never overlap). If space is short, use a pseudo-element `::after{inset:-8px}` but only where neighbours are >= 16 px away; otherwise group icons in a pill/overflow menu. Pencil is precise, finger is not: the 44 px rule is for finger; Pencil-only controls can be 32 px. [partly unverified]

### B7. Smooth, distance-independent scroll-to-anchor + highlight

- Native `scrollIntoView({behavior:"smooth"})` has no duration control; browsers choose. [verified: [StackOverflow via mirror](https://backiee.wasmer.app/https_stackoverflow_com/questions/64942035/how-to-set-a-timed-transition-to-the-scrollintoview-behavior-smooth)]
- Custom `requestAnimationFrame` tween with fixed duration and easing is the standard answer. [verified: [javascriptsource tutorial](https://javascriptsource.com/scroll-to-an-element-smoothly-smooth-scroll), [scroll-element-into-view](https://www.npmjs.com/package/scroll-element-into-view)]
- Recommendation: duration = clamp(250, 250 + 120*log2(1 + distance/viewportHeight)*..., 700) ms (so a 50-screen jump is ~600 ms, not 5 s); ease-in-out cubic; cancel on any `pointerdown`/`wheel`/`touchstart`; end offset = target top minus ~25 % of viewport (not flush to top); then add class `.anchor-flash` (background fade over 1200 ms). With `prefers-reduced-motion`: jump instantly, keep a static highlight for 1.5 s. For very long jumps, "teleport then short glide": jump to within 1.5 viewports, then animate the rest. [reasoning; unverified]

### B8. Bookmark UX in readers

- Kindle: blue ribbon top-right; critique: no cue when inactive, accidental page turns when tapping it. Apple Books (old critique): bookmark hard to discover; notes list items look identical so hard to scan. [verified: [Pratt design critique, Kindle Android](https://ixd.prattsi.org/2017/09/design-critique-amazon-kindle-android-app/), [Apple Books critique](https://ixd.prattsi.org/2019/02/design-critique-apple-books-iphone-app/)]
- Kindle bookmark usability complaints after an update. [verified: [pupuweb](https://pupuweb.com/why-are-my-kindle-bookmarks-so-hard-to-use-after-the-latest-update)]
- Recommendation: a bookmark shows a faint outline ribbon when inactive (discoverable) and filled when set; target 44 px but placed away from the page-turn/scroll edge; list shows a 1-line snippet + position + date, with different icon colours per type (bookmark / highlight / note). Always give an undo toast on removal. [unverified]

---

## Part C. Recommendations for our app (ordered)

1. **Two explicit modes** (Text vs Ink). Entering Ink: blur editor, set non-editable, enable overlay. Leaving: reverse. Show current mode in the toolbar. [Apple mode advice verified; implementation unverified]
2. **Sticky tools**: selected pen/eraser/lasso stays until changed. Avoid GoodNotes' snap-back-to-Lasso complaint. [verified complaint]
3. **Pen-only drawing** by default; finger scrolls/pans. Optional "finger draws" toggle. [unverified]
4. **Add stylus `touchstart/touchmove` preventDefault** plus `touch-action:none` plus pointer capture, and test with Scribble ON and OFF. [verified workaround report, unverified current]
5. **Treat `pointercancel` as stroke-commit + diagnostic count**, not a silent loss. [unverified]
6. **Lasso picks whole strokes** crossing/inside the loop, shows a count ("3 strokes"), and a selection bar placed above the selection, with 44 px buttons, never overlapping the rotate handle (matches our last commit). [OneNote lasso verified; rest unverified]
7. **Do not ship dead buttons** (OneNote Ink to Text on iPad). Hide unsupported actions. [verified]
8. **Two-layer panel**: "Ink 2 / Ink 1 / Page" rows, eye + lock only, active layer highlighted, swap button, no merge in v1, badge when a layer is hidden. [Photoshop pitfalls verified; design unverified]
9. **Toolbar**: one thin bar, pills for tool groups, 44 px targets, no hover-only labels (use long-press or a tooltip row on tap). Keep it out of the writing area, so the page does not jump when it opens. [GoodNotes complaints verified]
10. **Keyboard**: own scroll container, `visualViewport`-driven toolbar position via transform, no native `scrollIntoView`. Ink mode keeps the keyboard closed. [unverified]
11. **Selection bar for text**: accept the native iOS bar; place ours above the selection; avoid custom clipboard formats. [verified limits]
12. **Ink vs reflowing text**: pick one rule and say it in the UI. Safest for v1: ink is anchored to the page (x, y in page coordinates, plus anchor block id for "follow this block" later), and text edits that change block heights show a "ink may no longer line up" hint, or lock text while ink exists on that region. No competitor behaviour was found, so this is an owner decision. [unverified]
13. **Caret from pen**: `posAtCoords` plus null fallback plus `coordsAtPos` sanity check; snap to nearest block. [partly verified]
14. **Scroll-to-anchor**: custom rAF tween 250-700 ms, distance-compressed, cancellable, then 1.2 s highlight; reduced-motion = instant + static highlight. [unverified]
15. **Bookmarks**: outline/filled ribbon, list with snippet, undo on remove, type icons. [partly verified]
16. **Testing**: create a hidden "Pencil diagnostics" page logging pointer/touch event counts per stroke (down/move/up/cancel, pointerType) and run on the owner's iPad with Scribble on/off, Pencil 1 and 2/Pro, Safari tab and installed PWA. [unverified; recommended]

## Gaps (not found)

GoodNotes pills/hover labels/selection bar details; Notability ink-over-text anchoring; OneNote ink-vs-text anchoring; Notion iPad keyboard specifics; Excalidraw/tldraw/Xournal++/Rnote iPad Pencil source; `caretPositionFromPoint` on iPad Safari; whether `interactive-widget` shipped in stable Safari; Apple Books current bookmark UI. These need hands-on testing or reading repos directly.
