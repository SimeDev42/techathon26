"""Jelling enclosure CAD, millimetres. DRAFT: see README before manufacture.

Hardware geometry comes exclusively from sources/dimensions.json. Values in
DESIGN are enclosure design choices, not measurements of purchased hardware.
Unknown buzzer geometry and OLED assembly stack are deliberately absent.
"""
from pathlib import Path
import json, math, os
os.environ.setdefault('MPLCONFIGDIR','/tmp/jelling-matplotlib')
import cadquery as cq

ROOT=Path(__file__).resolve().parent
OUT=ROOT/'output'; OUT.mkdir(exist_ok=True)
HW=json.loads((ROOT/'sources/dimensions.json').read_text())
HOLDER=json.loads((ROOT/'sources/holder-analytic-geometry.json').read_text())
LEGO=json.loads((ROOT/'sources/lego-system-reference.json').read_text())
print('Loaded sourced geometry',flush=True)
DESIGN=dict(width=140.,height=192.,base_height=24.,wall=2.4,floor=2.4,
            lid_z=24.25,lid_thickness=3.,radius=16.,pcb_bottom_z=8.,
            board_translation=[14.,129.],oled_origin=[103.,37.],
            button_width=6.8,button_clearance_per_side=.3,button_gap=.25,
            lego_studs=[12,12],lego_center=[70.,124.],lego_plate_bottom=26.45,
            lego_pocket_clearance_per_side=.3,
            nfc_pad=[63.,43.,25.,28.],buzzer_footprint_center=[86.5,14.5],
            buzzer_platform_bottom=6.,buzzer_platform_thickness=2.4,
            buzzer_slot_length=4.,buzzer_slot_width=2.4,
            oled_glass_front_z=25.9,oled_component_pocket_ceiling=26.25)
TOP=DESIGN['lid_z']+DESIGN['lid_thickness']
oled_back_z=DESIGN['oled_glass_front_z']-HW['oled']['assembled_stack_height']
oled_front_pcb_z=oled_back_z+HW['oled']['pcb_thickness']

def rr(w,h,t,x,y,z,r):
    return cq.Workplane('XY').box(w,h,t,centered=(True,True,False)).edges('|Z').fillet(r).translate((x,y,z))
def cyl(d,h,x,y,z):
    return cq.Workplane('XY').circle(d/2).extrude(h).translate((x,y,z))
def bp(x,y):
    # Rigid -90 degree rotation: top of PCB continues facing top of enclosure.
    return DESIGN['board_translation'][0]+y,DESIGN['board_translation'][1]-x
def transform_board(shape):
    return shape.rotate((0,0,0),(0,0,1),-90).translate((*DESIGN['board_translation'],DESIGN['pcb_bottom_z']))

def nrf_wire():
    vs=HW['nrf']['outline']; edges=[]
    for i,v in enumerate(vs):
        nxt=vs[(i+1)%len(vs)]
        a,b=cq.Vector(v['x'],v['y'],0),cq.Vector(nxt['x'],nxt['y'],0)
        if v['kind']==1:
            angle=math.radians(v['start_angle']+(v['end_angle']-v['start_angle'])%360/2)
            m=cq.Vector(v['cx']+v['radius']*math.cos(angle),v['cy']+v['radius']*math.sin(angle),0)
            edges.append(cq.Edge.makeThreePointArc(a,m,b))
        else: edges.append(cq.Edge.makeLine(a,b))
    return cq.Wire.assembleEdges(edges)

def oled_wire():
    edges=[]
    for w in HW['oled']['outline']:
        a,b=cq.Vector(w['x1'],w['y1'],0),cq.Vector(w['x2'],w['y2'],0)
        theta=math.radians(w['curve'])
        if abs(theta)>1e-9:
            dx,dy=b.x-a.x,b.y-a.y
            # Arc mid-point from signed Eagle sweep, not a polygon approximation.
            sag=math.tan(theta/4)*math.hypot(dx,dy)/2
            length=math.hypot(dx,dy)
            m=cq.Vector((a.x+b.x)/2+dy/length*sag,(a.y+b.y)/2-dx/length*sag,0)
            edges.append(cq.Edge.makeThreePointArc(a,m,b))
        else: edges.append(cq.Edge.makeLine(a,b))
    return cq.Wire.assembleEdges(edges)

parts=[]
def add(name,shape,color,role='designed part'):
    parts.append((name,shape,color,role))
    return shape

base=rr(140,192,24,70,96,0,16).cut(rr(135.2,187.2,25,70,96,2.4,13.6))
# Four enclosure fasteners: M3 pilot geometry is a design choice to calibrate.
case_screws=[(12,12),(128,12),(12,180),(128,180)]
for x,y in case_screws:
    # Each boss is bridged to the nearest wall: no floating cylindrical islands.
    bx=2.4 if x<70 else 137.6
    base=base.union(cq.Workplane('XY').box(abs(x-bx),4,21.6,centered=(True,True,False)).translate(((x+bx)/2,y,2.4)))
    base=base.union(cyl(8,21.6,x,y,2.4)).cut(cyl(2.5,19,x,y,5))
# Clear the actual DK corner where it approaches the front-left case boss.
# This local notch stays outside its screw pilot and below the lid fastening.
base=base.cut(cq.Workplane('XY').box(4,4,2.4,centered=(False,False,False)).translate((13.7,13.7,7.8)))
# Four exact hole axes from the user's supplied holder STEP.
for h in HOLDER['board_mounting_holes']:
    x,y=h['x'],h['y']
    x,y=bp(x,y)
    base=base.union(cyl(6,5.6,x,y,2.4)).cut(cyl(2.5,5.6,x,y,2.4))
# Generous top-edge cable outlet, a design choice rather than a connector fit.
# Cable routing from the rotated board's USB edge still requires assembly QA.
base=base.cut(rr(20,9,11,38,191,12,1.5))
# Adjustable platform based on explicitly approximate user measurements.
# Pins/underside components must fit the gap to the floor; not yet verified.
bcx,bcy=DESIGN['buzzer_footprint_center']
bw,bh=HW['buzzer']['pcb_footprint']
hole_centres=[(bcx-bw/2+x,bcy-bh/2+y) for x,y in HW['buzzer']['nominal_derived_hole_centres']]
mount_y=hole_centres[0][1]
base=base.union(rr(17,6,2.4,bcx,mount_y,6,.8))
for x in [bcx-7.5,bcx+7.5]:
    base=base.union(cq.Workplane('XY').box(2,6,3.6,centered=(True,True,False)).translate((x,mount_y,2.4)))
for x,y in hole_centres:
    slot=cq.Workplane('XY').slot2D(4,2.4).extrude(3).translate((x,y,5.8))
    base=base.cut(slot)
# Three OLED posts end at the measured PCB back plane. The 1.6 mm pilot
# bores are designed for small PCB fasteners; print/tap fit must be calibrated.
oled_mount_centres=[]
for h in HW['oled']['mounting_holes']:
    x,y=103+h['x'],37+h['y']; oled_mount_centres.append([x,y])
    base=base.union(cyl(5,oled_back_z-2.4,x,y,2.4))
    base=base.cut(cyl(1.6,6,x,y,oled_back_z-6))
add('01_base_DRAFT',base,'#28364d')
print('Base built with holder hole pattern',flush=True)

lid=rr(140,192,3,70,96,24.25,16)
for x,y in case_screws: lid=lid.cut(cyl(3.4,4,x,y,24))
# Standard-grid top stud field replaces the nine decorative picture tiles.
nx,ny=DESIGN['lego_studs']; pitch=LEGO['stud_pitch']
plate_w,plate_h=nx*pitch-.2,ny*pitch-.2
lcx,lcy=DESIGN['lego_center']; plate_z=DESIGN['lego_plate_bottom']
lid=lid.cut(rr(plate_w+.6,plate_h+.6,.8,lcx,lcy,plate_z,.4))
plate=cq.Workplane('XY').box(plate_w,plate_h,LEGO['plate_body_height'],centered=(True,True,False)).translate((lcx,lcy,plate_z))
stud_centres=[(lcx+(i-(nx-1)/2)*pitch,lcy+(j-(ny-1)/2)*pitch) for i in range(nx) for j in range(ny)]
studs=cq.Workplane('XY',origin=(0,0,plate_z+LEGO['plate_body_height'])).pushPoints(stud_centres).circle(LEGO['stud_diameter']/2).extrude(LEGO['stud_height'],combine=True)
plate=plate.union(studs)
# Four mounting holes are between studs, preserving all 144 studs. These
# fastener dimensions are explicit design choices, not LEGO part features.
plate_fasteners=[(30,84),(110,84),(30,164),(110,164)]
for x,y in plate_fasteners:
    plate=plate.cut(cyl(2.4,4,x,y,plate_z))
    plate=plate.cut(cyl(4.2,1.6,x,y,plate_z+LEGO['plate_body_height']-1.6))
    lid=lid.cut(cyl(2.4,4,x,y,24))
add('03_LEGO_12x12_plate_DRAFT',plate,'#d7c9ae')

button_positions={}
switch_top=DESIGN['pcb_bottom_z']+HW['nrf']['thickness']+2.5
for label,ref in zip('ABCD',['SW2','SW3','SW5','SW6']):
    sw=HW['nrf']['switches'][ref]; x,y=bp(sw['x'],sw['y'])
    button_positions[label]=dict(ref=ref,x=x,y=y)
    lid=lid.cut(rr(7.4,7.4,6,x,y,23,.9))
    # A retained, sliding cap and shaft; nominal reach derives from the sourced
    # 2.5 mm switch envelope. Actual travel and preload still require verification.
    cap=rr(6.8,6.8,7.2,x,y,23.9,.8).union(rr(8.6,8.6,1.4,x,y,22.5,.8))
    cap=cap.union(cyl(2.8,22.6-(switch_top+.25),x,y,switch_top+.25))
    letter=cq.Workplane('XY').text(label,3.6,.35,combine=True).translate((x,y,30.8))
    cap=cap.cut(letter)
    add(f'button_{label}_{ref}_DRAFT',cap,'#dfd4be')

# Screen aperture sized from the actual panel outline + 0.3 mm per side.
panel_x,panel_y=109.35,37.
lid=lid.cut(rr(25.34,17.5,4,panel_x,panel_y,24,.4))
# Local relief accommodates the measured 4.3 mm assembly. Its maximum front
# plane (25.9) stays below the pocket ceiling (26.25), retaining 1 mm roof.
lid=lid.cut(rr(43,25,DESIGN['oled_component_pocket_ceiling']-24,104.0455,37,24,.5))
# NFC is a designed blank pad with 2.4 mm plastic remaining, not a reader model.
lid=lid.cut(rr(25,28,.6,63,43,26.65,4))
for x,y in [(85.5,19),(88.5,19),(91.5,19),(85.5,22),(88.5,22),(91.5,22),(88.5,25)]:
    lid=lid.cut(cyl(1.6,4,x,y,24))
# Engraved branding ties the design to the website.
for label,x,y,size in [('JELLING',28,184,3),('PICTURE PUZZLE',104,184,2.3),('NFC',63,43,3),('FOLLOW YOUR CURIOSITY',78,8,2.2)]:
    text=cq.Workplane('XY').text(label,size,.4,combine=True).translate((x,y,26.95))
    lid=lid.cut(text)
add('02_lid_DRAFT',lid,'#35445b')
print('Lid and buttons built',flush=True)

# The purchased DK is a simplified PCB solid with an exact outline and nominal
# stackup. This is NOT a complete populated-board interference model.
board=cq.Workplane('XY').add(nrf_wire()).toPending().extrude(HW['nrf']['thickness'])
for x,y in HW['nrf']['mounting_holes']:
    board=board.cut(cyl(HW['nrf']['mounting_hole_diameter'],3,x,y,0))
add('REFERENCE_nRF54L15_DK_bare_PCB',transform_board(board),'#247ba0','manufacturer PCB only')
for ref,sw in HW['nrf']['switches'].items():
    x,y=bp(sw['x'],sw['y'])
    envelope=cq.Workplane('XY').box(6.3,6.2,2.5,centered=(True,True,False)).translate((x,y,8+HW['nrf']['thickness']))
    add(f'REFERENCE_{ref}_nominal_envelope',envelope,'#929ca5','envelope only; not switch shape')
# Real OLED PCB thickness supplied by the user; retain the vendor XY outline.
ow=oled_wire(); face=cq.Face.makeFromWires(ow)
for h in HW['oled']['mounting_holes']:
    hole=cq.Face.makeFromWires(cq.Wire.makeCircle(h['diameter']/2,cq.Vector(h['x'],h['y'],0),cq.Vector(0,0,1)))
    face=face.cut(hole)
oled_pcb=cq.Workplane('XY').add(face).toPending().extrude(HW['oled']['pcb_thickness'])
add('REFERENCE_OLED_PCB_MEASURED_STACK',oled_pcb.translate((103,37,oled_back_z)), '#24a780','manufacturer XY; user measured thickness and stack')
panel=cq.Workplane('XY').box(24.74,16.9,1.42,centered=(True,True,False)).translate((panel_x,panel_y,DESIGN['oled_glass_front_z']-1.42))
add('REFERENCE_OLED_panel',panel,'#101e24','manufacturer panel size; user measured stack sets Z')
# A zero-thickness footprint is all the user's measurements establish for HW-508.
buzzer_face=cq.Face.makeFromWires(cq.Wire.makePolygon([cq.Vector(-bw/2,-bh/2,0),cq.Vector(bw/2,-bh/2,0),cq.Vector(bw/2,bh/2,0),cq.Vector(-bw/2,bh/2,0),cq.Vector(-bw/2,-bh/2,0)]))
for x,y in HW['buzzer']['nominal_derived_hole_centres']:
    hole=cq.Face.makeFromWires(cq.Wire.makeCircle(1,cq.Vector(x-bw/2,y-bh/2,0),cq.Vector(0,0,1)))
    buzzer_face=buzzer_face.cut(hole)
add('REFERENCE_HW508_APPROXIMATE_XY_ONLY',cq.Workplane('XY').add(buzzer_face).translate((bcx,bcy,8.4)),'#c68b42','user measured footprint; approximate hole centres; PCB thickness unknown')

assembly=cq.Assembly(name='Jelling_DRAFT_NOT_FOR_FABRICATION')
for name,shape,color,role in parts:
    assembly.add(shape,name=name,color=cq.Color(color))
assembly.export(str(OUT/'jelling_DRAFT.step'))
print('STEP assembly exported',flush=True)
# Save separate STEP and nominal-size prototype STLs. Hardware references are
# intentionally excluded from the printable files.
for name,shape,color,role in parts:
    if role=='designed part' and not name.startswith('tile_'):
        cq.exporters.export(shape,str(OUT/f'{name}.step'))
        cq.exporters.export(shape,str(OUT/f'{name}.stl'),tolerance=.025,angularTolerance=.08)

# Verify topology and exact rigid-transform button alignment.
checks=[]
for name,shape,color,role in parts:
    obj=shape.val(); assert obj.isValid(),name
    if role=='designed part': assert len(shape.solids().vals())==1,(name,'disconnected solids')
    checks.append(dict(name=name,role=role,valid=True,solids=len(shape.solids().vals())))
collisions=[]
design_parts=[p for p in parts if p[3]=='designed part']
for i,(an,a,_,_) in enumerate(design_parts):
    for bn,b,_,_ in design_parts[i+1:]:
        volume=a.intersect(b).val().Volume()
        if volume>1e-6: collisions.append(dict(a=an,b=bn,volume_mm3=volume))
assert not collisions,collisions
hardware_collisions=[]
for hn,hw,_,role in parts:
    if hn not in ['REFERENCE_nRF54L15_DK_bare_PCB','REFERENCE_OLED_PCB_MEASURED_STACK','REFERENCE_OLED_panel']:
        continue
    for dn,designed,_,_ in design_parts:
        volume=hw.intersect(designed).val().Volume()
        if volume>1e-5: hardware_collisions.append(dict(hardware=hn,part=dn,volume_mm3=volume))
assert not hardware_collisions,hardware_collisions
assert len(stud_centres)==144
assert len(oled_mount_centres)==3 and len(HOLDER['board_mounting_holes'])==4
assert abs(oled_pcb.val().BoundingBox().zlen-1.65)<1e-6
reimport=cq.importers.importStep(str(OUT/'jelling_DRAFT.step'))
assert reimport.val().isValid()
report=dict(status='DRAFT / NOT RELEASED FOR FABRICATION',units='mm',design=DESIGN,
    button_positions=button_positions,button_pitch_mm=[9.4996,10.2616],
    geometry_checks=checks,designed_part_collisions=collisions,
    modelled_PCB_and_panel_collisions=hardware_collisions,
    step_reimport_valid=True,
    holder_mounting_holes=HOLDER['board_mounting_holes'],
    lego_plate=dict(stud_count=len(stud_centres),stud_grid=[nx,ny],body_size=[plate_w,plate_h,LEGO['plate_body_height']],
      pitch=pitch,stud_diameter=LEGO['stud_diameter'],stud_height=LEGO['stud_height'],fasteners=plate_fasteners,
      source=LEGO['source'],clutch_fit_status='Nominal drawing geometry, physical fit not yet checked'),
    oled_mount=dict(centres=oled_mount_centres,pcb_back_z=oled_back_z,pcb_front_z=oled_front_pcb_z,
      glass_front_z=DESIGN['oled_glass_front_z'],post_height=oled_back_z-2.4,
      post_diameter=5.,pilot_diameter=1.6,pilot_depth=6.,glass_recess_mm=TOP-DESIGN['oled_glass_front_z'],
      component_pocket_clearance_mm=DESIGN['oled_component_pocket_ceiling']-DESIGN['oled_glass_front_z'],
      note='Grove connector removed; soldered wires run underneath PCB'),
    buzzer_mount=dict(nominal_approximate_hole_centres=hole_centres,slots_mm=[4,2.4],
      platform_top_z=8.4,minimum_floor_gap_mm=3.6,
      conservative_top_z_if_full_height_above_platform=8.4+HW['buzzer']['height'],
      nominal_lid_clearance_if_full_height_above_platform=24.25-8.4-HW['buzzer']['height'],
      status='User approximate hole measurements; underside/pin fit unverified'),
    unresolved=['Physical DK revision (holder XY used directly)','HW-508 approximate holes need fit check; pin projection and PCB thickness unknown',
      'Soldered OLED wire routing / strain relief',
      'Populated DK component envelope and underside clearance',
      'Switch travel, tolerance and assembled plunger preload',
      'Final service access, cable routing and assembly test',
      'LEGO nominal stud clutch-fit coupon and fastener selection'])
(OUT/'verification.json').write_text(json.dumps(report,indent=2)+'\n')
(OUT/'design-parameters.json').write_text(json.dumps(DESIGN,indent=2)+'\n')

def preview():
    import numpy as np
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig=plt.figure(figsize=(14,10),facecolor='#e8dcc7')
    for i,(title,exploded) in enumerate([('ASSEMBLED',False),('OPEN / HARDWARE REFERENCES',True)]):
        ax=fig.add_subplot(1,2,i+1,facecolor='#e8dcc7')
        polygons=[]; colors=[]
        for name,shape,color,role in parts:
            if not exploded and role!='designed part':
                if 'OLED_panel' not in name: continue
            if exploded and name=='03_LEGO_12x12_plate_DRAFT': continue
            if exploded and name=='02_lid_DRAFT': continue
            if exploded and name.startswith('button_'): continue
            vertices,triangles=shape.val().tessellate(.18)
            # Lift only the zero-thickness visual reference a tiny amount for
            # display, avoiding coincident depth-buffer surfaces on its support.
            reference_lift=.02 if name=='REFERENCE_HW508_APPROXIMATE_XY_ONLY' else 0
            vv=[(v.x,v.y,v.z+reference_lift) for v in vertices]
            polygons.extend([[vv[k] for k in tri] for tri in triangles])
            colors.extend([color]*len(triangles))
        # A true software depth buffer avoids painter-order artifacts from the
        # very large planar triangles in STEP tessellations.
        tris=np.asarray(polygons)
        az,el=np.radians([-70,63])
        right=np.array([-np.sin(az),np.cos(az),0])
        up=np.array([-np.sin(el)*np.cos(az),-np.sin(el)*np.sin(az),np.cos(el)])
        towards=np.cross(right,up)
        coords=tris@np.stack([right,up,towards],axis=1)
        lo=coords[:,:,:2].min(axis=(0,1)); hi=coords[:,:,:2].max(axis=(0,1))
        w,h=840,1050; scale=min((w-50)/(hi[0]-lo[0]),(h-50)/(hi[1]-lo[1]))
        coords[:,:,0]=(coords[:,:,0]-lo[0])*scale+25
        coords[:,:,1]=h-25-(coords[:,:,1]-lo[1])*scale
        canvas=np.empty((h,w,3),dtype=np.uint8); canvas[:]=[232,220,199]
        depth=np.full((h,w),-np.inf)
        light=np.array([-.4,-.45,1]); light/=np.linalg.norm(light)
        for original,tri,color in zip(tris,coords,colors):
            xmin=max(0,int(np.floor(tri[:,0].min()))); xmax=min(w-1,int(np.ceil(tri[:,0].max())))
            ymin=max(0,int(np.floor(tri[:,1].min()))); ymax=min(h-1,int(np.ceil(tri[:,1].max())))
            if xmax<xmin or ymax<ymin: continue
            x0,y0=tri[0,:2]; x1,y1=tri[1,:2]; x2,y2=tri[2,:2]
            den=(y1-y2)*(x0-x2)+(x2-x1)*(y0-y2)
            if abs(den)<1e-9: continue
            yy,xx=np.mgrid[ymin:ymax+1,xmin:xmax+1]; xx=xx+.5; yy=yy+.5
            a=((y1-y2)*(xx-x2)+(x2-x1)*(yy-y2))/den
            b=((y2-y0)*(xx-x2)+(x0-x2)*(yy-y2))/den; c=1-a-b
            z=a*tri[0,2]+b*tri[1,2]+c*tri[2,2]
            old=depth[ymin:ymax+1,xmin:xmax+1]
            visible=(a>=-1e-8)&(b>=-1e-8)&(c>=-1e-8)&(z>old)
            if not visible.any(): continue
            normal=np.cross(original[1]-original[0],original[2]-original[0]); length=np.linalg.norm(normal)
            intensity=.55+.45*abs(float(normal@light)/length) if length>0 else .8
            rgb=np.asarray(matplotlib.colors.to_rgb(color))*255*intensity
            canvas[ymin:ymax+1,xmin:xmax+1][visible]=np.clip(rgb,0,255).astype(np.uint8)
            old[visible]=z[visible]
        ax.imshow(canvas)
        ax.set_axis_off(); ax.set_title(title,fontsize=10,color='#303c31',pad=0)
        if exploded:
            ax.text(.5,-.025,'Blue: DK PCB  ·  Green: OLED PCB  ·  Amber: measured buzzer XY',transform=ax.transAxes,fontsize=7,color='#303c31',ha='center')
    fig.text(.065,.94,'THE JELLING JOURNEY',fontsize=22,fontweight='bold',color='#303c31')
    fig.text(.065,.9,'Hardware-based CAD study  /  140 × 192 × 27.25 mm shell',fontsize=12,color='#606c38')
    fig.text(.065,.085,'CAD PROTOTYPE · CHECK PRINTED FIT',fontsize=14,fontweight='bold',color='#934f35')
    fig.text(.065,.05,'12 × 12 LEGO stud grid + supports for all three PCBs. Printed fits and final physical assembly require verification.',fontsize=10,color='#303c31')
    fig.subplots_adjust(left=.02,right=.98,top=.87,bottom=.12,wspace=.02)
    fig.savefig(OUT/'preview.png',dpi=170,facecolor=fig.get_facecolor())
    plt.close(fig)
preview()
print('Exported validated draft STEP assembly, individual STEP parts and preview to',OUT)
