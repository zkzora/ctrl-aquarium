"""Validate deliverable resources; generate a portable manifest and evidence report."""
from pathlib import Path
import datetime, hashlib, json, re, struct, wave, xml.etree.ElementTree as ET

ROOT=Path(__file__).resolve().parents[1]
BASE=ROOT/"public"/"assets"
NS="{http://www.w3.org/2000/svg}"
animations=json.loads((BASE/"animations"/"animations.json").read_text())
anim={a["id"]:a for a in animations}
required=["aquarium-backdrop.png","whale-backdrop.png","fish-orange.svg","fish-blue.svg","fish-yellow.svg","shark.svg","jellyfish.svg","crab.svg","shelter.svg","treasure.svg","treasure-open.svg","treasure-empty.svg","seaweed.svg","clownfish.svg","blue-tang.svg","lionfish.svg","manta-ray.svg","anglerfish.svg","whale.svg","effects/black-hole.svg","rewards/nvda-demo.svg","brand/social-card.png","contact-sheet.png"]
errors=[];items=[]
bottom={"shelter","treasure","treasure-open","treasure-empty","seaweed","coral-pink","coral-blue","rocks","ruin","signpost"}
creatures={"fish-orange","fish-blue","fish-yellow","shark","jellyfish","crab","clownfish","blue-tang","lionfish","manta-ray","anglerfish","whale"}
for name in required:
    if not (BASE/name).is_file():errors.append(f"Required asset missing: {name}")
for p in sorted(BASE.rglob("*")):
    if p.suffix not in [".svg",".png",".wav"]:continue
    rel=p.relative_to(BASE).as_posix();data=p.read_bytes()
    item={"id":rel.replace("/","__").rsplit(".",1)[0],"path":rel,"url":"/assets/"+rel,"format":p.suffix[1:],"bytes":len(data),"sha256":hashlib.sha256(data).hexdigest()}
    stem=p.stem.replace("@2x","").replace("-sheet","")
    if p.suffix==".svg":
        try:
            doc=ET.fromstring(data);vb=[float(x) for x in doc.attrib["viewBox"].split()]
            item.update({"format":"svg","width":int(float(doc.attrib.get("width",vb[2]))),"height":int(float(doc.attrib.get("height",vb[3]))),"viewBox":vb})
            ids=set()
            for el in doc.iter():
                tag=el.tag.rsplit("}",1)[-1]
                if tag in ["script","foreignObject"]:errors.append(f"Unsafe SVG element in {rel}: {tag}")
                for key,value in el.attrib.items():
                    if key.startswith("on"):errors.append(f"Inline SVG event in {rel}")
                    if key.endswith("href") and not value.startswith(("#","data:")):errors.append(f"External dependency in {rel}: {value}")
                ident=el.get("id")
                if ident and ident in ids:errors.append(f"Duplicate SVG id in {rel}: {ident}")
                if ident:ids.add(ident)
        except Exception as exc:errors.append(f"Invalid SVG {rel}: {exc}")
    elif p.suffix==".png":
        if data[:8]!=b'\x89PNG\r\n\x1a\n':errors.append(f"Invalid PNG signature: {rel}")
        w,h=struct.unpack(">II",data[16:24]);item.update({"format":"png","width":w,"height":h})
    else:
        with wave.open(str(p),"rb") as wav:
            n=wav.getnframes();rate=wav.getframerate();raw=wav.readframes(n)
            if wav.getsampwidth()!=2 or wav.getnchannels()!=1:errors.append(f"Unexpected WAV format: {rel}")
            samples=struct.unpack("<"+"h"*(len(raw)//2),raw)
            peak=max(abs(x) for x in samples)/32768
            item.update({"format":"wav","durationSeconds":round(n/rate,3),"sampleRate":rate,"channels":1,"bits":16,"peakLinear":round(peak,4),"loop":stem=="underwater-ambience","suggestedGain":0.35 if stem=="underwater-ambience" else 0.5})
            if peak>.9:errors.append(f"Unexpected loudness: {rel}")
    category=p.parent.name if p.parent!=BASE else ("creatures" if stem in creatures else "world-props" if stem in bottom else "environment" if stem in ["aquarium-backdrop","whale-backdrop"] else "preview")
    item["category"]=category
    if "width" in item:
        item["anchor"]={"x":.5,"y":1 if stem in bottom else 0 if stem=="surface-lamp" else .5}
        item["layer"]="actors" if stem in creatures else "props" if stem in bottom or category=="props" else "overlay" if category=="effects" else "background" if stem in ["aquarium-backdrop","whale-backdrop"] else "ui" if category=="brand" else "reference"
        if category=="effects" and item["width"]==1586:item["anchor"]={"x":0,"y":0}
        if category=="animations":item["animation"]={k:v for k,v in anim[stem].items() if k not in ["path","id"]}
        if category=="png":item["pixelRatio"]=2
        if stem in creatures:item["facing"]="front" if stem in ["jellyfish","crab"] else "right"
    items.append(item)
for a in animations:
    for suffix in ["svg","png"]:
        match=next((i for i in items if i["path"]==f'animations/{a["id"]}-sheet.{suffix}'),None)
        if not match:errors.append(f"Missing motion sheet: {a['id']} {suffix}")
        elif match["width"]!=a["frameWidth"]*4 or match["height"]!=a["frameHeight"]:errors.append(f"Incorrect sheet bounds: {match['path']}")
manifest={"version":2,"project":"CTRL — Public and Whale Aquariums","baseUrl":"/assets/","normalizedAnchors":True,"notes":["Static SVG sources are authoritative; PNGs are deterministic exports.","Animation sheets are procedural squash/stretch frames, not skeletal rigs.","No audio autoplays. Test token illustration is not a launched token.","NVDA/AAPL/MSFT graphics are fictional demo souvenirs, not stocks, securities, or redeemable assets."],"assets":items}
(BASE/"asset-manifest.json").write_text(json.dumps(manifest,indent=2)+"\n",encoding="utf-8")
report={"auditedAt":datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=7))).isoformat(),"files":len(items),"svg":sum(i["format"]=="svg" for i in items),"png":sum(i["format"]=="png" for i in items),"wav":sum(i["format"]=="wav" for i in items),"totalBytes":sum(i["bytes"] for i in items),"errors":errors,"passed":not errors,"checks":["required files","SVG parsing / duplicate IDs / external dependencies","PNG headers and dimensions","WAV PCM metadata and peak","motion sheet bounds","SHA-256 for each asset"]}
(BASE/"VALIDATION_REPORT.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report));raise SystemExit(1 if errors else 0)
