# UX improvements and UI stress test

The visitor’s task is to navigate, scan, answer and assemble a picture. The handheld remains the original navy object: 400 px wide, 3×3 tiles, separate NFC pad, A/B above C/D, and 128×64 OLED. Only the surrounding experience and interaction feedback changed.

The page follows a Swiss layout structure: compact left-aligned headings, white surfaces, consistent rules and a constrained two-column workspace. The requested LEGO page retains Cera Pro, yellow branding, blue interaction accents and its dark footer. Those existing brand choices take precedence over the frontend-design skill’s default tokens. The original museum theme remains available.

The distinguishing interaction is the next-step panel: it changes from finding a station to scanning, answering, attaching, and returning the kit. The map collapses after scanning so the question becomes the primary task. It reopens when the next station becomes active. Map and station links provide direct keyboard navigation, and the question choices trigger the same controller as the physical buttons.

## 1. What broke

All non-discretionary fixes below are applied. The user’s request to improve the experience authorized fixing these findings. The initial findings were reported before the fixes; the 200% badge failure was reported when the expanded test revealed it.

| # | Severity | Field | Worst-case value | What happened | Fix and location |
| --- | --- | --- | --- | --- | --- |
| 1 | Broken | Route collection | Zero stations | Map said complete, panel promised a prize, and a station scan still appeared. Reproduced in the browser. | Explicit EMPTY state; no scan/answer actions; ask staff. [app.js](dist/app.js:104) |
| 2 | Broken | Route length and progress | 1 or 9 stations | Completion, OLED totals and return copy assumed two stations. Found in the controller; single-station completion verified after correction. | Derive all counts and completion from TOTAL; singular tile copy. [app.js](dist/app.js:95) |
| 3 | Broken | Answer text | `A commemorative plaque labelled <b>Jelling & Denmark</b>` | Raw interpolation treated the label as HTML. Source-confirmed; the final DOM contains literal angle brackets and no injected element. | Escape text at the HTML boundary and use textContent for notices, headings and map labels. [app.js](dist/app.js:2) |
| 4 | Broken | Return checklist | Only the inventory checkbox checked; submit | The previous error path rerendered the form and discarded checkbox state. Source-confirmed. | Keep checks in session state and render errors without replacing the form. Verified through error, reload and successful redemption. [app.js](dist/app.js:116) |
| 5 | Ugly | Map heading/status | 320 px width, 200% root text size | Heading and badge overflowed their row. Reproduced with layout measurements and screenshots. | Let the heading row wrap, preserve the badge, and allow the title to shrink. [ux.css](dist/ux.css:40) |
| 6 | Fragile | Station title | `Runensteinvermittlungsausstellungsbereich` | No break opportunity or field limit; existing CSS had no long-word policy. Source-identified risk. | Wrap essential titles and target labels in full; min-width:0 on layout children. Verified at 320, 1280 and 2560 px. [ux.css](dist/ux.css:23) |
| 7 | Ugly | Map and utility actions | Touch interaction; 27 px direction buttons | Small action targets and tiny instructional copy. Confirmed in CSS and the browser. | 44 px map/utility targets, rem-based copy, visible focus, full-text options, explicit disabled-scan explanation. [ux.css](dist/ux.css:4) |
| 8 | Fragile | Question interaction | Keyboard user after scanning or answering | Replacing the clicked control returned focus to the page instead of the next task. | Focus the question heading after a scan and the next-step heading after success. Verified with activeElement. [app.js](dist/app.js:143) |

## 2. Decisions made

- Essential titles and answers wrap in full. There is no ellipsis hiding question content. This is more useful than equal-height cards in an educational puzzle.
- The supported route maximum is nine stations, matching the physical plate. A 1,000-row list is outside the product model. The nine-station fixture exercises the actual maximum.
- Missing optional clue text receives a useful navigation instruction; missing required labels have explicit station/option fallbacks.
- The handheld stays 400 px wide on mobile, as requested. Only its own viewport scrolls horizontally; the page, map and question do not overflow.
- Mobile puts the task/map before the handheld in both visual and DOM order. Every answer is also available beside the question, so the physical viewport is not required to submit an answer.
- The map remains available while answering through Show map. Automatic collapse changes visual priority, not game state.
- No framework migration was needed. Shadcn CLI reported framework Manual, no config, Tailwind or installed components. Its registry and official [Button](https://ui.shadcn.com/docs/components/base/button), [Card](https://ui.shadcn.com/docs/components/base/card), [Alert](https://ui.shadcn.com/docs/components/base/alert), [Dialog](https://ui.shadcn.com/docs/components/base/dialog), [Empty](https://ui.shadcn.com/docs/components/base/empty) and [ToggleGroup](https://ui.shadcn.com/docs/components/base/toggle-group) docs were reviewed. Native buttons, fieldsets, radio groups, progress and dialog semantics implement the relevant patterns. No shadcn React components are installed or claimed.

## 3. What held up

- The proximity lock still rejects scans outside the current beacon’s 30-unit radius, including when the player is close to a different beacon.
- Wrong answers preserve the scanned tile and all four choices. Correct answers change the target without teleporting the player or implying physical attachment.
- The fixed handheld measures 400×569 px at 320 px with 200% text. Its appearance and controls stay independent of page reflow.
- The final demo/worst-case checks at 320, 1280 and 2560 px report no horizontal document overflow and no overflow in the task card, next-step panel, map header, target label or answers.
- Long natural-language titles, one-letter answer `J`, CJK, Vietnamese diacritics, emoji, missing clues and literal markup all remain readable.
- The one-station route completes at 1 of 1 tile; the nine-station fixture renders nine beacons and nine slots; the empty route offers no scan action.
- Staff checks persist across a validation error and reload. Successful redemption removes the redemption action.
- The visitor session is separate from test-route sessions, so testing does not erase or replace visitor progress.

## Rendered data surface

| Field | Source | Type | Limit | Optional? |
| --- | --- | --- | --- | --- |
| Station name | stations[].name | string | Unbounded authored text; wraps | Required; station-number fallback |
| Station short label | stations[].short | string | Unbounded; retained in configuration | Optional; number fallback |
| Navigation clue | stations[].clue | string | Unbounded; wraps | Yes; contextual fallback |
| Question | stations[].question | string | Unbounded; wraps | Required; staff-help fallback |
| Answer label | stations[].options[] | string | Unbounded; exactly 4 choices | Required; option-letter fallback |
| Correct choice | stations[].answer | enum | A, B, C or D | No |
| Picture position | stations[].slot | integer | 0–8 physical slots | No |
| Route length | stations.length | collection | 0–9; visitor default 2 | No |
| Beacon positions | BEACONS[] | coordinates | Schematic 320×220 map | No |
| Player position | session.player | coordinates | x:20–300, y:20–200; finite saved data | No; entry fallback |
| Target | session.target | integer | 0–route length | No |
| Validated/attached tiles | session arrays | index collections | Unique, valid route indices | No; empty default |
| Count/percentage | validated.length / TOTAL | derived numbers | 0–9 and 0–100%; zero guard | No |
| Signal state | distance to target | enum | Searching, far, near, close; no target separately handled | No |
| Answer feedback | controller | enum + fixed copy | correct, retry, wrong tile | Transient |
| Lifecycle | session.phase | enum | EMPTY, NAVIGATING, QUESTION, COMPLETE, RETURN_CHECK, REDEEMED | No |
| Sound | session.sound | boolean | On/off | No; off by default |
| Return checks | session.returnChecks | two booleans | Inventory and physical picture | Staff phase only |
| OLED | derived state | bitmap + text alternative | 128×64 logical pixels | No |
| Tile illustration | bundled assets/stone.svg | local image | Static square aspect ratio | No |
| Reference image | bundled assets/reference.png | local image | 1024×768, explicit dimensions | Help dialog only |
| Help/labels/buttons | authored UI copy | strings | Fixed copy; rem-sized controls | State dependent |

There are no person records, emails, money, timestamps, remote avatars, network loading results or permission roles. Those catalog cases do not apply. Dark mode and RTL are not supported modes, so they are not claimed as verified.

## Test controls and evidence

Open [the isolated UI lab](http://127.0.0.1:4173/ui-lab.html?data=demo). The fixed bottom control offers **Demo data / Worst case / Empty / One station / 9 stations**, plus **200% text**. The URL preserves the selected mode. `fixtures.js` and the controls are loaded only on `ui-lab.html`, never on the visitor pages. Each dataset has its own saved session.

Screenshots are in `ux-audit/`, including demo/worst comparisons at 320, 1280 and 2560 px and the 320 px enlarged-text test. `audit-before-worst.png` preserves the initial long-content view. These are supplementary to the live route.

Run `node check-game.cjs` for the shipped controller checks: scan boundary, future-beacon/wrong-tile rejection, retries, target advancement without teleporting, separate attachment, completion, empty/one-station routes, and escaping. Syntax checks also passed for the browser scripts.

All listed fixes are applied; no design approval is pending.
