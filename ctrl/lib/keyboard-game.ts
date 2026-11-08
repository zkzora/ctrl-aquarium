import {newGame,ensurePlayer,viewGame,type Game,type GameView,type PackReceipt} from './pack-game.ts';
import {initialWorld,parseCommand,apply,UserError,type World,type Kind} from './world.ts';
import {creature,isCreature,type Habitat} from './catalog.ts';
import {parseLootPrompt,type WorldEffect} from '../website/reward-engine.ts';
import {KEYBOARD_ODDS,KEYBOARD_RULES,type KeyboardQuote} from './keyboard-config.ts';
import type {Hex} from 'viem';
export type KeyboardMeta={sequence:number;seedReserve:number;startedAt:number;turns:number;contributions:Record<string,number>;pending?:Hex};
export type KeyboardGame=Game&{keyboardMeta:Record<Habitat,KeyboardMeta>};
export type KeyboardView=GameView&{keyboard:{price:number;poolPercent:80;developerPercent:20;baseSeed:300;seedReserve:number;sequence:number;turnsLeft:number;rewardsLeft:number;contributions:number;pending?:{id:Hex;expires:number;prompt:string;mine:boolean};roundTurns:number;migrationRequired?:boolean;legacyBalance?:number}};
export type Plan={world:World;before:World;flags:number;targetIds:string[];prompt:string;summary:string;action?:'explode'|'treasure'|'blackhole';payout:number;rolls:number[]};
export type KeyboardSecret={quote:KeyboardQuote;signature:Hex;nonce:Hex;plan:Plan;requestId:string;issuedAt:number;boughtAt?:number;buyHash?:Hex;executedAt?:number;settlementHash?:Hex;refundedAt?:number};
export function newKeyboardGame(now=Date.now()):KeyboardGame{
 const g=newGame(now) as KeyboardGame;g.keyboardMeta={} as KeyboardGame['keyboardMeta'];
 for(const h of ['public','whale'] as Habitat[]){const s=g.habitats[h];s.remaining=300;s.reserved=0;g.keyboardMeta[h]={sequence:0,seedReserve:KEYBOARD_RULES[h].reserve-300,startedAt:now,turns:0,contributions:{}};}
 return g;
}
const arrivals:Kind[]=['fish-orange','fish-blue','clownfish','fish-yellow','treasure','jellyfish','shark','lionfish','manta-ray','anglerfish','whale'];
// Once all scheduled arrivals have appeared, removed inhabitants never respawn.
export function tickKeyboard(g:KeyboardGame,now:number){for(const h of ['public','whale'] as Habitat[]){const s=g.habitats[h];if(!s.recoveryAt||g.keyboardMeta[h].pending)continue;const due=Math.min(h==='whale'?11:8,Math.max(0,Math.floor((now-s.recoveryAt)/15000)));while(s.spawned<due){const i=s.spawned++,kind=arrivals[i];if(s.room.world.objects.length<32)s.room.world.objects.push({id:`arrival-${h}-${s.round}-${i}`,kind,x:.15+(i%5)*.16,y:kind==='whale'?.34:.26+(i%3)*.14,seed:i*57+23,born:s.recoveryAt+(i+1)*15000});}}}
export function keyboardPlayer(g:KeyboardGame,wallet:string,now:number){const id='wallet:'+wallet.toLowerCase(),exists=!!g.players[id],p=ensurePlayer(g,id,now);if(!exists){p.balance=0;p.name=wallet.startsWith('0x')?'diver-'+wallet.slice(2,6):'observer';}return p;}
export function planCommand(g:KeyboardGame,actor:string,h:Habitat,prompt:string,now:number,id:string,rng=()=>crypto.getRandomValues(new Uint32Array(1))[0]/4294967296):Plan{
 const s=g.habitats[h],m=g.keyboardMeta[h],p=g.players[actor];prompt=prompt.trim();
 if(!prompt||prompt.length>240||/\b(don't|do not|without|jangan|tanpa|and|then|lalu|kemudian)\b/i.test(prompt))throw new UserError('Use one direct command, up to 240 characters.');
 if(m.pending)throw new UserError('Another paid command is settling. Wait or recover the pending turn.',409);
 let loot;try{loot=parseLootPrompt(prompt);}catch(error){throw new UserError(error instanceof Error?error.message:'Unsupported reward command.');}
 const before=structuredClone(s.room.world);let world=structuredClone(before),flags=0,summary='',action:Plan['action'],targetIds:string[]=[],payout=0;const rolls:number[]=[];
 if(loot){
  if(!(m.contributions[actor]>0))throw new UserError('Add a fish or treasure in this round first. Each contribution unlocks one reward command.');
  const rewardable=(o:World['objects'][number])=>isCreature(o.kind)||o.kind==='treasure';
  const targets=loot.type==='blackhole'?world.objects.filter(rewardable):world.objects.filter(o=>o.kind===(loot.type==='treasure'?'treasure':loot.kind)).slice(0,1);
  if(!targets.length)throw new UserError('No matching fish or treasure is here yet. Wait for arrivals or add one.');
  if(loot.type==='blackhole'&&(m.turns<3||now<m.startedAt+90000))throw new UserError('Black holes unlock after three settled turns and 90 seconds in this round.');
  action=loot.type;flags=2;targetIds=targets.map(o=>o.id);
  let budget=s.remaining+KEYBOARD_RULES[h].price*.8;
  for(const target of targets){const roll=rng();if(roll<0||roll>=1)throw new Error('Invalid random source');let acc=0;const outcome=KEYBOARD_ODDS.find(x=>(acc+=x.chance)>roll)??KEYBOARD_ODDS[3];const amount=Math.min(budget,outcome.value*KEYBOARD_RULES[h].multiplier);rolls.push(amount);payout+=amount;budget-=amount;void target;}
  world.objects=world.objects.filter(o=>!targetIds.includes(o.id));
  if(loot.type==='blackhole'){flags|=12;world.objects=[];}
  // A natural clear waits for scheduled arrivals, including plants/shelters.
  const complete=s.recoveryAt===0||s.spawned>=(h==='whale'?11:8);
  if(world.objects.length===0&&complete)flags|=4;
  summary=loot.type==='blackhole'?`Collapsed round ${s.round}`:loot.type==='treasure'?'Opened the treasure':`Exploded ${loot.kind.replaceAll('-',' ')}`;
 }else{
  const command=parseCommand(prompt);
  if(command.type==='undo'||command.type==='remove-sharks')throw new UserError('Use explode the shark to remove a fish. Undo cannot restore consumed rewards.');
  if(command.type==='add'&&creature(command.kind)?.habitat==='whale'&&h!=='whale')throw new UserError('That inhabitant belongs in Whale Aquarium.');
  if(command.type==='add'&&(isCreature(command.kind)||command.kind==='treasure'))flags=1;
  const room=structuredClone(s.room);room.active={id,session:actor,name:p.name,joinedAt:now,startedAt:now,endsAt:now+60000,actions:0};delete room.contract;
  const change=apply(room,actor,prompt,command,now,id);world=room.world;summary=change.summary;
 }
 return {world,before,flags,targetIds,prompt,summary,action,payout,rolls};
}
export function projectKeyboard(g:KeyboardGame,secret:KeyboardSecret,hash:Hex,at:number,poolShare:number,devShare:number,nextSeed:number){
 const q=secret.quote,h=q.habitat===0?'public':'whale',s=g.habitats[h],m=g.keyboardMeta[h],p=keyboardPlayer(g,q.buyer,at),plan=secret.plan;
 if(secret.executedAt)return;secret.executedAt=at;secret.settlementHash=hash;
 if(m.sequence!==Number(q.sequence)||s.round!==Number(q.round))throw new Error('Keyboard event projection sequence mismatch');
 p.balance+=plan.payout;s.remaining+=poolShare-plan.payout;s.sales+=poolShare+devShare;s.gross+=devShare;s.paidOut+=plan.payout;m.sequence++;m.turns++;delete m.pending;
 if(plan.flags&1)m.contributions[p.id]=(m.contributions[p.id]??0)+1;
 if(plan.flags&2){}

 // Natural arrivals between quote and payment are not overwritten by a later
 // command snapshot. A collapse intentionally clears the entire current world.
 const priorWorld=structuredClone(s.room.world),arrivals=priorWorld.objects.filter(o=>!plan.before.objects.some(old=>old.id===o.id));
 s.room.world=structuredClone(plan.world);if(!(plan.flags&4))s.room.world.objects=[...s.room.world.objects,...arrivals].slice(0,32);
 s.room.turns++;s.room.active=null;s.room.queue=[];s.room.version=++g.version;
 if(plan.action){const cards=plan.action&&h==='whale'&&plan.payout>=150?[(['NVDA','AAPL','MSFT'] as const)[Number(BigInt(secret.nonce)%3n)]]:[];
  const receipt:PackReceipt={id:hash,action:plan.action,habitat:h,round:s.round,credits:plan.payout,cost:KEYBOARD_RULES[h].price,purchaseCost:0,targets:plan.targetIds.length,stockCards:cards,empty:plan.payout===0,at,packIds:plan.targetIds,commitments:[{id:q.id,nonce:secret.nonce,payout:plan.payout,commitment:q.commitment}]};p.receipts.push(receipt);p.receipts=p.receipts.slice(-100);for(const card of cards)p.collection[card]++;
  s.effect={id:hash,type:plan.action,startedAt:at,duration:plan.action==='blackhole'?4200:1400,world:priorWorld,targetIds:plan.targetIds} as WorldEffect;
 }
 if(plan.flags&4){s.round++;s.remaining+=nextSeed;m.seedReserve-=nextSeed;m.turns=0;m.startedAt=at;m.contributions={};s.lastCollapse=at;s.recoveryAt=at+4200;s.spawned=0;s.room.world={...initialWorld(at),objects:[],biome:h,round:s.round};}
 s.room.history.push({id:hash,actor:p.name,session:p.id,prompt:plan.prompt,summary:plan.summary+(plan.action?` · ${plan.payout} credits`:''),at,world:structuredClone(s.room.world),interpreter:'rules'});s.room.history=s.room.history.slice(-80);
}
export function keyboardView(g:KeyboardGame,wallet:string,h:Habitat,now:number,secrets:Record<string,KeyboardSecret>):KeyboardView{
 tickKeyboard(g,now);const p=keyboardPlayer(g,wallet,now),s=g.habitats[h],m=g.keyboardMeta[h],base=viewGame(g,p.id,h,now),recent=(xs:number[])=>xs.filter(x=>x>now-86400000).length,pending=m.pending?secrets[m.pending]:undefined;
 base.packs=[];base.round.total=300;base.round.cooldownUntil=m.startedAt+90000;base.limits.purchasesLeft=Math.max(0,20-recent(p.purchases));base.limits.opensLeft=Math.max(0,5-recent(p.openings));base.limits.blackholesLeft=Math.max(0,1-recent(p.holes));base.limits.refillAt=p.refills.length?p.refills.at(-1)!+86400000:0;base.limits.refillsLeft=base.limits.refillAt<=now?1:0;
 return {...base,keyboard:{price:KEYBOARD_RULES[h].price,poolPercent:80,developerPercent:20,baseSeed:300,seedReserve:m.seedReserve,sequence:m.sequence,turnsLeft:base.limits.purchasesLeft,rewardsLeft:base.limits.opensLeft,contributions:m.contributions[p.id]??0,roundTurns:m.turns,pending:pending?{id:pending.quote.id,expires:pending.boughtAt!+300000,prompt:pending.plan.prompt,mine:pending.quote.buyer.toLowerCase()===wallet.toLowerCase()}:undefined}};
}
