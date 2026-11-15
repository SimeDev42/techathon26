"""Small independent fit checks, using the enclosure's source geometry (mm)."""
from pathlib import Path
import json, math, shutil, os
os.environ.setdefault('MPLCONFIGDIR','/tmp/jelling-fit-mpl')
import cadquery as cq

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'fit-test-templates'; OUT.mkdir(exist_ok=True)
HW=json.loads((ROOT/'sources/dimensions.json').read_text())
HOLDER=json.loads((ROOT/'sources/holder-analytic-geometry.json').read_text())
ENC=json.loads((ROOT/'output/verification.json').read_text())
LEGO=json.loads((ROOT/'sources/lego-system-reference.json').read_text())
T=1.2 # Test carrier thickness: a design choice, not a hardware measurement.
parts=[]
def disc(d,h,x,y,z=0):
    return cq.Workplane('XY').circle(d/2).extrude(h).translate((x,y,z))
def box(w,h,t,x,y,z=0):
    return cq.Workplane('XY').box(w,h,t,centered=(True,True,False)).translate((x,y,z))
def rail(a,b,width=3,t=T):
    dx,dy=b[0]-a[0],b[1]-a[1]
    return cq.Workplane('XY').slot2D(math.hypot(dx,dy)+width,width,math.degrees(math.atan2(dy,dx))).extrude(t).translate(((a[0]+b[0])/2,(a[1]+b[1])/2,0))
def carrier(points,pad,rail_w,t=T):
    cx=sum(p[0] for p in points)/len(points); cy=sum(p[1] for p in points)/len(points)
    ordered=sorted(points,key=lambda p:math.atan2(p[1]-cy,p[0]-cx))
    s=disc(pad,t,*ordered[0])
    for i,p in enumerate(ordered):
        s=s.union(disc(pad,t,*p)).union(rail(p,ordered[(i+1)%len(ordered)],rail_w,t))
    return s
def holes(s,points,d,t=T):
    for x,y in points: s=s.cut(disc(d,t+2,x,y,-1))
    return s
def add(name,title,s,info):
    assert s.val().isValid(),name
    assert len(s.solids().vals())==1,(name,'disconnected')
    # Translate only: each exported part sits on Z=0, with its XY pattern intact.
    b=s.val().BoundingBox(); delta=(-b.xmin,-b.ymin,-b.zmin)
    placed=s.translate(delta)
    cq.exporters.export(placed,str(OUT/f'{name}.step'))
    cq.exporters.export(placed,str(OUT/f'{name}.stl'),tolerance=.015,angularTolerance=.05)
    # Verify exported B-rep survives a round-trip.
    re=cq.importers.importStep(str(OUT/f'{name}.step'))
    assert re.val().isValid()
    dims=[b.xlen,b.ylen,b.zlen]
    parts.append(dict(name=name,title=title,shape=placed,dimensions=dims,
                      source_to_print_translation=list(delta),**info))
    print('Exported',name,flush=True)

np=[(h['x'],h['y']) for h in HOLDER['board_mounting_holes']]
op=[(h['x'],h['y']) for h in HW['oled']['mounting_holes']]
bp=[tuple(p) for p in HW['buzzer']['nominal_derived_hole_centres']]
nf=carrier(np,8,3)
of=carrier(op,6.5,2.5)
add('01_nrf_XY_hole_frame','nRF: four mounting holes',holes(nf,np,3.2),
    dict(purpose='XY check only',source='User holder STEP',hole_centres=np,hole_diameter=3.2))
add('02_oled_XY_hole_frame','OLED: three mounting holes',holes(of,op,2.2),
    dict(purpose='XY check only',source='Seeed Eagle PCB',hole_centres=op,hole_diameter=2.2))
# Exact nominal round holes reveal measurement errors that slots could hide.
bw,bh=HW['buzzer']['pcb_footprint']
bf=box(bw,bh,T,bw/2,bh/2).cut(box(9,11,T+2,bw/2,8.5,-1))
add('03_buzzer_XY_round_holes','Buzzer: nominal ROUND holes',holes(bf,bp,2),
    dict(purpose='Check approximate measurements before trying slotted mount',
         source='User approximate measurements',hole_centres=bp,hole_diameter=2.,
         pcb_footprint=[bw,bh],nominal_horizontal_pitch=10.6))

# Register the button gauge to all four board holes. Actual lid window size and
# sourced switch centres are used; the frame itself is a lightweight test tool.
switches=[HW['nrf']['switches'][r] for r in ['SW2','SW3','SW5','SW6']]
swp=[(s['x'],s['y']) for s in switches]
xs=[x for x,y in swp]; ys=[y for x,y in swp]
buttons=nf.union(box(max(xs)-min(xs)+10,max(ys)-min(ys)+10,T,(max(xs)+min(xs))/2,(max(ys)+min(ys))/2))
for x,y in swp:
    window=box(7.4,7.4,T+2,x,y,-1).edges('|Z').fillet(.9)
    buttons=buttons.cut(window)
buttons=holes(buttons,np,3.2)
add('04_nrf_buttons_alignment','nRF + button alignment',buttons,
    dict(purpose='Register four mounting holes and inspect four switch/window centres',
         source='Holder STEP + Nordic pick-and-place + enclosure window size',
         hole_centres=np,hole_diameter=3.2,switch_centres=swp,window_size=[7.4,7.4],
         switch_refs=['SW2 / A','SW3 / B','SW5 / C','SW6 / D']))

win=box(31.34,23.5,T,0,0).cut(box(25.34,17.5,T+2,0,0,-1).edges('|Z').fillet(.4))
add('05_oled_window','OLED: front window',win,
    dict(purpose='Test the actual enclosure aperture over the front glass',
         source='Enclosure aperture, panel size from Seeed datasheet',
         aperture=[25.34,17.5],aperture_corner_radius=.4))

# Optional height/support coupons: their bases substitute for the case floor.
# Heights are measured above the carrier top, preserving the actual floor-to-PCB
# separation regardless of the reduced test carrier thickness.
nrf_height=ENC['design']['pcb_bottom_z']-ENC['design']['floor']
nrfstand=nf
for x,y in np:
    nrfstand=nrfstand.union(disc(6,nrf_height,x,y,T)).cut(disc(2.5,nrf_height,x,y,T))
add('06_nrf_support_height','nRF: support-height test',nrfstand,
    dict(purpose='Optional Z/fastener fit check',source='Current enclosure supports',
         hole_centres=np,post_diameter=6.,post_height_above_carrier=nrf_height,
         pilot_diameter=2.5,pilot_depth=nrf_height))

om=ENC['oled_mount']; oledstand=of
for x,y in op:
    oledstand=oledstand.union(disc(om['post_diameter'],om['post_height'],x,y,T))
    oledstand=oledstand.cut(disc(om['pilot_diameter'],om['pilot_depth'],x,y,T+om['post_height']-om['pilot_depth']))
add('07_oled_support_height','OLED: support-height test',oledstand,
    dict(purpose='Optional Z/fastener fit check; underside wire clearance',source='Current enclosure supports',
         hole_centres=op,post_diameter=om['post_diameter'],
         post_height_above_carrier=om['post_height'],pilot_diameter=om['pilot_diameter'],
         pilot_depth=om['pilot_depth'],pcb_thickness=HW['oled']['pcb_thickness'],
         measured_pcb_display_stack=HW['oled']['assembled_stack_height']))

bs=box(17,6,T,0,0)
gap=ENC['buzzer_mount']['minimum_floor_gap_mm']
th=ENC['design']['buzzer_platform_thickness']
bs=bs.union(box(17,6,th,0,0,T+gap))
for x in [-7.5,7.5]: bs=bs.union(box(2,6,gap,x,0,T))
for x in [-5.3,5.3]:
    slot=cq.Workplane('XY').slot2D(4,2.4).extrude(th+.4).translate((x,0,T+gap-.2))
    bs=bs.cut(slot)
add('08_buzzer_slotted_support','Buzzer: actual slotted support',bs,
    dict(purpose='Optional fit of the actual enclosure support after checking round-hole gauge',
         source='Current enclosure mount from approximate measurements',
         slot_centres=[[-5.3,0],[5.3,0]],slot_size=[4.,2.4],
         floor_gap=gap,platform_thickness=th,pcb_back_height_above_carrier=gap+th))

lego=box(15.8,15.8,LEGO['plate_body_height'],0,0)
for x in [-4,4]:
    for y in [-4,4]: lego=lego.union(disc(LEGO['stud_diameter'],LEGO['stud_height'],x,y,LEGO['plate_body_height']))
add('09_LEGO_2x2_stud_fit','LEGO: small stud-fit test',lego,
    dict(purpose='Check printer/material clutch fit before printing 144 studs',
         source='Retained physical 3020 drawing',stud_diameter=LEGO['stud_diameter'],
         stud_height=LEGO['stud_height'],pitch=LEGO['stud_pitch'],stud_count=4))

# An open-sided comparator for the three user-measured thicknesses. +0.2 mm
# companions help distinguish print-hole undersizing from measurement error.
values=[1.65,1.85,4.3,4.5,11.7,11.9]
height=sum(values)+7*2
card=box(30,height,T,15,height/2)
y=2; slots=[]
for v in values:
    card=card.cut(box(18,v,T+2,24,y+v/2,-1))
    label=cq.Workplane('XY').text(f'{v:g}',2.4,.35,combine=True).translate((6.5,y+v/2,T-.3))
    card=card.cut(label)
    slots.append(dict(gap=v,from_bottom=y,to_bottom=y+v))
    y+=v+2
add('10_thickness_comparator','Measured stack-height checks',card,
    dict(purpose='Gently compare PCB, display-stack and total buzzer thickness; no forcing',
         source='User 1.65 / 4.3 / 11.7 mm measurements',slots=slots,
         note='+0.2 mm slots are test allowances, not revised hardware measurements'))

# Validate the actual manufactured-hole features as B-rep cylinders, rather
# than relying only on the input lists.
from OCP.BRepAdaptor import BRepAdaptor_Surface
from OCP.GeomAbs import GeomAbs_Cylinder
for p in parts:
    if p['name'] not in ['01_nrf_XY_hole_frame','02_oled_XY_hole_frame','03_buzzer_XY_round_holes']: continue
    cylinders=[]
    for face in p['shape'].faces().vals():
        surf=BRepAdaptor_Surface(face.wrapped)
        if surf.GetType()==GeomAbs_Cylinder:
            c=surf.Cylinder(); point=c.Location()
            cylinders.append((point.X(),point.Y(),c.Radius()*2))
    dx,dy,dz=p['source_to_print_translation']
    for x,y in p['hole_centres']:
        assert any(abs(a-(x+dx))<1e-6 and abs(b-(y+dy))<1e-6 and abs(d-p['hole_diameter'])<1e-6 for a,b,d in cylinders),(p['name'],x,y)
    p['actual_cylindrical_hole_check']='passed'

import trimesh
for p in parts:
    mesh=trimesh.load_mesh(OUT/f"{p['name']}.stl")
    assert mesh.is_watertight and mesh.is_volume,p['name']
    p['STL_watertight']=True
    p['volume_mm3']=float(mesh.volume)

manifest=[{k:v for k,v in p.items() if k!='shape'} for p in parts]
(OUT/'dimensions-and-checks.json').write_text(json.dumps(dict(units='mm',carrier_thickness=T,parts=manifest),indent=2)+'\n')

# Top views are drawn from exported model triangles, not separately sketched
# geometry. Height shading makes the optional support posts visible.
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.collections import PolyCollection
fig,axs=plt.subplots(4,3,figsize=(13,13),facecolor='#f4efdf')
for ax in axs.flat: ax.set_axis_off()
for ax,p in zip(axs.flat,parts):
    vs,ts=p['shape'].val().tessellate(.10)
    vv=np.array([(v.x,v.y,v.z) for v in vs]); tris=vv[np.asarray(ts)]
    va=tris[:,1,:2]-tris[:,0,:2]; vb=tris[:,2,:2]-tris[:,0,:2]
    area=np.abs(va[:,0]*vb[:,1]-va[:,1]*vb[:,0])
    tris=tris[area>1e-9]; z=tris[:,:,2].mean(axis=1); order=np.argsort(z)
    shade=.45+.4*z/max(float(vv[:,2].max()),1.2)
    colors=np.stack([shade*.45,shade*.59,shade*.7],axis=1)
    ax.add_collection(PolyCollection(tris[order,:,:2],facecolors=colors[order],edgecolors='none'))
    ax.autoscale_view(); ax.set_aspect('equal'); ax.margins(.09)
    ax.set_title(p['name'].split('_')[0]+' · '+p['title'],fontsize=9,color='#25364c')
    x,y,z=p['dimensions']
    ax.text(.5,-.06,f'{x:.1f} × {y:.1f} × {z:.1f} mm',ha='center',transform=ax.transAxes,fontsize=8,color='#5c6655')
fig.suptitle('JELLING · QUICK FIT-TEST TEMPLATES',fontsize=18,color='#25364c',fontweight='bold')
fig.text(.5,.025,'01–05: thin XY checks first   ·   06–08: optional support-height checks   ·   Print at 100% scale',ha='center',fontsize=11,color='#5c6655')
fig.subplots_adjust(top=.92,bottom=.075,hspace=.46,wspace=.25)
fig.savefig(OUT/'templates-preview.png',dpi=150,facecolor=fig.get_facecolor())
plt.close(fig)
print('All 10 templates: valid CAD, STEP re-import passed, watertight positive-volume STLs.',flush=True)
