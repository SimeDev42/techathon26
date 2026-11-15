# Quick fit-test templates

Print these before the whole enclosure. Each STL is a separate part, already
flat on Z = 0. **Units are millimetres; print at 100% scale in X, Y and Z.**
The STEP files contain the same geometry and remain editable.

## Start with the thin gauges

The flat gauges are **1.2 mm thick**: six layers at 0.2 mm layer height. Their
carrier shapes are lightweight test tools, not copies of the PCB outlines.
Only their specified interfaces reproduce the enclosure/hardware dimensions.
Use the printer, material and dimensional compensation intended for the final
parts. Print the flat gauges and LEGO coupon with their flat bottoms on the bed;
they need no supports. Slicer estimates determine actual print time.

| File | Test | What should fit |
|---|---|---|
| **01_nrf_XY_hole_frame** | nRF mounting pattern | All four PCB mounting holes line up simultaneously; 3.2 mm through-holes match the supplied holder |
| **02_oled_XY_hole_frame** | Grove OLED mounting pattern | All three 2.2 mm PCB holes line up simultaneously |
| **03_buzzer_XY_round_holes** | Approximate buzzer measurements | Two nominal 2 mm holes, 10.6 mm apart, align with the actual board |
| **04_nrf_buttons_alignment** | Button-to-board alignment | Four nRF mounting holes register the frame; four 7.4 mm rounded-square windows sit over SW2 / SW3 / SW5 / SW6 |
| **05_oled_window** | Display opening | The 25.34 × 17.5 mm opening clears the glass outline and exposes the display area |
| **09_LEGO_2x2_stud_fit** | Printed LEGO stud fit | A real brick/plate connects and releases with suitable clutch force |
| **10_thickness_comparator** | Measured thicknesses | Open slots compare 1.65 mm PCB, 4.3 mm OLED stack and 11.7 mm total buzzer height |

For the fastest first check, print **01, 02, 03 and 09**. Add 04, 05 and 10 as
needed. Gauge 04 repeats the nRF mounting pattern so you can print it instead
of 01 if you also want to inspect button alignment immediately.

### Check hole patterns

1. Align each gauge using its asymmetric mounting-hole pattern. Lightly insert
   all matching screws or smooth pins before tightening anything. The flat
   gauges check XY positions and hole sizes; they do not check component height.
   They may be held above the PCB if underside components prevent flat contact.
2. If a fastener will not pass through even one printed hole, measure that hole
   first. Printer undersizing and a wrong hole pattern are separate issues.
3. Record whether every hole aligns at once, the measured printed hole diameter,
   and any direction/amount of misalignment. Avoid bending the thin frame to fit.

Useful independent distances:

- **nRF:** lower hole centres (8, 5) and (106, 5) are **98 mm apart**; upper
  centres (12.6, 58.5) and (113.1, 58.5) are **100.5 mm apart**. The rows are
  **53.5 mm apart**. These come from the supplied holder STEP.
- **OLED:** left holes are **20 mm apart vertically**; the right hole is
  **30 mm to the right** and centred between them vertically. These come from
  Seeed's PCB file.
- **Buzzer:** nominal hole centres are **2.2 mm from each side** and **2.4 mm
  below the top edge** of the 15 × 19 mm board. These are derived from your
  approximate 2 mm hole diameter, 1.2 mm side-rim clearance and 1.3–1.5 mm
  top-rim clearance. The gauge uses the midpoint of that top range. This is a
  measurement hypothesis to test, not an independently verified exact drawing.

For 04, the source-board orientation puts A/B above C/D: A = SW2, B = SW3,
C = SW5, D = SW6. The final enclosure rotates this board −90°, preserving
the actual positions. The windows reproduce the lid guides; they are not
measurements of the switch actuator shape. Inspect centring over each switch.

Hold 05 gently over the front of the OLED. Do not force the glass into a tight
printed opening. This checks the actual enclosure aperture, including its
0.4 mm corner radius; it does not register the PCB's screw holes.

For 10, each measured thickness has a nominal slot and a **+0.2 mm** companion:
**1.65/1.85**, **4.3/4.5**, **11.7/11.9 mm**. The larger slots are explicit
test allowances, not changes to your hardware measurements. Compare accessible
edges gently; do not clamp or press on the OLED glass. A successful fit in only
the larger slot may indicate printed-slot undersizing, measurement uncertainty,
or both. The card is not a replacement for calibrated calipers.

## Optional support-height tests

These reproduce the actual enclosure support geometry on a minimal 1.2 mm
carrier. Measure heights **from the top of the carrier**, representing the top
of the enclosure floor. The carrier thickness is intentionally smaller than the
case floor to reduce print time; the floor-to-PCB distances remain the same.

| File | Same geometry as the enclosure | Check |
|---|---|---|
| **06_nrf_support_height** | Four 6 mm posts, **5.6 mm high**, 2.5 mm pilot bores | Board seating, underside clearance and intended fasteners |
| **07_oled_support_height** | Three 5 mm posts, **19.2 mm high**, 1.6 mm pilot bores 6 mm deep | Board seating and room underneath for your soldered wires |
| **08_buzzer_slotted_support** | **3.6 mm gap** under a **2.4 mm platform**, two **4 × 2.4 mm slots**, 10.6 mm pitch | Actual slotted mounting and pin/solder clearance underneath |

The pilot bores are the enclosure's fastener design sizes; they are deliberately
different from the PCB through-hole diameters on 01 and 02. These optional
coupons test that distinction before the full base is printed. Do not enlarge
the PCB holes to match a support.

06 and 07 print upright without supports. 08 contains the actual **13 mm
bridge** between its legs: use your normal bridge settings or support it if
your process requires this. This also tests how that feature will print in
the full base. Confirm pins/solder remain above the carrier and the PCB rests
on the platform rather than on its pins.

## Report results

| Test | Pass / adjustment | Measured value / error |
|---|---|---|
| Four nRF mounting holes | | |
| Three OLED mounting holes | | |
| Two buzzer round holes | | |
| Four button centres | | |
| OLED window | | |
| LEGO clutch fit | | |
| PCB/module thicknesses | | |
| nRF support and fasteners | | |
| OLED support and wires | | |
| Buzzer support and pins | | |

`dimensions-and-checks.json` records the original source coordinates, each
export's translation, dimensions and geometry/mesh checks. Exports only undergo
translation to the print bed: their XY distances are not scaled or mirrored.
The three round-hole patterns are checked against actual cylindrical CAD
surfaces, every STEP is re-imported, and each STL is checked for a watertight,
positive-volume mesh. Physical printed fits still need these bench tests.

Regenerate with Python 3.12 + CadQuery, matplotlib and trimesh:

```sh
python fit_templates.py
```

The source uses `sources/dimensions.json`, `sources/holder-analytic-geometry.json`,
`sources/lego-system-reference.json` and the current enclosure's
`output/verification.json`. Re-run the enclosure model first if its mounting
geometry changes. nRF post diameter/pilot values are copied explicitly from
the current `model.py`; update them together if those design choices change.
