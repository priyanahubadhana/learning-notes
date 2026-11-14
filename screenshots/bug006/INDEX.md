# BUG-006 pictures (taken after the last source edit; keyboard simulated at 40% of the height, format bar up, gear panel open)

Head commit when shot: 9bd19c59 plus this index commit (no source edit between).

| File pattern                        | Screen                                 | Theme              | Proves                                                           |
| ----------------------------------- | -------------------------------------- | ------------------ | ---------------------------------------------------------------- |
| old-landscape-{day,night,sepia}.png | old shell, 1180x820                    | Light, Dark, Sepia | fix 1: panel top at y=8, fully visible, scrolls inside           |
| old-portrait-{day,night,sepia}.png  | old shell, 820x1180                    | Light, Dark, Sepia | panel above the format bar (unchanged behaviour)                 |
| new-landscape-{day,night,sepia}.png | new shell (foundation.shell), 1180x820 | Light, Dark, Sepia | fix 2: rail capped, card inside the visible area, scrolls inside |
| new-portrait-{day,night,sepia}.png  | new shell, 820x1180                    | Light, Dark, Sepia | fix 2 portrait                                                   |
