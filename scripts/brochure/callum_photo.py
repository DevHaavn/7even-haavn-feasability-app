"""Callum Fraser's portrait for print.

The supplied photo is 335 x 597 px. It is upscaled in two gentle steps,
sharpened once at the end, and given a fine film grain at print resolution,
so the softness reads as a black and white photograph rather than as
enlargement. Tone is kept close to the original: deep blacks, soft city light.
"""
import numpy as np
from PIL import Image, ImageFilter, ImageOps
im=Image.open('callum2_src.jpg').convert('L')
W,H=im.size
im=im.filter(ImageFilter.GaussianBlur(0.75))                # soften the JPEG blocks before they are enlarged
im=im.resize((W*2,H*2),Image.LANCZOS).filter(ImageFilter.GaussianBlur(0.6))
im=im.resize((W*4,H*4),Image.LANCZOS)
im=im.filter(ImageFilter.UnsharpMask(radius=2.2,percent=70,threshold=2))
a=np.asarray(im).astype(np.float32)/255
a=np.clip((a-0.02)/0.97,0,1)**1.04                      # a touch deeper in the blacks
rng=np.random.default_rng(3)
g=rng.normal(0,1,(a.shape[0]//2+1,a.shape[1]//2+1)).astype(np.float32)
g=np.asarray(Image.fromarray(((g*0.5+0.5).clip(0,1)*255).astype(np.uint8)).resize((a.shape[1],a.shape[0]),Image.BICUBIC)).astype(np.float32)/255-0.5
amt=0.075*(1-np.abs(a-0.5)*1.2)                         # grain lives in the mid tones
a=np.clip(a+g*amt,0,1)
out=(a*255).astype(np.uint8)
Image.fromarray(out).convert('RGB').save('build/img/callum-fraser.jpg',quality=92)
Image.fromarray(out).crop((300,500,1000,1300)).save('callum_zoom.jpg',quality=90)
print(out.shape)
