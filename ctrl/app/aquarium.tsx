"use client";
import {useEffect,useRef,useState} from 'react';
import type {World,WorldObject} from '../lib/world';
import {CREATURES,HABITATS,isCreature} from '../lib/catalog';
import type {WorldEffect} from '../website/reward-engine';
type Props={world:World;offset:number;paused:boolean;at?:number;effect?:WorldEffect|null;viewerId?:string;onCanvas?:(canvas:HTMLCanvasElement)=>void};
const files=['aquarium-backdrop.png','whale-backdrop.png',...CREATURES.map(c=>`${c.kind}.svg`),'shelter.svg','treasure.svg','treasure-open.svg','treasure-empty.svg','seaweed.svg'];
const stationary=new Set(['shelter','treasure','seaweed','crab']);
function triangle(n:number){const p=((n%2)+2)%2;return p<1?p:2-p}
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
function position(o:WorldObject,w:World,now:number){
 const elapsed=((w.frozen?(w.frozenAt??now):now)-w.epoch)/1000,phase=o.seed*.041;let x=o.x,y=o.y,dir=1;
 if(stationary.has(o.kind)){y=o.kind==='crab'?.88:.89;if(o.kind==='crab')x=.1+.8*triangle(elapsed*.008+phase)}
 else{
  const rate=o.kind==='whale'?.006:o.kind==='manta-ray'?.009:o.kind==='shark'?.021:.015;
  const p=elapsed*rate*w.speed+phase;x=.10+.8*triangle(p);dir=(((p%2)+2)%2)<1?1:-1;
  y=o.y+Math.sin(elapsed*.55+phase)*.025;
  if(o.kind==='jellyfish'){y=.22+.45*triangle(elapsed*.012+phase);x=o.x+Math.sin(elapsed*.15+phase)*.08}
  if(['fish-orange','fish-blue','fish-yellow','clownfish','blue-tang'].includes(o.kind)&&w.objects.some(z=>z.kind==='shark')){
   const shelter=w.objects.find(z=>z.kind==='shelter');if(shelter){x=x*.55+shelter.x*.45;y=y*.55+.72*.45}else y+=Math.sin(elapsed*2.1+phase)*.025;
  }
  if(o.kind.includes('fish')&&now-w.fedAt<8000)y=y*.5+.18*.5;
 }
 if(w.gravity==='reverse')y=1-y;
 return {x,y,dir,elapsed};
}
const sizes:Record<string,number>={whale:.38,'manta-ray':.23,anglerfish:.12,lionfish:.12,shark:.22,shelter:.18,seaweed:.075,treasure:.12,jellyfish:.065,crab:.085,clownfish:.09,'blue-tang':.095};
export default function Aquarium({world,offset,paused,at,effect,viewerId,onCanvas}:Props){
 const ref=useRef<HTMLCanvasElement>(null),latest=useRef({world,offset,paused,at,effect,viewerId});latest.current={world,offset,paused,at,effect,viewerId};
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false);
 useEffect(()=>{
  const canvas=ref.current;if(!canvas)return;onCanvas?.(canvas);let alive=true,frame=0,lastPaint=0,heldAt=Date.now()+offset;
  const images=new Map<string,HTMLImageElement>(),reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
  Promise.all(files.map(file=>new Promise<void>((resolve,reject)=>{const img=new Image();img.onload=()=>{images.set(file,img);resolve()};img.onerror=reject;img.src=`./assets/${file}`}))).then(()=>{if(alive){setReady(true);draw()}}).catch(()=>{if(alive)setFailed(true)});
  function draw(){
   if(!alive||!canvas)return;frame=requestAnimationFrame(draw);const tick=Date.now(),v=latest.current;
   if(tick-lastPaint<(v.effect?24:(v.paused||reduce.matches)?350:30))return;lastPaint=tick;
   const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),W=rect.width,H=rect.height;if(!W||!H)return;
   if(canvas.width!==Math.round(W*dpr)||canvas.height!==Math.round(H*dpr)){canvas.width=Math.round(W*dpr);canvas.height=Math.round(H*dpr)}
   const ctx=canvas.getContext('2d');if(!ctx)return;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,W,H);
   const fx=v.effect&&!reduce.matches?v.effect:null,p=fx?clamp((tick-fx.startedAt)/fx.duration):1;
   const swallowing=fx?.type==='blackhole'&&p<.88,worldNow=swallowing?fx.world:v.world;
   if(!v.paused&&!reduce.matches)heldAt=tick+v.offset;
   const rawNow=v.at??heldAt,now=worldNow.frozen?(worldNow.frozenAt??rawNow):rawNow;
   const collapse=swallowing?Math.pow(clamp((p-.08)/.72),1.55):0,cx=W*.55,cy=H*.46;
   const bg=images.get(HABITATS[worldNow.biome??'public'].backdrop);
   if(bg){ctx.save();if(swallowing){ctx.translate(cx,cy);ctx.rotate(collapse*.045);ctx.scale(1+collapse*.10,1+collapse*.10);ctx.translate(-cx,-cy)}const scale=Math.max(W/bg.width,H/bg.height);ctx.drawImage(bg,(W-bg.width*scale)/2,(H-bg.height*scale)/2,bg.width*scale,bg.height*scale);ctx.restore()}
   if(worldNow.light!=='day'){ctx.fillStyle=worldNow.light==='night'?'rgba(6,12,40,.55)':'rgba(167,72,41,.19)';ctx.fillRect(0,0,W,H)}
   if(worldNow.disco){ctx.save();ctx.globalCompositeOperation='screen';for(let i=0;i<3;i++){const t=(now-worldNow.epoch)/1000;ctx.fillStyle=['#ab44eb20','#26dada20','#eb803b20'][i];ctx.beginPath();ctx.moveTo(W*(.2+i*.3),0);ctx.lineTo(W*(.1+i*.3+Math.sin(t*.5+i)*.15),H);ctx.lineTo(W*(.5+i*.3+Math.sin(t*.5+i)*.15),H);ctx.closePath();ctx.fill()}ctx.restore()}
   const sorted=[...worldNow.objects].sort((a,b)=>Number(!stationary.has(a.kind))-Number(!stationary.has(b.kind)));
   for(const o of sorted){
    const pos=position(o,worldNow,swallowing?fx.startedAt:now),filename=o.kind==='treasure'&&o.opened?(o.rewardEmpty?'treasure-empty.svg':'treasure-open.svg'):`${o.kind}.svg`,img=images.get(filename);if(!img)continue;
    const width=W*(sizes[o.kind]??(.07+(o.seed%3)*.008)),height=width*img.height/img.width;let px=pos.x*W,py=pos.y*H,rotation=0,shrink=1;
    if(swallowing){const dx=px-cx,dy=py-cy,r=Math.hypot(dx,dy)*(1-collapse),theta=Math.atan2(dy,dx)+collapse*7.5;px=cx+Math.cos(theta)*r;py=cy+Math.sin(theta)*r;shrink=Math.max(0,1-collapse)*(.9+.1*Math.cos(collapse*4));rotation=collapse*8;}
    ctx.save();ctx.globalAlpha=swallowing?clamp((1-collapse)*1.8):1;ctx.translate(px,py);ctx.rotate(rotation);ctx.scale(pos.dir*shrink,(worldNow.gravity==='reverse'?-1:1)*shrink);
    if(!stationary.has(o.kind)&&!swallowing)ctx.rotate(Math.sin(pos.elapsed*.8+o.seed)*.025);
    if(o.packOwner){ctx.shadowColor='#f6d788';ctx.shadowBlur=12;}
    ctx.drawImage(img,-width/2,-height/2,width,height);ctx.restore();
    if(o.packOwner&&!swallowing){const ready=tick+v.offset>=(o.sealedUntil??0);ctx.save();ctx.font=`${Math.max(8,W*.009)}px monospace`;ctx.textAlign='center';ctx.fillStyle='#142738de';ctx.fillRect(px-40,py+height/2+3,80,17);ctx.fillStyle='#ffe6ac';ctx.fillText(o.packOwner===v.viewerId?(ready?'YOUR PACK · READY':'YOUR SEALED PACK'):'OWNED PACK',px,py+height/2+15);ctx.restore();}
   }
   const t=(now-worldNow.epoch)/1000;
   if(worldNow.bubbles){ctx.strokeStyle='rgba(196,235,239,.32)';ctx.lineWidth=1;for(let i=0;i<22;i++){let x=((i*89+Math.sin(t*.5+i)*12)%Math.max(1,W-20))+10,y=H-(((t*18+i*47)%H+H)%H);if(swallowing){const a=Math.atan2(y-cy,x-cx)+collapse*9,r=Math.hypot(x-cx,y-cy)*(1-collapse);x=cx+Math.cos(a)*r;y=cy+Math.sin(a)*r}ctx.beginPath();ctx.arc(x,y,(2+i%4)*(1-collapse*.8),0,Math.PI*2);ctx.stroke()}}
   if(now-worldNow.fedAt<8000){ctx.fillStyle='#d7ab6c';for(let i=0;i<15;i++){ctx.beginPath();ctx.arc(W*(.25+i*.035),H*(.07+((now-worldNow.fedAt)/8000)*.46)+Math.sin(i)*7,2,0,Math.PI*2);ctx.fill()}}
   if(worldNow.frozen){ctx.fillStyle='rgba(188,231,248,.13)';ctx.fillRect(0,0,W,H)}
   if(fx&&p<1){
    if(fx.type==='blackhole'){
     const strength=Math.sin(Math.PI*clamp(p/.95)),radius=W*.07*Math.min(1,p*8);ctx.save();
     const glow=ctx.createRadialGradient(cx,cy,radius*.1,cx,cy,radius*3.2);glow.addColorStop(0,'#03050aff');glow.addColorStop(.22,'#07040bf0');glow.addColorStop(.32,'#eeac55a0');glow.addColorStop(.44,'#bf6efc55');glow.addColorStop(1,'#361e5000');ctx.globalAlpha=clamp(strength*1.5);ctx.fillStyle=glow;ctx.fillRect(0,0,W,H);
     ctx.translate(cx,cy);ctx.rotate(-.35);for(let ring=0;ring<5;ring++){ctx.strokeStyle=`rgba(${ring%2?'190,136,254':'255,208,134'},${.70-ring*.1})`;ctx.lineWidth=1.3+ring*.5;ctx.beginPath();ctx.ellipse(0,0,radius*(1.1+ring*.18),radius*(.32+ring*.06),p*2.3+ring*.08,0,Math.PI*2);ctx.stroke()}
     ctx.fillStyle='#03050b';ctx.beginPath();ctx.arc(0,0,radius*.66,0,Math.PI*2);ctx.fill();ctx.restore();
     ctx.save();ctx.globalAlpha=swallowing?clamp((p-.55)/.3):clamp(1-(p-.88)/.12);ctx.fillStyle='#02050c';ctx.fillRect(0,0,W,H);ctx.restore();
    }else{
     const target=fx.world.objects.find(o=>o.id===fx.targetIds[0]);if(target){const pos=position(target,fx.world,fx.startedAt),x=pos.x*W,y=pos.y*H;
      ctx.save();ctx.globalAlpha=1-p;
      if(fx.type==='treasure'){const beam=ctx.createRadialGradient(x,y,0,x,y,H*.3);beam.addColorStop(0,'#ffe9a9aa');beam.addColorStop(1,'#ffd97600');ctx.fillStyle=beam;ctx.fillRect(x-H*.3,y-H*.4,H*.6,H*.7);}
      ctx.strokeStyle=fx.type==='treasure'?'#ffe4a4':'#c8f4f3';ctx.lineWidth=2*(1-p)+.5;ctx.beginPath();ctx.arc(x,y,8+p*W*.1,0,Math.PI*2);ctx.stroke();
      for(let i=0;i<34;i++){const angle=i*2.39996,distance=(12+(i%6)*6)*p*3;ctx.fillStyle=fx.type==='treasure'?'#f4cf7e':i%3?'#b6e4ec':'#f5b47c';ctx.beginPath();ctx.arc(x+Math.cos(angle)*distance,y+Math.sin(angle)*distance+p*p*32,Math.max(.3,(3+i%3)*(1-p)),0,Math.PI*2);ctx.fill()}
      ctx.restore();
     }
    }
   }
  }
  return()=>{alive=false;cancelAnimationFrame(frame)};
 },[onCanvas]);
 return <><canvas ref={ref} className="aquarium-canvas" role="img" aria-label={`${HABITATS[world.biome??'public'].short} with ${world.objects.filter(o=>isCreature(o.kind)).length} creatures, ${world.light} lighting and ${world.gravity} gravity.`}/>{!ready&&!failed&&<div className="world-loading" role="status"><span className="loading-orbit"/>Opening the aquarium…</div>}{failed&&<div className="world-loading" role="alert">The artwork couldn't load. <button onClick={()=>location.reload()}>Reload artwork</button></div>}</>;
}
