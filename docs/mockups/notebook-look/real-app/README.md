# The real app, in its frame: what today's tools give (25 Nov 2026)

Made for the phase 1B planning talk ([the talk notes](../../../plans/phases/phase-1b-notebook-talk.md)), after the owner rejected the drawn samples and asked for pages in the app's own frame, built with the app's own tools. These are real screenshots of the preview app (build 1b0b03a7), on a PC (1440 x 900) and on a tablet held upright (820 x 1180). Nothing was drawn or edited.

**How they were made.** A helper drove the preview app by program, in a fresh and empty browser. The app asks for sign-in before any edit; the helper did not sign in. It set the switch that the project's own browser tests set (`learning-notes:accountGate.off`). No account and no data of the owner were used.

## The pictures

| What                                                                     | PC                                                                   | Tablet                                                                       |
| ------------------------------------------------------------------------ | -------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| An empty page in the frame                                               | [pc_s1_03](pc_s1_03_new_notebook_empty_page.png)                     | [tablet_s1_03](tablet_s1_03_new_notebook_empty_page.png)                     |
| The looks of a box                                                       | [pc_s1_10](pc_s1_10_toolbar_box_looks.png)                           | [tablet_s1_10](tablet_s1_10_toolbar_box_looks.png)                           |
| The shapes                                                               | [pc_s1_06](pc_s1_06_toolbar_shapes.png)                              |                                                                              |
| Today's import ("Paste notes"), the top of the page                      | [pc_s2_03 top](pc_s2_03_notes_view_top.png)                          | [tablet_s2_03 top](tablet_s2_03_notes_view_top.png)                          |
| Today's import, further down                                             | [pc_s2_03 scroll 1](pc_s2_03_notes_view_scroll1.png)                 | [tablet_s2_03 scroll 1](tablet_s2_03_notes_view_scroll1.png)                 |
| Today's import, the Summary (empty)                                      | [pc_s2_04 summary](pc_s2_04_summary_view.png)                        | [tablet_s2_04 summary](tablet_s2_04_summary_view.png)                        |
| A sheet made by hand with the app's tools                                | [pc_s3_01](pc_s3_01_sheet_top.png), [pc_s3_02](pc_s3_02_sheet_scrolled.png) | [tablet_s3_01](tablet_s3_01_sheet_top.png), [tablet_s3_02](tablet_s3_02_sheet_scrolled.png) |
| The four boxes of the diagram, close                                     | [pc_s3_04](pc_s3_04_diagram_closeup.png)                             | [tablet_s3_04](tablet_s3_04_diagram_closeup.png)                             |
| Fault: arrows saved but not shown                                        | [pc_s3_x1](pc_s3_x1_arrows_saved_but_invisible.png)                  |                                                                              |
| Fault: ink that starts in a box is cut at the box's edge                 | [pc_s3_x2](pc_s3_x2_ink_from_inside_box_clipped.png)                 |                                                                              |

## The hand-made sheet: what is real, and what is missing

- Real objects of the app, each one changeable with the same tools: the title; four text boxes; four boxes with the Outline look in a row; two boxes with the Sticky look; three highlights on words (the app turns a highlighter stroke over words into a text highlight); one pen underline.
- **Missing: the arrows between the four boxes.** Three ways were tried and all failed (faults 1 and 2). This is why the diagram has no arrows.
- The owner's own way to build a diagram (one box to draw in, sticky boxes on it, one group) was not tried here.

## The names in the app

- Tool bar: Text, Pen, Eraser, Shapes, Lasso, Insert, Speak to type, Paste, More, Minimise. With Text on: Box, Format, Bold, Italic. On the tablet the Tool bar shows icons only.
- Looks of a box: Plain, Outline, Soft, Note, Sticky, Card. Ten backgrounds; border, corner and shadow settings.
- Pens: Fountain pen, Ballpoint, Brush pen, Pencil, Marker, Highlighter.
- Shapes: Line, Arrow, Box, Oval, Triangle. No tape tool was found.

## Faults and rough edges seen (for Opus to sort; each one that is real becomes an issue with a stage label)

1. An arrow (Shapes) drawn in the 32 px gap between two boxes resized the boxes; nothing was drawn.
2. In a wider gap the arrows were saved (four strokes in the database) but never showed: they are tied to blocks that are not on the page (pc_s3_x1).
3. Ink that starts inside a box is cut off at the box's edge (pc_s3_x2). Pen ink over words is hidden behind the text.
4. **Ink is written about 2 seconds late, while the bar already says "Saved".** A reload inside those 2 seconds lost the strokes.
5. After a reload the Tool bar opens on the Lasso, not on the tool last used.
6. A sticky box would not keep a width of 200 px; it ended at about 253 to 297 px and reached past the text margin to the paper's edge.
7. On the tablet a word breaks in the middle: "descriptio / n".
8. On the PC the Insert card covers the top bar ("Saved", Beginner and Professional).
9. Import: the right-hand branches of the mind map are cut off.
10. Import: the Summary stays empty; the key points are not added to it.
11. Import: the "Pasted text / AI is off" panel pushes the notes far down the page.
12. The "Box moved, Undo" toast covers the words of a sticky box.
13. A yellow highlight on a yellow sticky box can hardly be seen.
14. The first pen stroke switches the device to Pencil mode, with a toast.
15. The title shifts by about 5 px when the page goes to Review.

## What the owner's wish needs that the app has no tool for today

- A way to join two boxes with an arrow.
- Ink that can lie on top of words.
- An import that fills the Summary, and one that writes boxes, looks, groups and ink.
