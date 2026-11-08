// Credit-only shared game. No money, transferable token, real stock, or cash-out.
import {initialRoom,initialWorld,advance,join,leave,parseCommand,apply,UserError,type Room,type World,type Kind} from './world.ts';
import {CREATURES,creature,isCreature,HABITATS,type Habitat} from './catalog.ts';
import type {RewardReceipt,StockSymbol,WorldEffect} from '../website/reward-engine.ts';
export const DAY=86400000;
export const PACK_RULES={public:{price:100,multiplier:1,reserve:10000},whale:{price:500,multiplier:5,reserve:50000}} as const;
export const PACK_ODDS=[{chance:.60,value:40,label:'Common'},{chance:.25,value:100,label:'Uncommon'},{chance:.10,value:200,label:'Rare'},{chance:.05,value:320,label:'Legendary'}] as const;
export const LIMITS={purchases:3,opens:3,blackholes:1,pending:3,maturity:20000,roomCooldown:90000,refillCooldown:600000,refills:2};
export type SealedPack={id:string;owner:string;habitat:Habitat;kind:Kind;price:number;maxPayout:number;payout:number;nonce:string;commitment:string;createdAt:number;maturesAt:number;openedAt?:number;returnsAt?:number;stock?:StockSymbol;label:string};
export type PackReceipt=RewardReceipt&{packIds:string[];purchaseCost:number;commitments:{id:string;nonce:string;payout:number;commitment:string}[]};
export type Player={id:string;name:string;balance:number;createdAt:number;seenAt:number;habitat:Habitat;packs:SealedPack[];purchases:number[];openings:number[];holes:number[];refills:number[];receipts:PackReceipt[];collection:Record<StockSymbol,number>;requests:Record<string,{body:string;at:number;receipt?:PackReceipt}>};
export type HabitatState={room:Room;round:number;remaining:number;reserved:number;paidOut:number;sales:number;gross:number;lastCollapse:number;recoveryAt:number;spawned:number;effect?:WorldEffect};
export type Game={schema:3;version:number;players:Record<string,Player>;habitats:Record<Habitat,HabitatState>;createdAt:number};
export type PublicPack=Omit<SealedPack,'payout'|'nonce'|'stock'|'label'>;
export type GameView={room:Room;round:{round:number;remaining:number;reserved:number;total:number;gross:number;cooldownUntil:number;recoveryAt:number};me:{id:string;name:string;balance:number};packs:PublicPack[];receipts:PackReceipt[];collection:Record<StockSymbol,number>;serverTime:number;viewers:number;limits:{purchasesLeft:number;opensLeft:number;blackholesLeft:number;refillAt:number;refillsLeft:number;nextPurchaseAt:number;nextOpenAt:number};lastEffect?:WorldEffect};
export type GameAction={type:'buy'|'open'|'blackhole'|'join'|'leave'|'command'|'rename'|'refill';kind?:string;packId?:string;packIds?:string[];prompt?:string;name?:string;round?:number};
const recent=(values:number[],now:number)=>values.filter(at=>at>now-DAY);
export async function commitment(id:string,payout:number,nonce:string){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${id}|${payout}|${nonce}`));return [...new Uint8Array(b)].map(v=>v.toString(16).padStart(2,'0')).join('')}
function habitatState(h:Habitat,now:number):HabitatState{
 const room=initialRoom(h,now);room.world.biome=h;room.world.round=1;
 const kinds:Kind[]=h==='whale'?['whale','manta-ray','anglerfish','shark','lionfish','blue-tang','treasure','seaweed']:['fish-orange','fish-blue','fish-yellow','clownfish','blue-tang','shark','treasure','seaweed'];
 room.world.objects=kinds.map((kind,i)=>({id:`scenery-${h}-${i}`,kind,x:.15+(i%5)*.16,y:kind==='whale'?.34:.25+(i%3)*.16,seed:23+i*57,born:now}));
 return {room,round:1,remaining:PACK_RULES[h].reserve,reserved:0,paidOut:0,sales:0,gross:0,lastCollapse:0,recoveryAt:0,spawned:0};
}
export function newGame(now=Date.now()):Game{return {schema:3,version:0,players:{},habitats:{public:habitatState('public',now),whale:habitatState('whale',now)},createdAt:now}}
export function ensurePlayer(g:Game,id:string,now:number){if(!g.players[id])g.players[id]={id,name:`diver-${id.slice(0,4)}`,balance:1500,createdAt:now,seenAt:now,habitat:'public',packs:[],purchases:[],openings:[],holes:[],refills:[],receipts:[],collection:{NVDA:0,AAPL:0,MSFT:0},requests:{}};const player=g.players[id];if(!player.collection){player.collection={NVDA:0,AAPL:0,MSFT:0};for(const receipt of player.receipts)for(const symbol of receipt.stockCards)player.collection[symbol]++;}return player}
const arrivals:Kind[]=['fish-orange','fish-blue','clownfish','fish-yellow','blue-tang','jellyfish','shark','lionfish','manta-ray','anglerfish','whale'];
export function tickGame(g:Game,now:number){
 for(const [h,state] of Object.entries(g.habitats) as [Habitat,HabitatState][]){
  advance(state.room,now);
  if(!state.recoveryAt)continue;
  const due=Math.min(h==='whale'?11:8,Math.max(0,Math.floor((now-state.recoveryAt)/15000)));
  while(state.spawned<due){if(state.room.world.objects.length>=32)break;const i=state.spawned++;const kind=arrivals[i];state.room.world.objects.push({id:`arrival-${h}-${state.round}-${i}`,kind,x:.15+(i%5)*.16,y:kind==='whale'?.34:.26+(i%3)*.14,seed:i*57+23,born:state.recoveryAt+(i+1)*15000});}
  for(const p of Object.values(g.players))for(const pack of p.packs){if(pack.habitat===h&&!pack.openedAt&&pack.returnsAt&&pack.returnsAt<=now&&state.room.world.objects.length<32){if(!state.room.world.objects.some(o=>o.id===pack.id))state.room.world.objects.push({id:pack.id,kind:pack.kind,x:.35,y:pack.kind==='whale'?.34:.45,seed:pack.createdAt%9999,born:pack.createdAt,packOwner:p.id,sealedUntil:pack.maturesAt});delete pack.returnsAt;}}
 }
}
function activeReceipt(p:Player,id:string){return p.receipts.find(r=>r.id===id)}
function eligible(p:Player,h:Habitat,now:number){return p.packs.filter(pack=>pack.habitat===h&&!pack.openedAt&&pack.maturesAt<=now)}
export function viewGame(g:Game,actor:string,h:Habitat,now:number,lastEffect?:WorldEffect):GameView{
 const p=g.players[actor],s=g.habitats[h];const buys=recent(p.purchases,now),opens=recent(p.openings,now),holes=recent(p.holes,now),refills=recent(p.refills,now);
 return {room:s.room,round:{round:s.round,remaining:s.remaining,reserved:s.reserved,total:PACK_RULES[h].reserve,gross:s.gross,cooldownUntil:s.lastCollapse?s.lastCollapse+LIMITS.roomCooldown:0,recoveryAt:s.recoveryAt},me:{id:p.id,name:p.name,balance:p.balance},packs:p.packs.filter(x=>!x.openedAt).map(({payout,nonce,stock,label,...safe})=>safe),receipts:p.receipts.slice(-20).reverse(),collection:p.collection,serverTime:now,viewers:Object.values(g.players).filter(x=>x.habitat===h&&x.seenAt>now-20000).length,limits:{purchasesLeft:Math.max(0,LIMITS.purchases-buys.length),opensLeft:Math.max(0,LIMITS.opens-opens.length),blackholesLeft:Math.max(0,LIMITS.blackholes-holes.length),refillsLeft:Math.max(0,LIMITS.refills-refills.length),refillAt:refills.length?refills.at(-1)!+LIMITS.refillCooldown:0,nextPurchaseAt:buys.length>=LIMITS.purchases?buys[0]+DAY:0,nextOpenAt:opens.length>=LIMITS.opens?opens[0]+DAY:0},lastEffect:lastEffect??(s.effect&&now<s.effect.startedAt+s.effect.duration?s.effect:undefined)};
}
export async function actGame(g:Game,actor:string,h:Habitat,body:GameAction,requestId:string,now:number,rng:()=>number=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296){
 const p=ensurePlayer(g,actor,now),s=g.habitats[h];tickGame(g,now);
 const canonical=JSON.stringify({h,...body}),previous=p.requests[requestId];
 if(previous){if(previous.body!==canonical)throw new UserError('That request ID was already used for a different action.',409);return {receipt:previous.receipt};}
 if(Object.values(p.requests).filter(r=>r.at>now-60000).length>=30)throw new UserError('Too many actions. Wait a moment before trying again.',429);
 let receipt:PackReceipt|undefined,effect:WorldEffect|undefined;
 const record=(summary:string,prompt:string)=>{s.room.history.push({id:requestId,actor:p.name,session:actor,prompt,summary,at:now,world:structuredClone(s.room.world),interpreter:'rules'});if(s.room.history.length>80)s.room.history.shift();};
 if(body.type==='buy'){
  const kind=body.kind as Kind,c=creature(kind);if(kind!=='treasure'&&!c)throw new UserError('Choose a supported creature or treasure pack.');
  if(c?.habitat==='whale'&&h!=='whale')throw new UserError('That creature belongs in Whale Aquarium.');
  if(recent(p.purchases,now).length>=LIMITS.purchases)throw new UserError('Purchase limit reached: three packs per rolling 24 hours across both aquariums.',429);
  const pending=p.packs.filter(x=>!x.openedAt).length;
  if(pending>=Math.min(LIMITS.pending,LIMITS.opens-recent(p.openings,now).length))throw new UserError('Open your existing packs or wait for your daily opening allowance.');
  const config=PACK_RULES[h],maxPayout=320*config.multiplier;
  if(p.balance<config.price)throw new UserError('Not enough demo credits. Use the free demo-credit refill.');
  if(s.remaining-s.reserved<maxPayout)throw new UserError('This reserve cannot back another pack. Existing packs remain fully backed.');
  if(s.room.world.objects.length>=30)throw new UserError('The aquarium is full. Open an existing pack first.');
  const roll=rng();if(!Number.isFinite(roll)||roll<0||roll>=1)throw new Error('Invalid random source');
  let acc=0;const outcome=PACK_ODDS.find(x=>(acc+=x.chance)>roll)??PACK_ODDS[3];
  const id=crypto.randomUUID(),nonce=crypto.randomUUID()+crypto.randomUUID(),payout=outcome.value*config.multiplier;
  const pack:SealedPack={id,owner:actor,habitat:h,kind,price:config.price,maxPayout,payout,nonce,commitment:await commitment(id,payout,nonce),createdAt:now,maturesAt:now+LIMITS.maturity,label:outcome.label};
  if(h==='whale'&&outcome.value>=200){const symbols:StockSymbol[]=['NVDA','AAPL','MSFT'];pack.stock=symbols[Math.floor(rng()*3)]??'NVDA';}
  p.balance-=config.price;p.packs.push(pack);p.purchases.push(now);s.reserved+=maxPayout;s.sales+=config.price;
  s.room.world.objects.push({id,kind,x:.18+(p.packs.length%5)*.14,y:kind==='whale'?.34:.25+(p.packs.length%3)*.16,seed:Math.floor(rng()*10000),born:now,packOwner:actor,sealedUntil:pack.maturesAt});
  record(`Added a sealed ${kind.replaceAll('-',' ')} pack`, `Buy ${kind} pack`);
 }else if(body.type==='open'||body.type==='blackhole'){
  const batch=body.type==='blackhole';let packs:SealedPack[];
  if(batch){
   if(body.round!==s.round)throw new UserError('The world changed. Review the new black-hole quote.',409);
   if(recent(p.holes,now).length>=LIMITS.blackholes)throw new UserError('One black hole per browser identity per rolling 24 hours.',429);
   if(s.lastCollapse&&now<s.lastCollapse+LIMITS.roomCooldown)throw new UserError('This aquarium is recovering. Wait for its black-hole cooldown.');
   if(!Array.isArray(body.packIds)||!body.packIds.length||new Set(body.packIds).size!==body.packIds.length)throw new UserError('Review the eligible packs before confirming a black hole.');
   packs=body.packIds.map(id=>p.packs.find(x=>x.id===id&&x.habitat===h&&!x.openedAt&&x.maturesAt<=now)!);
   if(packs.some(x=>!x))throw new UserError('A quoted pack is no longer ready. Review again.',409);
  }else{
   const pack=p.packs.find(x=>x.id===body.packId);if(!pack||pack.habitat!==h)throw new UserError('That pack does not belong to your identity in this aquarium.',403);
   if(pack.openedAt)throw new UserError('That pack was already opened.',409);if(pack.maturesAt>now)throw new UserError('Your fish is still hatching. Its opening time is set by the server.');packs=[pack];
  }
  if(recent(p.openings,now).length+packs.length>LIMITS.opens)throw new UserError('Daily opening limit reached. Batch opening counts every pack.',429);
  const fee=batch?HABITATS[h].blackHoleCost:0;if(p.balance<fee)throw new UserError('Not enough credits for the optional black-hole effect. Individual opening is free.');
  const before=structuredClone(s.room.world),credits=packs.reduce((sum,x)=>sum+x.payout,0);
  if(credits>s.remaining||packs.reduce((sum,x)=>sum+x.maxPayout,0)>s.reserved)throw new Error('Reserve invariant failed');
  p.balance+=credits-fee;s.remaining-=credits;s.reserved-=packs.reduce((sum,x)=>sum+x.maxPayout,0);s.paidOut+=credits;s.gross+=packs.reduce((sum,x)=>sum+x.price,0)-credits+fee;
  const ids=packs.map(x=>x.id);for(const pack of packs){pack.openedAt=now;p.openings.push(now)}
  s.room.world.objects=s.room.world.objects.filter(o=>!ids.includes(o.id));
  const priorRound=s.round;
  if(batch){p.holes.push(now);s.lastCollapse=now;s.round++;s.recoveryAt=now+4200;s.spawned=0;s.room.world={...initialWorld(now),objects:[],biome:h,round:s.round};let i=0;for(const player of Object.values(g.players))for(const pack of player.packs)if(pack.habitat===h&&!pack.openedAt)pack.returnsAt=s.recoveryAt+(++i)*15000;}
  receipt={id:requestId,action:batch?'blackhole':packs[0].kind==='treasure'?'treasure':'explode',habitat:h,round:priorRound,credits,cost:fee,targets:packs.length,stockCards:packs.flatMap(x=>x.stock?[x.stock]:[]),empty:false,at:now,packIds:ids,purchaseCost:packs.reduce((sum,x)=>sum+x.price,0),commitments:packs.map(x=>({id:x.id,nonce:x.nonce,payout:x.payout,commitment:x.commitment}))};
  for(const symbol of receipt.stockCards)p.collection[symbol]++;p.receipts.push(receipt);if(p.receipts.length>100)p.receipts.shift();
  record(batch?`Collapsed round ${priorRound} · opened ${packs.length} owned packs`:`Opened ${packs[0].label} pack · ${credits} demo credits`,batch?'Create a black hole':`Open pack ${packs[0].kind}`);
  effect={id:requestId,type:receipt.action,startedAt:now,duration:batch?4200:1400,world:before,targetIds:ids};s.effect=effect;
 }else if(body.type==='join'){join(s.room,actor,p.name,now,crypto.randomUUID())}
 else if(body.type==='leave'){leave(s.room,actor,now)}
 else if(body.type==='rename'){
  const name=String(body.name??'').trim();if(!/^[\p{L}\p{N} _.-]{2,20}$/u.test(name))throw new UserError('Use 2–20 letters, numbers, spaces, dots, underscores or dashes.');p.name=name;
  for(const state of Object.values(g.habitats)){if(state.room.active?.session===actor)state.room.active.name=name;for(const t of state.room.queue)if(t.session===actor)t.name=name;}
 }else if(body.type==='refill'){
  const times=recent(p.refills,now);if(times.length>=LIMITS.refills)throw new UserError('Two free refills per rolling 24 hours for this browser identity.',429);
  if(times.length&&now<times.at(-1)!+LIMITS.refillCooldown)throw new UserError('The free refill is cooling down. Try again after ten minutes.',429);p.balance+=500;p.refills.push(now);
 }else if(body.type==='command'){
  const prompt=String(body.prompt??'').trim();if(!prompt||prompt.length>240)throw new UserError('Write a command between 1 and 240 characters.');
  if(/\b(don't|do not|not|without|jangan|tanpa|explode|open|buy|blackhole)\b/i.test(prompt))throw new UserError('Use the owned pack controls for purchases and reveals. Keep world commands direct.');
  const command=parseCommand(prompt);
  if(command.type==='add'&&creature(command.kind)?.habitat==='whale'&&h!=='whale')throw new UserError('That creature lives in Whale Aquarium.');
  if(command.type==='undo')throw new UserError('Undo is unavailable in the shared pack demo. Purchased entitlements are never reverted.');
  if(command.type==='remove-sharks'&&s.room.world.objects.some(o=>o.kind==='shark'&&o.packOwner))throw new UserError('Another player’s sealed shark cannot be removed.');
  apply(s.room,actor,prompt,command,now,requestId);
 }else throw new UserError('Unknown action.');
 p.requests[requestId]={body:canonical,at:now,receipt};for(const [id,r] of Object.entries(p.requests))if(r.at<now-7*DAY)delete p.requests[id];
 // A pending purchase remains an inventory entitlement even when its scenery is swallowed.
 p.packs=p.packs.filter(x=>!x.openedAt||x.openedAt>now-7*DAY);
 g.version++;s.room.version=g.version;
 return {receipt,effect};
}
