# The Jelling Journey

See the [whole-project guide](../PROJECT_DOCUMENTATION.md) for hardware status,
project scope and physical tile/block options. The LEGO-style page below is
visual styling; it is not a 3D block-building mode.

Buildless interactive emulator. Serve `dist` with any static HTTP server, for example `python3 -m http.server 4173 --directory dist`.

Implements the browser portion of the two-station [architecture](../PROJECT_ARCHITECTURE.md) and [software specifications](../SOFTWARE_SPECIFICATIONS.md). The 0.96-inch SSD1315 OLED canvas is exactly 128×64 pixels. BLE proximity, NFC, physical placement, staff checks and prize handover are browser simulations, not hardware connections. Two demonstration questions are authored for the emulator, not asserted to be the supplied exhibition posters. Seven picture pieces are preloaded; two NFC tile types are collected on the 3×3 plate. The SVG artwork is a stylized interpretation of the supplied image. Reference accessible in the app.

Keyboard A/B/C/D, optional synthesized audio, quiet mode, local saved state, invalid tile handling, repeat scans, wrong-answer retries, independent tile placement and one-time redemption. Restart requires confirmation. No visitor identity or location history is stored.

## LEGO-style page variant

Open `dist/lego.html` for LEGO-inspired page styling. The original navy device markup and materials remain unchanged. Cera Pro font-face URLs were verified from LEGO.com public styles. The page uses a yellow header, bold headings, yellow outlined actions, blue accents and a dark footer. The original museum page remains at `dist/index.html`; both share game logic and progress.

## Proximity and device sizing

Scanning the current tile requires the CLOSE proximity band (within 30 map units of the current station). The scan button is disabled below that threshold and the NFC handler independently checks the same condition. An accepted question stays active for retries. Each new waypoint calculates proximity to its beacon from the player’s unchanged position. Both page variants share a fixed 400 px handheld with fixed control and plate dimensions; the page reflows and narrow viewports scroll the device area rather than resizing the object.

## Museum map simulation

The slider is replaced by a schematic SVG museum map with two fixed station beacons, a player and a return desk. Click or drag to move; keyboard arrows and labelled direction buttons are supported. Position saves with session progress. Proximity is computed only from the current target, and scanning requires a distance of 30 map units or less. This is an illustrative simulation, not a real floor plan or a calibrated measurement of BLE distance. Switching targets does not teleport the player.

## UX and stress tests

Both visitor pages now include a compact workspace, state-specific next action, dynamic collection progress, 44 px map controls, keyboard focus management, clickable answer choices, persistent return checks and a map that collapses while answering. The fixed navy product is preserved.

Use `http://127.0.0.1:4173/ui-lab.html?data=demo` for the isolated test data switch (demo, worst case, empty, one, nine stations, 200% text). Visitor progress is not shared with this route. The visitor pages do not load fixture controls. Run `node check-game.cjs` to verify controller behavior. See `UX_REVIEW.md` for findings, decisions, field limits and browser evidence.

## Specification status

The architecture and software specifications were updated on 14 November 2026, including the combined live-beacon hardware prototype. That firmware now uses a Button 0 NFC substitute and a 1.5 m CLOSE entry threshold; this browser still uses synthetic map units and separate game data. The ordinary scan gate is current-target CLOSE; beacon failure does not imply automatic tile-only acceptance. The browser has no live RF-loss input, physical NFC UID checks or authenticated staff controls. Complete malformed-route and saved-state validation also remain work to do. The software specification lists these gaps separately from the behavior verified in the simulator.
