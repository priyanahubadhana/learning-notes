# GoodNotes 6 Text tool, compared (research, 10 Nov 2026)

For owner bug batch 2 item 8. Plan: [plans/text-tool-plan.md](../plans/text-tool-plan.md). Facts marked (S) come from an official GoodNotes source or the owner's screenshots. Facts marked (F) come from GoodNotes feedback threads or reviews. Facts marked (K) are general product knowledge that a web source did not confirm in this pass.

## GoodNotes 6

- **Making a box (S, screenshots):** with the Text tool chosen, a tap on the page makes a new text box with a visible frame and a caret. The hint reads "Tap to add a textbox. Or long press and tap Start Typing to add text to the entire page".
- **Full-page text (S):** select the Text tool, long press the page, then choose Start Typing. The whole page becomes one text area. Text does not flow onto the next page, so the user has to add pages by hand (F). Users asked for the old automatic full-page box to come back (F). GoodNotes now ships separate "Text Documents" for long typing (F).
- **Text strip (S, screenshots):** when the Text tool is chosen, a strip opens under the tool bar. It holds colour, size (for example 26), font (Avenir Next), B and I, align, line spacing, a box-style swatch, Text Box Style and Pin Text Tool. Pinning keeps the Text tool chosen after a box is finished instead of going back to the previous tool (K: this matches the GoodNotes "pin" behaviour of other tools).
- **Text Box Style (S, screenshots and help):** a popover with Presets (a row of ready-made swatches) and Advanced: background colour, border colour, corner radius (pt), shadow switch, border width (pt) and padding (pt). It is also in the object menu of a selected box on Android, Windows and Web (F). Reviews mention border thickness, padding, subtle shadow and line spacing (F, Medium 2025).
- **Default style (S, staff replies):** select a box, then ⋯ › Save as Default. Or use the "T with a heart" button in the text menu, which is lit only when the current settings differ from the default. The default covers colour, size, font, style, alignment, line height and box style. There is only one default, and the most requested fix is several saved presets (F: "Save multiple text box presets", "Multiple Default Text Options").
- **Move and resize (S, help center):** drag the box to move it, then tap outside to finish. White corner squares scale, blue circles resize the width and a protruding circle rotates. Users complain that the move and resize targets are tiny and too close to the text (F).
- **Pain points (F):** too much default padding, no dashed or dotted borders, the default style is hard to find, handles are cramped, and full-page text does not flow.
- **iPad keyboard bar (S, screenshot):** the shortcut row above the keyboard shows indent and outdent, lists, align and B, I, U, S.

## Others

- **Notability (K):** a tap with the Text tool makes a box. The style bar holds font, size, colour, B, I, U and lists. A text box can take a fill and border via the box's style menu. A note can be typed as a whole page.
- **OneNote (K):** a click anywhere makes a note container that has no frame until you hover. The container grows as you type, is moved by its top grip and resized from its right edge. Styling is the ribbon's job. There is no box background, which keeps the page calm.
- **Apple Notes (K):** there are no text boxes. The page is one flow of text, with Aa styles (Title, Heading, Body, lists) and a keyboard bar holding Aa, checklist, table, attach and Pencil.
- **Freeform (K):** a text object is placed by tap, then styled from a floating inspector bar for font, size, colour, alignment and a fill and outline. Selection gives corner handles. Styles can be copied and pasted between objects.

## Takeaways for us

1. Use GoodNotes' strip-under-the-tool-bar model. We already have one: the options pill. Make the Text pill that strip.
2. Box style = presets first, Advanced second. Offer **several saved presets** (GoodNotes' top request) instead of one default. Keep padding modest by default.
3. Make the "default for new boxes" obvious, with a visible "Use for new boxes" and a dot when the current settings differ.
4. Large and separate move and resize targets. Our grid already moves boxes by ⠿ and resizes with dividers, and avoids GoodNotes' cramped handles.
5. Full-page text: our default box already is "type on the whole page" and it flows across sheets, which is better than GoodNotes. Keep it, and add a long-press "Start typing here".
6. OneNote's calm: a box has no frame unless styled, selected or new.

## Sources

- [Goodnotes Help: text box move and resize](https://support.goodnotes.com/hc/en-us/articles/7353727615375)
- [Goodnotes Text Tool guide (Notion)](https://goodnotes-team.notion.site/Text-Tool-26fb740273d2811983cbe906be1f5520) (page did not render in this pass)
- [Feedback: Save a default Text Box style](https://feedback.goodnotes.com/forums/950440-customer-suggestions-for-goodnotes-android-windo/suggestions/51061789-save-a-default-text-box-style)
- [Feedback: Save multiple text box presets](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes/suggestions/44811277-save-multiple-text-box-presets)
- [Feedback: Multiple default text options](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes/suggestions/38926945-multiple-default-text-options)
- [Feedback: Bring back the automatic full-page text box](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/50820665-bring-back-the-automatic-full-page-text-box)
- [Feedback: Writing in a full page](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes-apple/suggestions/49984542-writing-in-a-full-page-as-in-a-word-document)
- [Feedback: Better textboxes](https://feedback.goodnotes.com/forums/191274-customer-suggestions-for-goodnotes/suggestions/45676699-better-textboxes)
- [Medium: Apple Notes vs Goodnotes 2025](https://medium.com/@paperlessx/apple-notes-vs-goodnotes-2025-ultimate-comparison-0c3d1ffc05c0)
