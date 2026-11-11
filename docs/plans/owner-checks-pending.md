# Owner checks still pending (collected for the end-of-run iPad pass)

## Bug fixes 001, 003, 004 (11 Nov)

On the iPad: (1) BUG-001: in a page, type / then Checklist (or turn a line into a checklist), type a few words and tick one: the red "Not saved yet" bar never shows and typing feels normal; close and reopen the app: the checklist is still there. (2) BUG-003: Settings > Tool bar > Show tool bar Off; the bar goes and a blue "Show tool bar" pill stays at the top of the screen, easy to tap. Tap it, pick a tool, type: the bar stays. Turn it off again: the pill stays visible while you write. (3) BUG-004: the black "Updating…" screen is gone. A normal update shows only the small "Restarting…" pill. A REQUIRED update (the build is marked required, for example a storage change) shows a full-screen "Update required" with a 5 second countdown, then a download bar, then "Installing", then the app reopens with all your notes. Cancel keeps the app blocked with a Retry button; turn the network off during the download: you get Retry and nothing is lost. (To try it without a real release: Settings is not needed, ask me to mark a build required.)

## Priority 4 bug checks (11 Nov)

On the iPad: (1) Toasts above the keyboard: type in a box with the on-screen keyboard up, then do something that shows a message (for example delete a box); the message sits above the keyboard bar and can be read, only one at a time. Also with a hardware keyboard (only the short bar at the bottom). (2) Fewer toasts: Copy, Paste, Bookmark, Highlight, Bookmark, Layout change, Reset tool bar, Insert a template, Move a page, Make a card or mind map, Merge layers: no message appears, the result is visible. Deleting a box, emptying a page, removing a bookmark or a prompt still shows a message with Undo. Errors still show. (3) Scroll bar: tap the empty track near the bottom; the thumb jumps there, centred under the finger or Pencil; drag the thumb: it follows exactly. (4) Draw a line, type a line, wait 2 seconds, reload the app, then press Undo: the line and the text go away one step at a time; Redo brings them back. (5) Text strip (Text pill): new Font, Size and Line spacing buttons; each opens the same choices as the Aa card and the page changes at once. Add or hide them in Edit bar.

## Text box v2, step 1 (11 Nov)

On the iPad: (1) tap a box: a clear blue frame, 8 handles (corner dots, side pills) and the blue ≡ tab on top show, also on the very first box. (2) First box ⋯ menu: Box style, Copy, Cut, Duplicate, Colour, Layout (no Lock, no Delete). (3) Box style button in the format bar opens the panel for any box. (4) A box alone in its row: drag its right handle to make it narrower. (5) Drag the top handle: the top edge moves, the bottom stays. Tell me if any handle is still missing.

## Text box and Layout mode checks (11 Nov, owner bug batch 3)

On the iPad: (1) Text tool: tap empty paper, type, press Enter: new lines stay in the same box. (2) Tap a box once (frame or text): the grip and the menu show only on the selected box, and are easy to hit with a finger. (3) Drag a box and drop it, then tap empty paper at once: no new box; wait a second, tap again: a new box. (4) Tap any part of a box (the empty right side, the corner) with the Text tool: the caret goes into that box, never a new box on top. (5) The page's first text box shows the grip and the menu while you type in it. (6) Select a box: 8 round handles; drag the bottom or a corner: it grows, and it will not go smaller than its text. (7) Top row: the grip and menu sit clear of the Notes/Summary/Review bar, fully visible. (8) Layout button in the Text strip and the toolbar menu opens Layout mode: the page shrinks a little, boxes wiggle, the strip shows the layouts and the coach line; tap Two columns (changes at once), drag a box (others slide aside), pull a handle, Undo (back to before), Apply to all pages, Done. (9) With the keyboard up, a toast (for example after a drop) sits above the keyboard bar.

## Stay signed in checks (11 Nov)

On the iPad, PC and phone: after the update, close and reopen the app, leave it a few hours and reopen, switch apps and come back, and go offline for a day then back online. You should never be asked to sign in again unless you tapped Sign out. Tell me if it still happens, and when.

## Builder L checks (10 Nov, owner bug batch 2: layout, Text tool, hold menu)

On the iPad (these need a real Pencil and eyes): (1) Two-column row from Layout: boxes sit side by side, no overlap; drag a box: frame and text move together smoothly; the ⠿ grip stays at its top-left corner; "Tap here to keep writing" does not float in the middle. (2) Pencil tap on Done in "Name your page", and on a clash bar, picture strip, Box bar, link and tag chips: it presses, no ink, no dots typed. (3) Hold menu: write with Scribble in the Text tool, the menu never pops up; hold the Pencil on the caret or a selection for 1.5 s: it opens (a ring fills from 0.4 s); drift of a few millimetres cancels; near the bottom edge the menu stays on screen. (4) Layout: Box bar ▦ or ⋯ › Layout: pick 1:1:1, tap the zones, see the full-page preview, Done; Undo once puts it back; "Apply to whole notebook" shows every page first. (5) Text tool: Box style panel (swatches, Advanced); new box shows a dashed frame and "Type here"; tap the frame (selected), tap inside (bar hides), frame again; hold on blank paper gives "Start typing here"; the keyboard bar sits on the iPad keyboard (outdent, indent, lists, B I U S). (6) Clash bar: type on the iPad with the PC open on the same page: no "Changed on two devices" bar appears.

Moved out of HANDOFF on 2026-11-06 (audit) so HANDOFF stays five lines. Newest first; each paragraph names its step. The run decision (master plan) is one owner iPad pass before Sync; the Phase A builder adds its checks at the top. Tick a paragraph by deleting it.

## Pencil double tap bug (11 Nov)

On the iPad, Text tool: double tap a word with the Pencil, wiggling it a little, several times in different words ("let me type text"). The word is selected and stays; nothing is deleted or replaced. Then, after about a second, write with the Pencil (Scribble): handwriting still works. Why human: real Pencil drift and Scribble.

## iPad checks: one Undo history (Builder D, 10 Nov)

On the iPad: (1) Type a line, draw a stroke, move a box, change the paper style, add a tag, then tap Undo 5 times: each change goes back in that order and Redo brings it forward; a stray Enter, comma or pen tap can be undone. (2) Make 30 small changes (words, strokes, box moves) and Undo 30 times: still going. (3) Delete a box and Undo from the tool bar: the box and its lines come back. (4) Restore an old version in Page history, then Undo: the page returns to how it was. (5) Open a book (PDF and EPUB) and a note in reading mode: the Undo/Redo pair is the first thing at the top left on every screen, and the Pen strip has no Undo/Redo words. (6) Switch to another app and back, then Undo: it still works. Reload the app: Undo still walks back through box and paper changes (typing and drawing start fresh). Why human: Pencil timing and real iPadOS app switching.

## Builder G checks (10 Nov)

(00) Type in a box: a small bar floats above it (colour, size, Aa, B, I, align, list, highlighter, more); drag it and it stays there next time. A long table or database table: no row sits in the gap between two sheets. (0) Text tool: press and hold still on text with finger, Pencil and mouse for 1 s: our menu (Paste, Select, Select all, Insert) opens at that spot, never the iOS callout. Settings › Advanced › Press-and-hold menu time changes the delay. (1) Lasso tool, tap a text box once: the frame and box bar show, no keyboard. Tap again: caret where you tapped; again: word; again: line; again: paragraph. Same with finger, Pencil and mouse. Text tool: 1 caret, 2 word, 3 line, 4 paragraph. Tap bare paper: the box is deselected. (2) Drag a box by its grip while sync shows "Changed on two devices": the bar shows once and the box moves smoothly without white lines.

## Builder H checks (10 Nov)

(1) In a book, Contents and Notes open the left panel (no panel on the right). (2) Aa: change font, size, spacing, margins, page colour (sepia, black) on an EPUB and a PDF; Themes presets; Dim. (3) Lock: tap the lock, tap and draw (nothing happens), swipe turns the page, hold the lock icon 1.5 s (ring fills) to unlock. (4) Press and hold a word on the iPad: the menu shows Define and Ask AI; Define shows meanings (online) or the offline message; Pronounce speaks. (5) Full screen: tap the middle for the bar and the page slider ("Back to n" after a jump). (6) ⋯ › Tool bar: Compact and Full add sizes, pen type, colour picker. (7) Left panel › Audio › Read this page: the iPad voice reads, the sentence is marked and the page follows, then goes on to the next chapter/page; speed and voice change. (8) The selection tint looks soft in both themes.

## iPad checks: Builder F, book reader (10 Nov)

On the iPad: (1) open a PDF with Continue, open the left panel: Pages shows page pictures, the open page is highlighted, tapping one jumps; scroll a long PDF's thumbnails (smooth, no blank flashes); Outline shows the contents; Notes lists bookmarks and highlights, tap jumps; closing the reader brings back the note's tabs. (2) EPUB: Pages lists chapters, the current one is highlighted. (3) Reader ⋯: Go to page (type a number), Sync to furthest page read (read to page 5 on one device, go back to page 1, tap it: back at 5). (4) Tap the ribbon at the page corner: it fills, a bookmark appears in Notes. (5) Full screen button: only text, tiny title and progress; tap the middle for the bar; tap the left or right edge to turn pages; the Home swipe or the button leaves. (6) PDF: double tap zooms around the spot with a small overview in the corner, drag to pan, double tap or the cross returns; pinch still works. (7) The 13 h EPUB (item 28) opens with text, also in Pages layout. Why human: touch, iPad Safari full screen and long books.

## Builder E checks (10 Nov)

(1) Library book, Ask this book with AI on and a key: it works without touching Permissions. (2) Turn AI off, tap the AI-off card button: Settings opens on the AI keys row, highlighted. (3) Sync banner buttons open Account at the Sync / Sign in row.

## iPad checks: Builder C (10 Nov)

On the iPad: (1) Library, open the 13 h EPUB with Continue: text must show (a note appears in the console only if it fell back to Scroll). (2) Settings › Advanced: switch on "Show Refresh button in the top bar", tap it: the app restarts on the same page. (3) Open Page history on a page where you added and removed a text box: restore an old copy and check the boxes, picture and paper style come back; History shows the "before a restore" copy. (4) With two tabs open on the PC, let an update arrive: no black cover longer than 5 s, a small pill shows the download.

## iPad Lasso batch A (10 Nov)

On the iPad with the Pencil: (1) loop and rectangle outlines clearly visible on dark and light paper; (2) start a loop in the page margin left of the text: it selects the words; (3) select a word with the Text tool, then Lasso a drawing: no old caret, handles or bar remain; (4) 12 loops mixed free and rectangle, drag the selection bar to the top and pin it, loop again several times, drag a handle: all work, the bar returns each time; (5) selection fades in softly; (6) selected words show a soft tint (no dashed line), thin handles, a loupe above the Pencil while dragging a handle. Why human: Pencil and real iPadOS.

## iPad paper layout, scroll bar, pictures, box grid (10 Nov, builder B)

On the iPad: (1) with the Text tool, tap near the right or left edge of the sheet while scrolling: no stray box; a tap well inside makes one; leave it empty and tap elsewhere: it disappears. (2) The page has a scroll bar on its right (track, thumb, up and down arrows: one sheet per tap; drag the thumb). (3) Empty lines show "Enter text or type '/'" only where the caret is; the caret is the accent colour. (4) Put the caret in the lower half of a page, open the Write pad: the page scrolls so the line sits above the pad before you write. (5) Insert a picture from Files: drag the preview (smooth), drag it to the top and bottom edge (the page scrolls), it never goes over the bars, switch to another app and back (it stays), only the tick places it; a gap opens in the text where it will land and a drop in the middle of a line splits the line like Enter (Undo joins it); make it bigger than a page: it stops with "Largest size for one page"; Picture tab › Fit to page. (6) Box grid: make 3 boxes, drag one by its ⠿ onto the right side of another (2 columns, live preview, accent outline), a third beside (3 columns), a fourth beside shows "Row is full" and goes below; drag onto the top or bottom quarter to stack (2 x 2); drag a divider between columns (snaps to thirds), double tap it (equal); box ⋯ › Layout › Two columns / Six boxes; Undo toast after each; no box ever overlaps another; a row that does not fit the end of a sheet starts on the next one. (7) Open an old page that had free, overlapping boxes: they are tidy, no text lost (Page History has the copy).

## iPad tools robustness (10 Nov)

On the iPad (installed app): use the Lasso 20 times in a row (free and rectangle, on ink, words and a picture); switch to another app and back 3 times (once in the middle of a loop, once with the Pencil held down); after each return check that the Lasso, a Pencil double tap on a word, a Pencil Text selection, the Pen and the Text tool (typing) all work, and that nothing needs a restart. Then open Settings gear > "Refresh app": you should land on the same page, same scroll, same tool, with your text and drawing kept. Settings > Advanced > Copy tool state: the "health" lines list anything the app fixed by itself. Why human: real iPadOS drops lifts and cancels in ways a test cannot copy.

## iPad contextual strips and picture resize (9 Nov)

On the iPad: (1) paste a picture: it is selected at once, with the action bar and a Picture row under the tool bar (Smaller, Bigger, Fit width); tap More: the full bar opens on the Picture tab (resize, crop and rotate, replace, align, caption, Copy, Cut, Duplicate, Delete). Tap empty page: the Picture tab goes and the bar returns to what it showed. Try a table, a video link and a Lasso loop around a drawing: Table, Video and Drawing tabs. (2) Drag a corner with finger and Pencil: the picture follows every frame with no stutter, one Undo. Smaller and Bigger glide quickly. (3) Make a picture too big for the sheet: a dashed ghost shows on the next sheet while you drag, nothing jumps; on release it slides there, the page follows and it pulses once. Tap the blank end of the sheet: the caret appears at the end of the last line and "Continues on next page" is faintly visible. (4) Resize, switch to another app, come back, type, resize smaller again: the picture stays. Why human: touch and Pencil smoothness.

## Settings that follow you (9 Nov)

With two devices signed in (PC and iPad): (1) On the PC change the theme, the language and the AI spending limit; within a minute the iPad shows them. (2) Settings > Sync > What syncs: switch Review off on the iPad, change "New cards per day" on the PC: the iPad keeps its number; switch Review on again: it takes the PC's. (3) On any setting tap the three dots beside "All devices": "Keep on this device only", change it on the PC, the iPad keeps its value; "Reset to synced value" brings the PC's back. (4) The first time the new version opens on a device that already has your account, a small note may say how many settings changed; try Undo. (5) On a page edited on both devices you should no longer see empty "The other version:" bars; at most one bar per page. Why human: real devices, real sign-in and timing.

## Done by the owner (9 Nov, tested live)

- Email code sign-in works live ✓ (10 Nov). Brevo: SMTP IP blocking must stay DEACTIVATED (Supabase sends from changing IPs; error was 525 Unauthorized IP).
- Accounts setup steps 1-7 in Supabase + Brevo SMTP (10 Nov) ✓ — Brevo SMTP key expires Nov 2027 or after 90 days unused (renew in Brevo, paste in Supabase SMTP)

- Drive lasting connection: "Drive: stays connected" ✓
- AI key Test passed ✓; prompt picker found
- Insert › Picture (Photos, Files, Camera, Paste), placement, resize, action bar ✓ (resize smoothness still being improved)
- Lasso free-form word selection ✓ (rectangle menu, 3rd loop, handles: fixes pending deploy)
- Picture moved to next sheet when too big: understood; shrinking brings it back ✓ (animation and tappable gap pending)

## Notebooks home (9 Nov)

On the iPad and iPhone: tap the Notebooks icon (on the phone, tap it twice if the list slides in first). You see a shelf of covers with the notebook name, when you last opened it and how many cards are due. (1) Tap a star: the notebook jumps to the front. (2) Tap ⋯ on a cover: choose "Show the first page as the cover" and back, and "Change colour". (3) Switch Shelf / List. (4) Tap the dashed "+" or "New notebook": a new notebook starts. (5) Turn the iPad round: covers re-flow, nothing overlaps. (6) In the sidebar each notebook has a coloured tile, a bold name and a small number for cards due. Why human: touch feel and real screen sizes.

## iPad Lasso text selection (9 Nov)

On the iPad: Lasso with Text on, loop around a few words. The words get the dashed amber outline and our pill shows; Apple's Cut / Copy / Paste / Select All menu must NOT appear. Try Copy and Cut on our pill (they must work), then tap empty paper: the outline and pill go and no Apple menu is left. In Text (typing) mode a finger long-press still shows the normal Apple menu. Why human: iPadOS menus only show on a real device.

## iPad scroll feel (9 Nov)

On the iPad: (1) scroll the sidebar: a thin grey line (3 px) appears at the right edge and fades about a second after you stop. Grab it (touch area is wide): it grows a little and the list follows your finger step for step, no jump from bottom to top. (2) Pull any list, Settings or the page past the top or bottom: the content gives a few pixels and springs back. On a paper page with ink, pull at the bottom: words and ink move together and the ink stays on the words. With Reduce motion on, you see a brief glow at the edge instead. (3) Make the window narrow (split view): Notes, Summary, Review stay on one line (scroll sideways if needed). Why human: real touch and Pencil feel.

## AI settings clarity (9 Nov)

On your PC: open Settings > AI. You should see, in order: the on/off switch, Keys and default model, Spending limit, Usage and cost. (1) With AI off, a card "AI is off" with Turn on AI: press it, the switch turns on. (2) Type the monthly limit in rupees (for example 450): it stays 450 after reload. (3) Use AI once (for example Clean up with AI), then Usage and cost shows the total against the limit, the call under its feature and a row in Recent calls; Export CSV downloads a file with no note text. (4) Settings > Connections lists your Claude and Gemini keys with Test, and says nothing about "later phase". (5) With AI off, open Ask this book, a prompt and Convert to text: each shows the same "AI is off" card.

## ACCOUNTS SETUP (9 Nov): do this first, in the Supabase dashboard (no secrets in chat)

What it is: accounts are now required. People sign in with Google, an email code (6 digits) or email + password. These settings make the two email ways work. Until they are done, the Google button keeps working and the email ways say "could not reach the server" or never send mail.

1. Authentication > Sign In / Providers > Email: turn on Enable Email provider, turn ON "Confirm email", leave the email code (OTP) on. Set "Minimum password length" to 15. Set the one-time code length to 6 and its expiry to 3600 seconds.
2. Authentication > Email Templates: in "Magic Link", "Confirm signup" and "Reset Password" show the code instead of a link: put `Your code is {{ .Token }}` in the body (you may leave the link out). Save each.
3. Authentication > URL Configuration: Site URL = the live site address (the one you open the app at). Under Redirect URLs add that address with `/**` on the end (for example `https://YOUR-SITE/**`) and `http://localhost:5173/**` for testing. Google sign-in and "Connect Google" come back to these.
4. Authentication > Sign In / Providers: turn ON "Allow manual linking" (the page calls it beta). This lets you connect Google to an email account and the other way round.
5. Authentication > Sessions: leave "Time-box user sessions" and "Inactivity timeout" OFF, so a device stays signed in.
6. Free email sender (the built-in one sends about 2 emails an hour, too few). Easiest is Brevo (free, 300 emails a day). Make a Brevo account, add and verify your sender address (Senders), then SMTP & API > SMTP: copy the login and make an SMTP key. Then in Supabase: Authentication > Email > SMTP Settings > Enable Custom SMTP: sender email = the verified address, sender name = Learning Notes, host = `smtp-relay.brevo.com`, port = 587, username = the Brevo login, password = the SMTP key (paste it only in that box, never in chat). Alternative: Resend (100 a day) needs your own domain.
7. After the SMTP is saved, Authentication > Rate Limits: raise "Rate limit for sending emails" to 30 an hour (enough for testing).
8. Keep the testing allow-list: the "Before User Created" hook still blocks any email except yours. Before the public launch it must be turned off (launch checklist), and the paid-plan question (leaked-password check, custom limits) decided.
9. Check on the live site: sign out, then sign in with "Email me a code" (the mail arrives within a minute, the code works inside the app); sign out, then "Email and password" > Create account; Settings > Account > Connected accounts shows Google, Email code, Password with their emails; Connect Google works; you cannot disconnect the last one.

## Signed out from another device (9 Nov, after deploy)

What it is: if you press Sign out on all devices on one device, the others show a lock the next time they check in, like Instagram. Your notes are hidden, not erased.

1. Use two devices (for example iPad and iPhone), both signed in. On the iPad: Settings > Account > Sign out on all devices.
2. On the iPhone, open the app (or wait a minute). Check: a full screen says "You were signed out. Sign in to continue". Your notes are hidden and nothing else works behind it. Close and reopen the app: it still shows.
3. Before step 1, on the iPhone turn on Airplane mode, write something in a note, then turn it off after the lock appears. Tap Sign in to continue and sign in. Check: a box lists how many pages changed on this device and in the cloud, with three choices: Merge both (highlighted), Use this device's version, Use the cloud version. Pick Merge both. Check: your offline words are still in the note; where the same line differed, a bar offers Keep mine, Use other, Keep both; the other version is in the note's History.
4. Repeat once and pick Use the cloud version. Check: the cloud text is shown and your offline text is in History.
5. On a spare device only: tap Start fresh on this device. Check: a warning shows how many changes were never sent; the button saves a backup file (check it in Files/Downloads) and then opens the empty welcome. Do not do this on a device with notes you have not backed up.

## Update check fix (9 Nov, after deploy)

What it is: the version check no longer needs the offline helper to be working.

1. Open the live site, Settings > About, tap Check for updates now. Check: it never says Could not check while online; if a newer version exists the app restarts by itself within a few seconds. Do this signed in to sync too.

## Design step 2: the frame (9 Nov, after deploy)

What it is: the new look of the outer shell: soft violet backdrop, floating frosted sidebar, frosted bars, solid page.

1. Open the app in Day, Night and Sepia. Check: the sidebar floats with a gap and rounded corners, the top and tool bars are one frosted strip, the page is a solid white (dark, cream) card, the selected row is soft violet, the Review number is a violet pill.
2. Scroll a long page and write with the Pencil on the iPad. Check: nothing stutters. If it does, Settings > General > Reduce glass > Solid, and tell the builder.
3. Open a ⋯ menu, the Quiet corner (⚙), and Search (Ctrl+K). Check: they look frosted and every word is easy to read. Trigger a toast (delete a page): it is a solid card.
4. Hide the sidebar (button at the top left): the strip of spaces stays as the icon rail. On the phone: the menu opens as a drawer, the bottom tabs stay.

## Settings > Account (9 Nov, after deploy)

What it is: one place for your account, instead of Sync, Lock and AI.

1. Open Settings > Account (right under All). Check: your email and picture, Last synced and Sync now, the Google Drive line (and Set up lasting connection if it says it will ask), Make a new recovery code, the PIN lock and AI keys lines with their links.
2. Press Search all features and type "all devices", "recovery code" or "drive": the Account items show up and open the right place.
3. Sign out on all devices: press it, read the box, choose Sign out everywhere. Check: this device signs out; on your other device the next sync asks you to sign in again; the notes are still on both. Sign in again from Account.

## Design tokens review (9 Nov, after deploy)

What it is: the new colours, type, spacing and buttons, on one page.

1. On the iPad open the live site address followed by `#/design-tokens`. Look at Day, Night and Sepia (buttons at the top), and the buttons: hover/press, disabled, loading.
2. Check: violet accent looks right, text is easy to read everywhere, nothing looks washed out. Tell the builder what to change.
3. In the normal app the accent is now violet (links, selected items); layouts are unchanged until the screen redesigns.

## Drive lasting connection status (9 Nov, after deploy)

What it is: Settings > Sync now says whether Drive stays connected, and why not.

1. Open the live site after the deploy, Settings > Sync. Read the Drive line. "Drive: stays connected" = done (Supabase table drive_tokens has 1 row).
2. If it says "will ask to reconnect": tap "Set up lasting connection", pick the account, press Allow on Google's permissions screen. Come back: the line should now say "stays connected".
3. If it still says "will ask", read the small grey line under it and tell the builder; also Settings > Advanced > Slow moments > Copy report has a "drive" line (no secrets). "no Google refresh token" means Google or Supabase did not send one: also remove the app at myaccount.google.com/permissions (Third-party access) and tap the button again, so Google asks afresh.

## AI cost currency (9 Nov)

What it is: costs can show in any currency you choose, with a rate you type.

1. Settings > AI > Cost currency: it says INR with rate 90. Search "euro", tap it: rate shows 1. Type 0.92: "Rate last changed <today>" appears.
2. Open a prompt in the picker (or Clean up with AI): the cost line shows euros and tokens. Settings > Permissions spend lines too.
3. Switch back to INR: rate is 90 again. Open the app on a second signed-in device: same currency.

## Reader bar hide/show, pin, Contents (9 Nov, iPad)

What it is: the reader bar now behaves like Safari's, has a pin, and Contents opens the left panel's Outline tab.

1. In Read mode scroll down: the bar slides away (a small ✕ stays). Scroll up a little (about 10 px) or tap the page: the bar slides back. At the top it is always there.
2. Tap the pin on the bar: it stays visible while you scroll; tap again to let it hide. It is remembered on this iPad.
3. Tap Contents (☰): the left panel opens on Outline; tap a heading and the page jumps. In the full-screen reader it first returns to reading in place (the full-screen page covers the panel).
4. Toasts, the Lasso and mixed menus, the Now playing pill and the paste chip are sharp (no soft text).

## Ink scrolls with the page (9 Nov, iPad)

What it is: the ink now lives inside the page, so the browser scrolls it with the words (before, the app re-placed it on every scroll, which stuttered on big pages and could drift over the tool bar).

1. Open a long page with ink on it (a big pasted page with a few drawings is best). Scroll with one finger, slowly then fast: the ink moves exactly with its words, no lag, no flicker, no blank patch. Compare with the feel from before: it should be as smooth as a page with no ink.
2. Pull the page past its top and past its bottom (rubber band) with Pen, Lasso and Text tools: the ink never lands over the tool bar or the ribbon, and never trails behind the words.
3. Zoom the paper (pinch out to 73 %, in to 150 %, release): the ink stays on the same words at every zoom, also during the spring back.
4. Draw while the page is partly scrolled, then scroll away and back: the new stroke is still on its words. Lasso a stroke, drag it, scroll: fine. Erase and highlight: fine.
5. A book (PDF page) with ink: scroll the pages; ink stays on its page.
6. Tell the builder if you ever see a blank patch where ink should be after a very fast flick; the fix is a larger margin.

## Drive stays connected (9 Nov) - owner setup, about 10 minutes

What it is: today the app asks Google for a new one-hour Drive pass in the browser, and that fails after long idle or on Safari, so "Reconnect Drive" appears. This setup lets a small server step (free) keep a long-lasting Google key for you, locked, and hand the app a new pass whenever it needs one. After it, the bar should appear only if you remove the app's access in your Google account or change your Google password. Until you finish, the old way keeps working.

1. Google Cloud (console.cloud.google.com > APIs & Services > Credentials > your Web client): nothing new to add. The redirect address is the same Supabase one already there. Just check the consent screen still says "In production".
2. Supabase > Edge Functions > Secrets (or Project Settings > Edge Functions): add two secrets.
   - `GOOGLE_CLIENT_SECRET`: the same client secret you pasted in Authentication > Providers > Google. Paste it only there, never in chat or files.
   - `DRIVE_TOKEN_KEY`: any long random text (30+ characters). Keep a copy in your password manager. If it is ever lost, nothing breaks except one more Reconnect.
3. Supabase > SQL Editor: paste and run `supabase/migrations/20261109000001_drive_tokens.sql` (safe to run twice). It makes a table no browser can read.
4. Deploy the function `drive-token` from `supabase/functions/drive-token` (and its helper in `supabase/functions/_shared`). Easiest, in a terminal in the project folder: `npx supabase login`, then `npx supabase functions deploy drive-token --project-ref eludllranljtyasdoyaj --no-verify-jwt` (the function checks the signed-in owner itself). If you prefer the dashboard, ask the builder for a one-file copy.
5. In the app: Settings > Sync > sign out, then sign in again with Google. Google shows its permission screen once. This is when the long-lasting key is saved.
6. Check: leave the app closed for a day (or close Safari fully), open it: Drive pictures still sync and no Reconnect bar. Offline for a while, then online: same.
7. If a bar does appear after this, its tap signs in again once (that is the "Google cancelled access" case). Tell the builder if it appears without you changing a password or removing access.

## Paste "As text box" (9 Nov, iPad and PC)

1. Paste set to "Ask each time". Copy a ChatGPT answer with a heading and a list, tap in a blank spot of a page, paste: the chooser has a third row "As text box".
2. Choose it: a new box with the heading and list appears under the cursor; the page text is unchanged; the toast Undo removes the box. Drag it like any box.

## Vimeo, Loom and video files (9 Nov)

1. Paste a Vimeo link, a Loom share link and a link to an .mp4 file (one at a time, Paste set to Ask each time): the chooser says "Embed (video)"; Enter makes a card with the name and address, no picture or sound yet.
2. Tap Play: the video starts inside the page (iPad: full-screen button works). Offline the card says it needs a connection.
3. Any other address (a news page, an http file) is still a plain link card.

## Clean up with AI (9 Nov)

1. Settings > AI: on with your key; allow AI in the notebook. Paste a messy block of text (about 3 lines or more) with Paste set to "Ask each time": the chooser has a 4th row "Clean up with AI".
2. It shows the instructions (edit them if you like) and "Cost before sending" in rupees; Clean up sends; the preview lists anything it could not place; Insert puts headings, lists and tables into the page; the chip "Pasted as" can go back to Plain text.
3. Open Library > Prompts: "Clean up pasted text" is there and shows your edit as a version.

## Copy formats (9 Nov)

1. Select a few headings, a list and a table on a page, Ctrl/Cmd+C, paste into Word, Gmail or a Markdown editor: structure stays. Paste into another page of the app: the blocks are the same.
2. Block menu (⋮⋮) > Copy, then Copy as… > Markdown / Rich text / Plain text / HTML: each writes only that format; a toast says Copied.
3. Tap a picture, Copy, paste into Photos or a chat: it arrives as an image.
4. iPad: Lasso a line of text, Copy in the pill: pasting elsewhere gives clean Markdown.

## Delete page and sidebar ✕ (9 Nov)

1. Open a page, ⋯ > Delete page (red, above Save & restore): it goes to Trash, a toast says how many sub-pages, Undo brings it back and reopens it. On an edit-locked page it says locked and nothing is deleted.
2. ⋯ > Import now opens Save & restore (no more "Coming soon").
3. Sidebar, mouse: hover a page row at the normal width: ⋯ + ✕ show; ⋯ holds Move up/down, Favourite. Drag the sidebar wide: all icons show. ✕ moves the page to Trash with Undo. On a notebook ✕ asks with the page count, then Undo.
4. iPad: the row's 44 px ⋯ menu has Delete page / Delete notebook.

## Boxes like GoodNotes (9 Nov, iPad)

1. Pick the Lasso, hover a box with the Pencil or tap its thin frame: frame shows, handles appear. Drag a corner/side handle to widen; drag the frame to move.
2. Tap a box: a bar shows under it. Try colour, size, Bold, align, list, Duplicate, Delete (Undo), Cut.
3. Tap one box, Shift-tap (or loop with the Lasso) another: drag; both move, a see-through copy follows and a red line shows where it lands. Drop one on another: the one below slides down. One Undo ("2 boxes moved").
4. Drag near another box's edge or the margin: a thin guide line and a light click-in.
5. Page with several boxes: Ctrl+A three times, Delete (or Cut): all boxes empty, Undo brings them back.
6. Make an empty box on top of the page text, reopen the page: it is gone. An empty box: Backspace removes it.

## NotebookLM import and page tabs (9 Nov)

1. Data › More › Bring in from NotebookLM. From NotebookLM download an audio overview, a video overview, a slide deck (PDF, then PowerPoint), a mind map PNG and flashcards CSV; bring each in (choose "A new page"). Check the preview names the right thing, Add works, Undo removes it. The video should play on the page; the audio in the Audio panel.
2. Mind map picture: tick "Also rebuild it as an editable mind map": the cost line shows first; with your key it makes a mind map block. Check the rebuild is close to the picture.
3. In the Prompt library (purpose Import) copy the three NotebookLM prompts into NotebookLM chat; paste each answer into the paste box (mind map outline, A quiz, A report) and check it comes in.
4. Open the new page, tap ⋯ at the end of Notes · Summary · Review and switch on Slides, Audio & video, Mind map, Database one by one (also in Settings › General › Page tabs). Slides should show the strip; Database should show this page's databases with the two widening chips.

## Claude Skill (9 Nov)

1. Settings › AI › Use with Claude: tap Download the Claude Skill (.zip); in Claude open Settings › Capabilities › Skills and upload the zip (do not unzip). In a chat give Claude some text and say "make notes for Learning Notes": it replies with one JSON block (and maybe a .lnskill.json file).
2. In the app: Library › Prompts › any skill › No AI key? › Paste answer (paste the JSON) or Import a .lnskill.json file / drop the file: the preview opens with stars, icons, sources and cards.

## Paste, tables, select all, Notion import (9 Nov)

0. Paste (PC then iPad): copy a Gemini answer (headings, a table, bold labels, lists, ❌✅) and paste: a small chooser asks (Enter = Keep original format); the result has real headings, a table, bold labels and lists. Tap "Plain text" in the chip that appears: it swaps in one Undo. Tick "Always use this" once, then Settings › General › Paste shows your choice. Try a Google Doc, a Word page, a ChatGPT answer, and a tree (├── └──): it stays in a code block. Copy rows of a Notion database view and paste: a Database block with the first column as title and the emoji kept. Also try a big real Notion zip on the iPad (Save & restore › More › Notion).
1. Table: hover a row border, drag the pill: the row grows and stays after reload. Double-click a column border: it shrinks to fit its text. On iPad tap a table: pills appear on row and column borders; drag them with a finger and the Pencil; double-tap a column pill to fit.

2. Left panel › Outline: choose Headings 1 only, 1–2, All; tick Toggles (a toggle summary appears; tap it: it opens and the page scrolls to it); tick 1, 1.1 numbers; fold a heading with its arrow. Close the app and reopen: the choices are still there.

3. PC/iPad: copy a Notion page with toggles (and sub-toggles, headings, callouts) and paste: toggles stay toggles with their children. Copy rows of a Notion database and paste: a table, no big heading.
4. Hover a table: grips and + show only for the hovered row/column and fade about 0.3 s after the mouse leaves; the column border shows a grip pill and drags. On iPad tap a cell to see its grips, they hide after about 3 s.
5. Ctrl/Cmd+A in a cell: its words, then the whole table, then everything.
6. Save & restore › More › Notion: import a real Notion "Markdown & CSV" zip; check pages, database columns, row pages, pictures and links; then Undo.

## Lock editing, prompt gaps (9 Nov)

1. iPad: page ⋯ › Lock editing. The grey bar says "Locked — tap to unlock"; typing, Pencil drawing, the title and paper boxes do nothing. Tap the bar: editing works again. Lock a notebook (notebook screen › Tab options › Lock editing (all pages)): every page shows "Notebook locked"; Delete is refused.
2. Page ⋯ › Prompts and skills on a plain note page: run Summarise, Insert below, Undo. In a skill answer an icon like lucide:brain shows drawn in the preview and as 🧠 in the saved notes.
3. Lasso › Convert to text and the Write pad: "Use a saved prompt (optional)" picks a prompt; Use the normal reading clears it.

## Prompt library and skills (9 Nov)

1. iPad, Library space: tap Prompts. The list opens with prompts (Summarise, Quiz me, Study plan…) and skills (a chain sign). Type a word in the search box; the list shortens. Choose Purpose and Subject: it filters. Tap New prompt, give it a name and text, Save: it is in the list. Tap Edit, change the text, Save, Edit again: Earlier versions shows the old text.
2. Tap a prompt, paste a few lines of text: one line shows the cost in rupees, tokens and the model before anything is sent. With your Claude key (Settings › AI) tap Run with my AI: an answer appears; tap a star to rate it.
3. Tap a skill (Transcript to study set), paste a transcript, Run. Check the preview: points with 1-10 stars and an icon on the Must know ones, Sources at the bottom, unsourced points marked. Untick one point, edit another, tap Check the facts with a second model (its cost is shown first). Save into a new Research book: open it, see the summary, mind map, database table, pages and Cards page. Review the cards. Tap Undo in the saved panel: all of it is gone.
4. Same skill with no AI key (or AI off): open Prompts › the skill › No AI key? › Copy the prompt, paste it into the Claude or ChatGPT app, copy its reply, paste it back under Paste the AI answer, tap Paste answer: the same preview opens. A wrong reply shows a plain message and changes nothing.
5. In a book: Ask this book › Use a saved prompt fills the question box.

## Owner iPad findings, fixes (9 Nov)

1. Insert > Picture, pick any picture: it shows as a preview at the cursor line and the page scrolls to it. Drag it to another line, drag a corner to resize; the tick places it (one Undo), the cross cancels. Nothing is added before the tick.
2. Undo and Redo sit at the left of the main bar (and of the full ribbon) and never scroll away, at every width.
3. Lasso: with Pictures on in its pill, loop a picture the very first time after opening the app. Tell me if it still does nothing (I could not reproduce it in the browser).
4. A selected picture, word or line shows a dashed orange outline around only itself, no filled box.
5. Tap (or press and hold with the Pencil) a picture: a bar above it has Copy, Cut, Duplicate, Delete, Resize, Deselect; no iOS callout.
6. The Notes/Summary/Review tabs have no hint line under them; no section chips above the page; on a lesson page the study status is one closed row in Review ("Study status: Learning · 3 due · 72%") that opens the full panel.
7. Write on a picture, then resize the picture with its corner handles: the writing stays on the same spot. Pull the page past its top or bottom: it no longer bounces and the writing never lands over the tool bar.
8. Paper page, pinch out: the page shrinks a little with resistance and springs back to fit on release; pinch in stays where you let go.
9. Paste a long list into a paper box: no line sits in the gap between two sheets; the lines continue at the top of the next sheet.
10. Drag one box onto another: it settles under the box it would have covered, never on top.

## Database pages (9 Nov)

1. iPad, new page in a notebook: the last row of the template list says "Database page". Tap it: a full-width table appears with "+ New row"; add two rows. Switch to List with the buttons above the table; scroll is smooth.
2. In the table, choose Group by > a choice column: groups appear; tap a group heading to fold it.
3. Open Search, type a word from a row's text cell or tag: the row is found.
4. Formula column > Advanced > "Columns and functions": tapping a column or function adds it to the formula.

## C2b: ink on PDF and EPUB pages (9 Nov)

1. iPad, open a real PDF, tap Pen, write with the Pencil on page 2, then pinch or use + / - : the writing stays on the same words of page 2 and gets bigger or smaller with the page. Reload: it is still there. Scrolling with a finger still works while writing with the Pencil (Pencil mode).
2. Tap Done: you can select text again (highlight pop-up works), and the writing is still shown.
3. Open an EPUB in Scroll mode, tap Pen, underline a sentence, then make the text bigger (A+): the underline stays with its paragraph. In Pages mode the Pen button says drawing works in Scroll mode.
4. Eraser, Lasso (move/delete a drawing) and Undo/Redo work on the book pages.

## Ink rule 6 across boxes (9 Nov)

1. iPad, Lasso with Text on: write over a line, loop the line and its ink, drag them onto another box: the line and the ink arrive together and the ink still sits on the same words.
2. Same, but drop on bare paper: a new box appears holding the line, the ink on it.
3. Undo: the first Undo works in the box you dropped into, a second in the box you left (two steps, by design).

## Alerts banner (8 Nov, fix #6)

1. iPad, Sync on: nothing shows at the top when all is well. If Drive needs a tap, ONE blue bar says so with Reconnect Drive; tap it and the bar goes, "Drive reconnected" appears.
2. A new version waiting (Automatic updates off): a calm grey bar with Update; × hides it for a week. It never shows two bars at once and never while you are typing.
3. × on a blue bar hides it until you reopen the app.

## Insert > Picture chooser (8 Nov, fix #5)

1. iPad: Insert > Picture (or short bar Picture, or "/image") opens a small Add a picture sheet. Photos offers Photo Library, Take Photo, Choose File; Files, Camera and Paste are there too. Choose one: the picture lands in the page. No empty picture block appears.
2. Close the sheet (Cancel, tap outside): nothing is added.
3. Copy a picture (Photos > Copy), Insert > Picture > Paste: iPad asks to allow Paste, then the picture lands. If it does not, the hint says Press and hold > Paste.

## Drive pass renews itself (8 Nov, fix #4)

1. PC and iPad, Sync on: add a picture, wait 2 minutes; it appears on the other device without Reconnect Drive or Sync now.
2. Leave the app open, or closed and reopened, for over an hour, then add a picture: it still syncs. If Google needs a tap, a bar at the top says so with one Reconnect Drive button; after the tap the waiting pictures go out by themselves. Tell me if the bar shows often (that means Safari blocks the quiet renewal).

## Wrong passphrase or code (8 Nov, fix #3)

1. A second device, Settings > Sync, type a wrong passphrase, press Unlock: a red line with an icon says it does not match; your text stays selected; the eye shows it; turn Caps Lock on and a hint appears.
2. Two more wrong tries: "Too many tries. Try again in 0:59" counts down and the box is off. "Use your recovery code instead" still opens a working code box. A code with too few letters says how many you typed and does not count.
3. After the wait, the right passphrase unlocks. On an iPhone, right after Unlock you see "Checking your passphrase..." with a spinner (never red), then "Bringing your notebooks to this device" and "All set".
4. Same checks in the first-run sign-in guide and in Make a new recovery code.

## Two devices, same line (8 Nov, fix #2)

1. PC and iPad, Sync on, the same page open. Press a different key on each at the same moment, in the same line. Within a few seconds after you stop, both show the same line, with no refresh.
2. Both show a small bar "Changed on two devices" with the other version. Page History on BOTH devices lists the other version.
3. Tap Keep mine on one: the bar goes on both. Repeat and try Use other (then Undo) and Keep both (the other text appears as a line just below, on both).

## Sign in first and new recovery code (8 Nov)

0. Supabase › SQL Editor: run `supabase/migrations/20261108000001_sync_bundle_delete.sql` once (lets the app remove an OLD recovery-code copy; recovery copies only).
1. Fresh browser or Private window: the first screen shows "Sign in with Google" and "Use without an account". Pick the second with the network off: the welcome goes on, no error.
2. Fresh window, Sign in with Google (real account): after Google returns, full-screen steps (passphrase, then the code BIG). Check Print, Copy and Save as file (.txt) look right and the last-four check works. Needs human eyes: look, feel, printing.
3. A second device, Sign in with Google: "Welcome back", unlock with the passphrase, then with the code.
4. Settings › Sync › Make a new recovery code: wrong passphrase is refused; right one shows a new code. Then on another device the OLD code no longer unlocks and the NEW one does.

## Notebooks locked pop-up (8 Nov)

1. iPad: on a device signed in to Sync without the passphrase, open the app: one pop-up "Your notebooks are locked" appears (not while typing). Later leaves a red banner at the top with Unlock; Enter passphrase opens Settings › Sync with the box; after unlocking, banner and pop-up are gone and the notebooks appear. Quit and reopen while locked: the banner shows, no second pop-up. Needs eyes: banner height under the iPad clock.

## Template chooser at start (8 Nov)

1. Make a new page: the list shows Blank page first, then Study and the others. Tap Blank: the list closes. Tap a template: the page fills.
2. Make a new notebook: its first page shows the same list.
3. Tap "Don't show this again": the list goes and new pages open blank. Settings › General › "Template list on new pages" turns it back on.

## Allow AI while locked (8 Nov, R8-6)

1. iPad: lock a page, then try Lasso › Convert to text and a Write pad AI Read on it: a plain message says the page is locked and AI is not called.
2. Settings › Permissions: turn on Allow AI for a notebook; "Allow AI while locked" appears under it (off). Turn it on: the same actions now work on the locked page.

## Top gap for the pill and Pencil offer (8 Nov, R8-1/R8-2)

1. iPad, Pen tool: the pill sits in the gap under the main bar and the page does not move when it opens or closes; scroll down and open it: it floats. Needs eyes: the gap's size and feel.
2. Reading mode: the title is not covered.
3. iPad, Text tool, page scrolled down: the floating pill is tapped with the Pencil and no text is written under it (Scribble).
4. Fresh iPad with Auto switch off, first Pencil touch: the card appears once; Yes switches to Pencil mode; never asked again.

## Paper style, size and sheet thumbnails (8 Nov, Polish 2 item 9)

1. Page ⋯ › Paper style › Grid, then ⋯ › Paper size › Letter: the sheet changes at once. Needs eyes: the look of the lines at both sizes.
2. New page: the Paper style row sits above the template list and feels reachable with the Pencil.
3. Long page (2+ sheets), left panel › Pages: small sheet thumbnails under the open page; tap sheet 2 and the page scrolls to it.

## Paper hint and + box (8 Nov, Polish 2 item 8)

1. New page: the faint hint is on the sheet; type a word and it goes. With the Pencil hovering (iPad Pro M2 or later) or a mouse over empty paper (Text tool), a small "+ box" tag follows; tap: a box appears. Needs human eyes: how faint and how helpful it feels.

## Paper layout PDF (8 Nov)

1. On the iPad, draw on a paper page with two boxes, then page ⋯ › Export › Paper layout (PDF) › Print or save as PDF. Look at the preview: sheets look like the screen, boxes where they are, ink over its lines. Needs your eyes: the print preview cannot be tested.

## Paper on phones (8 Nov)

1. On the iPhone: open a paper page, tap "Add a box here" under the last box: a box appears at the end with the keyboard. With the Text tool, tap the empty space between two boxes: the new box sits between them. Needs a real phone for the feel of the tap zones.

## Paper speed (8 Nov)

1. Open your biggest paper page on the iPad (many boxes and ink) and scroll up and down: no stutter, boxes far down show faint grey lines for a moment and then their text. Needs hands on the real iPad for the feel.

## Paper ink rules 5, 6, 9 (8 Nov)

1. Lasso some ink and drag it off its box onto bare paper: a new box with empty lines appears there holding the ink.
2. Turn on the Lasso's Text filter, loop a line with ink on it, drag it two lines down: the line and its ink move together; one Undo puts both back.
3. Select a whole line that has ink, copy, make a new line, paste: the copy brings the ink. Cut and paste moves it.

## Automatic updates (8 Nov)

1. After the next deploy, keep the app open on the iPad and write something. Within a few seconds of stopping (or of coming back to the app) it restarts by itself on the same page and scroll with "Updated to the latest version". It never restarts while the Pencil is on the glass or while you type.
2. Settings › General › Update automatically: Off. After the next deploy you get the "A new version is ready. Update" bar instead.
3. Fill the iPad's storage nearly full (or ask me to): the update shows "this device is low on space" with Update anyway / Not now, and never restarts by itself.

## Polish pass 2 (8 Nov)

1. Clear the site data on the iPad, open the app: a Welcome sheet asks how you write. Choose Apple Pencil, Next, pick a language and theme, Next, Start with the Start here notebook. The bar is in Pencil mode and the notebook opens at "1. Write on paper". Do each "Try it" line (needs the Pencil).
2. Pick the Lasso for the first time: a one-line tip shows once; pick it again: no tip. Same for the Write pad, the Layers row and the first tap on empty paper that makes a box.
3. Pen, Eraser, then the ⇄ Last tool button (pinned in Pencil mode): you are on the Pen with the same colour. Eraser card › "Go back to the previous tool after one erase": erase once and you are back on the Pen.
4. Save a red fine pen with the ★ in the Pen pill, switch to blue, tap the red favourite: red fine again. Press and hold a favourite: it goes, with Undo.
5. Lasso card › Arrange the menu…: move Convert to text first, Done: the Lasso menu starts with it, also after a reload.
6. Split View so the window is narrow, open the Pen pill: a fade, arrow and handle appear and the handle slides the pill.
7. Insert › Handwriting: three clear choices that open the Write pad, the Lasso, and Text with Scribble.
8. With cards due, Home › Today shows "N due · Start"; one tap starts the review.
9. Loop a handwritten formula, ⋯ More › Make card, type the question: a card appears at the end of the page with your drawing as its answer; review it.
10. New notebook with no pages, search for nonsense, and an empty review: each shows one line and one button.

## Phase Q paper page, steps 4–6 (8 Nov)

1. A new page opens with the keyboard ready in the top box; tapping the title edits the title.
2. Write with the Pencil over a line in a box, then add lines above it: the ink moves with its line. Delete a line that has ink: the ink stays, with the next line.
3. Draw a big picture over several lines: it moves as one piece with its top line.
4. Write with the Pencil on empty paper beside or below the text: a box with lines appears under the writing and the stroke stays.
5. Lasso some ink: a faint dashed line points to its text line. Drag it to another line: it now moves with that line.
6. Lasso on empty paper around two boxes: both get an outline; drag one by its grip and both move with their ink.
7. On the iPhone (or a narrow window): the boxes are stacked under the text, full width, in reading order; no sideways scroll.

## Phase Q paper page, steps 1–3 (8 Nov)

1. Open an old page. It shows on an A4 sheet, with the text exactly where it was before and nothing missing. Turn on lined, grid or dots in the Pen pill: the sheet shows the lines.
2. Pinch with two fingers: the paper zooms (50–400 %) and pans sideways. The Pencil must never zoom, and the page must not zoom as a whole (Safari's own zoom). The % button goes back to fit width.
3. With the Text tool, tap empty paper below the text: a box appears with the keyboard ready. Type, then press Enter a few times: the box grows. Drag its ⠿ grip to move it and its side edge to make it wider. Use ⋯ › Lock in place, Duplicate box, Colour and Delete box (then Undo).
4. Type in a box with Scribble (Pencil handwriting): the text lands in that box. The toolbar's bold and lists act on the box that has the cursor.
5. Zoomed to 200 %, type in a box: the caret and the selection handles sit on the text.

## Round 7 gesture watchdog: R7-1, R7-3, R7-4, R7-5, R7-6, R7-8 (8 Nov)

1. Pen on: draw a line, then switch to another app (or a Safari tab) and come back. Draw again, erase it with the Eraser, loop it with the Lasso (freeform and rectangle). All three must work without restarting the app. Why human: the real background switch (iPadOS drops the pen's lift) cannot be simulated.
2. Same again, but switch away while the Pencil is still touching the page (mid-stroke), and once while dragging a Lasso selection by a handle. Come back: everything still works; the half stroke is either kept (if it was real writing) or gone, never a dead pad.
3. Text tool, Pencil: double-tap a word, then wait 10 s doing nothing. It must stay selected (and triple = line, four = paragraph the same). Then do this once after a tab switch. If a selection still vanishes: Settings › Advanced › Tool state › Copy tool state right after it happened and paste the text into the chat (it shows which flag was stuck; nothing leaves the device otherwise).
4. Update: when the "Update available" bar shows, press Update with the PWA and a Safari tab both open. Each should restart by itself within about 20 s (the Safari tab too, once you look at it), and the Pen must work in both without closing the app.
5. R6-21: Pen pill open, Layers, lock a layer, draw on it: the "locked" toast shows. Tap **Unlock** in the toast. The pill must stay open and the page must not jump (before, it moved up by the pill's height). Same for a toast's Undo.

## Write pad round 7: R7-15..R7-26 (8 Nov)

1. AI mode, Pen: write a word. Tap the pad's Eraser button (next to ␣ ↵ ⌫): the main bar Eraser lights too. Rub through one letter: only that part goes (Precise, thin). Try Whole stroke. Nothing appears on the page above the pad. Undo brings the part back. Why human: real Pencil erasing feel.
2. With the main bar Lasso chosen, draw a loop in the pad: no mark is left in the pad or on the page. Opening the AI canvas while the Lasso was chosen switches to the Pen by itself.
3. Look at the pad at the narrowest iPad window (Split View): colour, highlight, size, font, weight and "Show my writing on the page as I write" wrap and never overlap. With the keyboard and the floating dock/shortcut bar up, the last row is not covered (scroll the pad if needed).
4. Write in Scribble, tap Insert, then ↶: the text leaves the page and is back in the pad; ↷ puts it on the page again. Switch to AI and ↶: back in Scribble. AI Read, then ↶: the words go and your strokes return. Clear (new button) then ↶: the text returns.
5. First switch Scribble to AI shows the explainer; "Don't show again" stops it.
6. Write in the pad: the dashed draft shows on the page at the cursor (or at the end of the page if you never tapped it) and is not hidden under the pad. Edit the pad text: the draft follows. Done, Insert, or the X make it final; ↶ is one step.

## Round 7 batch: updates, toolbar sheet, search, scroll handle (8 Nov)

1. Update the app twice in a row (open the live site after each release). No backup question appears; your pages and your bar are as you left them. (Why human: real browser storage over real releases.)
2. ⋯ › Edit toolbar…: add Write pad with + , drag it to the front with the Pencil, press Done. It stays first after closing and reopening the app, and after an update. Cancel throws a change away.
3. Pin a tool from Search › Features: it lands first on the bar. Use ↑ ↓ in ⋯ › Bar settings… and drag in the sheet.
4. Open Search with nothing typed: Recent, Favourites and Recommended come first; one tap runs a tool.
5. On a narrow window or the iPad with the sidebar open: the bar shows a chevron with a count and a thin handle under it. Drag the handle with the Pencil: the bar slides and no tool is chosen.
6. Select a word at the far right or bottom of the page: the mini bar stays inside the page, also when dragged to the corners.
7. Second device (after SYNC SETUP): change the bar on one, it appears on the other.

## Pencil taps and Lasso words: R6-17..R6-20 (7 Nov)

1. Text tool, Pencil: double-tap a word in a paragraph. The word stays selected (no flicker, no jump to a caret) and the mini toolbar shows; it stays until you tap elsewhere or press a key. Why human: the real iPad's own double-tap and late click cannot be simulated.
2. Triple-tap a word deep inside a long wrapped paragraph: only that screen row is selected (not the paragraph). Four taps: the paragraph. Does the 450 ms pace feel natural? Too slow a second tap places the caret instead.
3. Settings › Advanced › "Pencil: tap twice" on: tap a block (outline), pause, tap again: the caret lands. A quick tap-tap now selects the word instead; say if that gets in the way.
4. Lasso, T filter on, Ink off: loop a few words inside a paragraph, freeform and rectangle: just those words are selected and the text menu shows. Loop a whole short line: the line is selected as a block, as before.

## Write pad: no lost text, live writing (7 Nov)

1. Write a few words in the pad, switch **Read with** to AI and back: the words stay (in AI they sit above the canvas). Write on the AI canvas without tapping Read, then switch back: it asks Keep writing / Discard.
2. Type or Scribble in the pad: the words appear faintly with a dashed underline at your cursor on the page, as you write. Do they sit where you expect, and is the ghost readable on the iPad? Why human: look and Scribble timing.
3. Tick **Insert automatically when I pause (2 s)**: pause 2 seconds and the words land on the page; one Undo removes them.
4. Close the pad with text in it and open it again (or leave the page and return): the text is back.

## Phase P part 2: Ask this book, Story so far, Permissions (7 Nov)

1. Settings › AI on, your Claude key saved. Settings › **Permissions**: switch on **Books**; the model list and "spend per key" show.
2. Open a PDF book, tap **✦ Ask AI**. Pick a chapter or "Pages I choose", type a question, tap **Show what will be sent**: it lists the words, the pages, `api.anthropic.com` and a cost. Tap **See the exact text**, then **Send**: the answer types itself in; tap a **p. N** link and the reader jumps there. Try **Stop** on a long question.
3. **Save to Summary** puts the answer under the book's Summary (Undo in the toast). **Make cards** shows the tick list.
4. Read to the middle of an EPUB, **Story so far** › Show what will be sent: nothing after where you are is in the text.
5. Settings › Permissions › **Everything AI sent this month**: one row per request (date, notebook, feature, host, cost) and none of your words.

## SYNC REALTIME SETUP — DONE 8 Nov 2026 (SQL run)

Real-time sync needs one small table and a publication on the server. Until this is done the app still syncs by polling every 10 s (Settings › Sync says "Live updates are off right now").

1. Open **supabase.com › your project › SQL Editor › New query**.
2. Paste the whole file `supabase/migrations/20261107000001_sync_realtime.sql` and press **Run**. It is safe to run twice. It makes the `sync_pings` table, teaches `sync_push` to touch it, and adds it to the `supabase_realtime` publication.
3. Check: **Database › Publications › supabase_realtime** lists `sync_pings`. If it does not, run only: `alter publication supabase_realtime add table public.sync_pings;`
4. (PASSED by owner 8 Nov) On the iPad and the PC, open the app, tap **Update** if offered, then **Settings › Sync**: the line under "Last synced" should read **"Live: changes from your other devices arrive within a second."**
5. (PASSED by owner 8 Nov) **Try it:** open the same page on both, type on the PC: the text should appear on the iPad within about 2 seconds without touching anything, and the iPad's caret should stay where it was. Then the other way round. Why human: the real websocket, the real iPad and Safari.
6. **Typing at the same time:** both type in the _same_ line for a few seconds. Each keeps what it typed; the other text is in that page's History and Settings › Sync shows "changed on two devices". Why human: two real devices.
7. **Background:** put the iPad app in the background, type on the PC, bring the iPad back: the text arrives within a few seconds (the socket reconnects). Why human: iPadOS suspends the app.

## SLOW MOMENTS (iPad, when it lags or freezes again)

- Settings › Advanced › **Record slow moments: On**. Use the app as usual for a day. When it has stalled a few times, Settings › Advanced › **Copy report**, paste it into a note or a message to the builder. The report has only times, how long, which screen and tool, and memory; no text of yours. Why human: real freezes happen only on the real iPad.
- Tell the builder what you were doing at the times listed (writing with the Pencil, scrolling a long page, syncing, opening a PDF).

## AI KEYS ON ALL DEVICES (PC and iPad, after Sync is set up)

- Settings › AI › turn on **Keep my AI keys on all my devices**. On the other device, after a sync, are the same named keys listed (masked)? Run Summarise there: does it work without pasting the key again? Why human: real keys and real devices.
- Turn the switch **off** on the iPad: does the PC's switch go off by itself after a sync, and do both devices still keep their keys? Why human: real two-device timing.
- **Backup:** Save everything on a device that has the switch on, open the zip on the PC and search for your key: it must not be there (there is no `secrets` file in the zip). Why human: your real key.

## ROUND 6 FIXES CHECKS (iPad, installed app; tap Update until the new version shows)

- **Write pad above the iPadOS bar:** open the pad with the keyboard up and the Writing Tools bar showing. Are ␣ ↵ ⌫ Replace Insert at the top of the pad and fully reachable? Why human: only a real iPad draws that bar.
- **Pad Undo:** write a few words with the Pencil, press the main bar ↶: do the words go away step by step, and ↷ bring them back? After Insert, does ↶ remove the text from the page?
- **Enter marks:** press ↵ in the pad and write on: do you see a faint ↵ at the end of each line, and does ⌫ remove it? Does pressing ↵ pop the keyboard up (we focus the box)?
- **Notebook reopen:** open a deep page in a notebook, go to another notebook, tap the first one: does it return to the same page with the sidebar unfolded to it? Settings › General › Open notebooks at: try First page and Notebook tabs.
- **Updates:** after a new version is published, keep the app open and type or move between pages: does "Update available" show within about 5 to 10 minutes without a restart, and never reload while you write?

## ROUND 6 BAR FIXES CHECKS (iPad with Pencil, installed app, tap Update until the new version shows)

- **Drag a bar with the Pencil** (mini keyboard strip, mini bar, a pill, the floating bar): hold the grip and move across the page. Is there no ink line, no caret and no keyboard during the drag, and does typing work again after? Why human: real Pencil.
- **Rectangle Lasso:** Lasso › Rectangle. Drag diagonally over ink. Does a tinted box follow your Pencil, and does lifting select what is inside? Why human: touch and look.
- **No callout:** long-press the toolbar, a pill, a menu and the ink layer. Does the Cut / Copy / Paste bubble stay away? Select words with a finger: iPadOS may still show its own bubble next to ours (a known limit). Why human: iPadOS decides.
- **Deselect:** make a Lasso selection and tap ⓧ with the Pencil. Then select words in the Text tool and tap empty paper with the Pencil. Does each clear? Why human: Pencil.
- **Page stays still:** scroll a long page, then tap Text, Lasso, Pen, Highlighter, Eraser. Does the page ever jump or scroll? The tool pill now floats over the first lines: is that acceptable, or should it push the page like before? Why human: feel.
- **Finger for bars, Pencil for the page:** tap bars with the Pencil and with a finger; rest your palm while writing. Is a palm ignored on the bars? Settings › Tool bar › Toolbar: finger only: with it on, do Pencil taps on the bars do nothing while a finger works? Why human: real palm.

## AI MODEL PICKER CHECKS (PC and iPad)

- **Keys:** Settings › AI › add "Claude main" and "Gemini free" with your real keys. Are they masked? Press Test on each: does it say the key works? Rename one, Replace one, Delete one (does it ask first?). Why human: real keys.
- **Models:** drag a card with your finger and with the Pencil on the iPad, and use Move up / down with a keyboard. Does the first card with a key say Default? Opus 5.5, Gemini 3.1 Flash-Lite and 3.6 Flash ids were not called live: use each once. Do the prices and notes look right?
- **Fallback:** put Gemini free first, then paste a wrong Gemini key: does the next model answer? Why human: real failure.
- **Per notebook:** Study → Gemini free, Private → Claude. Run Summarise in each: does console.anthropic.com / AI Studio show the call on the right account? Does the per-key spend list match?

## PHASE P CHECKS (AI with your own Claude key; iPad with Pencil and the PC, installed app, tap Update until the new version shows)

- **Paste your own Claude key:** Settings › AI › turn AI on, Provider Anthropic, paste your key from console.anthropic.com, Save. Is it shown masked (sk-…last four)? Model should say claude-haiku-5-5 and the cap $5. Turn on Allow AI for one notebook only. Why human: your real key and account; never paste it anywhere else.
- **Convert to text:** in that notebook, write a line in English and a line in Hindi with the Pencil, Lasso it, ⋯ / row › Convert to text. Does the sheet show exactly your ink and say only it is sent? Send. Is the text right in both scripts? Try Insert below, then Undo; then Replace the ink, then Undo (does the ink come back?); then Copy. Why human: real handwriting and Hindi quality.
- **Maths to formula:** write a fraction or E = mc² and use Maths to formula. Does a Formula block appear with the right LaTeX? Why human: real handwriting.
- **Write pad AI:** Insert › Write pad › Read with: AI. Write two words lightly and one word pressing hard, tap Read. Is the firm word bolder (Kalam shows Light/Normal/Bold; Caveat only Normal/Bold)? Insert: does the page match the preview? Why human: real Pencil pressure.
- **Notebook without AI:** in another notebook try Convert to text. Does it say AI is off for this notebook and send nothing? Why human: final check of the permission.
- **Cost:** after a few tries, Settings › AI shows this month's estimate. Compare with console.anthropic.com › Usage: is ours equal or higher? Set the cap to $0.01 and try again: is it blocked? Why human: your real bill.
- **Backup:** Save everything, then open the zip on the PC and search for your key: it must not be there. Why human: your real key.

## WRITE PAD CHECKS (real iPad with Pencil, Safari and the installed app, tap Update until the new version shows)

- **Scribble in the pad** (Insert › Write pad): write a few words with the Pencil in the big box. Does Scribble convert them? Try pad heights from small to tall and every zoom (A+). Does writing still work after zooming? Why human: Scribble cannot be tested by a computer; a zoom may break its hit-testing.
- **Palm and page gestures:** rest your palm and use the Pencil in the pad. Does the page behind react (cursor moves, selection changes, ink)? Does the on-screen keyboard pop up when you start writing? Why human: real palm and keyboard behaviour.
- **Selection kept:** select two words on the page, open the pad, write one word, tap Replace. Is it swapped for the selected words, and does one Undo bring them back? Do the same with only a cursor and Insert. Why human: focus moving to the box may lose the page selection on a real iPad.
- **Scribble switched off** (Settings › Apple Pencil): does the box still take typing, and is the hint line shown? Why human: iPad setting.
- **Hindi:** switch the iPad keyboard to Hindi: does Scribble refuse or guess Latin? Does Kalam show Hindi letters and joined letters (conjuncts) correctly in the page? Why human: Scribble has no known Hindi; real fonts on Safari.
- **Look:** pick colour, highlight, size, Kalam, Light and Bold, then Insert. Does the page text match the preview line, and does it look like handwriting? Is Light too thin to read? Why human: judging looks.
- **Offline and speed:** in aeroplane mode, open the pad and insert Caveat and Kalam text. Do the fonts still show? How fast does the pad open on slow data the first time? Why human: real offline cache.
- **Pad size:** drag the top edge with the Pencil and a finger. Is the grip easy to grab? Is too much of the page hidden? Why human: feel and layout.

## PENCIL FIXES (7 Nov: Lasso, taps, ruler, magnifier; iPad, installed app, tap Update until the new version shows)

- **Lasso over words:** Pen, write over a typed line, then Lasso: draw a loop around the ink, slowly. While the loop is drawn, does the text underneath stay quiet (no blue highlight, no outline, no scroll)? After lifting, is the ink selected with its box and menu? Why human: iPadOS Scribble and the stylus touch only exist on the real iPad.
- **Lasso over an empty line and blank paper:** write ink on an empty line and below the last line; loop around each. Does the loop start and select every time? Why human: the system touch-steal happens only on the device.
- **Handles:** with ink selected, drag the round handle to turn it and a corner to resize it; then a side handle on a wide selection. Does the ink turn or resize and the text behind it never get selected? Put two fingers on the selection and twist: does it turn? Why human: Pencil and two-finger gestures.
- **Taps are not ink:** with the Pen, tap quickly on the paper a few times, double-tap, then press for a moment to make a dot. Is nothing drawn by the quick taps and the double tap, and is the deliberate dot there? Does the dot of an "i" still appear when you write normally? If quick i-dots go missing, say so: the numbers in src/ink/tapFilter.ts are tunable (TAP_MS 90, TAP_PX 3). Why human: real Pencil timing.
- **Typing mode taps:** Text tool: double-tap a word with the Pencil, then triple-tap: is the word, then the line, selected with the mini toolbar, and does the Text tool stay? With "tap twice" on, does a slow second tap still place the caret? Why human: Pencil timing and Scribble.
- **Lasso filters:** in the Lasso bar turn T on, loop around two typed lines: are both lines selected with the text menu? Turn Ink and T on, loop around ink and a line: does the mixed menu appear, and does dragging move the ink only (the note under the menu)? Why human: feel of the filters.
- **Lasso menu:** with ink selected: Copy, then ⋯ › Paste: does a copy land a little to the right and down? Cut, Thickness, Convert to text (should say it needs AI), and in the Lasso card "Actions in the menu row": move Delete into the row. Why human: layout of the row on the iPad.
- **Ruler:** Insert › Ruler. Drag the bar with a finger and with the Pencil: does it move at once with no text selected behind it? Two fingers on it: does it turn, clicking at 15-degree steps with the angle shown? Why human: two-finger gesture.
- **Magnifier:** Insert › Magnifier. Is the pad about a third of the screen, and does dragging its top edge resize it? Write in the pad: does the ink appear exactly under the pen tip (the old build drew it to the right)? Does it land in the labelled box on the page and move on when you write near the pad's right end? Erase on the page (Eraser): does the pad clear at once? Switch to the Eraser and rub in the pad: does the page clear? Why human: Pencil feel and the real screen size.
- **Finger under the Lasso:** with the Lasso on, tap a line with a finger: does the caret land there with the keyboard, and does a finger drag still scroll? Why human: touch and keyboard.

## PHASE O CHECKS (iPad or PC, installed app, tap Update until the new version shows)

- **Two windows** (O1): open the same page in two browser windows. In the one that says it is open elsewhere, watch while you type in the other: does the text appear within a second or two without pressing anything? Why human: real two-window timing.
- **Reading goal** (O2): Read a page, Aa, More: pick 5 min. Read for a minute: does "Today: 1 of 5 min" update next time you open the sheet, and do Spanish and Hindi look right? Why human: wording and feel.

## NAME IT SHEET CHECKS (iPad with Pencil Pro, installed app, tap Update until the new version shows)

- **Rename with Scribble** (sidebar): tap + for a new notebook, then write its name with the Pencil in the big box and tap Done. Do the same for a new page, and for Rename from a row's ⋯. Does Scribble convert your handwriting? Does Done/Enter work? Why human: Scribble and the Pencil cannot be tested by a computer.
- **Palm resting** (sidebar): rest your palm on the screen while writing the name and while using the Pencil near the sidebar. Does nothing get added, renamed or deleted by the palm? Why human: real palm contact.
- **⋯ rows** (sidebar): each notebook and page row shows only ⋯ (easy to tap with a finger); its menu has Add page, Rename, Lock, Favourite, Move up/down, Delete. Is anything missing or too crowded? Why human: feel and layout.

## PHASE K CHECKS (debt, first load, languages, accessibility; iPad, installed app, tap Update until the new version shows)

- **Three-day trial** (K2): use the app for three days with one tester for real study (notes, cards, reading, Home). Write down anything slow, confusing or lost. Why human: the plan's trial; only real use shows it.
- **Slash menu inserts** (K1): in a page type / then Table, Picture, Callout, Divider, Mind map and Card. Does each appear at once (the very first one after opening the app may take a blink)? Why human: the insert now loads a small part on demand.
- **Undo and Redo, selection handles** (K1): type, tap Undo and Redo in the bar right after opening a page; select text and drag the two handles of the mini toolbar. Why human: these now load a small part in the background.
- **Sign-in account chooser** (sync): Settings › Sync › Sign in. Does Google always show Choose an account, even with one account signed in on the iPad? Why human: needs the real Google account.
- **VoiceOver on icon buttons** (K2): with VoiceOver on, swipe through the bars, reader and Home: does every icon button read a name (and the shortcut or "coming soon" hint after a pause)? Why human: needs a real screen reader.
- **Spanish and Hindi** (K2): switch language, look at the bars, Settings, Home and Review for odd or cut-off words. Why human: native-speaker review.

## PHASE N CHECKS (maths, new-page start, Calendar Day; iPad, installed app, tap Update until the new version shows)

- **Formula with the on-screen keyboard** (N1): in a page type / then Formula. Tap the empty formula; the editor opens with the keyboard up. Tap the fraction button, type the top part, then try Greek, Symbols and Statistics buttons: does the keyboard stay up, and does the cursor land where you expect? Done: is the formula crisp and the right size? Why human: iPad keyboard focus and touch feel.
- **Formula with Pencil and finger** (N1): tap the formula with a finger and with the Pencil (also while the Pen tool is on). Does the editor open, and does Esc/Cancel via the Cancel button leave the old formula? Does a long formula scroll sideways instead of spilling out? Why human: pen and touch rules.
- **Formula offline** (N1): add a formula, turn on aeroplane mode, reload the installed app, open the page: is the formula still drawn (fonts kept offline)? Why human: needs the real offline cache.
- **New page start** (N2): add a page to a notebook. Under the cursor is a short list with Study (Recommended) first. Tap it: are the Study headings filled in at once? Make another page and just type: does the list vanish by itself? Tick Always start new pages as Study, add a page: is it filled? Untick it in Settings › General. Why human: judging whether the list is helpful and not in the way.
- **Calendar Day** (N3): Calendar › Day. Swipe the card left and right with a finger: does it change day only on a deliberate swipe, and does scrolling up and down still work? Are Day, Week and Month easy to tap? Why human: real swipe feel.

## PHASE M CHECKS (Summary · Notes · Review, iPad, installed app, tap Update until the new version shows)

- **Add to Summary with a finger** (M2): open a page with a few lines of notes, long-press to select a line, and use the short bar's pop-up (the Summary icon, tooltip "Add to Summary") or Insert › Summary in the ribbon. Does the toast appear, and is the icon easy to find and tap (44 px)? Why human: the iPad selection pop-up and touch size.
- **The three views** (M2): under the page title tap Notes, Summary, Review. Is the switch quick, does the keyboard go away sensibly, and is nothing lost when you come back to Notes? Edit the note, then look at the Summary: does the line change too? Why human: feel, and the on-screen keyboard.
- **Notebook and app level** (M2): open a notebook, tap the Summary tab (it sits after Notes; older notebooks get it the first time they open). Then sidebar › All summaries: filter by notebook, tap a page name and the ↗ button on a line (does it open the page and flash the line?). Why human: layout on the iPad at both orientations, and Night and Sepia themes.
- **Save to Summary from a book** (C4 + M2): in a PDF select a passage, Save to… › Summary of this page. Open the book's page Summary: is the line there, and does its page link open the reader at the spot? Why human: real book and reader.

## POLISH 1 CHECKS (item 15)

- **Menus look the same** (item 15): open the ⋯ menu on a book (Library), a task (Home), a page (sidebar, press and hold) and a Search filter. They look and behave the same, with Delete in red at the bottom. Why human: the look and feel of the menus.

## POLISH 1 CHECKS (item 14)

- **Hindi** (item 14): switch the app to Hindi and open Home and Library. No English is left (the owner or the Hindi reviewer may also read the new `hiW5p.ts` lines). Why human: a native speaker judges the wording.

## POLISH 1 CHECKS (item 13)

- **VoiceOver on Home** (item 13, optional): turn VoiceOver on, open Home, tap one task and start the timer. Names are read, and "Timer started" is spoken. Why human: only a real screen reader proves it.

## POLISH 1 CHECKS (item 12)

- **Sync status** (item 12): after SYNC SETUP, switch Wi-Fi off and on on the iPad. The dot in Settings › Sync and in the quiet corner follows: Synced, Offline, Synced. Why human: needs the real accounts and Wi-Fi.

## POLISH 1 CHECKS (item 11)

- **Offline blocks** (item 11): in airplane mode open a page with a YouTube block and a PDF file block (and, if you can, a page restored with Notes only). The video says it needs a connection and lets you copy the link; a missing file says it is not on this device. Why human: real airplane mode on the iPad.

## POLISH 1 CHECKS (item 10)

- **Memory page examples** (item 10): make a PAO page from the template. Is it clear what to type, and is the grey example easy to delete? Why human: wording and feel for a beginner.

## POLISH 1 CHECKS (item 9)

- **Pencil on the picture editor and mind map** (item 9): with the Pencil, crop a picture and rearrange a mind map while your palm rests on the screen. The palm does nothing, a Pencil tap on a branch only selects it, and a double-tap types. Why human: Pencil and palm behaviour on the real iPad.

## POLISH 1 CHECKS (item 8)

- **First-run screens** (item 8): on a new browser profile open Library, Home › Tasks, Home › Routines, Review (Decks) and a page's Audio list. Each tells you what to do first, with one button. Why human: the wording and the feel of a first visit.

## POLISH 1 CHECKS (item 7)

- **AI preview** (item 7): make a summary with your own key; check the preview, press Add to page, then Remove it with the chip, and make it again. Nothing is left behind. Why human: needs a real key and a real answer.

## POLISH 1 CHECKS (item 6)

- **Big PDF on the iPad** (item 6): import a 100 MB or larger PDF. Page 1 shows within a few seconds, the Contents appear after, and ink works on page 50. Why human: real iPad memory and speed.

## WAVE 5 PART B CHECKS (Phase I, iPad, installed app, tap Update until the new version shows)

- **Notebook views** (I1): open a notebook with a few pages, tap View ▾ › Shelf: do the cover and page tiles look like a shelf and are they easy to tap with a finger? View ▾ › Tabs: tap each coloured tab and the six colour dots (44 px targets?); does the tab row scroll sideways with a swipe when there are many pages? Default › Layout ▾: Gallery, Table and Board; swipe the Board sideways. Close and reopen the app: are the choices remembered? Why human: touch size, swipe feel and the look in Night and Sepia.
- **Layer gallery** (I2): Quiet corner (gear) › Layer gallery: add the Study kit and the Finance tracker; open the Finance Transactions table, add a row, then Remove the layer: is your row's notebook kept with a message naming it, and does everything you never touched go to the Trash? Notebook ⋯ › Share as layer file on the iPad: does the share or download sheet appear, and does the file add on the PC with Add a layer file…? Why human: the file hand-off between iPad and PC, and the wording in Hindi and Spanish (machine drafts).

## WAVE 5 PART A CHECKS (J1, C5, C2b, iPad, installed app, tap Update until the new version shows)

- **Export PDF** (J1): open a page with a heading, a list and a picture. Page ⋯ › Export › PDF › Print or save as PDF. Does the print window open from the installed app? Can you choose Save as PDF (Share › Save to Files) and open the file with readable text and the picture? Why human: the iPad print window cannot be driven by a test. If it does not open, tell the builder: the fallback is a built-in PDF writer (jspdf).
- **Export Word and the share sheet** (J1): Export › Word (.docx) › Share…, send it to Mail or Save to Files, open it in Pages or Word. Are headings, bullets, colours and the picture right? On a page with Pencil writing, is the handwriting picture at the end of the PDF and Word file? Why human: the share sheet and the look of the document in Pages.
- **Notebook with ink** (J1): notebook ⋯ › Share one notebook (Save & restore), then on the same iPad Add as copies. Is the Pencil writing on the copy too? Why human: real Pencil strokes.
- **Page Flip** (C5): in a long PDF tap Page Flip, drag the slider. Does the small page picture follow your finger smoothly, and does the book open at the place when you let go? Does Back to p. N return? Same in an EPUB (percentage only). Why human: touch feel.
- **Time left** (C5): read a few pages. Does the line under the top bar say about how long a chapter and the book take, and is it close to your real pace after a few minutes? Why human: only real reading shows if the numbers feel right.
- **Pinch zoom** (C2b): in a PDF spread two fingers on a page, then pinch back. Does it follow your fingers, stay where you pinched and not fight scrolling or text selection? Why human: only real fingers on glass.
- **Liquid mode and Find** (C5, C2b): in a text PDF tap Liquid. Is the text readable as plain paragraphs, and does Show original take you back to the same page? Tap Find, type a word, tap a result. Why human: judging whether the reflowed text is good enough.
- **Lock screen direction** (C5): Settings › Reading › Lock screen direction › Sideways, then open a book. The iPad is expected to refuse; do you see the message about the Control Centre rotation lock? Why human: depends on iPadOS.

## POLISH 1 CHECKS (item 4)

- **Toggles stay put** (item 4): tap Ruler, Magnifier and Reading mode twice each from the ribbon. You stay on the same tab every time. Why human: iPad feel.

## POLISH 1 CHECKS (item 3)

- **Reading mode toggle** (item 3): turn Reading mode on and off from the ribbon and from the short bar. No empty pill appears and the tab stays put (owner note 18). Why human: feel on the iPad.

## POLISH 1 CHECKS (item 2)

- **Row actions by touch** (item 2): rename a notebook and a task, and open the actions of a book card, with only a finger and the Pencil, no keyboard: press and hold the row, or tap the ⋯ on the card. Why human: the 500 ms hold and the Pencil feel.

## POLISH 1 CHECKS (item 1)

- **Tips by touch** (item 1): on the iPad press and hold the ⋯ on a task, the ✕ in a book, and a zoom button in the picture editor. A tip appears, fades by itself, and the action does not run. Why human: touch feel on real hardware.

## WAVE 4 PART B CHECKS (G2 and G3, iPad, installed app, tap Update until the new version shows)

- **Camera and file** (G2): Insert › Camera: does the iPad camera open, and does the photo land in the page as a picture? Insert › File: choose a real PDF from Files, then Open in reader. Does it open and does Back return to the page? Why human: the camera, the Files picker and the reader hand-off are iPad/Safari behaviour.
- **Table and Toggle list** (G2): Insert › Table, type in two cells with the keyboard and with Scribble; "/toggle" and tap the arrow to fold a line with a nested line under it. Is it comfortable with a finger? Why human: feel of cells and the fold arrow.
- **Replay** (G2): Insert › Audio, write three words with the Pencil while saying something different for each, Stop. Lasso the second word: Play the recording from here. Does the sound start about where you wrote it? Why human: needs a real microphone and Pencil timing.
- **Picture resize** (G3): tap a picture, drag each corner with the Pencil and then a finger. Does it follow smoothly, with no page scrolling or text selecting? Why human: touch and Pencil feel; handles must not fight Scribble or the page scroll.
- **Name a drawing** (G3): draw, Lasso it, the T button, name it, then Search (the magnifier) for a word of the name. Does the page appear? Why human: the typing and the Lasso menu on the iPad keyboard.

## SYNC SETUP (Phase L) — DONE 8 Nov 2026 (owner: PC and iPad sync work; Google app In production; privacy page added)

Sync is built but stays off until these steps are done. Nothing here costs money. Never paste a secret into a chat.

1. **Make the database tables.** Open [supabase.com](https://supabase.com) › your project › **SQL Editor** (left bar) › **New query**. Open the file [supabase/migrations/20261106000001_sync.sql](../../supabase/migrations/20261106000001_sync.sql) on GitHub, press **Raw**, select all, copy, paste it into the query box, press **Run**. You should see "Success. No rows returned". (Running it twice is safe.)
2. **Allow only your Gmail.** Still in Supabase: **Authentication › Hooks** (it may say "Auth Hooks") › **Add hook** › **Before User Created** › type **Postgres** › schema `public` › function `hook_only_owner` › **Create/Enable**. This refuses every other Google account before an account is even made.
3. **Tell Supabase where to come back to.** **Authentication › URL Configuration**: Site URL `https://learning-notes-app.pages.dev`; under **Redirect URLs** add `https://learning-notes-app.pages.dev/?sync=callback` (and, only if you test on the PC dev server, `https://localhost:5173/?sync=callback`). Save.
4. **Check Google sign-in is on.** **Authentication › Sign In / Providers › Google**: enabled, with your client id (the secret is already there; do not change it).
5. **Google Cloud Console** ([console.cloud.google.com](https://console.cloud.google.com)) › your project: **APIs & Services › Library › Google Drive API** › Enable (if it says Manage, it is on). Then **APIs & Services › Credentials** › your Web client › **Authorized JavaScript origins**: add `https://learning-notes-app.pages.dev` (needed for the hourly Drive renewal). Save. **OAuth consent screen / Audience**: Publishing status **In production** (Testing mode signs you out every 7 days).

## SYNC CHECKS (Phase L, after SYNC SETUP, installed app, tap Update until the new version shows)

- **PASSED by owner 8 Nov** - **PC first** (Chrome, the live site): Settings › Sync › Sign in with Google › choose your passphrase (a short sentence of 4+ words) › **print or write down the recovery code** and type its last four letters › "Last synced …" appears. In Google Drive a folder **Learning Notes (encrypted)** appears with a `ln-key-…` file (the spare key; it is locked). Why human: real Google and Supabase accounts.
- **PASSED by owner 8 Nov, with open issues (fixes queued): pictures needed a manual Reconnect Drive on both devices; simultaneous edits did not show live (needed a refresh); the other version appeared in History only on the iPad** - **iPad** (installed app): Settings › Sync › Sign in with Google: does Google's page open and come back to the app (not to Safari)? Type the passphrase: do the PC's notebooks appear next to the iPad's own (nothing of the iPad's may disappear)? Edit a line on the iPad, open the PC a minute later: is it there? Edit the same line on both while one is offline, then reconnect both: does the newer text win and is the other in Page ⋯ › History, with a "changed on two devices" note in Settings › Sync? Add a picture on the PC: does it show on the iPad after a short wait? Leave the iPad app for over an hour, come back and add a picture: if **Reconnect Drive** shows, does one tap fix it? Settings › Sync › Check this device: tell me the lock time (the target is under 2 seconds; if it is much slower I will lower the setting). Why human: real iPad sign-in, real network and the feel of the waits.
- **PASSED by owner 8 Nov** - **Recovery**: on a spare browser (or a private window on the PC), sign in and type the **printed code** instead of the passphrase: do the notes appear? Why human: proves the paper code works before you ever need it.

- (WAVE 4 PART A · D1 LEFT PANEL, SIDEBAR, LOCK SCREEN, iPad, installed app, tap Update until the new version shows) Open any page, tap the Panel button (first on the top bar): do Pages, Outline and Audio open beside the page, and does a tap on a heading glide to it? In the sidebar, press and hold a page, then drag it above, below or onto another page: does it move, and does Undo bring it back? Do long page names wrap to two lines? Lock a page with a PIN and a Face ID passkey (Settings › Lock): does the PIN box say "Type your PIN here" with a clear border, and do Cancel on the Face ID sheet and an iCloud Keychain that is off give different messages (the app writes the reason and how fast it failed to the console)? Why human: touch drag, Face ID and Keychain cannot be tested here.
- (WAVE 4 PART A · F HOME COCKPIT, iPad, installed app, tap Update until the new version shows) Home › Tasks: add a few tasks, then press and hold one title for half a second and drag it into a box; does the page still scroll with a normal swipe, and does the Pencil drag at once? Tick a task. Start the timer with a project, lock the iPad for a few minutes, come back: is the time right, and does the chip show on the other spaces? Try Focus (25/5): does the chime play when the stretch changes (sound on, app open)? Plan: drag a task onto an hour. Routines: add a habit, make an affirmation from a page and read it aloud (does the Now playing pill appear?), then record your own voice (allow the microphone once) and play it back. After 20:00 (or Start now): write one answer in the evening review and check today's journal page. Why human: touch, Pencil, sleep, sound and the microphone prompt.
- (WAVE 3A PUSH 2 · EPUB, AI NOTES, RECALL, BYO AI, iPad, installed app) Open a real EPUB: do pages turn smoothly in Pages mode, does A+ change the text, does a highlight stay after closing the app? In Gemini or Claude: Capture › Copy prompt with a YouTube link, paste the prompt, paste the answer back under Paste notes: does a page appear with key points, a mind map you can move, cards in Review and 📷 slots? Does Remove this AI result take it away and Undo bring it back? Highlight ten passages in a book, then Review › All cards: is Highlights for today useful and Make card quick? Does a card's From line bring you to the spot? Settings › AI: paste your own key (a key with a spend limit), allow the Books notebook, try Summarise and Cards from this page: is the approval list clear and is the estimated use plausible? Tell me the right cheap model names for your provider (the defaults are guesses). Why human: the real model answers, costs, EPUB look and feel.
- (WAVE 3 PART B · G0 PICTURE EDITOR, iPad, installed app, tap Update until the new version shows) Add a picture, tap it, then the toolbar's Edit picture (or ⋮⋮ › Edit picture). Can you drag each corner with a finger and with the Pencil (the targets are 44 px), pinch to zoom, turn and straighten, then Save? Does Undo bring the old picture back? Cut out one icon as a new picture: is it added below and is the first unchanged? Does Restore original bring the first back? Needs human eyes: touch feel and the look in Night and Sepia.
- (WAVE 3 · E2 MEMORY TECHNIQUES, iPad, installed app, tap Update until the new version shows) Sidebar › Templates: tap Memory helpers (brain button at the end). Type 32: are word ideas shown, does tapping one keep it as your pick, can you type your own and press Enter? Paste three lines in the Acronym builder with a page open: does it show the letters and make a card that appears in All cards with the list as its answer? Make a page from Memory palace: type a question in each room card; All cards › New deck › tick Walk the route: does Study show the rooms in order? Vivid image: add or paste a picture into the card answer: does Review show it after Show answer? New database › PAO table: 100 numbered rows? Do the How to use and evidence lines read honestly? Why human: tap targets, Hindi and Spanish wording (machine drafts) and the feel of the flow.
- (WAVE 3 PART B · G1 SHAPES, TAPE, RULER, MAGNIFIER, iPad, installed app, Scribble ON, Pencil paired) Pen card (tap the Pen, then Pen type): choose Draw as › Box, then drag with the Pencil: does the box follow the tip and look clean? Try Arrow and Oval. Choose Tape, drag over a line of text: is the text hidden, and does a Pencil tap on the tape peel it off and a second tap stick it back? Insert › Ruler: drag the middle and the ends with the Pencil, then draw along the edge: is the line straight, and does a stroke away from it stay free? Insert › Magnifier: write a word in the pad with the Pencil and with a finger: does it land small in the dashed box, does the box move on, are Space and Next line useful, and is the pad comfortable above the iPad keyboard shortcut bar? Needs human eyes: Pencil feel, palm rejection in the pad, sizes.
- (WAVE 3 PART B · G2a EMBEDS, iPad, installed app, online) Type /video, paste a YouTube link with a start time (for example one ending in ?t=90), tap Add, then Play: does the video play inside the page, with sound, and is full screen allowed? While it plays tap Insert timestamp: does it add the right time (if the iPad does not report the time, a small box asks for it: tell me which happened)? Take a screenshot of the video (side buttons), paste it into the page while it plays (Paste screenshot, or paste into the page): is the picture captioned with the time? Turn on Airplane mode: does the card say Needs internet? Needs human eyes: real YouTube behaviour and the iPad clipboard.
- (WAVE 3 PART B · G0b MIND MAP, iPad, installed app) Type /mind map. Tap the centre, tap again and type; use the on-screen keyboard's return key to add a branch beside; use + Branch for a child. Can you drag a branch onto another with a finger and with the Pencil (does the page still scroll when you drag empty space)? Try the three Styles and Save as picture (Night and Sepia too). Needs human eyes: touch drag feel and colours.
- (WAVE 3A PUSH 1 · LIBRARY, PDF READER, HIGHLIGHTS, CAPTURE, iPad, installed app, tap Update until the new version shows) Library space: tap Import a book and pick a real PDF from Files, then an EPUB and a DOCX: do the covers, titles and authors look right, and is a big PDF (try 100 MB) accepted without the app freezing or losing it after you close and reopen it? Open the PDF with Continue: is scrolling smooth through a long book, do pages appear quickly, does the page number follow you? Close the app, reopen: are you back at your page? Select text with a finger: does the small bar show above or below it without covering it (it should not fight with the iPad's own copy menu), do the five colours highlight, does Note open a sheet above the keyboard, and does the highlight appear on the book's page with a link that brings you back to the exact spot with a soft glow? Zoom with + and −: is the text sharp? Draw nothing (drawing on book pages is not built yet). Capture: copy a link in Safari, open Capture and paste it with some text; then build the Shortcut from the recipe (Shortcuts app › accept links and text from the Share Sheet › Open URL with the capture address) and try it from Safari's share sheet, and tell me if you want a one-tap link to it on the Capture screen. Why human: the real iPad file picker, big files in Safari storage, finger selection and the pop-up position, the Shortcuts app and scrolling feel cannot be judged by a script.
- (AUDIO + SCROLL HINTS + BACKUPS, iPad, installed app, tap Update until the new version shows) Audio: open a page, tap Insert > Audio. Does Safari ask for the microphone once, and does the Audio list open on the left with a red Stop button and a running timer? Write or draw for 20 seconds while talking, tap Stop: does the recording appear in the list, and does Play play your voice (try the speaker and headphones)? Start a recording, close the list with the cross: does the red Recording chip stay at the bottom and Stop save it? Switch to another app for a few seconds and come back: is what you said before still saved? Delete a recording: does Undo bring it back; open Deleted recordings, Restore it, delete again and Delete forever. Settings > General > Scroll hints: on the sidebar page list and a long Settings screen, is the soft fade at the edge where more is hidden and does a thin bar show while you scroll and fade away after about a second (turn the switch Off: all gone)? Save & restore > Save notes only: then open that file; does the restore window say pictures are included and only the audio sound is left out? Why human: the real microphone, Safari's permission sheet, playback sound and the look of the fade cannot be tested by a script.
- (WAVE 2 PART 2 · PHASE B READER, iPad, installed app, tap Update until the new version shows) Read for five minutes in each view (Read in place, and page ⋯ › Full-screen reader). The main bar must be gone while reading and the same controls must show in both views: do they feel calm, and are the buttons easy to hit? Scroll down: does the bar shrink to a small ✕ at the top left (not hidden under the iPad clock or the app's blur zone), and does a short scroll up bring the whole bar back? Settings › Reading › Reader bar: try Always show and Only at the top. Aa sheet: are the four tabs clear, are the font tiles nice to pick, does "Save current as…" keep a look you can apply later, does Pages switch to the full-screen reader with the note? Dim the page 30 to 40 % in a dark room: is it comfortable (it darkens the page, it is not the real brightness)? Contents: does the pane look calm, do the arrows fold a chapter, is the heading you are reading highlighted as you scroll, does the pin keep it open and push the text aside on the iPad (landscape)? Tap a heading far away: does the page glide for about a second whatever the distance, does a touch stop it, and does the glow make it obvious where you arrived? Bookmarks: add one (a toast with Undo, a small ribbon in the margin), use it, remove it. Find: This page shows every match highlighted and "3 of 12" with arrows; This notebook and Everywhere list results. Listen: is the voice better after downloading an Enhanced or Premium voice (iPad Settings › Accessibility › Spoken Content › Voices)? Listen for ten minutes: is any word or sentence ever repeated? Do the pauses between sentences and paragraphs sound natural? Back and forward by a sentence, the 15-second choice, Next page, the sleep timer "End of page". Leave the page while it reads: does the Now playing pill stay on every screen (above the bottom tab bar on the iPhone), and does ⏹ always stop? Why human: reading feel, real iPad voices, Safari scrolling and the position of bars under the iPadOS top area cannot be judged by a script.
- (WAVE 2 PART 1 · H1 FONTS and E1 DECKS, iPad, installed app, tap Update until the new version shows) Fonts: Aa › Font (Read) and Aa › Style › Font: do the nine tiles show your sentence in their own letters, are Caveat, Kalam, Patrick Hand and Shantell Sans pleasant for handwriting-style notes, is Kalam right for Hindi text, is Atkinson/Lexend calm to read for five minutes? Import font: pick a .ttf or .otf from Files; does it appear as a tile, apply to the page and survive closing the app, and is it back after Save & restore (Everything) on a fresh browser? Switch the iPad to airplane mode: do the fonts still work? Decks: Review space › All cards: do the tiles with New · Learning · Due read clearly on iPad and iPhone; make a deck from one notebook, then one from a few pages with a tag: is the three-step flow easy and does the "N cards match" line feel right? Study a deck: does it only show its cards? Pause a notebook from its ⋯ menu and a page from the page ⋯ menu: do its cards leave Study, and does Resume in the Paused list bring them back? Why human: look, feel, real fonts on Safari and the ease of the flow.
- (PHASE A PART 3, iPad, installed app, tap Update until the new version shows) Selection mini bar: double-tap a word under Lasso; tap its colour (palette) button: does the colour panel open, above the bar? Open Aa: does its card sit above the bar? Drag the bar by its grip (the dots at the left) and tap the pin: does it stay where you left it for the next selection and after closing the app? Tap Align and List: the bar must not jump. Mini keyboard: tap the mic button at the right of the bar (next to the keyboard): a small strip appears. Drag it to each edge: does it snap and stay after reload? Put the caret in text and tap its mic: does Safari ask for the microphone and type what you say (if not, does the keyboard open with a hint)? Does ↵ add a line and does ⌫ delete (hold to repeat)? Paper: Layers card › Lined, Grid, Dots: do the lines match your text lines (try Aa › Style size and line height)? Layers: lock Layer 1, draw on Layer 2, Merge, then erase: can every stroke be erased? Eraser › Erase highlights only: do highlights vanish while the Pencil is still moving? Why human: real Safari speech, Pencil feel and layout cannot be fully tested by a script.
- (PHASE A PART 2, iPad, installed app, Scribble ON, tap Update until the new version shows) Finger: with the Pencil paired, do finger taps work on the bar, pills, Settings and sidebar pages (also right after Pencil use)? Lasso: double-tap a word and wait 5 s: still selected and drawn? Handles, the cross, Delete (one Undo), a tap elsewhere. ⌫ beside New line: tap and hold. Loop around text and drawing: one mixed menu, Delete then one Undo, Screenshot, Copy. Hide Layer 2: does the chip at the top right show it again? Side pill docked left: one thin column? Hover names with a mouse; Settings › Tool bar › Show names under icons. Open and close the keyboard ten times: any jump? Sepia: bar background.
- (STEP 4a, iPad and iPhone, installed app, tap Update until the new version shows) Strip: is the slim column at the left calm and are the four icons clear? Tap each space: does the list change to match (Review: Review, All cards; Library and Home: a short note)? On the iPhone: is the bottom tab bar easy to reach with a thumb, are the labels readable, does it sit clear of the home bar, does it cover the page or the keyboard? Quiet corner (⚙): are Settings, Save & restore, Trash, Day/Night/Sepia, Device mode and Help easy to find, and does the panel fit on the phone? Search (Ctrl/Cmd+K or Shift+K on the Magic Keyboard, or the search icon): are the chips (Pages, Books, Highlights, Cards, Tasks, Features) clear, is it obvious Books, Highlights and Tasks come later, does "Features" feel like the old control panel? Settings › General › Home, Library and Review space: hide one, does the strip follow? Close the app and reopen: does it return to the last space? Night and Sepia: strip and corner easy to see?
- (STEP 3, iPad, installed app, tap Update until the new version shows) Pen: write for two minutes with the Pencil: is it smooth, with no lag or gaps, does the line follow the tip, do pressure and tilt change the width (Fountain, Brush, Pencil)? Do the five pens look different and right? Does a finger scroll the page while the Pencil is on the glass, and does a resting hand never draw (Settings: Pen settings › Finger can draw)? Does the Pencil never scroll the page? Hold the Pencil still at the end of a line, a box, a circle, a triangle: does it snap, is the 0.6 s hold right? Highlighter over words: do they get a highlight that stays with the text; Night theme too? Eraser: all three modes and the size ring; Highlight eraser. Scribble over ink and a quick circle around ink (turn them on in Pen gestures). Lasso: tap a stroke, drag around several, move, resize with a corner, turn with the round handle, Duplicate, Colour, Copy as picture then paste into Notes or Messages. Layers: add, hide, lock, reorder, delete then Undo; paper lined, grid, dots. Type a line above some ink: does the ink stay with its paragraph? Change the text size: does it scale? Undo and Redo with ink and typing mixed. A long page with lots of ink: does it scroll smoothly (60 fps target)? Does the page keep enough blank room under the last line? Does the keyboard or the iPadOS Scribble ever appear while drawing?
- (STEP 2, iPad) Main bar: is it one calm solid row, same look on iPad and iPhone, no Write/Draw/Read switch? Tap Pen: options pill; drag its ⠿ to each edge: does it snap smoothly, with drop zones, and is the place remembered after closing the app? Press and hold Pen about a third of a second, slide to a colour, lift: chosen? Tap the active thickness again: Stroke card; Pen card sliders and preview. Text tool with the Pencil: does Scribble handwriting work, with NO keyboard popping up? Does the ⌨ button show it? Rest the Pencil on a word about 0.3 s then drag: does it select (the caret grows)? Double-tap a word, triple-tap a line with the Pencil and a finger: mini toolbar, and NO iOS copy/paste callout? Drag the handles. Lasso tool: Pencil drag selects, never deletes. Select text, a picture and text with Pencil and finger: no jump, no change, copy works. Pen or Highlighter tool: a Pencil tap must not open the keyboard. Does a Pencil flick still scroll under Read? Hold ↵ New line: extras after 0.6 s? Edit bar (⋯ first item): hide, reorder, reset. Night and Sepia: icons easy to see? (earlier checks follow.)
- (3a) iPad: drag the Pencil across text, back and forth, over whole lines and over a picture: is the text only selected, never deleted? Does Undo/Redo on the bar work after deleting text and pictures, and does Page ⋯ › History hold a copy from before? Does the keyboard flicker after a stroke? Settings › Advanced › Pencil writes text (Scribble): turn it on, does handwriting work (and can scratch-out delete)?
- (3) iPad and iPhone, installed app: Settings › Lock › Face ID, Touch ID or Windows Hello › Set up: does Face ID / Touch ID ask and set it? Lock a page (page ⋯ menu), leave and come back: lock screen? Unlock with Face ID; make it fail (cover the camera) and use the PIN. Press the Home button or switch apps while a locked page is open, then look at the app switcher: is the snapshot blank? Is the lock back when you return? Forgot?: is the wording clear and honest?
- (3) Reading: tap 📖 Read: does the page become calm to read (Night and Sepia too)? Try the full-screen reader (page ⋯ › Full-screen reader, or Settings › Reading › The Read button opens): tap the middle for controls, tap the edges and swipe in "Pages" mode. Try the OpenDyslexic font, text size, margin and width, line focus.
- (3) Read aloud with the real iPad voices: are words marked, does it keep going into the next page, does the sleep timer stop it, what happens when the screen locks? Select words while reading: Highlight, Look up. Bookmark a heading, leave, come back: does it resume?
- (3) Blanks: "Self-test" hides them, a tap shows one.
- (2g) iPhone and iPad: open the page ⋯ menu: is it calmer (page actions, Copy & paste ▸, Page address ▸, Device mode ▸)? Tap the monitor, hand or pencil button at the right of the top bar: does the list open with a tick and switch the mode, and does the top bar still look uncluttered on the phone?
- (2f-2) iPad: tap New line three times with the Pencil; drag the Pencil across text and a picture: nothing should be deleted (if text still vanishes an Undo message appears; tell me what the Pencil did). Undo and Redo are at the left of the bar.
- (2f-2) iPad: tap ↵ New line three times with the Pencil; drag the Pencil across text and a picture: nothing is deleted (if text still vanishes, an Undo message appears; tell me what the Pencil did). Undo and Redo are at the left of the bar.
- (2f-1) iPad: tap Update; the short bar shows at the top; Settings › Tool bar › Device mode is the first row.
- (2e-1) iPad: reload until the update bar appears. Drag across a picture with the Pencil: is the picture selected like the text, and do Copy, Delete and move work on all of it?
- (2e-2) Open More, then tap a ribbon tab or Settings: does More close? Does every menu have a ✕?
- (2e-3) Turn the tool bar off (page ⋯ menu): the question, Undo, the Show tool bar button in the top bar.
- (2e-4) Ribbon at 768, 820 and 1366 px, sidebar open and closed: are all six tabs whole? Try Slim, "Ribbon + short bar" and a position for each bar.
- (2e-5) Settings › Formatting bar position › Floating: does the bar appear near the bottom with the tip? Drag ⠿ with the Pencil and a finger; open the keyboard: does it stay in view?
- (2e-6) Tap ↵ New line five times in a row on the short bar, the ribbon (Home) and the floating bar.
- (2e-7) Sidebar: fold each group, reload; is it calmer?
- (2e-8) Page ⋯ menu › Path style: try Full path (the › lists) and Page only.
- (2d-1) iPad: reload until the update bar appears, tap Update; the device picker shows once: does it preselect iPad? Tick "I use an Apple Pencil" and Use this.
- (2d-2) Does the short bar look calm and clear (switch, All tools, search)? Touch the screen with the Pencil: do the Draw tools show, and does typing bring Write back? Try the pin.
- (2d-3) Search all features: Ctrl/Cmd+Shift+K on the Magic Keyboard, or the search icon: find "paste", run it, pin a tool.
- (2d-4) Sidebar: star a page, open Recent, open Calendar (add a dated database row and a journal day first).
- (2d-6) iPad: tap All tools; do the tabs fit and scroll with a finger? Try both behaviours (the pin button) and Ctrl+F1 on the Magic Keyboard; Edit bar › hide a tab.
- (2d-5) Night theme: are the bar icons easy to see?
- (2c-1) iPad: reload the app until the update bar appears and tap Update; does Touch mode now show the bar at the top at once, with Edit bar under ⋯?
- (2c-2) Write with the Pencil: does Pencil mode switch on with Undo, and does it stay while writing? Try Settings › Advanced › Auto switch › Both ways.
- (2c-3) Night theme: is the colour button easy to see and does it show the chosen colours?
- (2c-4) Long lesson page: do the section chips stay under the bar?
- (2c-5) Copy page with pictures, then paste into Gmail or Pages; Paste as plain text and Cmd+Shift+V.
- (0) iPad: open https://learning-notes-app.pages.dev/pencil-test.html again (fixed: dots, instant strokes, smoothing, prediction on); write for 2 minutes with the Pencil, tap Copy results (if it fails, the text appears selected: touch and hold, Copy), paste it in the chat and say smooth or laggy.
- (7) iPad Touch mode: open a note, tap a word; is the bar under the top bar, easy to tap, and does it never cover text? Try Key point, ↵ New line, tap below the last line, More, Done.
- (8) Switch to Pencil mode from ⋯: does the bar sit above the iPad keyboard bar and rise with the keyboard?
- (9) Settings › Advanced: change each option and check it does what it says.
- (10) Edit bar: pin, drag and reorder a button; does it stay after closing the app?
- (1) Make the scoped Cloudflare token (DECISIONS.md).
- (2) iPad: Save everything, then Open saved file and Replace my notes, then Undo restore; see if it feels clear (B16).
- (3) iPad: an update bar appears; tap Update.
- (4) iPad: select text; the toolbar wraps.
- (5) iPad: tap a line and see if the side menu appears (B17).
- (6) Does a Card or to-do look spread out on touch?
