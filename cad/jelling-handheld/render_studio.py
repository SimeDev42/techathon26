"""Studio renders from the actual STEP geometry, without rebuilding the model."""
from pathlib import Path
import sys, types, json, argparse, hashlib, time, subprocess, faulthandler
faulthandler.enable()
faulthandler.dump_traceback_later(45,repeat=True)
sys.modules.setdefault('vtk',types.ModuleType('vtk'))
import cadquery as cq
import numpy as np
import trimesh
import mitsuba as mi
mi.set_variant('llvm_ad_rgb')
T=mi.ScalarTransform4f

ROOT=Path(__file__).resolve().parent
SRC=ROOT/'output'
OUT=ROOT/'renders'; OUT.mkdir(exist_ok=True)
MESH=OUT/'meshes'; MESH.mkdir(exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--draft',action='store_true')
parser.add_argument('--only',default='all')
parser.add_argument('--denoiser',default='/tmp/oidn-2.5.1.arm64.macos/bin/oidnDenoise')
args=parser.parse_args()

def rgb(hexcode):
    v=np.array([int(hexcode[i:i+2],16)/255 for i in (1,3,5)])
    return np.where(v<=.04045,v/12.92,((v+.055)/1.055)**2.4).tolist()

def mat(color,rough=.25):
    return dict(type='roughplastic',distribution='ggx',alpha=rough,
                int_ior=1.49,diffuse_reflectance=dict(type='rgb',value=rgb(color)))

parts=[]
def add(name,shape,color,role='designed',rough=.25):
    filename=MESH/f'{name}.ply'
    if not filename.exists():
        vs,fs=shape.tessellate(.02,.05)
        mesh=trimesh.Trimesh(vertices=[(v.x,v.y,v.z) for v in vs],faces=fs,process=False)
        filename.write_bytes(trimesh.exchange.ply.export_ply(mesh,vertex_normal=True))
    parts.append(dict(name=name,file=filename,color=color,role=role,roughness=rough))

for name,color in [('01_base_DRAFT','#28364d'),('02_lid_DRAFT','#35445b'),
                   ('03_LEGO_12x12_plate_DRAFT','#d7c9ae')]+[(f'button_{a}_{b}_DRAFT','#dfd4be') for a,b in zip('ABCD',['SW2','SW3','SW5','SW6'])]:
    print('Loading',name,flush=True)
    add(name,cq.importers.importStep(str(SRC/f'{name}.step')).val(),color)

assembly=cq.importers.importStep(str(SRC/'jelling_DRAFT.step'))
for s in assembly.solids().vals():
    b=s.BoundingBox()
    if abs(b.zlen-1.57634178)<1e-5:
        add('reference_nrf_PCB',s,'#277a99','reference',.4)
    elif abs(b.zlen-1.65)<1e-5:
        add('reference_oled_PCB',s,'#208064','reference',.4)
    elif abs(b.zlen-1.42)<1e-5:
        add('reference_oled_panel',s,'#0c1b24','panel',.08)
    elif abs(b.zlen-2.5)<1e-5 and abs(b.xlen-6.3)<1e-5:
        add(f'reference_switch_{len(parts)}',s,'#a9abb0','reference',.3)
for f in assembly.faces().vals():
    b=f.BoundingBox()
    if abs(b.xlen-15)<1e-5 and abs(b.ylen-19)<1e-5 and b.zlen<1e-5 and abs(b.zmin-8.4)<1e-5:
        add('reference_buzzer_footprint',f,'#c38b42','footprint',.4)
        break
print('Prepared',len(parts),'actual CAD meshes',flush=True)
faulthandler.cancel_dump_traceback_later()

views={
 '01_hero':dict(origin=[.27,-.34,.36],target=[0,0,.014],up=[0,0,1],fov=30,width=2000,height=1600,mode='assembled'),
 '02_top':dict(origin=[0,0,.5],target=[0,0,.01],up=[0,1,0],fov=28,width=1600,height=2000,mode='assembled'),
 '03_rear_quarter':dict(origin=[-.28,.33,.29],target=[0,0,.014],up=[0,0,1],fov=30,width=2000,height=1600,mode='assembled'),
 '04_exploded':dict(origin=[.36,-.48,.37],target=[0,0,.056],up=[0,0,1],fov=31,width=1800,height=2000,mode='exploded'),
 '05_internal_supports':dict(origin=[.20,-.28,.42],target=[0,0,.012],up=[0,0,1],fov=30,width=2000,height=1600,mode='supports'),
}

def scene_for(v):
    w,h=v['width'],v['height']
    if args.draft: w//=2;h//=2
    scene=dict(type='scene',integrator=dict(type='path',max_depth=8,hide_emitters=True),
        sensor=dict(type='perspective',fov=v['fov'],fov_axis='y',
          to_world=T().look_at(origin=v['origin'],target=v['target'],up=v['up']),
          sampler=dict(type='independent',sample_count=24 if args.draft else 48),
          film=dict(type='hdrfilm',width=w,height=h,pixel_format='rgb',rfilter=dict(type='tent'))),
        environment=dict(type='constant',radiance=dict(type='rgb',value=[.35,.37,.40])),
        floor=dict(type='rectangle',to_world=T().translate([0,0,-.00015]).scale([3,3,1]),
          bsdf=dict(type='diffuse',reflectance=dict(type='rgb',value=rgb('#e8dcc7')))))
    for name,origin,size,energy in [
        ('key',[-.80,-.80,1.52],[.72,.60,1],9),
        ('fill',[1.12,.28,1.20],[.60,.72,1],4),
        ('rim',[-.28,1.20,.96],[.72,.20,1],6)]:
        scene[name]=dict(type='rectangle',to_world=T().look_at(origin=origin,target=[0,0,.03],up=[0,1,0]).scale(size),
            emitter=dict(type='area',radiance=dict(type='rgb',value=[energy]*3)))
    for p in parts:
        n=p['name']; role=p['role']; dz=0
        if v['mode']=='supports' and n!='01_base_DRAFT': continue
        if v['mode']=='assembled' and role not in ['designed','panel']: continue
        if v['mode']=='exploded':
            if n=='03_LEGO_12x12_plate_DRAFT': dz=90
            elif n=='02_lid_DRAFT' or n.startswith('button_'): dz=60
            elif role in ['reference','panel','footprint']: dz=22
        material=mat(p['color'],p['roughness'])
        if role=='footprint': material=dict(type='twosided',bsdf=material)
        scene[n]=dict(type='ply',filename=str(p['file']),face_normals=False,
            to_world=T().scale(.001) @ T().translate([-70,-96,dz]),bsdf=material)
    return mi.load_dict(scene)

def denoise(img,name):
    raw=OUT/'raw'; raw.mkdir(exist_ok=True)
    array=np.asarray(img,dtype=np.float32)
    source=raw/f'{name}.pfm'; target=raw/f'{name}_denoised.pfm'
    h,w,_=array.shape
    with source.open('wb') as f:
        f.write(f'PF\n{w} {h}\n-1.0\n'.encode())
        f.write(np.flipud(array).astype('<f4').tobytes())
    result=subprocess.run([args.denoiser,'-d','cpu','--hdr',str(source),'-o',str(target),'-q','h'],capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stdout+result.stderr)
    with target.open('rb') as f:
        assert f.readline().strip()==b'PF'
        rw,rh=map(int,f.readline().split()); endian=float(f.readline())
        result=np.frombuffer(f.read(),dtype='<f4' if endian<0 else '>f4').reshape((rh,rw,3))
    assert (rw,rh)==(w,h)
    return np.ascontiguousarray(np.flipud(result))

rendered=[]
for name,v in views.items():
    if args.only!='all' and args.only not in [name,name.split('_',1)[1]]: continue
    start=time.monotonic(); print('Rendering',name,flush=True)
    img=mi.render(scene_for(v),seed=28)
    filename=OUT/(name+('_draft' if args.draft else '')+'.png')
    if not args.draft and Path(args.denoiser).exists(): img=denoise(img,name)
    mi.util.write_bitmap(str(filename),img)
    rendered.append(filename.name)
    print('Saved',filename.name,'in',round(time.monotonic()-start,1),'s',flush=True)

if not args.draft:
    manifest=dict(source='output/jelling_DRAFT.step',
        source_sha256=hashlib.sha256((SRC/'jelling_DRAFT.step').read_bytes()).hexdigest(),
        note='Studio render finish and lighting are illustrative. CAD geometry is unchanged. PCB references are simplified; buzzer is an XY footprint only.',
        renderer='Mitsuba 3 / CPU path tracing',samples_per_pixel=48,
        denoising='Open Image Denoise / CPU' if Path(args.denoiser).exists() else 'none',
        files=[name+'.png' for name in views if (OUT/(name+'.png')).exists()],
        views=views,exploded_translation_mm=dict(lid_and_buttons=60,stud_plate=90,hardware_references=22))
    (OUT/'render-info.json').write_text(json.dumps(manifest,indent=2)+'\n')
print('Finished',flush=True)
