# Tool bar vs the approved artifact (toolbar mock v8): audit, 15 Nov 2026

Asked by the owner during the 15 Nov test (T7, T9, T11, T12, T13, T15, T16). Done by the Opus reviewer: the build (`origin/build/next`) side by side with docs/mockups/toolbar-v8, Professional and Beginner, dark and light, iPad upright. Pictures: this chat's scratchpad `audit-toolbar/` (`mock-*` = artifact, `app-*` = build).

**Verdict: the frame and colours match; the contents of most cards do not.** The earlier 2A reviews checked each task's own pictures, not every card against the mock.

**Why dark mode looks blurry, not premium** (the glass itself matches, tokens.css:492):

1. The pen defaults to black ink; the artifact uses a light ink in dark mode. So the colour chip is an empty ring, pen-type pictures are dark on dark, and the Feel preview is a white strip with a black line.
2. No tonal wells: switchers, sliders and tiles sit on bare glass instead of a well with a raised thumb.
3. Switch knobs are near-black in dark mode; the artifact's are white.

| Tool / part             | Artifact                                                   | App                                                                                                                                                                                | Severity                   |
| ----------------------- | ---------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Pen row                 | type, size, colour chips with names; Favourites            | icons only; no Favourites                                                                                                                                                          | missing feature            |
| Pen › Feel › Feel (Pro) | Tip sharpness, Flatness, Stabilisation in a well; Response | Beginner set: Pressure, Stabilisation, Fine-tune                                                                                                                                   | missing feature            |
| Pen › Feel › Page       | four paper pictures; Paper size; Layer row with tools      | empty text tiles; paper choice twice                                                                                                                                               | missing preview, duplicate |
| Pen › Feel › Aids       | 3-way segmented control; icon on each switch row           | bare text tiles; no icons                                                                                                                                                          | wrong look                 |
| Feel › Math rows        | small picture per row                                      | none                                                                                                                                                                               | wrong look                 |
| Eraser row (Pro)        | Mode, Size, Options as three ▾                             | Options hidden in the Mode card                                                                                                                                                    | wrong place                |
| Text › Format           | 4-way section switcher; colours, fonts, sizes inside       | one long scroll of 25+ tiles plus fonts; covers the bar and side bar                                                                                                               | wrong look                 |
| Format › Colors         | swatches inside the card; never a card on a card           | old pop-up opens behind the card; its ✕ closes both                                                                                                                                | broken, wrong look         |
| Format "on" states      | every style shows its current value                        | only Bold, Italic, Underline, Strike, Code; none for headings, lists, Key point, alignment, Callout, font, size, colour, highlight (Indent, Outdent, Divider are actions: correct) | missing feature            |
| Text › Box card         | hangs under its ▾                                          | opens bottom-left over the side bar                                                                                                                                                | wrong place                |
| Lasso (Pro)             | Select, Menu, Layers                                       | Beginner's Shape, Actions                                                                                                                                                          | missing feature            |
| "+" and ☰ (second row) | ★ saves the setup as a custom tool                         | placeholders, no tap action, waiting for "Slice 1g" (ToolRow.tsx:228)                                                                                                              | missing feature            |
| Pen type tiles, light   | pen picture plus sample stroke                             | stroke only                                                                                                                                                                        | fine                       |
| Shapes tool             | on the bar                                                 | under ⋯ when the side bar is open                                                                                                                                                  | fine                       |

Leftovers from the audit (the permission layer refused cleanup): a dev server on port 5760 from ln-buildnext, and `test-results\shots-*` folders there.
