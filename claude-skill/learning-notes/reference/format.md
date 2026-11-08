# ln-skill/1 field reference

One JSON object. Unknown fields are ignored. Wrong types are cleaned or dropped, never an error, except that the answer must be JSON and hold something usable.

| Field      | Type                                             | Notes                                                                                                                                                                                             |
| ---------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `format`   | `"ln-skill/1"`                                   | Always this text.                                                                                                                                                                                 |
| `title`    | string, max 200                                  | Short title.                                                                                                                                                                                      |
| `summary`  | string, max 3,000                                | 2 to 4 short sentences.                                                                                                                                                                           |
| `keywords` | string[], max 60                                 | Short terms.                                                                                                                                                                                      |
| `sources`  | `{n, title, url}`[], max 100                     | `n` from 1, unique. `url` is http or https, or `""`. Never invent one.                                                                                                                            |
| `points`   | `{text, stars, icon, topic, sources}`[], max 200 | `stars` 1-10 (8-10 Must know, 4-7 Good to know, 1-3 Extra). `icon` is one emoji (required at 8+). `topic` max 80, builds the mind map. `sources` lists existing source numbers, `[]` = unchecked. |
| `pages`    | `{title, body}`[], max 40                        | `body` is Markdown, max 20,000 characters, `[n]` marks after claims.                                                                                                                              |
| `cards`    | `{kind, q, a, point}`[], max 300                 | `kind` is `qa`, `cloze`, `truefalse` or `reverse`. A `cloze` question must contain `{{hidden words}}`. `point` is the index in `points` (from 0) or `null`.                                       |

Output rules: ONE fenced `json` block; the same JSON saved as `<title>.lnskill.json` when you can make files; the language of the material; no HTML.
