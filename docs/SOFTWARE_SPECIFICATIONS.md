# Museum puzzle software specifications

Updated 14 November 2026 against the requirements, browser controller and combined hardware firmware. The [project guide](PROJECT_DOCUMENTATION.md) describes functionality, usage, scope and tile/block options. [PROJECT_ARCHITECTURE.md](PROJECT_ARCHITECTURE.md) specifies the intended museum product. This document separates shared requirements, browser behavior, implemented firmware and remaining work.

The combined Nordic app and ESP32-C3 station 01 have been built/flashed and live reception observed. NFC uses a Button 0 substitute; progress is RAM-only. The latest OLED check failed, so the full physical interaction is not yet verified. Current settings are 100 ms beacon advertising and CLOSE entry at estimated distance ≤1.5 m, with exit above 1.8 m.

## 1. Product rules shared by firmware and simulator

| ID | Requirement | Current browser | Current firmware / remaining product work |
| --- | --- | --- | --- |
| GAME-01 | Follow stations in configured order; another beacon/item must not change the target. | Implemented using indices | Implemented with ordered route and exact beacon matching |
| GAME-02 | Accept a new check-in only for the current target while its proximity gate is satisfied. | Map-distance guard at UI and controller | Fresh/stable CLOSE gate implemented for Button 0; real item identity/reader still required |
| GAME-03 | Enable A-D after check-in; wrong answers retry without rescanning or progress loss. | Implemented | Implemented with debounced buttons and full-release gate |
| GAME-04 | Correct answer advances target and invalidates old proximity. | Implemented; no player teleport | Implemented; physical tile/UID validation not yet recorded |
| GAME-05 | Keep assembly separate from quiz validation. | Separate illustrative attachment | Placement is not sensed; physical build checking remains manual/planned |
| GAME-06 | Prevent duplicate item credit. | At station/tile-type level | Route cannot be completed twice in one RAM run; physical NFC UID binding/repeat checks remain required |
| GAME-07 | Keep an accepted question active after leaving range. | Implemented | Implemented during the current run; power-cycle restoration not implemented |
| GAME-08 | Derive completion from route count; reject empty/invalid configuration. | Counts/empty case; partial nonempty validation | Implemented for 1–9 entries, beacon identity, answer/text/exponent fields; future reward fields need validation |
| GAME-09 | Finish all tasks before completion; return inspection is separate. | Completion and return states implemented | ROUTE_COMPLETE implemented; staff return states absent |
| GAME-10 | Record redemption once; explicit reset for next session. | Browser demonstration | Not implemented; reset currently loses RAM progress |
| GAME-11 | Beacon failure must not automatically unlock ordinary check-in. | Out-of-range locked; no live RF-loss input | Five-second expiry resets readiness; touch also requires a packet within one second; no staff override yet |

The normal scan gate is required. A valid NFC identity alone is no longer the automatic fallback for a missing beacon. An explicit staff override is a separate assisted event for the current task; it must not unlock future stations.

## 2. Configuration and session contract

### Route and content

- The original picture product and browser have a 3x3 plate: nine image positions, indexed 0–8. Building blocks, guided models, open builds and hybrids are product options described in the project guide; there is no automatic construction sensing or implemented block mode.
- A playable route contains 1–9 stations. The hackathon default is two stations and two collectible tiles. The browser preloads the other seven picture positions.
- Each station has a unique station ID, a name, a tile type, a unique image position, its beacon mapping, one question, four A-D choices and an answer key in A-D. A navigation clue is optional.
- Exhibition questions need separate approval. Browser questions are museum-themed demonstrations; firmware uses short test questions (station 01 correct B, station 02 correct A). They are not a shared approved content set.
- Display essential station titles and answer choices in full, wrapping where needed. Missing optional clue text should receive a useful navigation instruction.
- Text is data: labels containing angle brackets, quotes, ampersands, diacritics or non-Latin characters must render as text. Do not interpret it as HTML.
- Validate the complete configuration before starting a visitor session. Do not silently start with duplicate station IDs/image slots, missing beacon mappings or an invalid answer key.

The current browser caps the station list at nine, supplies missing-text fallbacks and normalizes four option slots. It does **not** yet reject every malformed configuration. A future editable/importable route loader must validate rather than silently truncate or repair required fields.

### Session state

Store the active route/content version, lifecycle, current target, passed/validated tile types, pending tile identity, completion/redemption state and staff assistance. Hardware also requires base/session identifiers and physical tag UIDs.

Browser additions are the player’s latest schematic position, illustrative attached-tile indices and return-check checkbox values. They are not hardware sensor data. Save the latest position, not a movement history. Both visitor page styles share one origin-local session; UI-lab datasets use separate keys.

Restored state must be consistent with the route: indices in range, no duplicate credit, attachment only for validated tiles, pending question bound to its expected tile, and completion/redemption only after all required tasks. The current browser performs partial validation and range checks; full invariant validation and version migrations remain work to do. The intended product requires atomic/versioned firmware persistence and safe power-loss recovery; the current hardware app has neither and restarts the route on reboot. Browser localStorage testing does not establish those guarantees.

Do not restore sensor proximity as authorization. After a firmware restart in NAVIGATING, reacquire fresh current-target BLE data. A persisted accepted QUESTION may resume without another scan.

## 3. Hardware display and feedback

- Display target: **0.96-inch SSD1315 OLED, 128x64 logical pixels**, replacing the former LED matrix.
- Use short status labels, icons and a proximity bar. The printed station poster remains the source of the full question and A-D descriptions.
- Required semantic states: searching/lost, far/near/close, scan locked, wrong tile, tile accepted/choose, correct, try again, complete/return, redeemed and configuration error.
- Keep the OLED active in quiet mode. Navigation audio stops during questions, transient interaction feedback and completion. Interaction feedback takes priority over navigation.
- Feedback must not block BLE/NFC processing, button debouncing or a fresh answer press. Distinguish icons/text as well as sound; do not rely on colour.
- The browser’s amber pixels are a visual representation. The physical panel colour, legibility, brightness and mounting must be checked on the actual module.

`ssd1315-demo` remains the HELLO component test. The combined game now reuses its low-level driver in `ibeacon-demo/nrf54l15/src/oled.c` for navigation, short questions/options, correct/wrong results, completion and configuration errors. It does not yet render physical wrong-tag feedback, staff return/redemption or quiet-mode states. The display worker and revision acknowledgment coordinate screen and tone without blocking input polling. A missing OLED pauses audible feedback and visitor input while BLE/logging and periodic display retries continue.

The live firmware uses a fixed 2 kHz, 60 ms tone with FAR/NEAR/CLOSE gaps of 1000/400/100 ms; questions/results/completion are silent. Minimum samples=5, band dwell=500 ms, further close dwell=1000 ms, touch freshness=1 s and lost timeout=5 s. CLOSE entry is ≤1.5 m, exit >1.8 m. These are uncalibrated starting values. The browser retains map-unit proximity and its own cadence; they are not interchangeable.

## 4. Browser map simulation

### Movement and proximity

| ID | Requirement |
|---|---|
| SIM-01 | Show a schematic gallery, numbered station beacons, the player, current target and scan-zone legend. The map is not a measured floor plan. |
| SIM-02 | Replace the old slider with click-to-position, drag movement, focused-map arrow keys and labelled direction buttons. All movement methods feed the same controller. |
| SIM-03 | Clamp the player to x=20–300 and y=20–200 in the 320x220 map coordinate system. Arrow steps are 8 map units. Convert pointer coordinates through the SVG transform so resizing does not change click accuracy. |
| SIM-04 | Calculate distance only to the current target. Show other beacons without allowing their proximity to unlock the current task. |
| SIM-05 | Accept new scans when distance to the target is <=30 map units. Re-lock before a new scan when the player leaves that radius. |
| SIM-06 | Changing targets must keep player position unchanged. Completion must not teleport the player to the return desk. |
| SIM-07 | Update the OLED, map status, next-step instruction and scan availability from the same state. Announce meaningful band transitions without announcing every pointer sample. |
| SIM-08 | Save the latest player position and restore it on reload. Debounce pointer-position writes; save progress transitions immediately. |

The current synthetic signal is `clamp(100 - distance / 1.2, 0, 100)`. Its presentation bands are SEARCHING below 10, FAR from 10 to below 40, NEAR from 40 to below 75, and CLOSE from 75 to 100. The 30-unit radius matches the CLOSE threshold. These are **simulation constants**, not metres, dBm, a radio calibration or evidence of physical presence.

The current map always has synthetic beacon coordinates. It does not simulate packet timing, absent/faulty beacons, RSSI noise, filtering, hysteresis or dwell. Those require either future fault-injection controls or real hardware tests. A map showing SEARCHING because the player is far away must not be confused with the firmware’s lack-of-packets SEARCHING state.

### Page experience

| ID | Requirement |
|---|---|
| UI-01 | Preserve the original navy handheld, A/B above C/D, separate NFC pad, speaker and 3x3 plate. LEGO-inspired styling applies to the surrounding page. |
| UI-02 | Keep the handheld a fixed 400 px wide model with fixed internal geometry; normal rendering measures 400x569 px. This is a browser rendering size, not a physical enclosure measurement. |
| UI-03 | Reflow the surrounding page. At narrow widths, keep horizontal scrolling confined to the handheld viewport, with a scroll affordance. The map, question and controls must fit the page. |
| UI-04 | Show a compact task workspace with collection progress and one state-specific next-step instruction. An accepted question takes priority over an earlier tile-attachment reminder. |
| UI-05 | After scanning, collapse the map and focus the question heading. Allow Show map to reopen it. After a correct answer, focus the next-step heading and reopen the map for navigation. |
| UI-06 | Allow answers through physical-style A-D buttons, keyboard A-D and labelled answer-choice buttons. All must invoke the same answer handler. |
| UI-07 | Keep answer buttons disabled before a scan. A disabled scan action must have a nearby reason explaining how to unlock it; the controller guard must still reject an ineligible NFC-pad activation. |
| UI-08 | Map/utility buttons have at least 44x44 px hit targets; text actions have at least 44 px height and wrap as necessary. Preserve visible keyboard focus, named dialogs and semantic progress/checkbox controls. |
| UI-09 | Long titles, multilingual choices and 200% text must stay readable. Avoid truncation of essential question content and horizontal page overflow. |
| UI-10 | Keep correct/retry feedback visible as text, not only in the OLED/sound. Retry without rescanning. |
| UI-11 | Preserve both return checkboxes after validation errors and reloads. Require both before recording redemption, and remove the redemption action afterward. |
| UI-12 | Restart is explicit and confirmed. It clears this browser session, not other UI-lab datasets or a real device. |
| UI-13 | Provide jump links to map/station, useful help and reduced-motion handling. On narrow layouts the task/map precedes the model in both DOM and visual order. |

The browser return desk is illustrative: a staff operator can inspect the saved completion and tick the return checks. The player does not have to walk onto the desk marker. Requiring return-desk proximity would be an additional feature, not an existing rule.

The build remains static HTML/CSS/JavaScript. It uses native controls informed by shadcn documentation; it does not install or claim shadcn React components. Both page styles share the same game controller. External fonts have fallbacks; no BLE, NFC, geolocation or account integration is present. There is no PWA/offline-cache guarantee for an initial page load.

## 5. UI laboratory and test isolation

`jelling-emulator/dist/ui-lab.html` is the prototype test route. Its **Demo data / Worst case / Empty / One station / 9 stations** toggle and **200% text** control select fixtures through the URL. Test data enters through the route configuration boundary, not hand-edited markup. The visitor pages do not load the fixture script or toggle.

The test route must not replace a visitor’s progress. It has separate origin-local keys per dataset. Nine stations is the current picture-prototype/firmware route limit; a 1,000-row fixture is outside the supported route size. A block-building alternative does not automatically expand that software limit. Dark mode and RTL are not currently supported page modes.

## 6. Acceptance matrix

### Browser checks

| Test | Expected result | Evidence/status |
|---|---|---|
| Expected tile outside/at scan boundary | Locked at distance >30; eligible at <=30 | Controller check and browser movement tests |
| Close to future station | Current tile stays locked; route order unchanged | Controller check |
| Wrong tile while near target | No question/progress advance | Controller check |
| Valid scan and wrong answer | Question remains active; all answer choices available | Controller and browser checks |
| Correct answer | Validate once, change target, retain position; attachment remains separate | Controller and browser checks |
| Attachment repeated | No duplicate credit or extra physical slot | Controller check |
| Zero stations | No-route guidance; no visitor scan/answer/prize actions | Browser and controller checks |
| One station | Correct answer completes 1 of 1 tile; singular return copy | Browser and controller checks |
| Nine stations | Nine beacons/slots; counts use nine | Browser rendering check; full nine-station journey not yet exercised |
| Long/multilingual/literal markup text | Full wrapping; literal `<b>…</b>` text; no injected element | Browser/escaping checks |
| 320, 1280 and 2560 px page widths | No document/task-panel overflow; fixed handheld geometry | Browser layout measurements and screenshots in `jelling-emulator/ux-audit/` |
| 320 px with 200% root text | No heading/badge/answer overflow | Browser layout measurement and screenshot |
| Staff validation with one checkbox | Error appears without discarding the checked value | Browser check, including reload |
| Successful redemption | Recorded once; action removed | Browser check |
| Scan/correct-answer keyboard focus | Focus reaches question/next-step heading | Browser active-element check |
| Empty/malformed saved storage | Safe recovery with route-consistent state | Partial handling exists; comprehensive corruption/migration tests still required |

Run `rtk proxy node check-game.cjs` from `jelling-emulator` for the current controller checks. The file exercises the shipped controller source, not a separately reimplemented model. `jelling-emulator/UX_REVIEW.md` records the UX findings and decisions.

### Hardware checks still required

The combined beacon/scanner, target switching, proximity gate, button input, OLED rendering and buzzer scheduler have been implemented and built. Both boards have been flashed and station 01 radio reception verified. Remaining acceptance work:

1. Restore OLED I2C communication; verify physical legibility, synchronized sound and responsive buttons on the actual base. Mock-rendered screens do not establish this.
2. Calibrate proximity in final cases/carrying conditions; test body blocking and nearby beacons. Current entry ≤1.5 m is an RSSI-model threshold, not measured ranging accuracy.
3. On hardware, reject Button 0 check-in outside stable/fresh CLOSE; accept it when ready; verify release before answer A, wrong-answer retry, and continued answering after leaving range.
4. Add station 02's ESP; verify progression, stale/old-target rejection, signal loss/reacquisition and final completion.
5. Integrate the actual NFC reader/UID mapping, then repeat gate, wrong-item, duplicate and replacement tests. No source code currently reads physical tags.
6. Add and test durable sessions, quiet/accessibility controls and controlled assistance/return/redemption/reset. Verify power-loss recovery only after persistence exists.
7. Choose and test the tile/block/hybrid physical kit, including attachment, retention, inventory and the full visitor/return-for-prize trial.

## 7. Implementation gaps to carry forward

- Real NFC reader/interface/driver and physical item UIDs are absent. Button 0 is a check-in substitute, not evidence that a tile/block is present.
- The route has beacon/question configuration, not tile position, piece-pack inventory or reward-handover fields. Add and validate these with the chosen physical activity.
- The base does not sense attachment, block coordinates or model shape. A block-building alternative needs a mechanical kit and manual/staff checks unless new sensing is explicitly engineered.
- Hardware progress is RAM-only. Durable state, safe migrations, controlled staff assistance, return inventory, redemption and reset remain work to do.
- A hardware quiet control and distinct answer/completion tone patterns are not implemented. Current question/result/completion feedback is visual and silent.
- Browser configuration validation needs a schema/error path for malformed nonempty routes, duplicate slots/IDs, answer keys and beacon-count mismatches; normalization is not complete validation.
- Browser restored-state validation needs complete lifecycle/progress invariants and migrations. Its localStorage does not prove hardware persistence or staff authority.
- Browser RF fault injection, actual NFC identity, RF freshness/noise/hysteresis/dwell and hardware fault recovery remain outside its current synthetic map.
- OLED hardware response, complete real-board interaction, second beacon, venue calibration, reader allocation, buzzer ratings, physical preload/build inventory, approved content and staff policy remain delivery checks or decisions.

The current firmware source and recorded checks supersede the earlier receiver-only status. This documentation update does not change application behavior or flash devices. See [the project guide](PROJECT_DOCUMENTATION.md) and [firmware README](ibeacon-demo/README.md) for use and configuration.
