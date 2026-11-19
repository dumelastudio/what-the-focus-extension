from pathlib import Path
import struct,zlib,math
ROOT=Path(__file__).resolve().parents[1]/'extension/icons'
ROOT.mkdir(parents=True,exist_ok=True)
SVG='''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="17" fill="#202523"/><g fill="#72d49b"><rect x="18" y="18" width="12" height="4" rx="2"/><rect x="18" y="18" width="4" height="12" rx="2"/><rect x="34" y="18" width="12" height="4" rx="2"/><rect x="42" y="18" width="4" height="12" rx="2"/><rect x="18" y="42" width="12" height="4" rx="2"/><rect x="18" y="34" width="4" height="12" rx="2"/><rect x="34" y="42" width="12" height="4" rx="2"/><rect x="42" y="34" width="4" height="12" rx="2"/><rect x="28" y="28" width="8" height="8" rx="2"/></g></svg>'''
(ROOT/'mark.svg').write_text(SVG)
def rr(x,y,left,top,width,height,radius):
    cx=left+width/2;cy=top+height/2
    dx=max(abs(x-cx)-(width/2-radius),0);dy=max(abs(y-cy)-(height/2-radius),0)
    return dx*dx+dy*dy<=radius*radius
rects=[(18,18,12,4),(18,18,4,12),(34,18,12,4),(42,18,4,12),(18,42,12,4),(18,34,4,12),(34,42,12,4),(42,34,4,12),(28,28,8,8)]
def pixel(x,y):
    if not rr(x,y,0,0,64,64,17):return (0,0,0,0)
    if any(rr(x,y,*r,2) for r in rects):return(114,212,155,255)
    return(32,37,35,255)
def png(size):
    rows=[]
    for y in range(size):
        row=bytearray([0])
        for x in range(size):
            samples=[pixel((x+(sx+.5)/3)*64/size,(y+(sy+.5)/3)*64/size) for sy in range(3) for sx in range(3)]
            row.extend(round(sum(p[i] for p in samples)/9) for i in range(4))
        rows.append(bytes(row))
    def chunk(name,data):return struct.pack('>I',len(data))+name+data+struct.pack('>I',zlib.crc32(name+data)&0xffffffff)
    return b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',size,size,8,6,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(rows),9))+chunk(b'IEND',b'')
for size in [16,32,48,128]: (ROOT/f'icon{size}.png').write_bytes(png(size))
print('Geometric focus mark and 4 PNG sizes generated.')
