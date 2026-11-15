"""Extract manufacturer geometry; never infer missing hardware dimensions."""
from pathlib import Path
import csv, io, json, re, xml.etree.ElementTree as ET

HERE = Path(__file__).resolve().parent
NRF = HERE/'sources/nrf_400708.PcbDoc'
s = NRF.read_bytes().decode('latin1')
# The board record carries the precise outline, in absolute Altium coordinates.
start = s.index('|ORIGINX=')
record = s[start:s.index('\x00', start)]
d = dict(re.findall(r'\|([^=|]+)=([^|]*)', record))
def mm(v):
    assert v.endswith('mil'), v
    return float(v[:-3]) * .0254
ox, oy = mm(d['ORIGINX']), mm(d['ORIGINY'])
vertices = []
for i in range(11):
    vertices.append(dict(kind=int(d[f'KIND{i}']), x=mm(d[f'VX{i}'])-ox,
                         y=mm(d[f'VY{i}'])-oy, cx=mm(d[f'CX{i}'])-ox,
                         cy=mm(d[f'CY{i}'])-oy, radius=mm(d[f'R{i}']),
                         start_angle=float(d[f'SA{i}']), end_angle=float(d[f'EA{i}'])))
stack = [(k, mm(v)) for k,v in re.findall(r'\|(V9_STACK_LAYER\d+_(?:DIELHEIGHT|COPTHICK))=([^|\x00]+)', s)]
text = (HERE/'sources/400708_Pick_And_Place.csv').read_text(errors='replace')
rows = list(csv.DictReader(io.StringIO(text[text.index('"Designator"'): ])))
switches = {r['Designator']: {'x':float(r['Center-X(mm)']), 'y':float(r['Center-Y(mm)']),
    'description':r['Description']} for r in rows if r['Designator'] in ['SW2','SW3','SW5','SW6']}
# Excellon header explicitly specifies INCH,TZ and FILE_FORMAT=2:4.
drill = (HERE/'sources/400708-RoundHoles.TXT').read_text()
tail = drill[drill.rindex('\nT08\n')+5:]
holes=[]; x=y=None
for line in tail.splitlines():
    if line.startswith('M'): break
    mx,my=re.search(r'X(\d+)',line),re.search(r'Y(\d+)',line)
    if mx: x=int(mx[1])*.00254
    if my: y=int(my[1])*.00254
    if mx or my: holes.append([x,y])
b=ET.parse(HERE/'sources/grove_ssd1315_v1.0.brd').getroot().find('.//board')
pkg=next(p for p in b.findall('./libraries/library/packages/package') if p.get('name')=='2U-DIM-W/DRILL')
el=next(e for e in b.findall('./elements/element') if e.get('name')=='U5')
dx,dy=float(el.get('x')),float(el.get('y'))
outline=[]
for w in pkg.findall('wire'):
    if w.get('layer')=='20':
        a={k:float(w.get(k,'0')) for k in ['x1','y1','x2','y2','curve']}
        for k in ['x1','x2']: a[k]+=dx
        for k in ['y1','y2']: a[k]+=dy
        outline.append(a)
oled_holes=[dict(x=float(h.get('x'))+dx,y=float(h.get('y'))+dy,diameter=float(h.get('drill'))) for h in pkg.findall('hole')]
data=dict(units='mm', status='MANUFACTURER GEOMETRY; PHYSICAL REVISIONS NOT YET CONFIRMED',
    nrf=dict(revision='PCA10156 1.0.0 / 400708', outline=vertices,
             thickness=sum(v for k,v in stack), stackup=stack, switches=switches,
             mounting_holes=holes, mounting_hole_diameter=.1260*25.4,
             drill_coordinate_resolution=.00254),
    oled=dict(revision='Grove SSD1315 v1.0', outline=outline, mounting_holes=oled_holes,
              panel_center=[6.35,0],panel_size=[24.74,16.9,1.42],
              active_area=[21.74,10.86],pcb_thickness=1.65, assembled_stack_height=4.3,
              stack_source='User measurements, 14 November 2026; Grove connector removed, wires soldered to PCB back'),
    buzzer=dict(model='HW-508', pcb_footprint=[15.,19.],
                footprint_source='User caliper measurement, 14 November 2026',
                approximate_minimum_hole_spacing=7.7,
                spacing_status='Approximate minimum only; NOT used as hole-centre spacing',
                approximate_hole_diameter=2.,
                approximate_border_distance=1.2,
                border_distance_reference='Nearest hole rim',
                top_rim_offset_range=[1.3,1.5],
                hole_arrangement='Two holes, top left and top right; 15 mm dimension used as width',
                nominal_derived_hole_centres=[[2.2,16.6],[12.8,16.6]],
                measurement_status='User approximate rim measurements; derived nominal centres are not exact metrology',
                mounting_holes=None, height=11.7, height_source='User total-height measurement including pins',
                pin_projection_below_pcb=None),
    nfc=dict(model=None, note='Placeholder only. No reader dimensions asserted.'))
(HERE/'sources/dimensions.json').write_text(json.dumps(data,indent=2)+'\n')
print(json.dumps({'nrf_thickness':data['nrf']['thickness'],'switches':switches,'nrf_holes':holes,'oled_holes':oled_holes},indent=2))
