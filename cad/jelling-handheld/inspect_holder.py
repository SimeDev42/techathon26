"""Read the supplied STEP's explicit analytic geometry without assuming dimensions."""
from pathlib import Path
import re,json
p=Path(__file__).resolve().parent
s=(p/'sources/54L15_Helmet.step').read_text()
entities={int(n):v.replace('\n',' ').replace('\r',' ') for n,v in re.findall(r'#(\d+)\s*=\s*(.*?);',s,re.S)}
def refs(t): return [int(x) for x in re.findall(r'#(\d+)',t)]
def nums(t): return [float(x) for x in re.findall(r'[-+]?\d*\.\d+(?:E[-+]?\d+)?',t)]
out=[]
for n,v in entities.items():
    if v.startswith('CYLINDRICAL_SURFACE'):
        axis=entities[refs(v)[0]]
        ar=refs(axis)
        point=nums(entities[ar[0]])
        direction=nums(entities[ar[1]])
        out.append(dict(entity=n,radius=nums(v)[0],point=point,axis=direction))
result=dict(source='54L15_Helmet.step',units=[v for v in entities.values() if 'SI_UNIT' in v],cylinders=out)
holes=sorted({tuple(round(t,6) for t in v['point'][:2]) for v in out if abs(v['radius']-1.6)<1e-6 and abs(v['axis'][2])>.99999})
result['board_mounting_holes']=[dict(x=x,y=y,diameter=3.2) for x,y in holes]
(p/'sources/holder-analytic-geometry.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'units':'mm','board_mounting_holes':result['board_mounting_holes']},indent=2))
