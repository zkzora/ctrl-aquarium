"""Package authored assets/spec/source; exclude dependencies and local secrets."""
from pathlib import Path
import hashlib,json,zipfile,shutil
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT.parent
IGNORE={"node_modules",".git",".wrangler",".sites-runtime",".vinext",".next","dist","out","outputs","work","__pycache__",".ctrl-data",".vercel"}
def safe(relative):
    if any(p in IGNORE for p in relative.parts):return False
    if relative.parts[0]==".openai" and relative.as_posix()!=".openai/hosting.json":return False
    n=relative.name.lower()
    if (n.startswith(".env") and n!=".env.example") or n.startswith(".dev.vars"):return False
    return not n.endswith((".pem",".key",".p12",".keystore",".log",".tsbuildinfo",".pyc"))
def archive(destination,entries):
    with zipfile.ZipFile(destination,"w",zipfile.ZIP_DEFLATED,compresslevel=7,strict_timestamps=False) as z:
        for p,name in sorted(entries,key=lambda item:item[1]):z.write(p,name)
    return {"path":str(destination),"files":len(entries),"bytes":destination.stat().st_size,"sha256":hashlib.sha256(destination.read_bytes()).hexdigest()}
assets=[(p,"ctrl-assets/"+p.relative_to(ROOT/"public").as_posix()) for p in (ROOT/"public"/"assets").rglob("*") if p.is_file()]
assets.extend([(ROOT/"public"/"asset-gallery.html","ctrl-assets/asset-gallery.html"),(ROOT/"ASSETS_README.md","ctrl-assets/README.md")])
source=[(p,"ctrl/"+p.relative_to(ROOT).as_posix()) for p in ROOT.rglob("*") if p.is_file() and safe(p.relative_to(ROOT))]
website=[(p,"CTRL_WEBSITE/"+p.relative_to(ROOT/"website-dist").as_posix()) for p in (ROOT/"website-dist").rglob("*") if p.is_file()]
report={"assets":archive(OUT/"CTRL_ASSETS.zip",assets),"website":archive(OUT/"CTRL_WEBSITE.zip",website),"handoff":archive(OUT/"CTRL_WEBSITE_HANDOFF.zip",source)}
shutil.copyfile(OUT/"CTRL_WEBSITE_HANDOFF.zip",OUT/"CTRL_HANDOFF.zip")
(OUT/"CTRL_DELIVERY.json").write_text(json.dumps(report,indent=2)+"\n",encoding="utf-8")
print(json.dumps(report))
