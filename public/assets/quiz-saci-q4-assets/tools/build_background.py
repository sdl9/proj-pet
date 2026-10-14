"""Normalize an approved background and assemble a static visual preview.

Usage: python build_background.py INPUT_PNG
Dependencies: Pillow and numpy. No game logic is implemented.
"""
from pathlib import Path
import sys
import json
import shutil
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
ASSETS=ROOT/'public/assets/quiz-saci'
BACKGROUND=ASSETS/'backgrounds'
PREVIEWS=ROOT/'previews'
BACKGROUND.mkdir(parents=True,exist_ok=True)
PREVIEWS.mkdir(parents=True,exist_ok=True)

PALETTE=['A8C7C0','F3EAD3','A9B993','B9C69E','C8CBA2','789571','6D8967',
         '58755A','416447','97AD82','9A7257','A68C70','B69A73','665044']
source=Image.open(sys.argv[1]).convert('RGB').resize((640,360),Image.Resampling.NEAREST)
arr=np.array(source).astype(np.int32)
colors=np.array([tuple(bytes.fromhex(c)) for c in PALETTE],dtype=np.int32)
distance=((arr[:,:,None,:]-colors[None,None,:,:])**2).sum(axis=3)
normalized=colors[distance.argmin(axis=2)].astype(np.uint8)
background=Image.fromarray(normalized).convert('RGBA')
background.save(BACKGROUND/'quiz-saci-background.png')

def nine_slice(image,width,height,border=8):
    sw,sh=image.size;dest=Image.new('RGBA',(width,height))
    sx=[0,border,sw-border,sw];sy=[0,border,sh-border,sh]
    dx=[0,border,width-border,width];dy=[0,border,height-border,height]
    for j in range(3):
        for i in range(3):
            tile=image.crop((sx[i],sy[j],sx[i+1],sy[j+1])).resize((dx[i+1]-dx[i],dy[j+1]-dy[j]),Image.Resampling.NEAREST)
            dest.paste(tile,(dx[i],dy[j]))
    return dest

def three_slice(image,width,border=4):
    result=Image.new('RGBA',(width,image.height))
    result.paste(image.crop((0,0,border,image.height)),(0,0))
    result.paste(image.crop((border,0,image.width-border,image.height)).resize((width-2*border,image.height),Image.Resampling.NEAREST),(border,0))
    result.paste(image.crop((image.width-border,0,image.width,image.height)),(width-border,0))
    return result

def scale2(image):return image.resize((image.width*2,image.height*2),Image.Resampling.NEAREST)
def ui(name):return Image.open(ASSETS/'ui'/name).convert('RGBA')

screen=scale2(background)
portrait=Image.open(ASSETS/'characters/saci-quiz-portrait.png').convert('RGBA')
screen.alpha_composite(scale2(portrait),(48,40))
screen.alpha_composite(scale2(ui('portrait-frame.png')),(48,40))
screen.alpha_composite(scale2(nine_slice(ui('question-panel.png'),480,96)),(272,40))
screen.alpha_composite(scale2(ui('question-tail.png')),(252,116))
screen.alpha_composite(scale2(three_slice(ui('separator.png'),592)),(48,260))
for y in (300,436,572):
    screen.alpha_composite(scale2(nine_slice(ui('answer-panel-normal.png'),516,56)),(200,y))
    screen.alpha_composite(scale2(ui('answer-badge-normal.png')),(64,y+8))
screen.save(PREVIEWS/'quiz-saci-composition-q4.png')

manifest=json.loads((ASSETS/'quiz-saci-assets-manifest.json').read_text())
manifest.update(version=4,stage='Q4',background={'key':'quiz-saci-background','sourceSize':[640,360],'displaySize':[1280,720],'scale':2,'palette':['#'+c for c in PALETTE]})
manifest['images']=[e for e in manifest['images'] if e['key']!='quiz-saci-background']
manifest['images'].insert(0,{'key':'quiz-saci-background','path':'quiz-saci/backgrounds/quiz-saci-background.png','size':[640,360]})
manifest['notes']=[n for n in manifest['notes'] if 'Background pending' not in n]
(ASSETS/'quiz-saci-assets-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')

report=[]
for path in sorted(ASSETS.rglob('*.png')):
    image=Image.open(path).convert('RGBA');arr=np.array(image)
    alphas=set(map(int,np.unique(arr[:,:,3])))
    assert alphas.issubset({0,255}),path
    color_count=len({tuple(c) for c in arr[arr[:,:,3]==255,:3]})
    if path.parent.name=='backgrounds':
        assert image.size==(640,360)
        assert alphas=={255}
        assert color_count<=len(PALETTE)
    report.append({'file':path.relative_to(ASSETS).as_posix(),'size':list(image.size),'opaqueColors':color_count,'alphaValues':sorted(alphas)})
assert len(report)==20
assert screen.size==(1280,720)
(ROOT/'validation.json').write_text(json.dumps({'status':'passed','pngCount':20,'logicalScreen':[1280,720],'backgroundPixelScale':2,'staticPortrait':True,'integrationTested':False,'files':report},indent=2)+'\n')
print(json.dumps({'status':'passed','pngCount':20,'backgroundSize':list(background.size),'backgroundColors':len(set(map(tuple,normalized.reshape(-1,3)))),'previewSize':list(screen.size)}))
