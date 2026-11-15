"""Package the checked CAD renders as a labelled overview (no cropping)."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
import numpy as np,json
ROOT=Path(__file__).resolve().parent/'renders'
fonts=[Path('/System/Library/Fonts/Supplemental/Arial.ttf'),Path('/System/Library/Fonts/Helvetica.ttc')]
fontfile=next(p for p in fonts if p.exists())
def font(size): return ImageFont.truetype(str(fontfile),size)
canvas=Image.new('RGB',(2400,2920),'#f3ecdc'); d=ImageDraw.Draw(canvas)
d.text((90,52),'THE JELLING JOURNEY',font=font(52),fill='#28364d')
d.text((92,124),'Current CAD assembly · studio views',font=font(28),fill='#687357')
views=[('01_hero.png','01 / ASSEMBLED'),('02_top.png','02 / TOP VIEW'),
       ('03_rear_quarter.png','03 / REAR QUARTER'),('04_exploded.png','04 / EXPLODED ASSEMBLY'),
       ('05_internal_supports.png','05 / PCB SUPPORTS')]
checks=[]
for index,(filename,title) in enumerate(views):
    image=Image.open(ROOT/filename).convert('RGB')
    a=np.asarray(image)
    black=float(np.mean(a.max(axis=2)<8))
    assert black<.02,(filename,'unexpected black obstruction',black)
    checks.append(dict(file=filename,resolution=list(image.size),nearly_black_fraction=black))
    x=80+(index%2)*1160; y=215+(index//2)*850
    d.rounded_rectangle((x,y,x+1080,y+790),radius=12,fill='white')
    small=ImageOps.contain(image,(1060,720),Image.Resampling.LANCZOS)
    canvas.paste(small,(x+(1080-small.width)//2,y+15+(720-small.height)//2))
    d.text((x+24,y+746),title,font=font(25),fill='#28364d')

x,y=1265,2010
d.text((x,y),'THE CURRENT DESIGN',font=font(32),fill='#28364d')
for i,line in enumerate(['140 × 192 mm enclosure footprint','12 × 12 studs / 144 total','Four button extensions','Supports for three PCBs','Recessed OLED and NFC blank']):
    d.text((x,y+75+i*59),line,font=font(28),fill='#4f5c50')
for i,line in enumerate(['Rendered from the existing STEP geometry.','Colour and lighting are illustrative.','Hardware references are simplified; the','buzzer reference shows its PCB footprint.']):
    d.text((x,y+410+i*42),line,font=font(24),fill='#687357')
d.text((90,2840),'CAD geometry unchanged · Assembled and separated views · 14 November 2026',font=font(25),fill='#687357')
canvas.save(ROOT/'render-sheet.png')
(ROOT/'image-checks.json').write_text(json.dumps(checks,indent=2)+'\n')
print('Checked and composed five render views.')
