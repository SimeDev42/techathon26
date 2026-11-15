"""Standalone 4x4 LEGO-compatible smooth tile for the Jelling 12x12 top plate.

Follows the nominal LEGO System geometry in sources/lego-system-reference.json
(8.0 mm stud pitch, 4.8 mm stud diameter, 1.8 mm stud height, 3.2 mm plate/tile
body height) and verifies zero-interference fit across all nine 4x4 positions on
output/03_LEGO_12x12_plate_DRAFT.step.
"""
from pathlib import Path
import json
import math
import cadquery as cq

ROOT = Path(__file__).resolve().parent
REF = json.loads((ROOT / 'sources/lego-system-reference.json').read_text())
DESIGN = json.loads((ROOT / 'output/design-parameters.json').read_text())
OUT = ROOT / 'output'
OUT.mkdir(exist_ok=True)

NX, NY = 4, 4
PITCH = REF['stud_pitch']                 # 8.0 mm
STUD_D = REF['stud_diameter']             # 4.8 mm
STUD_H = REF['stud_height']               # 1.8 mm
BODY_H = REF['plate_body_height']         # 3.2 mm

# Standard LEGO outer clearance: 0.1 mm per side -> 31.8 x 31.8 mm
TILE_W = NX * PITCH - 0.2                 # 31.8 mm
TILE_H = NY * PITCH - 0.2                 # 31.8 mm

# Outer wall thickness: (31.8 - (3 * 8.0 + 4.8)) / 2 = 1.5 mm
# Inner cavity is 28.8 x 28.8 mm, tangent to outer 4x4 studs.
WALL_T = 1.5
CAVITY_W = TILE_W - 2 * WALL_T            # 28.8 mm
CAVITY_H = TILE_H - 2 * WALL_T            # 28.8 mm
CAVITY_DEPTH = 2.0                        # 0.2 mm axial clearance over 1.8 mm studs
TOP_DECK_T = BODY_H - CAVITY_DEPTH        # 1.2 mm

# Anti-stud tubes sit at the 3x3 midpoints between 2x2 stud clusters.
# Exact tangent OD = 2 * (sqrt(2) * (pitch/2) - stud_d/2) = 6.5137085 mm
TUBE_OD = 2.0 * (math.sqrt(2.0) * (PITCH / 2.0) - STUD_D / 2.0)
TUBE_ID = STUD_D                          # 4.8 mm
TUBE_CENTRES = [((i - 1) * PITCH, (j - 1) * PITCH) for i in range(3) for j in range(3)]


def build_tile(corner_fillet: float = 0.4, edge_chamfer: float = 0.15) -> cq.Workplane:
    """Build nominal 4x4 smooth LEGO-compatible tile with underside tubes."""
    body = cq.Workplane('XY').box(TILE_W, TILE_H, BODY_H, centered=(True, True, False))
    if corner_fillet > 0:
        body = body.edges('|Z').fillet(corner_fillet)

    # Smooth tile top perimeter bevel and subtle bottom prying bevel
    if edge_chamfer > 0:
        body = body.faces('>Z').edges().chamfer(edge_chamfer)
        body = body.faces('<Z').edges().chamfer(edge_chamfer)

    # Underside stud-receiving cavity
    cavity = (
        cq.Workplane('XY')
        .box(CAVITY_W, CAVITY_H, CAVITY_DEPTH, centered=(True, True, False))
    )
    tile = body.cut(cavity)

    # 3x3 array of underside anti-stud tubes
    tubes = (
        cq.Workplane('XY')
        .pushPoints(TUBE_CENTRES)
        .circle(TUBE_OD / 2.0)
        .circle(TUBE_ID / 2.0)
        .extrude(CAVITY_DEPTH)
    )
    tile = tile.union(tubes)
    return tile


def main() -> None:
    tile = build_tile()
    assert tile.val().isValid(), 'Tile geometry is not valid'
    assert len(tile.solids().vals()) == 1, 'Tile must be a single solid'

    bb = tile.val().BoundingBox()
    assert abs(bb.xlen - TILE_W) < 1e-6, bb.xlen
    assert abs(bb.ylen - TILE_H) < 1e-6, bb.ylen
    assert abs(bb.zlen - BODY_H) < 1e-6, bb.zlen
    assert abs(bb.zmin) < 1e-6, bb.zmin

    step_path = OUT / 'tile_4x4_NOMINAL.step'
    stl_path = OUT / 'tile_4x4_NOMINAL.stl'
    cq.exporters.export(tile, str(step_path))
    cq.exporters.export(tile, str(stl_path), tolerance=0.01, angularTolerance=0.05)

    reimport = cq.importers.importStep(str(step_path))
    assert reimport.val().isValid(), 'STEP reimport failed'

    # Verify zero solid interference on all 9 positions of the 12x12 top plate
    plate_step = OUT / '03_LEGO_12x12_plate_DRAFT.step'
    if plate_step.exists():
        plate = cq.importers.importStep(str(plate_step))
        lcx, lcy = DESIGN['lego_center']
        plate_top_z = DESIGN['lego_plate_bottom'] + BODY_H
        max_overlap = 0.0
        for gx in (-1, 0, 1):
            for gy in (-1, 0, 1):
                tx = lcx + gx * (4 * PITCH)
                ty = lcy + gy * (4 * PITCH)
                placed = tile.translate((tx, ty, plate_top_z))
                vol = placed.intersect(plate).val().Volume()
                max_overlap = max(max_overlap, vol)
                assert vol < 1e-6, f'Collision at grid ({gx},{gy}): {vol} mm^3'
        print(f'Verified 9-position fit on 12x12 plate (max overlap volume: {max_overlap:.2e} mm^3)')

    print(
        f'Created {step_path.name} and {stl_path.name}: '
        f'{TILE_W:.1f} x {TILE_H:.1f} x {BODY_H:.1f} mm, '
        f'cavity {CAVITY_W:.1f} x {CAVITY_H:.1f} x {CAVITY_DEPTH:.1f} mm, '
        f'9 tubes OD={TUBE_OD:.4f} mm / ID={TUBE_ID:.1f} mm'
    )


if __name__ == '__main__':
    main()
