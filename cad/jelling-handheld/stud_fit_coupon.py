"""Standalone 2x2 top-stud fit coupon; not the final device top plate."""
from pathlib import Path
import json
import cadquery as cq

ROOT=Path(__file__).resolve().parent
REF=json.loads((ROOT/'sources/lego-system-reference.json').read_text())
OUT=ROOT/'output'; OUT.mkdir(exist_ok=True)
# 2-stud edge length and 3.9 mm edge-to-first-centre are shown on the
# retained 3020 drawing. Flat underside is intentional: only top clutch is tested.
plate=cq.Workplane('XY').box(15.8,15.8,REF['plate_body_height'],centered=(True,True,False))
plate=plate.faces('>Z').workplane().pushPoints([(-4,-4),(-4,4),(4,-4),(4,4)]).circle(REF['stud_diameter']/2).extrude(REF['stud_height'])
assert plate.val().isValid()
assert len(plate.solids().vals())==1
b=plate.val().BoundingBox()
assert abs(b.xlen-15.8)<1e-6 and abs(b.ylen-15.8)<1e-6 and abs(b.zlen-5.0)<1e-6
cq.exporters.export(plate,str(OUT/'stud_fit_coupon_NOMINAL.step'))
cq.exporters.export(plate,str(OUT/'stud_fit_coupon_NOMINAL.stl'),tolerance=.01,angularTolerance=.05)
print('Created nominal 2x2 stud fit coupon, 15.8 x 15.8 x 5 mm, flat underside.')
