// Deterministic export of original SVG source art. No generated painting is edited.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
const root=path.resolve(import.meta.dirname,'..');
const assets=path.join(root,'public','assets');
const pngDir=path.join(assets,'png');await fs.mkdir(pngDir,{recursive:true});
let count=0;
for(const name of ['fish-orange','fish-blue','fish-yellow','shark','jellyfish','crab','shelter','treasure','seaweed','clownfish','blue-tang','lionfish','manta-ray','anglerfish','whale','treasure-open','treasure-empty']){
 await sharp(path.join(assets,`${name}.svg`),{density:144}).png().toFile(path.join(pngDir,`${name}@2x.png`));count++;
}
for(const file of await fs.readdir(path.join(assets,'animations'))){if(!file.endsWith('.svg'))continue;
 await sharp(path.join(assets,'animations',file)).png().toFile(path.join(assets,'animations',file.replace('.svg','.png')));count++;
}
await sharp(path.join(assets,'brand','social-card.svg')).png().toFile(path.join(assets,'brand','social-card.png'));count++;
const sprites=['fish-orange.svg','fish-blue.svg','fish-yellow.svg','shark.svg','jellyfish.svg','crab.svg','shelter.svg','treasure.svg','seaweed.svg',
 'clownfish.svg','blue-tang.svg','lionfish.svg','manta-ray.svg','anglerfish.svg','whale.svg','treasure-open.svg','treasure-empty.svg',
 'props/coral-pink.svg','props/coral-blue.svg','props/rocks.svg','props/ruin.svg','props/surface-lamp.svg','props/signpost.svg'];
const cells=[];
for(let i=0;i<sprites.length;i++){
 const p=path.join(assets,sprites[i]);let raw;try{raw=await fs.readFile(p)}catch{continue}
 const x=(i%5)*260,y=Math.floor(i/5)*218;
 cells.push(`<rect x="${x+10}" y="${y+10}" width="240" height="196" rx="14" fill="#1c2931"/><image href="data:image/svg+xml;base64,${raw.toString('base64')}" x="${x+44}" y="${y+26}" width="172" height="128"/><text x="${x+26}" y="${y+184}" fill="#d9e6e5" font-family="Arial, sans-serif" font-size="15">${sprites[i].replace('props/','').replace('.svg','')}</text>`);
}
const sheetHeight=112+Math.ceil(sprites.length/5)*218;
const sheet=`<svg xmlns="http://www.w3.org/2000/svg" width="1300" height="${sheetHeight}" viewBox="0 0 1300 ${sheetHeight}"><rect width="1300" height="${sheetHeight}" fill="#11191e"/><text x="24" y="48" font-family="Arial, sans-serif" font-size="29" font-weight="700" fill="#edf0e9">CTRL / TWO AQUARIUMS</text><text x="24" y="78" font-family="Arial, sans-serif" font-size="15" fill="#a5b6bf">Original editable SVG inhabitants · natural shark v2 · whale habitat · procedural motion sheets</text><g transform="translate(0 100)">${cells.join('')}</g></svg>`;
await fs.writeFile(path.join(assets,'contact-sheet.svg'),sheet);
await sharp(Buffer.from(sheet)).png().toFile(path.join(assets,'contact-sheet.png'));
for(const file of await fs.readdir(path.join(assets,'rewards'))){if(file.endsWith('.svg'))await sharp(path.join(assets,'rewards',file),{density:144}).png().toFile(path.join(assets,'rewards',file.replace('.svg','.png')));}
console.log(JSON.stringify({pngExports:count,contactSheet:'public/assets/contact-sheet.png'}));
