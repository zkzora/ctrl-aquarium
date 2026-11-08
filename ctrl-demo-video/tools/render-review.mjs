import {bundle} from '@remotion/bundler';
import {selectComposition,renderStill,openBrowser} from '@remotion/renderer';
import fs from 'node:fs/promises';
import path from 'node:path';
const timeline=JSON.parse(await fs.readFile('out/timeline.json','utf8'));
const serveUrl=await bundle({entryPoint:path.resolve('src/index.ts')});
const browser=await openBrowser('chrome');
try{
 const composition=await selectComposition({serveUrl,id:'CTRL',puppeteerInstance:browser});
 await fs.mkdir('out/review',{recursive:true});
 const checks=timeline.map((s,i)=>({name:`${String(i+1).padStart(2,'0')}-${s.id}`,frame:s.from+Math.min(s.frames-30,Math.floor(s.frames*.6))}));
 const hole=timeline.find(x=>x.id==='hole');checks.push({name:'11-collapse',frame:hole.from+150},{name:'12-regrowth',frame:hole.from+490});
 for(const check of checks){await renderStill({composition,serveUrl,output:`out/review/${check.name}.png`,frame:check.frame,imageFormat:'png',puppeteerInstance:browser});console.log('Reviewed frame '+check.name);}
 console.log('Composition '+composition.durationInFrames/30+'s. Review images in out/review.');
}finally{await browser.close({silent:true});}
