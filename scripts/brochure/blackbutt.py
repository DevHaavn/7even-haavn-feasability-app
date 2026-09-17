"""Blackbutt tile: the Yakisugi three-quarter render re-clad in Blackbutt.

The architect has not rendered the Blackbutt facade, so the cladding in the
Yakisugi render is recoloured using the Blackbutt swatch from the Fraser &
Partners facade strategy page. The render's own light is kept: each pixel's
luminance is divided by the charred timber's value and multiplied back through
the Blackbutt colour, so shade, sun, board grooves and reflections stay where
Enscape put them. Frames, flashings and glazing are left as rendered.
"""
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
F='/Users/jamiebaldwin/Desktop/HAAVN BLACK/Renders - Exterior/'
src=Image.open(F+'enhanced_YAKISUGI_V3.png').convert('RGB')
W,H=src.size
X0,Y0,X1,Y1=int(W*0.40),int(H*0.22),int(W*0.98),int(H*0.80)
crop=src.crop((X0,Y0,X1,Y1)); cw,ch=crop.size; s=cw/1200.0
P=lambda pts:[(x*s,y*s) for x,y in pts]
polys=[
 [(636,178),(741,139),(741,470),(636,471)],          # front wall panel
 [(741,139),(906,222),(906,394),(741,470)],          # end wall
 [(0,500),(636,468),(652,468),(652,499),(0,519)],    # base band
 [(345,258),(373,251),(373,481),(345,483)],          # module column
 [(117,293),(139,289),(139,491),(117,493)],          # module column
]
mask=Image.new('L',(cw,ch),0); d=ImageDraw.Draw(mask)
for p in polys: d.polygon(P(p),fill=255)
a=np.asarray(crop).astype(np.float32)/255
lin=np.where(a<=0.04045,a/12.92,((a+0.055)/1.055)**2.4)
lum=lin@np.array([0.2126,0.7152,0.0722],np.float32)
r,g,b=a[...,0],a[...,1],a[...,2]
mx=a.max(-1); mn=a.min(-1)
# leaves and grass are yellow-olive (blue well under red); the charred boards
# stay close to neutral even in the sunset, measured off this render
foliage=(b/(r+1e-3))<0.585
bright=lum>0.09                                      # glass, curtains, sky through
m=(np.asarray(mask)>0)&~foliage&~bright
m=Image.fromarray((m*255).astype(np.uint8)).filter(ImageFilter.MedianFilter(5)).filter(ImageFilter.GaussianBlur(1.0))
m=np.asarray(m).astype(np.float32)/255
# Blackbutt: the swatch colour, and its grain turned vertical as a faint overlay
sw=Image.open('booklet/img_p06_1.jpeg').convert('RGB')
swa=np.asarray(sw).astype(np.float32)/255
bb=np.median(swa.reshape(-1,3),0)
bb_lin=np.where(bb<=0.04045,bb/12.92,((bb+0.055)/1.055)**2.4)
grain=sw.convert('L').rotate(90,expand=True).resize((int(cw/5),ch)).filter(ImageFilter.GaussianBlur(0.6))
grain=np.tile(np.asarray(grain).astype(np.float32)/255,(1,6))[:, :cw]
grain=1+ (grain-grain.mean())*0.55
yak=np.median(lum[np.asarray(mask)>0])               # the charred timber as rendered
light=np.clip(lum/max(yak,1e-4),0,6)*0.45            # 0.34: Blackbutt sits about this far above charcoal in the light
warm=np.array([1.03,0.93,0.86],np.float32)             # the sunset on the timber
out_lin=bb_lin[None,None,:]*warm*light[...,None]*grain[...,None]
out_lin=np.clip(out_lin,0,1)
gray=out_lin@np.array([0.2126,0.7152,0.0722],np.float32)
out_lin=out_lin*0.82+gray[...,None]*0.18           # Blackbutt weathers toward silver, not yellow
out=np.where(out_lin<=0.0031308,out_lin*12.92,1.055*out_lin**(1/2.4)-0.055)
res=a*(1-m[...,None])+out*m[...,None]
img=Image.fromarray((np.clip(res,0,1)*255).astype(np.uint8))
full=src.copy(); full.paste(img,(X0,Y0))
full.save('blackbutt_V3_full.jpg',quality=93)
img.resize((1200,int(1200*ch/cw))).save('crop_BLACKBUTT.jpg',quality=90)
print('swatch',np.round(bb,3),'charred lum',round(float(yak),4))
