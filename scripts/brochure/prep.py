import fitz, numpy as np
from PIL import Image, ImageOps, ImageFilter
D='/Users/jamiebaldwin/Desktop/'
HB=D+'HAAVN BLACK/'; EX=HB+'Renders - Exterior/'
O='build/img/'
def save(im,name,w,q=84):
    im=im.convert('RGB')
    if im.width>w: im=im.resize((w,round(w*im.height/im.width)),Image.LANCZOS)
    im.save(O+name,quality=q,optimize=True,progressive=True); print(name,im.size)
def crop(im,fx0,fy0,fx1,fy1):
    W,H=im.size; return im.crop((int(W*fx0),int(H*fy0),int(W*fx1),int(H*fy1)))
def mirror_plain(im,frac=0.40):
    """a logo-free ground: the top of the texture, mirrored down"""
    W,H=im.size; top=im.crop((0,0,W,int(H*frac)))
    body=Image.new('RGB',(W,H)); half=H//2
    t=top.resize((W,half)); body.paste(t,(0,0)); body.paste(ImageOps.flip(t),(0,half)); return body

bc=Image.open(D+'HVN - Black Concrete.png'); wc=Image.open(D+'HVN - White Concrete.png'); lt=Image.open(D+'HVN - Black Leather.png')
save(bc,'cover-black-concrete.jpg',2800); save(wc,'back-white-concrete.jpg',2800)
save(mirror_plain(lt),'ground-leather.jpg',2800); save(mirror_plain(bc),'ground-black-concrete.jpg',2400)
save(mirror_plain(wc),'ground-white-concrete.jpg',2400)

ext=lambda k,v: Image.open(EX+'enhanced_%s_V%d.png'%(k,v))
save(ext('YAKISUGI',1),'hero-yakisugi-front.jpg',2800)
save(ext('STANDING',2),'standing-seam-view.jpg',2600)
save(ext('FC',1),'fc-front.jpg',2400)
# the four finishes, the three-quarter, drawn in close
box=(0.43,0.25,0.95,0.77)
save(crop(ext('YAKISUGI',3),*box),'finish-yakisugi.jpg',1700)
save(crop(Image.open('blackbutt_V3_full.jpg'),*box),'finish-blackbutt.jpg',1700)
save(crop(ext('STANDING',3),*box),'finish-standing-seam.jpg',1700)
save(crop(ext('FC',3),*box),'finish-fibre-cement.jpg',1700)
# material swatches, cut from flat walls in the renders (big, sharp) and the Blackbutt board
def sq(im,cx,cy,side):
    W,H=im.size; s=int(W*side); x=int(W*cx)-s//2; y=int(H*cy)-s//2; return im.crop((x,y,x+s,y+s))
save(sq(ext('YAKISUGI',2),0.52,0.50,0.10),'sw-yakisugi.jpg',900)
save(sq(ext('STANDING',2),0.40,0.48,0.10),'sw-standing-seam.jpg',900)
save(sq(ext('FC',2),0.40,0.48,0.10),'sw-fibre-cement.jpg',900)
save(Image.open('booklet/img_p06_1.jpeg'),'sw-blackbutt.jpg',900)
# interiors
for n,f in (('int-lounge','LOUNGE_enhanced.png'),('int-kitchen','KITCHEN_DINING_enhanced.png'),('int-bedroom','BEDROOM_enhanced.png'),('int-bathroom','BATHROOM_enhanced.png')):
    save(Image.open(HB+f),n+'.jpg',2400)
save(Image.open(HB+'Renders - Interior/260825_Look and Feel Material Samples Presented.jpeg'),'int-samples.jpg',1400)
# plan: vector, from the architect's booklet
d=fitz.open(HB+'26025_FP Living Systems_SOLUM_Project Booklet_260825.pdf')
clip=fitz.Rect(60*1.2,190*1.2,650*1.2,845*1.2)
pix=d[4].get_pixmap(dpi=360,clip=clip); pix.save(O+'plan.png'); print('plan.png',pix.width,pix.height)
