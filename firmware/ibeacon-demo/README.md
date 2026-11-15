# ESP32-C3 beacon + nRF54L15 waypoint game

See the [whole-project guide](../PROJECT_DOCUMENTATION.md) for scope, the browser
simulator and tile/block construction options.

This is the combined firmware. `esp32-c3` is the fixed iBeacon transmitter;
`nrf54l15` is the handheld BLE receiver, SSD1315 display, passive buzzer and
four-button quiz. The older `buzzer-test` and `ssd1315-demo` remain separate
hardware demos. The combined app uses **live RSSI**, not simulated distances.

## Visitor flow

1. On boot the Nordic follows only station 01. Its OLED shows the station,
   estimated distance, SEARCHING/FAR/NEAR/CLOSE and a ten-segment band indicator.
   SEARCHING is silent. FAR, NEAR and CLOSE use 1000, 400 and 100 ms gaps
   between 60 ms, fixed-pitch 2 kHz beeps.
2. CLOSE must be stable before `B0 TOUCH` appears. At least five samples are
   needed, the CLOSE band must dwell for one second, and a matching packet
   must have arrived within the past second. Press **Button 0** to simulate
   touching the station's NFC tag. This is a button placeholder, not an NFC driver.
3. The OLED displays a question with four options. Release Button 0, then use
   **Button 0=A, Button 1=B, Button 2=C, Button 3=D**. A held touch cannot submit
   A. Buttons are debounced; simultaneous presses are ignored until release.
4. A wrong answer shows WRONG for 1.5 seconds, then returns to the same question.
   A correct answer shows CORRECT for 1.5 seconds, then selects the next beacon.
   Beeping is silent during questions and answer feedback.
5. Changing targets clears all previous RSSI/filter/close eligibility. The
   receiver ignores the previous beacon even if it remains nearby and strong.
   When the future station 02 is absent, it simply stays SEARCHING for station 02.
   After the last configured station it displays ALL DONE and stays silent.

The default first question is "WHAT IS TWO / PLUS TWO?": **B (4)** is correct.
The future second question asks which option is a colour: **A (BLUE)** is correct.

## Set your beacon IDs and route

No MAC address is required. Both flashed boards already match by **UUID +
major + minor**. These identities remain meaningful even if a radio address
changes; no additional ID needs to be supplied for this pair:

- UUID: `7b8a2f10-6c45-4d9e-a123-54726b617468`
- Major: `1` (exhibition)
- Minors: `1` for station 01 and `2` for the future station 02

On **each ESP**, set `BEACON_MINOR` in `esp32-c3/main/station_config.h` before
building/flashing that unit. UUID, major and the 1 m calibration byte are in
`common/beacon.h`. The ESP sends a 30-byte, nonconnectable legacy iBeacon
advertisement about every 100 ms on all advertising channels. No pairing or
Wi-Fi is required. ESP-IDF defaults determine radio transmit power; keep it
fixed after calibration.

On the **Nordic**, edit the ordered `route[]` in `nrf54l15/src/route.c`. Each
entry contains its UUID, major, minor, station label, two question lines,
four answers, correct option (0=A through 3=D) and path-loss exponent. Different
UUIDs or majors per station are supported. Add/remove/reorder entries there;
route length is derived automatically. To run only one station, remove the
second entry. To prepare more ESPs, add matching entries and flash each ESP
with its corresponding minor.

The route validates one to nine entries, unique full beacon identities,
nonempty question/answer strings, display length limits and valid answer keys.
Labels may be at most 14 characters, question lines 20, answer text 8; use
uppercase A-Z, digits, spaces, question marks, hyphens and periods.
Invalid configuration displays CONFIG, mutes beeps and disables the quiz.

Progress is currently **RAM only**: reset/power cycling restarts at station 01.
There is no real NFC reader, persistent session, staff reset flow or MAC-only
filter in this prototype. Public beacon IDs are not authenticated proximity
proof. A touched station's question remains enabled after moving away or
losing its signal, just as an accepted tag touch would latch that question.

## Connections — power off before wiring

For the existing four-pin **128x64 SSD1315 I2C module supporting 3.3 V** and
confirmed passive HW-508 variant:

| Component pin | nRF54L15 DK connection |
| --- | --- |
| OLED VCC | VDDIO configured to 3.3 V |
| OLED GND | GND |
| OLED SCL / SCK | P1.11 |
| OLED SDA | P1.12 |
| Passive buzzer S | 1 kohm resistor → P1.14 |
| Passive buzzer − | GND |
| HW-508 middle pin | Leave disconnected if unconnected on your variant |

Use printed 11/12/14 on PORT P1, not physical header positions. Both devices
share ground. P1.14 also drives onboard LED3, which may light while beeping.
Do not use OLED VBUS/5 V or apply 5 V to GPIO. I2C pull-ups must go to 3.3 V;
typical modules include them. If absent, add one 4.7 kohm pull-up per I2C line.
The driver detects OLED address 0x3C or 0x3D. Active/magnetic buzzers or speakers
need their appropriate driver circuitry; the direct resistor wiring above is
for the confirmed passive piezo variant only.

The onboard buttons need no additional wiring. The board definitions map:

| Button | GPIO | Function |
| --- | --- | --- |
| Button 0 | P1.13 | Simulated tag touch when ready; answer A in quiz |
| Button 1 | P1.09 | Answer B |
| Button 2 | P1.08 | Answer C |
| Button 3 | P0.04 | Answer D |

If the OLED is unavailable, the app retries initialization every five seconds.
Button actions and beeps stay disabled until a matching screen is successfully
rendered; BLE scanning and serial status remain active.

## Build and flash

ESP32-C3 using the installed **PlatformIO** setup (the path verified on hardware):

```sh
pio run --project-dir esp32-c3
pio run --project-dir esp32-c3 --target upload --upload-port /dev/cu.usbmodem21301
```

`platformio.ini` pins Espressif32 7.0.1 with Arduino-ESP32 2.0.17 and enables
the ESP32-C3 native USB console. `main/arduino_entry.cpp` calls the same C
beacon code used by ESP-IDF; it keeps BLE memory available at Arduino startup.
Change the upload port to the ESP's current port if needed.

Alternatively, from an activated **ESP-IDF 5.4.x** terminal:

```sh
cd esp32-c3
idf.py set-target esp32c3
idf.py build
idf.py -p YOUR_ESP_SERIAL_PORT flash monitor
```

Set the board's console connection in `idf.py menuconfig` if required. Boards
using only native USB can select USB Serial/JTAG as the console. Some boards
need BOOT held while resetting to enter download mode. This standalone app's
standard NVS recovery may erase the NVS partition if it is incompatible/full.

Nordic, from an activated **nRF Connect SDK v3.4.2** terminal:

```sh
cd nrf54l15
west build -p always --no-sysbuild -b nrf54l15dk/nrf54l15/cpuapp -d build/direct .
west flash -d build/direct
```

Or open `nrf54l15` as an application in the Nordic VS Code extension. The
initial pristine build discovers the new display/buzzer overlay even when
upgrading an old receiver-only build. Serial: 115200 baud, VCOM 1; on the
current DK this is `/dev/cu.usbmodem0010577170953`.

In the restricted local environment, builds additionally use
`-DUSER_CACHE_DIR=/tmp/techathon-zephyr-cache` and
`CCACHE_DIR=/tmp/techathon-ccache` to keep caches writable.

## Distance calibration and thresholds

RSSI is an **approximate proximity estimate**, not accurate metre-level ranging.
The user carries the Nordic, and distance refers to the two boards' antennas.
Bodies, antenna orientation, walls and reflections can shift readings heavily.
The numeric OLED value is prefixed EST to reflect that uncertainty.

1. Place the two boards one metre apart in their final cases/orientation and
   collect 30–60 seconds of serial RSSI readings.
2. Set `BEACON_RSSI_AT_1M` in `common/beacon.h` to the median raw RSSI and
   reflash that ESP. The default -59 dBm is an uncalibrated placeholder, not
   the transmitter's radio power setting. The Nordic reads the byte from packets.
3. Measure at known distances such as 2 m and 4 m. Tune the corresponding
   route entry's `path_loss_exponent` (starting value 2.0), then rebuild Nordic.
   Model: `metres = 10^((RSSI_at_1m - filtered_RSSI) / (10 * exponent))`.
4. Tune the proximity bands onsite in `src/game.c`. CLOSE enters at or below 1.5 m
   and exits above 1.8 m. FAR enters around 5 m, with 4.5/5.5 m hysteresis
   against NEAR. Transitions dwell for 500 ms; close eligibility requires a
   further 1000 ms. These are initial tuning values, not guaranteed distances.

RSSI is exponentially smoothed (alpha 0.20). Duplicate reports are enabled.
After five seconds without the current beacon, the screen returns to SEARCHING,
sound stops and touch is unavailable. The next sample resets the filter.
Scan eligibility uses the stricter one-second freshness window. Continuous
passive scanning increases receiver power use.

## Implementation and verification

[OLED screen previews rendered through the C display driver](docs/oled-screens.png)


- `src/main.c`: BLE filtering, 20 ms button polling, nonblocking tone scheduler,
  and a separate OLED thread with a one-frame coalescing queue.
- `src/game.c`: portable game state machine, hysteresis, dwell and eligibility.
- `src/button_filter.h`: debounce, chord rejection and release gating.
- `src/route.c`: ordered waypoint/question configuration and validation.
- `src/oled.c`: 128x64 font/layout and SSD1315 I2C driver reused from the demos.

Screen/tone updates share a revision: a new cadence starts after its matching
screen has rendered successfully. I2C transfers never block button polling or
the tone scheduler. Proximity bands share one game state with the screen.

From the workspace root, run the meaningful host tests:

```sh
cc -std=c11 -Wall -Wextra -Werror -fsanitize=address,undefined \
  -I ibeacon-demo/common ibeacon-demo/tests/test_beacon.c -lm \
  -o /tmp/techathon-beacon-test
/tmp/techathon-beacon-test
cc -std=c11 -Wall -Wextra -Werror -fsanitize=address,undefined \
  -I ibeacon-demo/common -I ibeacon-demo/nrf54l15/src \
  ibeacon-demo/tests/test_game.c ibeacon-demo/nrf54l15/src/game.c \
  ibeacon-demo/nrf54l15/src/route.c -lm -o /tmp/techathon-game-test
/tmp/techathon-game-test
```

Tests exercise packet bytes, wrong/truncated identifiers, calibration/RSSI
validation, smoothing/timeouts, route validation, current-target matching,
fresh/stable close gating, wrong-answer retry, correct-answer progression,
completion, hysteresis, button bounce, chords and held-button suppression.
Tests assume the shipped example route/IDs; update expectations with configuration.

On hardware: confirm OLED initialization; advertise only the current target;
verify RSSI/proximity and calibrate; press B0 outside CLOSE (must do nothing);
enter stable CLOSE and touch; hold B0 (must not choose A); release and answer A
(wrong at station 01); retry with B; verify station 02 stays SEARCHING while
only station 01 is powered. Add the second ESP and finish its question. Remove
beacon power to verify SEARCHING and revoked touch. Check response while
repeatedly pressing/releasing buttons and while the OLED is refreshing.

The ESP transmitter was built/flashed using PlatformIO and its installed
Arduino-ESP32 SDK; the alternative standalone ESP-IDF path was not built.
Do not interpret successful radio reception as calibrated physical ranging.

References:
- [Espressif iBeacon example, v5.4.2](https://github.com/espressif/esp-idf/tree/v5.4.2/examples/bluetooth/bluedroid/ble/ble_ibeacon)
- [Zephyr observer sample](https://docs.zephyrproject.org/latest/samples/bluetooth/observer/README.html)
- [Nordic DK board definitions](https://github.com/nrfconnect/sdk-zephyr/blob/main/boards/nordic/nrf54l15dk/nrf54l15dk_common.dtsi)

## Local verification status (2026-11-14)

- Both boards built and flashed successfully; programming verification passed.
- Subsequent updates were flashed: ESP advertising interval 100 ms; Nordic
  CLOSE entry at or below 1.5 m (exit above 1.8 m). Game tests passed at the
  1.5 m entry boundary.
- ESP32-C3 MAC: `e8:3d:c1:95:8c:1c`, on `/dev/cu.usbmodem21301`.
- Nordic DK: `1057717095`; combined firmware uses about 92 KB flash / 24 KB RAM.
- Shared first target: UUID `7b8a2f10-6c45-4d9e-a123-54726b617468`, major 1,
  minor 1. Future station 02 is configured as minor 2.
- Nordic serial confirmed live matching beacon reception: `fresh=1`, CLOSE,
  RSSI approximately -41 to -44 dBm. Estimated distance around 0.13–0.17 m
  is uncalibrated and is not a physical distance measurement.
- OLED still did not acknowledge at 0x3C/0x3D. The app retries every five
  seconds; beeps and button actions wait for the OLED to render successfully.
  Check VCC=VDDIO 3.3 V, GND, SCL=P1.11 and SDA=P1.12 with power disconnected.
- Protocol and game tests passed under AddressSanitizer/UndefinedBehaviorSanitizer.
- All eight OLED screens were rendered through the actual C driver using a
  mock I2C bus; layout was visually inspected. This does not prove panel wiring.
- Physical display/sound/button operation and distance calibration still need
  checking after the OLED connection is restored.
