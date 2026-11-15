# Jelling handheld — manufacturer-based CAD draft

**STATUS: NOT RELEASED FOR FABRICATION. Units: millimetres, STEP at 1:1 scale.**

This is a reviewable mechanical design, not a claim that the purchased hardware
has been fitted. Unknown hardware dimensions are `null` in
`sources/dimensions.json`; the HW-508 has a user-measured 15 × 19 mm footprint
and 11.7 mm overall height. Its approximate mounting inputs drive an adjustable
platform, with no invented PCB thickness, body shape or pin projection.
Separate nominal-size STL parts are included for prototyping. Their availability
does not mean that printed clutch fits or a complete physical assembly have been
verified.

## Open the model

For quick bench checks before a full print, see
[`fit-test-templates/PRINT-AND-TEST.md`](fit-test-templates/PRINT-AND-TEST.md).
That pack includes thin hole-pattern gauges, button/window checks, a LEGO
coupon, a thickness comparator and optional replicas of the mounting supports.

- `output/jelling_DRAFT.step`: coloured assembly, including separate shell,
  lid, 12 × 12 stud plate, buttons and clearly named hardware reference geometry.
- `output/preview.png`: assembled and open views.
- `output/01_base_DRAFT.step`, `02_lid_DRAFT.step`, and button STEP files:
  individual editable parts.
- `output/verification.json`: topology checks, design-part collision checks,
  sourced button positions and release blockers.
- `model.py`: editable CadQuery source.
- Matching `.stl` files: separate prototype print parts, excluding PCB references.
- `output/03_LEGO_12x12_plate_DRAFT.step`: separate 144-stud mounting plate.
- `output/stud_fit_coupon_NOMINAL.stl`: small 2 × 2 stud test for the selected
  printer/material; flat underside, intended to test the top studs only.

Import the STEP into FreeCAD, Fusion, Onshape, SolidWorks or another STEP-capable
CAD tool. Use millimetres. References are not print parts. The OLED PCB uses the
user-measured 1.65 mm thickness and 4.3 mm PCB/display stack. The connector has
been removed and its cables are soldered to the back, as confirmed by the user.
The nRF reference is a bare PCB plus simplified nominal switch
envelopes; it does not model all populated components, connectors or headers.

## Geometry and provenance

The four **enclosure PCB mounting axes** come directly from the user's supplied
`54L15_Helmet.step` (retained in `sources/`). They are (8, 5), (12.6, 58.5),
(106, 5), (113.1, 58.5), with 3.2 mm diameter cylindrical surfaces. STEP units
are explicitly millimetres. `inspect_holder.py` extracts these analytic surfaces
without estimating from an image. The original holder is not fitted inside the
new enclosure; its mounting pattern is used as the authoritative reference.
The other two holes in Nordic's drill file are retained in the reference PCB
but are not used as enclosure supports.

The buzzer footprint **15 × 19 mm** is the user's physical measurement, supplied
14 November 2026. The roughly **7.7 mm minimum mounting-hole distance** is
recorded as provisional information only and is not treated as an exact
centre-to-centre spacing or used to create holes.

The user confirmed **two holes, top left and top right**, **around 2 mm** in
diameter, with the nearest rims **around 1.2 mm from the side edges** and
**around 1.3–1.5 mm from the top edge**. Taking the 15 mm dimension as width,
the nominal derived centres are (2.2, 16.6) and (12.8, 16.6), relative to the
PCB's bottom-left corner. This gives 10.6 mm nominal pitch. These are approximate
derived positions, not newly verified exact measurements.

The base has an integrated platform with **4 × 2.4 mm slots** at those
nominal centres. Slot sizes are enclosure design choices to allow adjustment.
The platform top is Z = 8.4 mm, with **3.6 mm free below it to the case floor**
between its supporting legs. Board centre is (86.5, 14.5) in case coordinates.
The 17 × 6 mm platform and its legs fit beside the nRF PCB and clear the OLED
mounting posts; the board was moved internally to accommodate these supports.
Choose small through-fasteners and washers after checking the actual PCB holes;
fastener length and clamping fit have not been verified.

The user supplied **11.7 mm total height including pins**. Reserving that full
height above the mounting platform gives Z = 20.1 mm, **4.15 mm below the lid**.
This is a conservative upper bound for the buzzer alone, not a populated-assembly
clearance approval. The portion below the PCB and its thickness remain unknown,
so pin-to-floor and pin-to-platform clearance are still unverified. The model
shows only a zero-thickness PCB footprint and approximate hole references,
not a made-up buzzer body or pin arrangement.

### OLED supports

The user supplied **1.65 mm PCB thickness** and **4.3 mm back-of-PCB to front
glass thickness**, and confirmed removal of the Grove connector. The base has
three 5 mm diameter posts at the vendor hole centres, with 1.6 mm diameter,
6 mm deep pilot bores. Pilot size is an enclosure fastener design choice.

Post tops / PCB back: **Z = 21.6 mm**. Posts rise **19.2 mm** above the floor.
PCB front: **Z = 23.25 mm**. Glass front: **Z = 25.9 mm**, recessed **1.35 mm**
below the lid top. A 43 × 25 mm underside relief pocket reaches Z = 26.25,
leaving a 1 mm roof around the display opening and 0.35 mm clearance above the
measured maximum front plane. Soldered wires route underneath the PCB.

### 12 × 12 stud plate

The cream plate replaces the nine picture-tile inserts in the same upper area.
It has **144 studs**, **8 mm pitch**, **4.8 mm nominal diameter** and
**1.8 mm stud height**, on a **3.2 mm thick** body. The 12-stud exterior is
**95.8 × 95.8 mm**, using the drawing's 0.2 mm total part gap, centred at
(70, 124). The outer size is an extrapolation of the published 2 × 4 plate grid.

Physical-dimension reference: [Christoph Bartneck's plate 3020 drawing](https://www.bartneck.de/wp-content/uploads/2019/04/lego-2x4-plate-dimensions-measurements-3020.pdf),
retained as `sources/lego-3020-reference.pdf`; this is an independent technical
drawing, not a LEGO manufacturing specification. `sources/lego-system-reference.json`
records the dimensions and distinguishes them from LDraw's simplified virtual
stud height. No printer compensation is silently applied.

The body rests in a 0.8 mm deep lid recess with 0.3 mm clearance per side.
Four 2.4 mm fastening holes at (30, 84), (110, 84), (30, 164), (110, 164) lie
between the studs, preserving every stud. The plate has 4.2 mm diameter,
1.6 mm deep head counterbores. These mounting features are our design choices;
the underside is flat and does not reproduce LEGO anti-studs. Use small
through-bolts and nuts with appropriate heads; select lengths after checking
the actual hardware stack. The nominal studs should be checked with the small
fit coupon before printing the full plate.

Retrieved 14 November 2026 from these primary manufacturer sources:

1. [Nordic nRF54L15-DK hardware files](https://www.nordicsemi.com/Products/Development-hardware/nRF54L15-DK/Hardware-files?lang=en)
   — [PCA10156 v1.0.0 archive](https://nsscprodmedia.blob.core.windows.net/prod/software-and-other-downloads/dev-kits/nrf54l15-dk/pca10156-nrf54l15-dk-1_0_0.zip).
   The original `400708.PcbDoc`, pick-and-place CSV and Excellon drill file are
   retained under `sources/`. The board outline is extracted directly from the
   Altium record, including arcs and the chamfered corner. Bare PCB thickness
   **1.57634178 mm** is the sum of the file's active `V9_STACK_LAYER` copper,
   dielectric and solder-mask thicknesses; this is nominal source data, not an
   asserted manufacturing tolerance or a measurement of your particular board.
   Six 3.2004 mm mounting holes are transcribed from the drill file. Drill output
   has 0.00254 mm coordinate resolution; the extra decimal places reflect file
   unit conversion, not greater real-world accuracy.

2. [Seeed Grove SSD1315 documentation](https://wiki.seeedstudio.com/Grove-OLED-Display-0.96-SSD1315/)
   — [Grove SSD1315 v1.0 Eagle archive](https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1315-/res/Grove%20-%20OLED%20Display%200.96%20%28SSD1315%29_v1.0.zip).
   `sources/grove_ssd1315_v1.0.brd` retains the actual outline, including tabs,
   notches and arcs. The PCB is not represented as a generic 40 × 20 rectangle.
   Its outline spans approximately 42.1 × 24.2 mm including tabs. U5 has no
   rotation and is translated −0.0045 mm in X in the vendor file; that small
   translation is retained. Its three mounting holes are 2.2 mm in diameter,
   centred at (−10.0045, −10), (−10.0045, 10), (19.9955, 0).

3. [OLED panel specification linked by Seeed](https://files.seeedstudio.com/wiki/Grove-OLED-Display-0.96-SSD1315-/res/OEL%20Display%20Module.pdf),
   ZJY-2864KSWPG01 revision C, mechanical specification and drawing, PDF pages
   4–5. Panel: **24.74 × 16.9 × 1.42 mm**, active area: **21.74 × 10.86 mm**.
   The drawing gives panel width/height tolerance ±0.2 mm, thickness ±0.1 mm
   and general tolerance ±0.3 mm. These are panel values, not the assembled
   Grove module thickness. Eagle U4 locates its panel centre at (6.35, 0).

### Exact onboard button alignment

| Label | Nordic reference | Vendor X | Vendor Y | Enclosure X | Enclosure Y |
|---|---|---:|---:|---:|---:|
| A | SW2 / Button 0 | 87.9176 | 14.0576 | 28.0576 | 41.0824 |
| B | SW3 / Button 1 | 98.1792 | 14.0576 | 28.0576 | 30.8208 |
| C | SW5 / Button 2 | 87.9176 | 4.5580 | 18.5580 | 41.0824 |
| D | SW6 / Button 3 | 98.1792 | 4.5580 | 18.5580 | 30.8208 |

The PCB is rotated −90° with its component side facing upwards, then translated
using `Xcase = Yboard + 14`, `Ycase = 129 − Xboard`. Rotation preserves every
distance. Switch pitch is 9.4996 × 10.2616 mm. The labels follow the existing
firmware mapping, so the visible rows are **C A / D B** in this orientation.
These switches cannot support the website's oversized, widely spaced A–D keys
with straight vertical plungers; a different visual order or a lever mechanism
would be a separate design decision.

The pick-and-place descriptions specify a 6.2 × 6.3 × 2.5 mm switch envelope.
The draft plunger reach uses that nominal 2.5 mm height and a *designed* 0.25 mm
initial gap. It is not a sourced switch stroke, nor a validated working clearance.
The cap flange limits downward travel to 0.35 mm in the nominal CAD assembly.
Actual switch travel/tolerances must be checked before producing the buttons.

## Enclosure choices — not hardware measurements

The navy shell, cream stud plate, recessed display, four button extensions and
NFC blank follow the local `jelling-emulator/dist/index.html` design. The outer
enclosure and control positions are retained. The upper picture-tile inserts
are replaced with the requested stud plate.

| Designed feature | Size / location |
|---|---|
| Shell | 140 × 192 mm, 16 mm plan corner radius |
| Base | 24 mm high, 2.4 mm floor and walls |
| Lid | 3 mm thick, underside Z = 24.25 mm |
| Bare PCB underside | Z = 8 mm, subject to populated-board clearance check |
| Stud plate | 12 × 12 studs, 95.8 × 95.8 mm body; see measured reference above |
| Button caps | 6.8 mm wide, 0.3 mm sliding clearance per side |
| Screen aperture | Panel outline plus 0.3 mm per side |
| OLED supports | Three 5 mm posts, 19.2 mm high, using vendor hole positions |
| NFC blank recess | 25 × 28 × 0.6 mm, 2.4 mm plastic remains |
| Buzzer grille | Seven 1.6 mm holes; does not specify buzzer dimensions |
| Cable outlet | 20 mm wide × 11 mm high, at top edge, routing unverified |
| Case fastening | Four 3.4 mm lid clearance holes and 2.5 mm base pilot holes |

A local clearance notch at the front-left internal case boss clears the DK's
board corner at PCB height while keeping the case screw and PCB mount positions.

The nominal M3 pilot sizes, printed sliding clearance, shell thickness, arbitrary
reserved space and assembly gap are engineering choices to test and adjust.
They are not manufacturer specifications. Select fastener type and length only
after confirming the assembly and the printed material. No heat-set inserts are
assumed. The top-edge cable outlet is not presented as an exact USB connector
cutout. There is no battery or battery envelope in this design.

## Unresolved before fabrication

1. **Confirm your DK revision.** The model uses PCA10156 v1.0.0 for switch and
   outline geometry and the supplied holder's exact pattern for case mounts.
   A physical board revision has not been supplied or inferred.
2. **Dry-fit the HW-508 platform.** The user supplied its 15 × 19 mm PCB
   footprint, 11.7 mm total height and approximate hole rim offsets. The slotted
   platform accommodates adjustment; fit and fastening still need checking.
   Confirm PCB thickness, actual pin projection below the PCB, header arrangement
   and any bottom components against the platform and 3.6 mm floor gap.
3. **Check the assembled OLED wiring.** The support heights use the supplied
   1.65 / 4.3 mm measurements, with the Grove connector removed. Verify solder
   joints, cable routing and strain relief during physical assembly.
4. **Check the populated DK envelope**, underside components, header/jumper
   heights, power switch, reset access, USB lead bend and wire routing. Bare PCB
   geometry alone cannot establish these clearances. No complete board-to-lid
   collision check is claimed.
5. **Validate button travel and return.** Fit a tolerance sample and measure
   switch stack before finalising shaft lengths. Confirm no continuous preload,
   reliable release and enough movement before the flange reaches the lid.
6. **Choose any future NFC reader.** The blank is a placeholder only, with no
   promised reader fit or read range. It is not modelled as a working reader.
7. Complete a physical dry assembly and select/calibrate the manufacturing
   process, fastening and printed stud fits before treating the prototype as a
   finished assembly.

## Rebuild

Python 3.12 with `cadquery==2.8.0` and `matplotlib==3.11.2` was used.

```sh
python extract_dimensions.py
python inspect_holder.py
python model.py
python stud_fit_coupon.py
```

The extractor reads local vendor files and regenerates `sources/dimensions.json`.
The model validates every CAD object, checks that each designed part is a single
solid, checks designed parts for volumetric overlap and reimports the exported
STEP. It also checks the modelled nRF PCB, OLED PCB and panel against designed
parts for volumetric interference. These checks cover only the geometry present
in the file and do not establish the full populated-board envelope or printed fit.
