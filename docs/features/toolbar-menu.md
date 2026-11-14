# Toolbar ⋯ menu (Phase 2A task 2A.2, flag `toolbar.menu`)

Source: docs/plans/ipad-test-findings-2026-11-14.md L3 and R3. The owner's iPad screenshot showed one long flat list. Simple by default, advanced behind ▾. Page and notebook ⋯ menus use another part (`MenuPopover`, spec page-menus.md PM-60 to PM-64) and are not touched here.

## When

- TM-01 When I open the toolbar ⋯ menu with the switch ON → a short top row of four icon buttons with labels: Edit toolbar, All tools, Search all features, Done (All tools is left out while the ribbon is the bar).
- TM-02 When the menu is open → I see the groups "Text style" (Bold, Italic, Underline, Strike, Code as toggles) and "Copy and paste" (plain text, Markdown, paste as plain text, page with pictures), each with a small heading.
- TM-03 When I tap "More ▾" → the rare items show: Bar settings, Reset bar position (free bar only), and every other bar action (Revise marks, blank, card, new line, align, colour, indent, outdent, link). They are hidden until then.
- TM-04 When the screen is a touch screen → no key names show; with a mouse and keyboard they show when hints are on.
- TM-05 When I tap ✕ or Done → the menu closes; the list scrolls with the shared scroll bar; every control is at least 44 pt.
- TM-06 When the switch is OFF → the old flat menu shows, unchanged.
- TM-07 When I compare with the old menu → every old item is still there (e2e "every item of the old menu is in the new one").
- TM-08 When the new tool bar (toolbar.v8) is on and I tap its ⋯ → the card shows the app actions (Reading mode, All tools, Settings, Hide the tool bar) as one row of icon tiles and the tools that did not fit as a tile grid under "More tools"; no key names; a tap draws no focus ring; the shared scroll bar only (e2e toolbarMenuV8.spec.ts).

## Won't do

- The page and notebook ⋯ menus (PM-60 to PM-64, their own task).
- Pinning actions into the top row (PM-63).
- The phone tray running under the tab bar (R5): unchanged here.
