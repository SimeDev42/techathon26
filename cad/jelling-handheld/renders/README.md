# Jelling Journey CAD renders

These images are rendered directly from the current STEP geometry. The enclosure,
144 studs, buttons, OLED window, NFC blank, speaker holes and internal supports
retain their modelled dimensions. Colour, surface finish and studio lighting are
illustrative. No extra mechanical features are introduced for the images.

| Image | View |
|---|---|
| `01_hero.png` | Assembled front three-quarter |
| `02_top.png` | Assembled top view |
| `03_rear_quarter.png` | Rear three-quarter, showing the cable outlet |
| `04_exploded.png` | Base, simplified PCB references, lid/buttons and stud plate separated vertically |
| `05_internal_supports.png` | Empty base showing the supports for all three PCBs |
| `render-sheet.png` | Overview of all five views |

The PCB references are simplified, as in the CAD. The buzzer reference is its
measured flat PCB footprint, not an invented buzzer body. The OLED is shown as
a blank dark panel. Small fastening holes are shown without invented screw-head
models.

The exploded view translates the hardware references upwards by 22 mm, the lid
and buttons by 60 mm, and the stud plate by 90 mm. These are illustration offsets;
the assembled views use the original part positions.

`render-info.json` records the source STEP SHA-256, cameras, offsets and rendering
settings. The intermediate PLY meshes use 0.02 mm CAD tessellation tolerance.
Full renders use Mitsuba CPU path tracing at 48 samples per pixel, followed by
Open Image Denoise. Raw HDR data is retained in `raw/` in the workspace.

To reproduce from the project with CadQuery, trimesh, numpy and Mitsuba 3:

```sh
python render_studio.py --denoiser /path/to/oidnDenoise
```

The render script reads existing STEP files; it does not rebuild or edit the CAD.
