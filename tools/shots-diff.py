import sys,os
from PIL import Image,ImageChops
a,b=sys.argv[1],sys.argv[2];bad=[]
for f in sorted(os.listdir(a)):
    if not os.path.exists(b+'/'+f):bad.append((f,'missing'));continue
    x=Image.open(a+'/'+f).convert('RGB');y=Image.open(b+'/'+f).convert('RGB')
    if x.size!=y.size:bad.append((f,'size'));continue
    d=ImageChops.difference(x,y).convert('L').point(lambda v:255 if v>16 else 0)
    n=sum(d.histogram()[255:]);
    if n>0:bad.append((f,n))
print(len(bad),'differ');[print(' ',x) for x in bad[:30]]
