// Local entertainment simulation only. No real treasury, money, equity or tokens.
import { apply, initialRoom, parseCommand, type Room, type Kind, type World } from '../lib/world.ts';
import { creature, HABITATS, isCreature, TIER_RULES, type Habitat } from '../lib/catalog.ts';
export type StockSymbol = 'NVDA' | 'AAPL' | 'MSFT';
export type RewardReceipt = {id:string;action:'explode'|'treasure'|'blackhole';habitat:Habitat;round:number;credits:number;cost:number;targets:number;stockCards:StockSymbol[];empty:boolean;at:number};
export type RewardRound = {room:Room;round:number;remaining:number;fundedIds:string[];claimedIds:string[]};
export type WorldEffect = {id:string;type:RewardReceipt['action'];startedAt:number;duration:number;world:World;targetIds:string[]};
export type LootCommand = {type:'explode';kind:Kind}|{type:'treasure'}|{type:'blackhole'};
export function makeRound(habitat:Habitat,now=Date.now(),round=1,remaining:number=HABITATS[habitat].budget):RewardRound {
  const r=initialRoom(habitat,now-300000);r.world.biome=habitat;r.world.round=round;
  const extra:Kind[]=habitat==='whale'?['whale','manta-ray','anglerfish','lionfish','shark','blue-tang','treasure','treasure','seaweed','seaweed']:['clownfish','blue-tang','lionfish','treasure','seaweed'];
  if(habitat==='whale')r.world.objects=[];
  for(const [i,kind] of extra.entries())r.world.objects.push({id:`${habitat}-r${round}-spawn-${i}`,kind,x:.16+(i%5)*.16,y:kind==='whale'?.35:.23+(i%3)*.18,seed:23+i*57,born:now-300000});
  r.world.objects=r.world.objects.map(o=>({...o,id:`r${round}-${o.id}`}));
  const seeds=habitat==='whale'?[['atlas','Add two jellyfish'],['softsignal','Build a shelter'],['orbit','Add a treasure chest']]:[['miso.eth','Add three seaweed'],['pixel.bob','Add a friendly shark'],['softsignal','Build a shelter'],['miso.eth','Add two jellyfish'],['orbit','Add a crab'],['pixel.bob','Feed the fish']];
  seeds.forEach(([name,prompt],i)=>{const at=now-(seeds.length-i)*48000;r.active={id:`seed-${i}`,session:name,name,joinedAt:at,startedAt:at,endsAt:at+60000,actions:0};apply(r,name,prompt,parseCommand(prompt),at,`${habitat}-r${round}-seed-${i}`)});
  r.active=null;
  return {room:r,round,remaining,fundedIds:r.world.objects.filter(o=>isCreature(o.kind)||o.kind==='treasure').map(o=>o.id),claimedIds:[]};
}
export function parseLootPrompt(input:string):LootCommand|null {
  const p=input.trim().toLowerCase().replace(/[.!?]+$/,'');
  if(/^(?:(?:create|add|summon|make|buat|tambah)\s+(?:a\s+)?)?black\s*hole$/.test(p))return {type:'blackhole'};
  if(/^(?:open|buka)\s+(?:(?:the|a)\s+)?(?:treasure(?: chest)?|treasury|chest|peti(?: harta)?)$/.test(p))return {type:'treasure'};
  const match=p.match(/^(?:explode|pop|ledakkan|pecahkan)\s+(?:(?:the|a)\s+)?(.+)$/);
  if(!match)return null;
  const aliases:Record<string,Kind>={'orange fish':'fish-orange','orange reef fish':'fish-orange','blue fish':'fish-blue','yellow fish':'fish-yellow','ikan oranye':'fish-orange','ikan biru':'fish-blue','ikan kuning':'fish-yellow','shark':'shark','hiu':'shark','whale':'whale','paus':'whale','clownfish':'clownfish','blue tang':'blue-tang','lionfish':'lionfish','manta ray':'manta-ray','manta':'manta-ray','anglerfish':'anglerfish','jellyfish':'jellyfish','crab':'crab'};
  const kind=aliases[match[1]];if(!kind)throw new Error('Choose one supported creature, for example “explode the orange fish” or “explode the shark”.');
  return {type:'explode',kind};
}
export function performLoot(source:RewardRound,balance:number,command:LootCommand,now:number,id:string,rng:()=>number=Math.random) {
  const next=structuredClone(source),room=next.room,turn=room.active;
  if(!turn||turn.session!=='you'||now<(turn.startedAt??0)||now>=(turn.endsAt??0))throw new Error('Wait for your active turn before opening rewards.');
  if(turn.actions>=3)throw new Error('You have used your three changes. Take another turn.');
  const habitat=room.world.biome??'public';const cost=command.type==='blackhole'?HABITATS[habitat].blackHoleCost:0;
  if(balance<cost)throw new Error(`This black hole costs ${cost} demo credits. Add demo credits first.`);
  const eligible=(o:World['objects'][number])=>(isCreature(o.kind)||o.kind==='treasure')&&!o.opened;
  const targets=command.type==='blackhole'?room.world.objects.filter(eligible):command.type==='treasure'?room.world.objects.filter(o=>o.kind==='treasure'&&!o.opened).slice(0,1):room.world.objects.filter(o=>o.kind===command.kind).slice(0,1);
  if(!targets.length&&command.type!=='blackhole')throw new Error(command.type==='treasure'?'No unopened treasure here. Add a chest as scenery, or explore another aquarium.':'That creature is not here. Try a creature visible in this aquarium.');
  let credits=0;const stockCards:StockSymbol[]=[];
  for(const o of targets){
    if(!next.fundedIds.includes(o.id)||next.claimedIds.includes(o.id))continue;
    next.claimedIds.push(o.id);
    const tier=o.kind==='treasure'?'B':creature(o.kind)?.tier??'D';const rule=TIER_RULES[tier];
    if(rng()<rule.empty||next.remaining<=0)continue;
    const amount=Math.min(next.remaining,(rule.min+Math.floor(Math.min(.999999,Math.max(0,rng()))*(rule.max-rule.min+1)))*HABITATS[habitat].multiplier);
    credits+=amount;next.remaining-=amount;
    if(habitat==='whale'&&(tier==='S'||tier==='A'||o.kind==='treasure')&&rng()<.20){const symbols:StockSymbol[]=['NVDA','AAPL','MSFT'];stockCards.push(symbols[Math.floor(Math.min(.999999,Math.max(0,rng()))*3)]);}
  }
  const before=structuredClone(room.world);let summary:string;
  if(command.type==='blackhole'){
    const fresh=makeRound(habitat,now,source.round+1,next.remaining);
    room.world=fresh.room.world;next.round=fresh.round;next.fundedIds=fresh.fundedIds;next.claimedIds=[];
    summary=`Collapsed round ${source.round} · ${credits} demo credits revealed`;
  }else if(command.type==='treasure'){
    const chest=room.world.objects.find(o=>o.id===targets[0].id)!;chest.opened=true;chest.rewardEmpty=credits===0&&stockCards.length===0;summary=`Opened treasure · ${credits ? `${credits} demo credits`:'empty chest'}`;
  }else{
    room.world.objects=room.world.objects.filter(o=>o.id!==targets[0].id);summary=`Exploded ${command.kind.replace('fish-','')} · ${credits ? `${credits} demo credits`:'no reward'}`;
  }
  turn.actions++;room.history.push({id,actor:turn.name,session:'you',prompt:command.type==='blackhole'?'Create a black hole':command.type==='treasure'?'Open the treasure':`Explode the ${command.kind}`,summary,at:now,world:structuredClone(room.world),interpreter:'rules'});if(room.history.length>80)room.history.shift();
  const receipt:RewardReceipt={id,action:command.type==='treasure'?'treasure':command.type,habitat,round:source.round,credits,cost,targets:targets.length,stockCards,empty:credits===0&&stockCards.length===0,at:now};
  return {next,balance:balance-cost+credits,receipt,effect:{id,type:receipt.action,startedAt:now,duration:command.type==='blackhole'?4200:1400,world:before,targetIds:targets.map(o=>o.id)} as WorldEffect};
}
