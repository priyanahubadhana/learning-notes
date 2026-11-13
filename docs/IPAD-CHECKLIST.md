# Owner iPad checklist: first preview (draft, 13 Nov 2026)

Tick each box as you go. If a step does not match "You should see", write down what you saw and send it to Claude.

**What this is:** a test copy of the app (the "preview") with new parts that are still switched OFF in the live app. You can switch them on yourself, on this iPad only.

**Not in this preview:** Reader v2 (the new reader), Notebooks and Search v2, Toolbar v8, Page menus, Review v2. Those screens look the same as the live app.

## Part 1: Open the preview

1. [ ] Open Safari on the iPad. Type this address and go: https://build-next.learning-notes-app.pages.dev
   - You should see: the app's first screen loads within a few seconds, with no error page.
2. [ ] Add it to the Home Screen if you want (Share icon > Add to Home Screen).
   - You should see: an app icon with the name you gave it; opening it shows the same app.

## Part 2: Sign in

3. [ ] Tap Settings, then Account, then Sign in. Use the same way you sign in on the live app (Google, or your email code).
   - You should see: your notes appear. The signed-in name shows in Settings > Account.
4. [ ] Close Safari and open the preview again.
   - You should see: you are still signed in and your notes are still there.

## Part 3: Turn on the new parts

5. [ ] Go to Settings > Try new features. All switches start OFF.
   - You should see: a list of switches with short names.
6. [ ] Turn on **New Settings**.
   - You should see: Settings is laid out in new sections; everything else still works.
7. [ ] Turn on **New Home**.
   - You should see: the Home screen shows the new layout. Your notebooks are still listed.
8. [ ] Turn on **New Library**.
   - You should see: the Library screen shows the new layout. Opening a notebook still works.
9. [ ] Turn on **AI framework**.
   - You should see: no change to what you write. AI stays off until you turn it on in Settings > AI, and it costs nothing until then.
10. [ ] Turn on **New updates**.
    - You should see: Settings > About shows the update area. Nothing downloads by itself.
11. [ ] Close the app completely (swipe up from the bottom, then swipe the preview away) and open it again.
    - You should see: the switches you turned on are still ON.

## Part 4: BUG-002 (the format bar must stay on screen)

12. [ ] Open any note with some text. Hold a finger on one word to select it, then drag the selection to the **left** edge and to the **right** edge.
    - You should see: the floating format bar stays fully inside the screen. It never runs off an edge.
13. [ ] Turn the iPad sideways (landscape), then back (portrait). Repeat step 12 near the **top** and **bottom** corners.
    - You should see: the bar keeps its normal size and stays fully on screen in both directions.
14. [ ] If the bar runs off the screen or changes size, write down the orientation and the corner, then tell Claude.

## Part 5: Claude connector (screens only on iPad)

The connector's full test runs on the PC. On the iPad you can only check the screens. The online part is not switched on yet.

15. [ ] Open Settings > Claude.
    - You should see: three tabs, Settings, Inbox and Activity. Each is easy to tap with a finger or Pencil.
16. [ ] Tap Inbox.
    - You should see: "Nothing is waiting" with a short help text. Nothing scrolls sideways.
17. [ ] Tap Activity.
    - You should see: an empty list or a short "no activity yet" message. The page does not break.

## Part 6: Key flows

18. [ ] **New notebook.** Tap + on Home or Library, give it a name, and create it.
    - You should see: the new notebook opens at once, with its name at the top. It appears in your list after you go back.
19. [ ] **Write with Pencil.** Open a page, pick the Pencil, and write a short line by hand. Then type a word with the keyboard.
    - You should see: the ink stays where you wrote it, with no lag you can notice. The typed word appears in place. Close and reopen the page: both are still there.
20. [ ] **Make a card.** On a page, select a few words and use the make-card action (or add a card from the page menu, if you see it).
    - You should see: a card is created with the words you chose. It shows in your cards list.
21. [ ] **Review.** Open Review (or the cards area) and answer the first card, once with a "know it" and once with "not yet".
    - You should see: the next card appears after each answer. The count of cards left goes down.
22. [ ] **Search.** Use the search button, type a word that is in one of your notes.
    - You should see: that note is in the results. Tapping it opens the note at the word.
23. [ ] **Start speed.** Fully close the app, then open it and time how long until the Home screen is ready. Do it three times.
    - You should see: the Home screen is usable in a few seconds. Write the three times down and send them to Claude.

## Part 7: Send your results

24. [ ] Write down, for each step that did NOT match, the step number and what you saw. Send the list to Claude.
    - You should see: nothing to see here; Claude will fix each one and tell you when to check again.
25. [ ] Switch OFF any new parts you do not want, in Settings > Try new features.
    - You should see: the screens go back to how they looked before.

