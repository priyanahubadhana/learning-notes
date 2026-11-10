# Snap Assist research (owner bug batch 2, item 7) — 10 Nov 2026

Question: how do window/zone tools let people fill a chosen layout with **existing** items instead of empty ones? Used for the box ⋯ › Layout redesign ([plan](../plans/layout-assist-plan.md)).

## What others do

| Product | Pick a layout | Fill the zones | Empty zones |
| --- | --- | --- | --- |
| Windows 11 Snap Layouts | Hover Maximize or Win+Z; a small grid of layout thumbnails; you click the **zone** the current window goes in | **Snap Assist** then shows thumbnails of the other open windows in the next empty zone; click one, it fills, the next zone asks | Esc / click away leaves the rest unfilled; nothing new is opened |
| Windows Snap Groups | — | The filled set is remembered as a group (taskbar hover restores all) | — |
| PowerToys FancyZones | Layout editor (Win+Shift+backtick), custom zones | Drag a window with Shift held; zones light up; drop to place. Ctrl spans zones | Zones stay empty until something is dropped |
| iPadOS Split View / Slide Over | ⋯ multitasking control at the top of the app | The current app slides aside; you **pick the second app** from Home Screen / Dock | Cancel returns to full screen; no blank app |
| iPadOS Stage Manager | Control Center toggle | Drag apps from the strip or Dock into the current set | Free placement, no empty slots |
| Notion columns | Drag a block to another block's side (or the columns block) | Drag existing blocks in; a drop line previews | The "2 columns" block creates **empty** columns, the same confusion the owner hit; dragging is the main path |

## Lessons

1. The layout is chosen **for the item you started from** (that box takes the zone you click).
2. Remaining zones are filled from **what already exists**, shown as thumbnails, one zone at a time, in reading order.
3. **Skip/Esc never creates content.** In our grid a zone without a box simply collapses.
4. Drag-and-drop (FancyZones, Stage Manager) and tap-to-pick (Snap Assist, Split View) both exist; touch platforms favour tap-to-pick.
5. Avoid Notion's empty-column preset pattern.

## Sources

- [Thurrott: Snap Layouts](https://www.thurrott.com/windows/windows-11/252475/windows-11-feature-focus-snap-layouts), [Snap Groups](https://www.thurrott.com/?p=253108)
- [Windows Central: Snap Assist](https://www.windowscentral.com/how-use-snap-assist-windows-11), [22H2 Snap changes](https://www.windowscentral.com/whats-new-snap-assist-windows-11-version-22h2)
- [Neowin: Snap Layouts and Groups](https://www.neowin.net/news/closer-look-snap-layouts-and-snap-groups-in-windows-11/)
- [Microsoft Learn: FancyZones](https://learn.microsoft.com/en-us/windows/powertoys/fancyzones)
- [iPhone Life: iPad multitasking](https://iphonelife.com/content/complete-guide-to-ipad-multitasking-split-screen-slide-over-picture-picture), [Switching to Mac: iPadOS 26 multitasking](https://www.switchingtomac.com/ipad-multitasking-tips-to-increase-productivity/)
