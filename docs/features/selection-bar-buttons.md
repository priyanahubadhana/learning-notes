# The button list of the three old selection bars (Part B1)

Security rules: [rules/security.md](../../rules/security.md). This page changes no stored data and no app code.

Written 21 Nov 2026 for [selection-bar.md](selection-bar.md) ("Nothing dropped", SB-N1, SB-N2, "We assume" item 2) and Appendix C of [the phase page](../plans/phases/phase-2-finish.md). It is the base Part B2 (the pictures) and Part B3 (the smart bar) start from: every button, whether it really works today, whether the Pencil reaches it, and where it goes on the smart bar.

The test is `e2e/selectionBarButtons.spec.ts`: one test per row, named with the row's id. It opens each bar as the owner meets it, finds the button, and where the row says "yes" taps it and checks the result. A row that says "no" is a `test.fail` with its id: when someone makes that button work the test goes green and says so, and the row here is changed (the test is never weakened). Nothing here is fixed; a broken button is only recorded.

## How to read it

Bars: **Text bar** = the small bar that floats at words picked by a double tap (MiniToolbar). **v8 bar** = the row under the tool row (SelectionBarV8) with the new tool bar on; it shows for words and pictures picked with the Lasso and for drawings. **Classic Lasso menu** = the icon menu on words with the new tool bar off (SelectionMenu). **Drawing menu** = the menu on drawings with the new tool bar off (InkSurface). **Mixed menu** = a loop round drawings and page words together. **Old box bar** and **One bar** = the bar of a picked box with the text box switch off / on.

Works today: **yes** (tapped it, saw the result), **partly** (the result is smaller than the name says, or only in some cases), **no** (the button is shown and does nothing useful, or only says "this works on drawings" / "coming later"). The proof is the test id in the first column. Level: Beginner and Professional show the same buttons everywhere except the v8 bar, where Professional adds Edit picture (`tb.pictureEdit`) and the nine rows under ⋯ marked "Pro" (`tb.selectionMenu`); that is tested in SB-B29 and SB-B30.

Pencil-reachable: **yes** = one tap, 44 pt, no drag and no keyboard. A grip needs a drag (marked). Smart bar place: **top** = on the bar itself (Edit order: Delete, Paste ▾, Cut, Copy, B/I, Colour, Size, Highlight, ⋯; Study order: Highlight, Colour, Make card, B/I, Copy, ⋯; a mix: Cut, Copy, Duplicate, Delete, Resize, Edit Text); **⋯** = under ⋯; **B2 decides** = the owner's pictures settle it; **not on the smart bar** = it does nothing today (SB-N2), so it is not carried over until it works.

## The list

### Text bar (words picked by a double tap)

| Id     | Button                             | Where | Works today                                                               | Pencil     | Smart bar                                                           |
| ------ | ---------------------------------- | ----- | ------------------------------------------------------------------------- | ---------- | ------------------------------------------------------------------- |
| SB-B01 | Move the selection tools (grip)    | top   | yes: a drag moves the bar (SB-B01)                                        | yes (drag) | B2 decides (the bar moves, pins and docks; a drag)                  |
| SB-B02 | Text colour                        | top   | yes: opens the colour card (SB-B02)                                       | yes        | top (Colour)                                                        |
| SB-B03 | Text size                          | top   | yes: steps the page text size on each tap (SB-B03)                        | yes        | top (Size)                                                          |
| SB-B04 | Text style (Aa)                    | top   | yes: opens the style card (SB-B04)                                        | yes        | ⋯ (B2 decides)                                                      |
| SB-B05 | Bold                               | top   | yes (SB-B05)                                                              | yes        | top (B/I)                                                           |
| SB-B06 | Italic                             | top   | yes (SB-B06)                                                              | yes        | top (B/I)                                                           |
| SB-B07 | Alignment                          | top   | yes: each tap turns the line left, centre, right (SB-B07)                 | yes        | ⋯ (B2 decides)                                                      |
| SB-B08 | List                               | top   | yes: makes a bullet list (SB-B08)                                         | yes        | ⋯ (B2 decides)                                                      |
| SB-B09 | Highlight colour                   | top   | yes (SB-B09)                                                              | yes        | top (Highlight)                                                     |
| SB-B10 | Link…                              | top   | partly: opens the tool tray, where "Create link" is one more tap (SB-B10) | yes        | top when words are selected (spec: "Link" is added at the end)      |
| SB-B11 | Cut                                | top   | yes: words leave and are copied (SB-B11)                                  | yes        | top                                                                 |
| SB-B12 | Copy                               | top   | yes: toast "Copied" (SB-B12)                                              | yes        | top                                                                 |
| SB-B13 | Delete                             | top   | yes: words leave, the bar closes (SB-B13)                                 | yes        | top (the only red button)                                           |
| SB-B14 | ⋯ More                             | top   | yes: opens the second row (SB-B14)                                        | yes        | top (⋯)                                                             |
| SB-B15 | Pin: keep the selection tools here | top   | yes: the place is remembered (SB-B15)                                     | yes        | B2 decides (pinning is a rule of the smart bar)                     |
| SB-B16 | ✕ Deselect                         | top   | yes: the selection goes (SB-B16)                                          | yes        | ⋯                                                                   |
| SB-B17 | ⋯ Paste (plain)                    | ⋯     | yes: pastes the clipboard as plain words (SB-B17)                         | yes        | top (Paste ▾ replaces it)                                           |
| SB-B18 | ⋯ Make card                        | ⋯     | yes: a card is made (SB-B18)                                              | yes        | top in Study, else ⋯                                                |
| SB-B19 | ⋯ Add to Summary                   | ⋯     | yes: a toast says it was added (SB-B19)                                   | yes        | ⋯                                                                   |
| SB-B20 | ⋯ Key point                        | ⋯     | yes: the words get the key-point mark (SB-B20)                            | yes        | ⋯ (Revise mark)                                                     |
| SB-B21 | ⋯ Save to notes                    | ⋯     | no: says "Coming in a later update" (SB-B21, test.fail)                   | yes        | not on the smart bar (the v8 bar's Save to notes works, see SB-B38) |

### v8 selection bar, top row (new tool bar on; words, a picture or a drawing picked with the Lasso)

Each row is tested for the three kinds: `(words)`, `(picture)`, `(drawing)`.

| Id     | Button       | Where                                  | Works today                                                                                                                                                                | Pencil | Smart bar                       |
| ------ | ------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------- |
| SB-B22 | Cut          | top                                    | words yes, picture yes, drawing yes (SB-B22 x3)                                                                                                                            | yes    | top                             |
| SB-B23 | Copy         | top                                    | words yes ("Copied"), picture yes (the picture is put on the clipboard, no message), drawing yes ("Picture copied") (SB-B23 x3)                                            | yes    | top                             |
| SB-B24 | Paste        | top                                    | words yes; picture partly (pastes words into the page, not onto the picture); drawing partly (pastes only a drawing copied before, else nothing) (SB-B24 x3)               | yes    | top (Paste ▾)                   |
| SB-B25 | Duplicate    | top                                    | words yes, picture yes, drawing yes (SB-B25 x3)                                                                                                                            | yes    | top for a mix and a box, else ⋯ |
| SB-B26 | Colour       | top                                    | words yes (text and highlight colours); picture partly (opens the text colour panel, a picture has no text colour); drawing yes (colour card recolours it) (SB-B26 x3)     | yes    | top (Colour)                    |
| SB-B27 | Resize       | top                                    | words partly (opens a Text size card that sets the page text size, not the picked words); picture yes (size list); drawing yes (Smaller, Bigger, Half, Double) (SB-B27 x3) | yes    | top for a mix and a box         |
| SB-B28 | Delete       | top                                    | words yes, picture yes, drawing yes (SB-B28 x3)                                                                                                                            | yes    | top (the only red button)       |
| SB-B29 | Edit picture | top, Professional, only with a picture | yes: opens the picture list with Border (SB-B29); not shown to Beginner                                                                                                    | yes    | B2 decides                      |
| SB-B30 | ⋯ More       | top                                    | yes: Beginner lists Deselect (plus Border for a picture), Professional lists nine more (SB-B30 x2)                                                                         | yes    | top (⋯)                         |

### v8 selection bar, ⋯ list

| Id     | Button                      | Where               | Works today                                                                                                                                         | Pencil | Smart bar                                                                                       |
| ------ | --------------------------- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| SB-B31 | Deselect                    | ⋯, Beginner and Pro | words yes, drawing yes, picture yes (SB-B31 x3)                                                                                                     | yes    | ⋯                                                                                               |
| SB-B32 | Border (picture)            | ⋯, Beginner and Pro | yes: cycles none, thin, thick (SB-B32)                                                                                                              | yes    | ⋯ (B2 decides)                                                                                  |
| SB-B33 | Convert to text (beta)      | ⋯, Pro              | words no ("works on drawings", test.fail); drawing partly (the convert sheet opens; the recognition itself is beta and not proven here) (SB-B33 x2) | yes    | ⋯ for a drawing; not on the smart bar for words                                                 |
| SB-B34 | Screenshot of the selection | ⋯, Pro              | words no (test.fail); drawing yes (a PNG file is saved) (SB-B34 x2)                                                                                 | yes    | ⋯ for a drawing; not on the smart bar for words. A box has no Screenshot at all today (SB-B162) |
| SB-B35 | Key point                   | ⋯, Pro              | words yes (mark appears); drawing no ("works on words", test.fail) (SB-B35 x2)                                                                      | yes    | ⋯ (Revise mark) for words only                                                                  |
| SB-B36 | Make card                   | ⋯, Pro              | words yes; drawing yes (asks for the question) (SB-B36 x2)                                                                                          | yes    | top in Study, else ⋯                                                                            |
| SB-B37 | Add to Summary              | ⋯, Pro              | words yes; drawing partly: it asks you to name the drawing first through "⋯ > Name this drawing", a row this bar does not have (SB-B37 x2)          | yes    | ⋯                                                                                               |
| SB-B38 | Save to notes               | ⋯, Pro              | words yes (a Highlights page is made); drawing no ("works on words", test.fail) (SB-B38 x2)                                                         | yes    | ⋯ for words only                                                                                |
| SB-B39 | Move                        | ⋯, Pro              | words no (test.fail); drawing yes (a card with four arrows) (SB-B39 x2)                                                                             | yes    | ⋯ for a drawing; not on the smart bar for words                                                 |
| SB-B40 | Scale                       | ⋯, Pro              | words no (test.fail); drawing yes (the resize card) (SB-B40 x2)                                                                                     | yes    | same as Resize (SB-B27); not on the smart bar for words                                         |
| SB-B41 | Rotate                      | ⋯, Pro              | words no (test.fail); drawing yes (turns 90 degrees) (SB-B41 x2)                                                                                    | yes    | ⋯ for a drawing; not on the smart bar for words                                                 |

Buttons the v8 bar does not have but the drawing menu has (listed under the Drawing menu below): Thickness, Name this drawing, Play the recording from here, Copy as picture, Save as picture. B2 and B3 must carry them over or the owner must say they go (SB-N1).

### Old box bar (text box switch off)

| Id     | Button                | Where | Works today                                                         | Pencil | Smart bar                                 |
| ------ | --------------------- | ----- | ------------------------------------------------------------------- | ------ | ----------------------------------------- |
| SB-B42 | Box style             | top   | yes: opens the style panel (SB-B42)                                 | yes    | B2 decides (the one bar's fill button)    |
| SB-B43 | Duplicate box         | top   | yes (SB-B43)                                                        | yes    | top (box)                                 |
| SB-B44 | Cut                   | top   | yes: the box leaves and its words are copied as plain text (SB-B44) | yes    | top                                       |
| SB-B45 | Copy                  | top   | yes: the words are copied as plain text (SB-B45)                    | yes    | top                                       |
| SB-B46 | Delete box            | top   | yes (SB-B46)                                                        | yes    | top (red)                                 |
| SB-B47 | ⋯ Box actions         | top   | yes: opens the menu (SB-B47)                                        | yes    | top (⋯)                                   |
| SB-B48 | ⋯ Box style           | ⋯     | yes (SB-B48)                                                        | yes    | ⋯                                         |
| SB-B49 | ⋯ Copy                | ⋯     | yes (SB-B49)                                                        | yes    | ⋯                                         |
| SB-B50 | ⋯ Cut                 | ⋯     | yes (SB-B50)                                                        | yes    | top                                       |
| SB-B51 | ⋯ Duplicate           | ⋯     | yes (SB-B51)                                                        | yes    | top                                       |
| SB-B52 | ⋯ Colour (box colour) | ⋯     | yes: opens the colour choices (SB-B52)                              | yes    | ⋯ (B2 decides; the one bar has Box style) |
| SB-B53 | ⋯ Layout              | ⋯     | yes: opens Layout (SB-B53)                                          | yes    | ⋯                                         |
| SB-B54 | ⋯ Delete box          | ⋯     | yes (SB-B54)                                                        | yes    | top (red)                                 |

### One bar of a box (text box switch on; the bar the smart bar grows from)

| Id      | Button                                                       | Where              | Works today                                                           | Pencil     | Smart bar                                               |
| ------- | ------------------------------------------------------------ | ------------------ | --------------------------------------------------------------------- | ---------- | ------------------------------------------------------- |
| SB-B60  | Move bar (grip)                                              | top                | yes: a drag moves the bar and shows Pin (SB-B60)                      | yes (drag) | B2 decides                                              |
| SB-B61  | Pin bar here                                                 | top, after a move  | yes (SB-B61)                                                          | yes        | B2 decides                                              |
| SB-B62  | Text colour                                                  | top                | yes: a pick colours the words (SB-B62)                                | yes        | top                                                     |
| SB-B63  | Size                                                         | top                | yes: Larger changes the size (SB-B63)                                 | yes        | top                                                     |
| SB-B64  | Font                                                         | top, phone under ⋯ | yes: a pick sets the font (SB-B64)                                    | yes        | ⋯ (B2 decides)                                          |
| SB-B65  | Bold and italic (Bold, Italic, Underline, Strike, Highlight) | top                | yes: each switch turns on (SB-B65)                                    | yes        | top (B/I, Highlight); Underline and Strike in its strip |
| SB-B66  | Align (left, centre, right, Line spacing)                    | top                | yes: Align right turns the box's line (SB-B66); Line spacing is shown | yes        | ⋯ (B2 decides)                                          |
| SB-B67  | List                                                         | top, phone under ⋯ | yes: makes a list (SB-B67)                                            | yes        | ⋯ (B2 decides)                                          |
| SB-B68  | Box style (fill)                                             | top                | yes: opens the Box card (SB-B68)                                      | yes        | B2 decides                                              |
| SB-B69  | Cut                                                          | top, phone under ⋯ | yes (SB-B69)                                                          | yes        | top                                                     |
| SB-B70  | Paste                                                        | top                | yes: puts the clipboard in the box (SB-B70)                           | yes        | top                                                     |
| SB-B71  | Paste options ▾                                              | top                | yes: Keep look, Match style, Plain text (SB-B71, SB-B145)             | yes        | top (Paste ▾)                                           |
| SB-B72  | Delete box                                                   | top                | yes (SB-B72)                                                          | yes        | top (red)                                               |
| SB-B73  | ⋯ Box actions                                                | top                | yes: the list opens (SB-B73)                                          | yes        | top (⋯)                                                 |
| SB-B74  | ⋯ Copy                                                       | ⋯                  | yes (SB-B74)                                                          | yes        | top                                                     |
| SB-B75  | ⋯ Duplicate box                                              | ⋯                  | yes (SB-B75)                                                          | yes        | top for a box                                           |
| SB-B76  | ⋯ Lock in place / Unlock                                     | ⋯                  | yes: the row turns into Unlock (SB-B76)                               | yes        | ⋯                                                       |
| SB-B77  | ⋯ Box style…                                                 | ⋯                  | yes (SB-B77)                                                          | yes        | ⋯                                                       |
| SB-B78  | ⋯ Layout…                                                    | ⋯                  | yes (SB-B78)                                                          | yes        | ⋯                                                       |
| SB-B79  | ⋯ Text options…                                              | ⋯                  | yes: opens the Format card (SB-B79)                                   | yes        | ⋯                                                       |
| SB-B80  | ⋯ Move up / Move down                                        | ⋯                  | yes: Move down swaps the two boxes (SB-B80)                           | yes        | ⋯                                                       |
| SB-B81  | ⋯ Group                                                      | ⋯                  | partly: dimmed with one box; a tap says "pick two or more" (SB-B81)   | yes        | ⋯ (needs two boxes)                                     |
| SB-B82  | ⋯ Delete box                                                 | ⋯                  | yes (SB-B82)                                                          | yes        | top (red)                                               |
| SB-B150 | Phone: Font, List, Cut and Paste move under ⋯                | ⋯                  | yes: all four rows exist and Font opens its strip (SB-B150)           | yes        | phone: fewer buttons, the rest under ⋯                  |

### Classic Lasso menu on words (new tool bar off)

| Id      | Button                     | Where | Works today                                                 | Pencil | Smart bar                        |
| ------- | -------------------------- | ----- | ----------------------------------------------------------- | ------ | -------------------------------- |
| SB-B90  | Copy                       | top   | yes (SB-B90)                                                | yes    | top                              |
| SB-B91  | Cut                        | top   | yes (SB-B91)                                                | yes    | top                              |
| SB-B92  | Duplicate                  | top   | yes (SB-B92)                                                | yes    | ⋯                                |
| SB-B93  | Delete                     | top   | yes (SB-B93)                                                | yes    | top                              |
| SB-B94  | Colour                     | top   | yes: opens the colour panel (SB-B94)                        | yes    | top                              |
| SB-B95  | Move                       | top   | no: dimmed, says "works on drawings" (SB-B95, test.fail)    | yes    | not on the smart bar (for words) |
| SB-B96  | Scale                      | top   | no: same (SB-B96, test.fail)                                | yes    | not on the smart bar (for words) |
| SB-B97  | Rotate                     | top   | no: same (SB-B97, test.fail)                                | yes    | not on the smart bar (for words) |
| SB-B98  | Screenshot                 | top   | no: same (SB-B98, test.fail)                                | yes    | not on the smart bar (for words) |
| SB-B99  | Key point                  | top   | yes (SB-B99)                                                | yes    | ⋯                                |
| SB-B100 | Make card                  | top   | yes (SB-B100)                                               | yes    | top in Study, else ⋯             |
| SB-B101 | Add to Summary             | top   | yes (SB-B101)                                               | yes    | ⋯                                |
| SB-B102 | Save to notes              | top   | yes (SB-B102)                                               | yes    | ⋯                                |
| SB-B103 | Convert handwriting (beta) | top   | no: dimmed, "Coming in a later update" (SB-B103, test.fail) | yes    | not on the smart bar             |
| SB-B104 | Deselect                   | top   | yes (SB-B104)                                               | yes    | ⋯                                |

### Drawing menu (new tool bar off; a drawing picked with the Lasso)

The row shows Deselect, then the owner's chosen row (default Copy, Cut, Duplicate, Convert, Colour), then ⋯. The row is arranged in Settings (lasso menu sheet), so the rows below can sit either at the top or under ⋯.

| Id      | Button                       | Where    | Works today                                                                                                                                                                 | Pencil            | Smart bar                                                                        |
| ------- | ---------------------------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------- |
| SB-B110 | Deselect (✕)                 | top      | yes (SB-B110)                                                                                                                                                               | yes               | ⋯                                                                                |
| SB-B111 | Copy                         | row      | yes: "Picture copied" (SB-B111)                                                                                                                                             | yes               | top                                                                              |
| SB-B112 | Cut                          | row      | yes (SB-B112)                                                                                                                                                               | yes               | top                                                                              |
| SB-B113 | Duplicate                    | row      | yes (SB-B113)                                                                                                                                                               | yes               | top for a mix, else ⋯                                                            |
| SB-B114 | Convert to text              | row      | yes: the convert sheet opens (SB-B114); the recognition itself is beta                                                                                                      | yes               | ⋯                                                                                |
| SB-B115 | Colour                       | row      | yes: a colour recolours the drawing (SB-B115)                                                                                                                               | yes               | top                                                                              |
| SB-B116 | Delete                       | row or ⋯ | partly: it works (SB-B116), but at 1180 px with the ⋯ list open its place can sit under the sidebar's resize handle, so a finger misses it (SB-B116 second test, test.fail) | yes, but see left | top (red)                                                                        |
| SB-B117 | ⋯ More                       | top      | yes (SB-B117)                                                                                                                                                               | yes               | top (⋯)                                                                          |
| SB-B118 | Thickness                    | row or ⋯ | yes: a pick changes the pen width (SB-B118)                                                                                                                                 | yes               | B2 decides: the v8 bar has no Thickness                                          |
| SB-B119 | Make card                    | row or ⋯ | yes: asks for the question (SB-B119)                                                                                                                                        | yes               | top in Study, else ⋯                                                             |
| SB-B120 | Add to Summary               | row or ⋯ | partly: asks for a name first (SB-B120)                                                                                                                                     | yes               | ⋯                                                                                |
| SB-B121 | Name this drawing            | row or ⋯ | yes: saves the name (SB-B121)                                                                                                                                               | yes               | B2 decides: the v8 bar has no Name this drawing, but its Add to Summary needs it |
| SB-B122 | Paste                        | ⋯        | yes: puts a copied drawing back; shown only when one was copied (SB-B122)                                                                                                   | yes               | top (Paste ▾)                                                                    |
| SB-B123 | Copy as picture              | ⋯        | yes (SB-B123)                                                                                                                                                               | yes               | ⋯                                                                                |
| SB-B124 | Save as picture              | ⋯        | yes: a PNG is saved (SB-B124)                                                                                                                                               | yes               | ⋯                                                                                |
| SB-B125 | Play the recording from here | ⋯        | yes, proved by e2e/inkReplay.spec.ts; shown only when a recording exists                                                                                                    | yes               | ⋯                                                                                |

### Mixed menu (a loop round drawings and words together)

| Id      | Button       | Where | Works today                              | Pencil | Smart bar |
| ------- | ------------ | ----- | ---------------------------------------- | ------ | --------- |
| SB-B130 | Copy         | top   | yes (SB-B130)                            | yes    | top       |
| SB-B131 | Cut          | top   | yes: drawing and words leave (SB-B131)   | yes    | top       |
| SB-B132 | Delete       | top   | yes: one Undo brings both back (SB-B132) | yes    | top (red) |
| SB-B133 | Screenshot   | top   | yes: a PNG is saved (SB-B133)            | yes    | ⋯         |
| SB-B134 | Make card    | top   | yes (SB-B134)                            | yes    | ⋯         |
| SB-B135 | Deselect (✕) | top   | yes (SB-B135)                            | yes    | ⋯         |

The mixed menu has no Duplicate, Resize or Edit Text; the smart bar's list for a mix has them (owner agreed 20 Nov). B3 adds them; they are new, not carried over.

### Appendix C of the phase page, row by row

Every row of Appendix C of [the phase page](../plans/phases/phase-2-finish.md) is here, in its order. "Proof" names the rows and tests above or below that show it; the last four of the tests are the Appendix-only ones.

| Id     | Seen in Goodnotes                                                                      | Our app today                                                                                                                                                  | Result                                  | Proof                                      | Pencil | Smart bar                                   |
| ------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- | ------------------------------------------ | ------ | ------------------------------------------- |
| SB-C01 | Box bar: colour, size, Resize, Edit Text, Cut, Duplicate, Delete, ⋯                    | the one bar has colour, size, font, B/I, align, list, fill, Cut, Paste, Delete, ⋯; Resize is the eight dots; Duplicate is under ⋯; no Edit Text                | covered, except Edit Text (B4)          | SB-B60 to SB-B73, SB-B75, SB-B147, SB-B160 | yes    | see rows                                    |
| SB-C02 | Text bar with only the cursor: colour, size, Aa, B/I, align, list, highlight, Paste, ⋯ | the Text row has Format, Bold, Italic; the rest is in the Format card; Paste ▾, mic, return, backspace, undo, redo sit on the top row                          | covered                                 | SB-B140 to SB-B144                         | yes    | top: B/I, Colour, Size, Highlight, Paste ▾  |
| SB-C03 | Text bar with words selected: the same, plus link, cut, copy at the end                | the text bar has Link, Cut, Copy                                                                                                                               | covered                                 | SB-B10 to SB-B12                           | yes    | added at the end (B3)                       |
| SB-C04 | Edit Text puts the cursor at the end of the text; the bar turns into the text bar      | no Edit Text button anywhere                                                                                                                                   | not built (B4)                          | SB-B160                                    | n/a    | B4                                          |
| SB-C05 | A held button shows its name ("Edit Text", "Resize")                                   | no bar button shows a name on a long press today                                                                                                               | not built (B3, every bar button)        | none yet                                   | n/a    | B3                                          |
| SB-C06 | Delete is the only red button                                                          | the one bar's Delete is the only red button there (`pm-ob__btn--danger`, OneBar.tsx); the text bar's and the v8 bar's Delete are not red                       | not built (B3)                          | none yet                                   | n/a    | B3                                          |
| SB-C07 | Resize mode: four square corners, a turn handle, a short bar                           | a picked drawing has four corner dots and a turn handle; a picked box has eight dots; a text box does not turn                                                 | handles covered; box turning later      | SB-B146, SB-B147                           | yes    | B2 decides                                  |
| SB-C08 | A box and the ink on it resized and turned as one piece                                | they move together; the handles move the ink only (the mixed menu says so)                                                                                     | open: owner decides (later by default)  | SB-B130 to SB-B135                         | n/a    | later                                       |
| SB-C09 | ⋯: Cut, Copy, Duplicate, Paste, Paste and Match Style                                  | Cut, Copy, Duplicate on the one bar and under ⋯; Paste ▾ offers Keep look, Match style, Plain text                                                             | covered                                 | SB-B69, SB-B74, SB-B75, SB-B145            | yes    | top                                         |
| SB-C10 | ⋯: Front, Back                                                                         | not in the app (needs layers)                                                                                                                                  | open: owner decides (later by default)  | SB-B161                                    | n/a    | later                                       |
| SB-C11 | ⋯: Lock Textbox                                                                        | "Lock in place" in the box ⋯                                                                                                                                   | covered                                 | SB-B76                                     | yes    | ⋯                                           |
| SB-C12 | ⋯: Take Screenshot                                                                     | a box has no Screenshot in its bar or ⋯; drawings and mixed selections have one                                                                                | covered for ink; for a box B2 decides   | SB-B162, SB-B34, SB-B124, SB-B133          | yes    | ⋯                                           |
| SB-C13 | ⋯: Create Element (save a selection as a sticker)                                      | not in the app                                                                                                                                                 | open: owner decides (ideas list)        | SB-B163                                    | n/a    | later                                       |
| SB-C14 | Writing Tools, Add to Image Playground, Ask Siri; the AI button                        | Apple's own items; our AI waits for the cost OK                                                                                                                | cannot, or later                        | none (a web page cannot add them)          | n/a    | not on the smart bar                        |
| SB-C15 | Bottom keyboard bar: indent, lists, align, B I U S, mic, return                        | Underline and Strike are in the B/I strip and the Format card; Indent, lists and alignment are in the Format card; Mic, Enter and Backspace are on the top row | covered: each reachable with the Pencil | SB-B65, SB-B140, SB-B142 to SB-B144        | yes    | not on the smart bar (owner: no bottom bar) |
| SB-C16 | The dashed loop stays round the selection; the bar sits below it, never on it          | the loop fades into a dashed box with handles; the bar never covers the words                                                                                  | covered (our look kept)                 | lassoFreeze.spec.ts (LS-21, LS-22)         | n/a    | n/a                                         |
| SB-C17 | Undo and Redo top left; the Lasso's ▾ "what it selects"                                | Undo and Redo on the page bar; Picks on the Lasso row                                                                                                          | covered                                 | SB-B148                                    | yes    | n/a                                         |

### Absent today (a new part must change these tests on purpose)

| Id      | What is missing                      | Test                                 |
| ------- | ------------------------------------ | ------------------------------------ |
| SB-B160 | Edit Text on the box bar or in its ⋯ | the box bar and its ⋯ list have none |
| SB-B161 | Front and Back in the box ⋯          | none in the list                     |
| SB-B162 | Screenshot for a box                 | none in the bar or the list          |
| SB-B163 | Create Element                       | none in the bar or the list          |

## Counts

115 buttons (each row above once; the v8 bar's kinds count as one button). Works today: yes 94, partly 15, no 6. The six that do nothing useful (test.fail): SB-B21 (text bar, Save to notes), SB-B95, SB-B96, SB-B97, SB-B98 (classic Lasso menu: Move, Scale, Rotate, Screenshot on words), SB-B103 (classic Lasso menu: Convert). The partly rows work for drawings but not words, or the other way (SB-B33 to SB-B41 on the v8 bar), or need one more step (SB-B10, SB-B81, SB-B120), or are cut off (SB-B116), or do less than the name says (SB-B24, SB-B26, SB-B27).

## END OF LIST
