# Museum picture puzzle architecture

Design baseline: 13 November 2026; updated 14 November 2026 after combined firmware development. This document specifies the intended integrated museum product. The [complete project guide](PROJECT_DOCUMENTATION.md) documents current functionality, usage, scope, setup and physical activity options; [software specifications](SOFTWARE_SPECIFICATIONS.md) track implementation gaps.

**Current hardware snapshot:** ESP32-C3 station 01 and the combined nRF54L15 visitor firmware have been built, flashed and verified. Live matching iBeacon reception was observed. Advertising is now 100 ms; CLOSE enters at estimated distance ≤1.5 m and exits above 1.8 m. OLED, buzzer, debounced buttons, touch simulation, quiz and ordered waypoint switching are integrated in code. The latest OLED check failed at both I2C addresses, so the physical screen/quiz/sound journey remains unverified. NFC is simulated with Button 0; hardware progress is RAM-only. Station 02 is configured but its beacon is future hardware. Intended durable sessions, physical tag identity and staff return/redemption below are not current firmware features.

### Changes agreed during simulator development

- Replace the earlier 8x8 LED matrix with a **0.96-inch, 128x64 OLED**, using the SSD1315 module demonstrated in `ssd1315-demo`.
- Use a **3x3 picture plate**, with nine positions. Keep the two-station, two-collectible-tile hackathon scope; a nine-position plate does not require nine stations.
- A new tile scan must satisfy both conditions: it belongs to the **current target station**, and the base has a **fresh CLOSE proximity classification for that target**. Being near another station does not enable the current tile.
- An accepted question remains enabled for retries even if the visitor subsequently moves away or the beacon is lost. Correct answers still advance the target immediately; physical attachment is separate and is not sensed.
- The browser uses a player/beacon map instead of a proximity slider. Its map, responsive page layout, clickable answer choices and test fixtures are simulation features, not additional hardware requirements.

The proximity gate supersedes the earlier automatic tile-only fallback on beacon loss. Assistance now requires an explicit staff override; ordinary scans must not silently bypass the gate.

## Intended hackathon delivery scope

- Deliver two working stations, one working visitor base, and a complete return-for-prize demonstration.
- Historical theme: the Great Jelling Stone and its copies around the world.
- Fixed station order: only a tile associated with the current target waypoint enables A-D. A future-station tile leaves the current target and answer lock unchanged.
- Proximity-gated scanning: the target station must be freshly classified CLOSE when a new tile is accepted. Searching, FAR, NEAR and LOST leave new scans locked.
- Each station provides its question and A-D choices on a poster, a fixed BLE beacon, and a box containing copies of that station's NFC picture tile.
- Visitors take and scan the tile before answering. Correct answers validate that tile and advance the waypoint; no second scan is required.
- Retain the picture tiles' stud-and-tube attachment on a 3x3 plate, square A/B above C/D button layout, separate NFC pad and small buzzer. Use the 0.96-inch OLED for proximity and answer feedback; omit the earlier matrix and separate LED arc.

Still to clarify: intended age range and group size; final station count and physical activity format; actual NFC reader/interface; buzzer ratings and kit quantities; calibrated proximity thresholds/freshness/dwell; team roles; hint policy; and physical return inventory. The current advertiser is ESP32-C3, and the buzzer firmware is configured for a passive HW-508 variant. The rules below are proposed defaults where these decisions remain open.

## Physical activity alternatives

The picture-tile product below remains the original baseline. An alternative uses building blocks to construct a model on the smart base, with each station awarding a build step or piece pack. A hybrid can combine a picture foundation with raised construction. The proximity/quiz route can be reused; reward metadata, kit inventory, mechanical design, reader integration and instructions need their own work. A single NFC pad identifies presented pieces, not their final position or the constructed shape. Staff/visitor inspection is the default proposed build check unless additional sensors are engineered.

The current 3×3 browser plate and 1–9-entry route are implementation limits, not proof of a 3D block mode. `lego.html` is page styling only. See [tiles, building blocks and other options](PROJECT_DOCUMENTATION.md#6-tiles-building-blocks-and-other-activity-options) for guided/open builds, tag/pack choices and additional scope.

## Product definition

Visitors borrow a handheld puzzle base, follow proximity beeps to exhibition stations, take one picture tile from a station box, tap that tile to enable its printed multiple-choice question, answer using four buttons, and press the tile onto a studded plate after a correct answer. They complete a picture, return the base and every tile, and receive a prize from staff.

The base has a 0.96-inch 128x64 OLED for short status text, icons and a proximity indicator. It is not expected to show the full exhibition question and four answer descriptions. Buttons form a square: A B above C D. The 3x3 plate holds smooth printed picture tiles with stud-and-tube connections underneath. The buzzer and OLED supply coordinated proximity and interaction feedback. The NFC pad is separate from the picture area.

Electronic completion means every required task and tile scan is recorded. Staff check physical picture placement and returned inventory. The base does not detect tile position or attachment.

## Scope and hardware allocation

| Component | Two-station hackathon prototype | Role |
|---|---|---|
| nRF54L15 development kit | 1 | Visitor base running the combined game |
| ESP32-C3 station beacon | 2 intended; station 01 flashed | One fixed advertiser per station; station 02 is configured future hardware |
| NFC reader module inside base | 1 | Under the base scan pad; exact model and interface unconfirmed |
| Passive NFC tags | 2 for the visitor prototype | One inside each tile; no separate station check-in tags |
| Four answer buttons | Onboard DK buttons initially | A/B/C/D; physical caps in final enclosure |
| Small buzzer and suitable driver | 1 set | Navigation pulse cadence and feedback patterns |
| 0.96-inch, 128x64 SSD1315 OLED module | 1 | Short status text, proximity indicator, answer and completion feedback; use the demonstrated four-pin I2C module |
| USB supplies / power banks and matching cables | 3 supplies | One per board; reader power included in base budget |
| 3x3 studded plate and smooth picture tiles | 1 plate, 2 collectible tagged tiles | Nine image positions; choose how remaining positions are populated for the two-station physical demonstration |
| Printed station panels | 2 | Instructions, question, A-D choices, hints, target landmark |
| Enclosure, mounting and wiring | As required | Reader clearance, grips, protected wiring, service access |
| Staff laptop and USB data cable | 1 during development | Logs, provisioning, diagnostics and controlled reset |

Default interaction: one station, one question, one collectible tile per group. Each station box contains many physical copies of its tile for different groups. Configure one to nine stations for the current 3x3 product, with unique collectible image positions; prototype with two. The browser preloads seven image pieces and collects the remaining two. That is its presentation setup; the team must still choose and record the equivalent physical kit inventory. A pack of several distinct tiles per question is a future option, not part of the baseline.

## Hardware topology by physical unit

### 1 Handheld base carried by visitors

All of these parts belong to ONE device and fit inside or onto its enclosure:

- nRF54L15 controller and BLE scanning antenna.
- NFC reader module and antenna, mounted internally under the separate scan pad. “External reader” in component datasheets means external to the Nordic chip, not a separate object carried by the visitor.
- Four A-D buttons, arranged A/B above C/D.
- SSD1315 OLED module, small buzzer and required buzzer driver.
- Shared power bank / supply and internal power distribution and wiring.
- Controller's local progress storage and all visitor game firmware.
- Studded picture plate, grips and enclosure. The plate holds tiles but does not sense their positions.

The firmware inside this unit handles BLE proximity, scan eligibility, NFC tile identity, answer enabling/checking, saved progress, route order and OLED/buzzer feedback. It is the sole authority for its visitor session. Multiple bases can listen to the same fixed beacons independently.

### 2 Collectible picture tiles

Each tile consists of a smooth printed picture fragment, a passive NFC tag and a stud-and-tube underside. It has no battery, beacon or running firmware. A stored identity maps to its station/question and image position through the base's configuration.

Tiles start in their station's box. Each group takes its own physical copy, taps it on the base to enable the current question, then attaches it after a correct answer. They travel with the visitor and are returned with the base at the prize desk. Different physical copies can represent the same station's tile type.

### 3 Fixed beacon at each station

Each beacon is its own stationary powered unit: a BLE-capable board/antenna and USB supply or power bank, inside a fixed housing. Its only firmware role is to advertise the exhibition/station identity. It contains no NFC reader, visitor answer buttons, game progress or picture plate.

Alongside that beacon, the station has a printed poster with the question and A-D choices, plus a replenished box containing copies of its tile. The poster and tile box belong to the station setup, not inside the beacon electronics.

The intended two-station demo uses three BLE boards total: one nRF54L15 INSIDE the visitor base and one ESP32-C3 at EACH station. The original all-Nordic allocation has been superseded for the current prototype. `ibeacon-demo` contains the combined Nordic game and ESP transmitter; station 01 has been radio-verified, while the second physical beacon remains to be added. Station identity uses iBeacon UUID + major + minor rather than assuming a permanent BLE address.

### Connections between the units

| From | To | Connection and purpose |
|---|---|---|
| Station beacon | Base BLE scanner | Wireless BLE advertisement and RSSI for approximate proximity |
| Tile | Reader inside base | Short-range NFC tap to identify tile and enable its question |
| Tile | Base's picture plate | Mechanical stud-and-tube attachment after a correct answer |

Staff laptop/service tools are a support system used at handout/return and during development. They are outside these three visitor-facing physical units. The USB-reader fallback below is a prototype exception to the intended integrated handheld base.

### NFC integration decision

Preferred: an embedded reader module with a supported SPI, I2C or UART interface connects to the base. Select the actual bus and firmware driver after identifying the reader. Confirm it reads the supplied NTAG tags.

Fallback: a USB desktop reader connects to a laptop. A small bridge forwards scan events over USB serial to the base. Keep game rules on the base so this temporary transport can later be replaced by a direct reader. This fallback is tethered and cannot be described as a standalone handheld.

The nRF54L15's NFC antenna provides tag functionality, not reader functionality. The DK's debugger USB port must not be assumed to be a USB host for a desktop reader.

### Electrical and mechanical integration

- Check actual DK GPIO voltage and every peripheral's power and logic requirements before wiring; use level conversion when necessary.
- Use a common ground for directly connected modules. Power the boards through their documented USB inputs for the prototype; never feed power-bank voltage directly into GPIO.
- Identify whether the buzzer is active or passive. Use timed switching for an active buzzer or PWM for a passive one. Select a transistor driver if its current exceeds GPIO capability; component ratings determine the circuit.
- Verify power banks remain on at the measured load. Measure runtime with scanning, reader, buzzer and OLED enabled, including the intended display brightness and maximum lit-pixel pattern.
- Use the onboard button inputs initially, map them to the enclosure's A/B/C/D arrangement, and debounce them in firmware.
- Keep the BLE antenna away from hands, metal and the power bank where possible. Bench-test the assembled enclosure, not only the bare DK.
- Place the NFC antenna under a thin nonmetallic scan pad, away from tile storage and the assembled picture. Read one presented tag at a time.
- Put NFC inlays inside tiles without obstructing connector tubes. Test reading, clutch strength and removal before producing the full set. Add a small lifting notch so smooth tiles remain removable.
- Provide a serviceable underside, accessible USB port and protected cables. Final enclosure dimensions depend on measured boards, reader and battery.

## Software architecture

### Firmware inside the handheld base

Use the Nordic SDK/toolchain already supported at the event for the actual boards. Keep these modules separate:

| Module | Responsibility |
|---|---|
| BLE scanner | Receive advertisements, validate game/version IDs, emit station sightings and RSSI |
| Proximity estimator | Filter the current target's RSSI; emit SEARCHING/FAR/NEAR/CLOSE/LOST |
| Scan eligibility | Require the active target's fresh CLOSE classification at new-tile acceptance; invalidate eligibility after signal expiry or a target change; expose a locked reason |
| NFC adapter | Turn embedded-reader or serial-bridge input into typed tile scan events; report identity to the game controller rather than enabling answers itself |
| Button input | Debounce A-D and emit one answer per press; require release before accepting another |
| Game controller | Own session state, question checks, station order, tile eligibility and completion |
| Content configuration | Store route, question answer keys, tile-to-station mappings, station IDs and printed-panel version |
| Feedback scheduler | Coordinate nonblocking OLED updates and buzzer patterns; prioritise answer feedback over navigation |
| OLED adapter | Render short labels, icons and proximity bands into a 128x64 framebuffer; update the SSD1315 without blocking sensing or button processing |
| Persistent store | Save pending scanned tile, accepted answers, validated tiles and session lifecycle at transition boundaries |
| Staff service | Provision kits, inspect state, recover a fault, mark redemption and reset explicitly |

Run sensing and feedback without blocking sleeps. BLE/NFC callbacks produce events; the game controller consumes them. A button press must never be lost because a beep pattern is playing.

### Firmware inside each fixed station beacon

One small advertiser application is reused on every station with a different configured station ID. Use BLE advertisements; iBeacon formatting is optional, not another required radio. No pairing, mesh, cloud or continuous visitor connection is needed for navigation.

The current transmitter uses iBeacon: UUID namespace, major/exhibition ID, minor/station ID and signed one-metre RSSI calibration. There is no separate protocol-version field. The configured interval is now 100 ms, plus BLE random delay, replacing the earlier 300 ms. Each ESP gets a unique configured station identity. Exact transmit power and proximity thresholds require venue calibration and are not promised physical distance accuracy.

### Configuration and session data

Keep the following logical records locally; a database server is unnecessary:

- Station: station ID, display name, question ID, four A-D options, correct option, associated tile type, unique image position 0-8, next station, proximity calibration and scan-gate parameters. Full question/option text remains on the printed panel; the browser also displays it.
- Tile: unique physical tag identity, associated station/question, tile type/image position, exhibition version. A provisioned lookup may map tag IDs to types instead of writing all metadata to tags.
- Session: base ID, session ID, kit/content version, state, target station, passed stations, pending tile ID, validated tile IDs per type, completion status, staff return checks, redemption status and any recorded staff assistance.
- Feedback: navigation cadence, OLED labels/icons and distinct accepted/retry/completion patterns.
- Transient sensing: current target ID, filtered RSSI, last accepted packet timestamp, band and dwell state. Do not persist these as proof of proximity after a restart or target change.

A valid new scan binds a pending physical tile to the current question and enables A-D only after the controller checks tile identity, route order and current-target proximity. Recheck those conditions when processing the scan event, not only when displaying a ready indicator. A correct answer promotes the pending tile to a validated tile, saves success and advances the target. Clear the previous target's scan eligibility; never reuse its CLOSE classification for the next station. No second tile scan is required. Each validated tile type is bound to one physical tag for the session. Repeat scans of that tag are harmless. Another tag of the same type does not create extra credit; staff can replace a lost or faulty tile through a controlled reassignment.

Validate route configuration before starting: one to nine stations, unique station IDs and image positions, exactly four non-empty answer options, an answer key in A-D, and a matching beacon/tile mapping for each station. An empty or invalid route must show a configuration error and keep visitor scan/answer/prize actions unavailable; it must not count as a completed route. Counts and completion conditions derive from the configured station count, not a hardcoded two. These are integrated-product requirements; the current browser only implements part of configuration validation (see implementation status).

Store no visitor name, account or location history. Persist only meaningful progress transitions, not every RSSI sample. Use atomic/versioned writes with validity checks so a power interruption cannot silently corrupt progress. After restart, reload the active session; reset only through staff action.

Ordinary NFC identities are not proof against cloning. Treat them as low-stakes game identifiers, and use staff supervision for prize redemption. A staff tag is a convenience trigger, not strong authentication; keep destructive reset/redemption available through a staff-operated wired service.

## Navigation and audiovisual feedback

Follow only the current target station. Filter several RSSI readings and use different entry/exit thresholds plus a short dwell time to avoid rapid band changes. Tune bands onsite with visitors holding the board and with nearby beacons active.

The combined firmware currently uses a fixed 2 kHz tone, with 60 ms bursts:

| Situation | Current firmware response |
| --- | --- |
| SEARCHING / expired signal | Silent; clear close eligibility |
| FAR | 1000 ms silence between beeps |
| NEAR | 400 ms silence between beeps |
| CLOSE | 100 ms silence between beeps |
| Question / answer result / complete | Silent; visual question/result/completion feedback |
| OLED unavailable or not synchronized | Beeps and button actions paused; retry display initialization |

CLOSE enters at estimated distance ≤1.5 m and remains until >1.8 m. Band changes dwell for 500 ms, followed by a further one-second close eligibility dwell; at least five samples and a packet within the last second are required for touch. The lost timeout is five seconds. These are prototype settings subject to calibration. Distinct success/retry/completion sounds and a user quiet control are future options, not present firmware behavior. The browser uses its own slower simulated cadence and sound toggle.

The beeps represent approximate proximity, not metres or bearing. They do not indicate a safe walking route through walls. Printed landmark clues handle routing. If a beacon is unavailable, new ordinary tile scans remain locked. Staff can use an explicit, recorded override for the current task; printed clues provide routing. A tile identifies its station, and a fresh BLE proximity band is an interaction gate, not reliable proof of physical presence.

### Proximity-gated tile acceptance

- Accept a new tile only in NAVIGATING, for the current target, with fresh matching beacon data and a CLOSE band that has satisfied its configured entry dwell.
- SEARCHING, FAR, NEAR, LOST, an expired reading, or a different station's stronger signal must not unlock a new scan.
- Select RSSI entry/exit thresholds, packet freshness limit and dwell time through onsite calibration. Use hysteresis so eligibility does not flicker at the boundary. No dBm threshold or physical distance is approved by the browser demonstration.
- On expiry, leave CLOSE and lock new scans immediately; do not leave a stale ready indicator. The combined firmware uses a five-second lost timeout and a stricter one-second touch freshness window; these are starting implementation values, not calibrated venue guarantees.
- On target change, discard the previous target's eligibility and acquire valid readings for the new target. Do not reset a visitor's physical position or assume the next station is nearby.
- Once a tile has been accepted and QUESTION is active, allow answers/retries without a new proximity check. Moving away or losing the signal does not discard that pending question. On restart, a persisted QUESTION can resume; persisted NAVIGATING must reacquire live proximity.
- Reject invalid, wrong-station and out-of-range scans without changing target, pending identity, validated tiles or redemption state. Give short OLED feedback explaining the lock.
- Beacon-fault assistance requires staff action scoped to the current task and recorded with a reason. It must not become a permanent fail-open mode for later stations.

Pause navigation beeps during questions, scans and completion. Give interaction feedback priority. Avoid overlapping patterns. Include an optional quiet mode, for example holding A+D together while navigating; this gesture must never submit answers. Staff can enable it through the service interface. The OLED remains active in quiet mode, providing proximity and answer feedback without sound; printed clues and staff assistance remain available. The browser uses a Sound on/off control. Neither that A+D gesture nor another user quiet control is implemented in the current hardware firmware; chords are currently ignored until release.

### OLED behaviour and placement

Use the demonstrated 128x64 SSD1315 display as the rendering target. The current combined app also displays short test questions and four short choices directly, within two 20-character question lines and four 8-character answers. Full museum question content still belongs on the printed panel. Short status labels below are the semantic contract; the exact glyphs, wrapping and icon layout must fit that framebuffer. The browser's amber display is a visual treatment and does not establish the physical panel's colour. Proposed states, to test with visitors:

| State | OLED output |
|---|---|
| Navigating | Current station number, SEARCHING/FAR/NEAR/CLOSE label and filling bar matching the buzzer; no directional arrow |
| Searching / lost signal | SEARCHING or LOST; clear the ready/close indication and lock new scans |
| Target tile presented out of range | Short move-closer/scan-locked feedback; remain in navigation |
| Wrong tile | Short wrong-tile feedback; keep the current target and answer lock |
| Valid tile scanned / question active | TILE ACCEPTED / CHOOSE and A-D prompt; pause proximity feedback |
| Correct answer | CORRECT and check icon held briefly; then acquire the next target's proximity |
| Incorrect answer | TRY AGAIN and retry icon, then restore the A-D prompt without rescanning |
| All tasks completed | COMPLETE, configured collected/required count and RETURN TO STAFF |
| Redeemed | THANK YOU / PRIZE REDEEMED; no further prize action |
| Invalid/empty configuration | Configuration/no-route error; scan and answer controls locked |

Use text, icons and shapes that work on a monochrome OLED; do not depend on red versus green. Keep visual feedback active when the buzzer is muted. Brief feedback must be observable before transitioning, while sensing and inputs remain responsive. Do not replace the printed question/answer descriptions with tiny text on this screen.

Keep the display window visible and separate from the 3x3 picture plate and NFC pad. The reference/simulator locates it below the picture area on the right; its mounting dimensions depend on the measured module and enclosure. `ssd1315-demo/README.md` and `app.overlay` describe the demonstrated four-pin I2C module and pin mapping; check shared-bus/pin conflicts when adding the reader and buzzer. The OLED adapter is not a second game controller and does not change the tile-first flow.

## State machine and visitor flow

| State | Entry / allowed actions | Exit |
|---|---|---|
| READY | Staff checks base and kit, starts session and explains controls | NAVIGATING |
| CONFIG_ERROR | Empty or invalid route; display error; visitor scan/answer/prize actions disabled | Staff fixes configuration and starts a valid session -> READY |
| NAVIGATING | Follow target beacon cadence and printed landmark clue; A-D disabled; new scans locked until fresh target CLOSE | Expected tile scanned while scan gate is satisfied -> QUESTION; recorded staff assistance is a separate controlled path |
| QUESTION | Pending tile saved; A-D enabled; read poster; proximity sound paused | Wrong answer -> stay; correct answer -> save validated tile, disable A-D and advance to NAVIGATING or COMPLETE |
| COMPLETE | Play completion cue; no more approach beeps; visitor finishes/checks physical picture | Staff begins return inspection |
| RETURN_CHECK | Staff verifies saved completion, picture and all returned components | Accept -> REDEEMED; missing items -> resolve |
| REDEEMED | Record redemption once before handing over prize | Staff clean/replenish/recharge and explicit reset -> READY |

Detailed journey:

1. Staff hands out one powered base per visitor group and explains A/B above C/D, the scan pad, quiet mode and the return-for-prize rule.
2. A printed route card identifies the first landmark. The base starts scanning its target beacon and beeping in proximity bands.
3. At the station, visitors take one physical tile from the box. The poster explains the question and what A, B, C and D represent.
4. Visitors tap that tile at the base's NFC pad. The controller checks that it belongs to the expected station and that this target is freshly CLOSE. Only then does it save the tile as pending, pause navigation and enable A-D. Out-of-range or wrong-station taps retain the current target and locked answers. No separate station tag is used.
5. Visitors inspect the exhibit and question, then press A, B, C or D. An incorrect answer produces a gentle retry cue and keeps the same question active, without another tile scan.
6. A correct answer validates the pending tile, saves task success, disables answer input and selects the next waypoint. The base plays success feedback before resuming proximity guidance. It does not write an unlock to the passive tile.
7. Visitors press the tile onto the central studs and move to the next waypoint. Placement is not sensed, so navigation advancement is triggered by the correct answer, not attachment.
8. Repeat taking one station tile, scanning it, answering and attaching it at every waypoint. Poster and tile symbols help visitors select the correct piece.
9. After the final correct answer, play the completion cue instead of navigation beeps. Visitors attach the last tile and finish/check the picture.
10. At the staffed desk, staff checks saved completion, visually checks the picture and counts the returned base and all tiles.
11. Staff records redemption before awarding a prize, then cleans, recharges and resets the base and replenishes station tile boxes.

The OLED supplies short status text and feedback, not a readable replacement for a printed multiple-choice panel. Question text, hints, tile symbols and next-station clues must still exist physically. No speech playback is specified.

## Failure and recovery rules

- Power loss: restore passed tasks and accepted tiles; resume the pending question/navigation state without replaying a redeemed prize.
- Wrong station: emit a retry cue and keep the current target. Never advance because a different beacon is stronger.
- Tile scanned before answering: this is the required normal flow; accept the target station's tile and enable its question only when the current-target proximity gate is satisfied.
- Out-of-range or stale target reading: reject a new scan without progress loss; show a move-closer/searching cue. Leaving range after a valid scan does not cancel the pending question.
- Wrong station or already completed tile: do not enable a new question or award credit.
- Repeat scan of pending tile: retain the current question and progress. Reject a different tile while that question is pending unless staff performs a replacement.
- Several tags presented together: require separation and one-at-a-time scanning; do not guess the intended tag.
- Repeated held button: accept one answer until release; require a fresh press after the question becomes active.
- Missing/wrong tile: staff replace or reassign it and preserve the rest of the session.
- Empty tile stock: staff replenishes or supplies an equivalent reward; do not strand the visitor.
- Beacon fault: keep ordinary new scans locked; use printed routing and an explicit recorded staff override for the current task, or repair the beacon. Do not automatically bypass the proximity requirement because the tile is valid.
- NFC reader fault: stop automatic progression and use a recorded staff override; label this as assisted operation.
- No network: normal operation continues, because the route, answer keys and progress are local.
- Busy stations: several bases can coexist, but physical panels and reward bins need enough capacity. Multiple independent routes are a later enhancement.

## Delivery sequence and acceptance checks

1. Identify NFC reader, tag type, buzzer and available advertiser/base boards. Reuse the demonstrated SSD1315 interface, verify its actual appearance, read a real tag and verify buzzer operation before final enclosure design.
2. Make one station advertise and one base reliably identify it. Log RSSI and calibrate bands with hands/enclosure in place.
3. Integrate taking and scanning a tile to enable the printed question. Verify A-D are ignored before a valid scan, and expected tiles are rejected while FAR/NEAR/SEARCHING/LOST or stale. Verify the same tile is accepted on entering fresh CLOSE.
4. Integrate correct-answer validation of the pending tile, immediate target advancement, duplicate rejection and physical tile attachment; do not require a second scan.
5. Add second station, completion, return inspection and staff reset/redemption.
6. Verify power-loss recovery; wrong station; answer presses before scanning; wrong/repeated tile scans; held buttons; lost/expired beacon; changing targets while the old target remains CLOSE; pending-question retries after leaving range; staff-assisted recovery; independent progress on two bases if a fourth board is available.
7. Run a full visitor trial without developer explanations, including the return desk. Check that beeps are understandable, tiles stay attached during walking and every kit can be reset and replenished.

Unresolved integration decisions: NFC reader/interface/driver and its pin allocation; actual passive-buzzer electrical ratings; venue calibration of gate/timing; power/runtime; enclosure and connector design; picture tiles versus blocks/hybrid and their starting inventory; final station count; approved exhibit questions; persistence; prize policy; and staff inventory/override workflow. These do not change the overall architecture.

## Browser simulator contract

The detailed browser requirements, acceptance cases and known implementation gaps are in [SOFTWARE_SPECIFICATIONS.md](SOFTWARE_SPECIFICATIONS.md). In particular:

- The map supplies synthetic coordinates and beacon distance. It does not connect to hardware or locate a real visitor. The browser gate is distance <= 30 map units from the current target; do not turn that value into a firmware metre/RSSI threshold.
- The browser has a default two-station route, seven preloaded image pieces and two collectible tiles in a 3x3 plate. The isolated UI lab covers zero, one, two and nine stations.
- The browser map, clickable answer alternatives, next-step panel, progress bar and collapsing question layout are page features. The real handheld remains the original navy design, with buttons and a status OLED.
- The 400 px fixed browser device width is a rendering constraint, not an enclosure dimension in millimetres. Narrow screens scroll its viewport; the surrounding map/question layout reflows.
- Browser state tracks station/tile types and illustrative attachment. It does not implement unique physical NFC tag identity, authenticated staff operations, real beacon freshness, RSSI filtering/hysteresis/dwell or hardware power-loss guarantees.

## Implementation status at this review

| Area | Evidence in this workspace | Remaining work |
| --- | --- | --- |
| Combined firmware | `ibeacon-demo/nrf54l15`: live target filtering, RSSI smoothing, proximity gate, Button 0 touch substitute, debounced A-D, OLED/buzzer scheduler, retries and ordered route; built/flashed | Physical display/input/sound and complete two-station visitor trial |
| Station beacon | `ibeacon-demo/esp32-c3`: built/flashed ESP32-C3, matching UUID/major/minor, 100 ms advertising; live reception observed | Add station 02 hardware; venue calibration, power and mounting trials |
| OLED | Combined game screens rendered through actual C driver with mock I2C; earlier standalone HELLO logs recorded successful I2C | Latest combined-app hardware check found no OLED at 0x3C/0x3D; fix/verify wiring and panel appearance |
| Browser game | `jelling-emulator/dist/app.js`, `map.js`, `check-game.cjs`, UI lab and UX evidence | See software specifications for configuration/storage gaps; no hardware connection |
| NFC/reward identity | Button substitute in hardware; browser tile-type simulation | Actual reader, physical UIDs, tile/block/pack mapping and duplicate/replacement handling |
| Assembly | 3×3 browser illustration and mechanical baseline; block/hybrid options documented | Physical kit and retention design; no electronic attachment/shape sensing |
| Persistence/staff | Browser localStorage and illustrative return checklist/redemption | Hardware RAM-only; implement durable sessions and controlled assistance/reset/redemption |

Both hardware projects have been programmed and live radio reception recorded. This documentation change itself does not modify firmware or flash devices. Build/test/flash evidence and current constants are detailed in [ibeacon-demo/README.md](ibeacon-demo/README.md). The [project guide](PROJECT_DOCUMENTATION.md) describes the complete scope and alternatives.

## Reference links

- Event equipment inventory: https://techathon.dk/
- Nordic nRF54L15 DK hardware: https://docs.nordicsemi.com/r/bundle/ug_nrf54l15_dk/page/ug/nrf54l15_dk/intro/intro.html
- Nordic clarification that NFC reading requires external hardware: https://devzone.nordicsemi.com/f/nordic-q-a/125399/nfc-tag-read-usingnrf54l15-sdk
- Bluetooth proximity limitation: https://developer.apple.com/documentation/corelocation/clbeacon/accuracy?language=objc
