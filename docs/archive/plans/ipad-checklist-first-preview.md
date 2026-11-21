# iPad checklist: first preview (13 to 14 Nov 2026)

Moved word for word from the old pending list. Each phase page takes its own steps from here. Switch names as they appear in the app: New app frame, New tool bar, New Settings, New Notebooks, New Search, New Home, New Library, New Review, AI framework, New updates, New page menus, Storage safety.

Written 13 Nov 2026. Do it on the iPad in Safari, at the preview address. Tap each box as you go. If a step does not match "You should see", write down the step number and what you saw, then tell Claude. The live app is not changed by this test.

**Not in this check:** Reader v2 (the new reader). The connector's full test ran on the PC; here you only check its screens.

**Part 1: Open the preview and turn on the new parts**

1. [ ] Open Safari and go to https://build-next.learning-notes-app.pages.dev
   - You should see: the app loads within a few seconds, with no error page.
2. [ ] Go to Settings, then Try new features.
   - You should see: a list of switches, all OFF.
3. [ ] Turn ON, in the order they appear: New app frame, New tool bar, New Settings, New Notebooks, New Search, New Home, New Library, New Review, AI framework, New updates, New page menus, Storage safety (once the preview has it). Leave the "Shared …", Tool list, New text box, New Reader and the other "New …" parts OFF.
   - You should see: each switch stays ON after you tap it.
4. [ ] Close the app completely (swipe up from the bottom, then swipe it away) and open it again.
   - You should see: the switches are still ON and your notes are still there.

**Part 2: Shell (the frame of the app)**

5. [ ] Move between Home, Library, Notebooks, Search and Settings.
   - You should see: each screen opens at once, and the back button returns you to where you were.
6. [ ] Turn the iPad sideways, then upright.
   - You should see: nothing is cut off, and nothing scrolls sideways.

**Part 3: Home v2**

7. [ ] Open Home and tap Edit.
   - You should see: a big blue Done bar at the top.
8. [ ] Press and hold a box, then drag it. Let go.
   - You should see: the other boxes move out of the way while you drag, and the box stays where you let go.
9. [ ] Tap the three dots on a box and pick a size.
   - You should see: the box grows or shrinks smoothly and stays on screen.
10. [ ] Add the Pending items box and tick one item.
    - You should see: the box shows what is late and what is open, and the ticked item changes.
11. [ ] Tap Edit time range, pick the Exam time example, tap the tick, then tap Undo at the top.
    - You should see: the bar changes, then Undo brings back the old version.

**Part 4: Library v2**

12. [ ] Open Library.
    - You should see: the book you are reading is at the top with a Continue button, then all covers. Tap + Add: a menu shows Import, Capture and Prompts.
13. [ ] Tap More, pick Videos, then tap Done. Tap the small ✕ on the Videos chip.
    - You should see: only videos show, then all covers come back.
14. [ ] Tap Knowledge, then View, then Export. Switch a few items off and export.
    - You should see: the file saves and leaves out the items you switched off.

**Part 5: Notebooks and Search v2**

15. [ ] Open Notebooks and tap All, Starred, then Recent.
    - You should see: the list changes each time you tap.
16. [ ] Press and hold a notebook cover, then tap Pin, then Undo.
    - You should see: a small strip of actions appears, Pin adds the pin, and Undo removes it.
17. [ ] Open a notebook, then a page.
    - You should see: the tab row is hidden. A small arrow brings it back.
18. [ ] Open the side panel, tap Pages, and tap Organise. Try Duplicate, then Delete, then Undo.
    - You should see: Duplicate makes a copy, Delete removes the page, and Undo brings it back.
19. [ ] Tap More, change a notebook's cover to one of your photos, then tap Done.
    - You should see: the new cover shows in your list.
20. [ ] Tap Search and type a word that is in one of your notes. Tap that result.
    - You should see: the note is in the results, and it opens at that word.
21. [ ] Tap the ✕ to clear the search. Tap the Features chip and search "dark".
    - You should see: only matching results show.

**Part 6: Settings v3 and the connector screens**

22. [ ] Open Settings and tap each section.
    - You should see: the sections are laid out in the new way, and the text is easy to read.
23. [ ] Open Settings, then Claude. Tap Inbox, then Activity.
    - You should see: three tabs (Settings, Inbox, Activity). Inbox says "Nothing is waiting". Activity shows an empty list or "no activity yet". Nothing breaks.
24. [ ] Open Settings, then About.
    - You should see: the update area is there, and nothing downloads by itself.

**Part 7: Page menus**

25. [ ] Open a page and press and hold one word.
    - You should see: the strip shows above the word, not on top of the handles. Tap Paste to see the formats.
26. [ ] Copy a line from Safari and paste it into a page.
    - You should see: the pasted text keeps its look and is easy to read.
27. [ ] On an empty line, type / then the word tab, then press Enter.
    - You should see: a table appears. Tap Show all and you see every group.
28. [ ] Tap the three dots at the top of a page.
    - You should see: the side sheet opens to the full height. Delete a test page, then tap Undo. The page comes back.

**Part 8: Toolbar v8, and BUG-002 (the format bar)**

29. [ ] Tap Pen, tap it again, and pick a pen type, a size and a colour. Tap + to save a favourite. Tap ☰ to move it, remove it, then Undo.
    - You should see: each change shows at once, and Undo brings back what was removed.
30. [ ] **BUG-002.** Select a word near each corner of the screen, and near the left and right edges, in landscape and in portrait.
    - You should see: the format bar stays fully on screen, keeps its normal size, and never covers the blue handles.
31. [ ] Turn on Hide toolbar while writing, then write with the Pencil.
    - You should see: the bar tucks away, and the Show toolbar pill brings it back.

**Part 9: AI framework**

32. [ ] Go to Settings, then AI.
    - You should see: AI is still OFF. Nothing is sent and nothing is charged. Do NOT type or paste any key here.

**Part 10: Update flow**

33. [ ] Go to Settings, then About, and tap Check for updates now.
    - You should see: a normal update shows only a small pill. Nothing downloads by itself.
34. [ ] Go to Settings, then Advanced, and tap the hidden test button "Pretend a must-have update" (preview only).
    - You should see: a full-screen notice counts down 5 seconds, downloads, and the app reopens on the same page.
35. [ ] Turn Wi-Fi off and repeat step 34.
    - You should see: the notice asks you to connect. Turn Wi-Fi on, and it carries on by itself.

**Part 11: Key flows**

36. [ ] Tap + on Home or Library, name a new notebook, and create it.
    - You should see: it opens at once with its name at the top, and it is in your list after you go back.
37. [ ] Open a page. Write a short line with the Pencil, then type a word on the keyboard. Close the page and open it again.
    - You should see: the ink and the typed word are both where you put them, with no lag you can notice.
38. [ ] Select a few words on a page and make a card from them.
    - You should see: the card shows in your cards list with those words.
39. [ ] Open Review. Answer two cards: once Know it, once Not yet.
    - You should see: the next card appears after each answer, and the count left goes down.
40. [ ] Fully close the app, open it, and time how long until Home is ready. Do this three times.
    - You should see: Home is usable in a few seconds. Write the three times down.

**Part 11b: Added overnight (14 Nov)**

43. [ ] **BUG-006, the Settings gear.** Hold the iPad upright in Safari, open a page, tap in a text box so the keyboard shows.
    - You should see: the ⚙ gear at the bottom of the left strip is still visible and opens its menu (Settings is in it).
44. [ ] **Storage safety.** In Settings, then Try new features, turn ON Storage safety. Reload the page.
    - You should see: a calm notice "Keep your notes safe: add this app to your Home Screen" with Show how and Back up first. Tap Show how: three short steps. Tap Back up first: "Backup saved." and a file in Downloads.
45. [ ] **Review (new).** Open Review and answer a few cards; open its other tabs.
    - You should see: the counts change after each answer, and nothing jumps or overlaps.

**Part 12: Send your results**

41. [ ] Write down each step that did NOT match: the step number and what you saw. Send the list to Claude.
    - You should see: nothing to do here. Claude fixes each one and tells you when to check again.
42. [ ] Turn OFF any new part you do not want, in Settings, then Try new features.
    - You should see: those screens go back to how they looked before.
