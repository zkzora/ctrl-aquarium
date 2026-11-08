"""Reproducible native SVG sheets/branding and synthesized sound. No raster editing."""
from pathlib import Path
import base64, copy, json, math, random, struct, wave, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "public" / "assets"
SVG = "http://www.w3.org/2000/svg"
ET.register_namespace("", SVG)

def save(name, text):
    p = ASSETS / name
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text, encoding="utf-8")

def svg(w, h, content, title):
    return f'<svg xmlns="{SVG}" width="{w}" height="{h}" viewBox="0 0 {w} {h}" role="img"><title>{title}</title>{content}</svg>'

def mark(ink, background="none"):
    return f'<rect x="4" y="4" width="56" height="56" rx="14" fill="{background}" stroke="{ink}" stroke-width="3"/><path d="M20 22h15v12h11M39 27l7 7-7 7M20 42h8" stroke="{ink}" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'

save("brand/ctrl-mark.svg", svg(64,64,mark("#efefeb"),"CTRL keyboard mark"))
save("brand/ctrl-favicon.svg", svg(64,64,mark("#efefeb","#111315"),"CTRL"))
save("brand/token-test.svg", svg(64,64,'<circle cx="32" cy="32" r="28" fill="#1d252a" stroke="#a8ced4" stroke-width="2"/><path d="M18 20h24v24H18zM24 27h12m-12 6h8m-8 6h12" fill="none" stroke="#d5e4e4" stroke-width="2.5" stroke-linejoin="round"/><circle cx="48" cy="16" r="9" fill="#f1cb8b"/><path d="M44 16h8m-4-4v8" stroke="#313034" stroke-width="2"/>','tCTRL test credit — no monetary value'))
letters='M3 4H0V0h3M5 0h4M7 0v4M11 4V0h2q2 0 2 1t-2 1h-2m2 0 2 2M17 0v4h3'
for theme, ink in [("light","#eeeeea"),("dark","#172125")]:
    save(f"brand/ctrl-wordmark-{theme}.svg", svg(208,56,f'<g transform="translate(0 -4) scale(.86)">{mark(ink)}</g><path d="{letters}" transform="translate(72 14) scale(6.2)" stroke="{ink}" fill="none" stroke-width=".75" stroke-linecap="square" stroke-linejoin="miter"/>',"CTRL wordmark"))

actors=["fish-orange","fish-blue","fish-yellow","shark","jellyfish","crab","seaweed","clownfish","blue-tang","lionfish","manta-ray","anglerfish","whale"]
animation=[]
for name in actors:
    source=ET.parse(ASSETS/f"{name}.svg").getroot()
    w,h=[int(float(x)) for x in source.attrib["viewBox"].split()[2:]]
    sheet=ET.Element(f"{{{SVG}}}svg",{"width":str(w*4),"height":str(h),"viewBox":f"0 0 {w*4} {h}","role":"img"})
    ET.SubElement(sheet,f"{{{SVG}}}title").text=f"{name} four-frame motion sheet"
    for i in range(4):
        cell=ET.SubElement(sheet,f"{{{SVG}}}svg",{"x":str(i*w),"y":"0","width":str(w),"height":str(h),"viewBox":f"0 0 {w} {h}","overflow":"hidden"})
        sx=[1.0,.97,1.0,1.025][i]
        sy=[1.0,1.025,1.0,.98][i]
        rotation=([0,-1.4,0,1.4][i] if name in ["crab","seaweed"] else 0)
        if name=="jellyfish": sy=[1,.95,1,1.04][i];sx=[1,1.04,1,.97][i]
        g=ET.SubElement(cell,f"{{{SVG}}}g",{"transform":f"translate({w/2} {h/2}) rotate({rotation}) scale({sx} {sy}) translate({-w/2} {-h/2})"})
        for item in source:
            if item.tag==f"{{{SVG}}}title":continue
            child=copy.deepcopy(item)
            for e in child.iter():
                for k,v in list(e.attrib.items()):
                    if k=="id": e.set(k,f"f{i}_{v}")
                    else:
                        import re
                        e.set(k,re.sub(r"url\(#([^)]+)\)",lambda m:f"url(#f{i}_{m.group(1)})",v))
            g.append(child)
    p=ASSETS/"animations"/f"{name}-sheet.svg";p.parent.mkdir(exist_ok=True)
    ET.ElementTree(sheet).write(p,encoding="unicode",xml_declaration=False)
    animation.append({"id":name,"path":f"animations/{name}-sheet.svg","frames":4,"frameWidth":w,"frameHeight":h,"fps":5 if name=="jellyfish" else 7,"loop":True,"method":"procedural squash/stretch of original SVG; not articulated skeletal animation"})
save("animations/animations.json",json.dumps(animation,indent=2)+"\n")
save("effects/concern.svg",svg(80,64,'<path d="M11 8h58v38H42L27 58l3-12H11z" fill="#f1e5d1" stroke="#526775" stroke-width="3" stroke-linejoin="round"/><path d="M39 17v12m0 7v1" stroke="#526775" stroke-width="4" stroke-linecap="round"/>',"Creature concern bubble"))
save("effects/ground-shadow.svg",svg(160,48,'<ellipse cx="80" cy="24" rx="74" ry="17" fill="#102e3e" opacity=".18"/>',"Soft ground shadow"))

RATE=22050
def audio(name,duration,fn,volume=.3,loop=False):
    count=int(duration*RATE)
    values=[fn(i/RATE,i,count) for i in range(count)]
    if not loop:
        values=[v*min(1,i/(RATE*.01),(count-1-i)/(RATE*.04)) for i,v in enumerate(values)]
    peak=max(max(abs(v) for v in values),1e-6)
    values=[max(-1,min(1,v/peak*volume)) for v in values]
    target=ASSETS/"audio"/f"{name}.wav";target.parent.mkdir(exist_ok=True)
    with wave.open(str(target),"wb") as out:
        out.setnchannels(1);out.setsampwidth(2);out.setframerate(RATE)
        out.writeframes(b"".join(struct.pack("<h",round(v*32767)) for v in values))

tau=math.tau
audio("bubble",.25,lambda t,i,n:math.sin(tau*(370*t+1500*t*t))*math.exp(-17*t),.23)
audio("change-accepted",.48,lambda t,i,n:math.sin(tau*([523.25,659.25,783.99][min(2,int(t/.13))])*t)*math.exp(-3*t),.25)
audio("unsupported",.25,lambda t,i,n:(math.sin(tau*190*t)+.3*math.sin(tau*285*t))*math.exp(-12*t),.16)
audio("your-turn",.72,lambda t,i,n:math.sin(tau*([392,523.25,659.25,783.99][min(3,int(t/.15))])*t)*math.exp(-2*t),.27)
audio("countdown",.12,lambda t,i,n:math.sin(tau*620*t)*math.exp(-32*t),.17)
audio("pass-keyboard",.48,lambda t,i,n:math.sin(tau*(740*t-550*t*t))*math.exp(-7*t),.2)
audio("feed",.36,lambda t,i,n:sum(math.sin(tau*(300+q*180)*t)*math.exp(-20*max(0,t-q*.055))*(t>=q*.055) for q in range(4)),.2)
# Integer cycles over twelve seconds: seamless synthetic loop, no sampled recordings.
audio("underwater-ambience",12,lambda t,i,n:sum(math.sin(tau*(k/12)*t+math.sin(k))*(1/(1+(k/180)**1.5)) for k in range(420,1600,13))+.8*math.sin(tau*37*t)+.4*math.sin(tau*61*t),.055,True)

# Vector source for sharing image. Backdrop is embedded unchanged; this is a layout,
# not an edit to the painting. render-asset-kit.mjs exports this SVG to PNG.
bg=base64.b64encode((ASSETS/"aquarium-backdrop.png").read_bytes()).decode()
fish=base64.b64encode((ASSETS/"fish-orange.svg").read_bytes()).decode()
shark=base64.b64encode((ASSETS/"shark.svg").read_bytes()).decode()
save("brand/social-card.svg",svg(1200,630,f'<rect width="1200" height="630" fill="#111517"/><image href="data:image/png;base64,{bg}" x="460" y="0" width="1005" height="630"/><rect x="0" y="0" width="475" height="630" fill="#111517"/><g transform="translate(58 46) scale(.8)">{mark("#eeeeea")}</g><text x="128" y="85" fill="#eeeeea" font-size="34" font-family="Arial, sans-serif" font-weight="700">CTRL</text><text x="58" y="225" fill="#eeeeea" font-size="62" font-family="Arial, sans-serif" font-weight="700">One world.</text><text x="58" y="301" fill="#eeeeea" font-size="62" font-family="Arial, sans-serif" font-weight="700">Your turn.</text><text x="60" y="369" fill="#b5bfc2" font-size="21" font-family="Arial, sans-serif">Change a little aquarium.</text><text x="60" y="403" fill="#b5bfc2" font-size="21" font-family="Arial, sans-serif">See what the internet does next.</text><rect x="60" y="493" width="210" height="48" rx="9" fill="#e9eeeb"/><text x="87" y="524" fill="#182227" font-size="19" font-family="Arial, sans-serif" font-weight="700">THE AQUARIUM / 001</text><image href="data:image/svg+xml;base64,{shark}" x="790" y="227" width="230" height="115"/><image href="data:image/svg+xml;base64,{fish}" x="622" y="341" width="110" height="66"/>',"CTRL — one world, your turn"))
card_path=ASSETS/"brand"/"social-card.svg"
card_path.write_text(card_path.read_text(encoding="utf-8").replace('width="210" height="48"','width="240" height="48"'),encoding="utf-8")
print(json.dumps({"animationSheets":len(animation),"audioFiles":8,"assetRoot":str(ASSETS)}))
