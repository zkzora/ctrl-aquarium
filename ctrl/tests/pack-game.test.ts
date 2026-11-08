import {test} from 'node:test';
import assert from 'node:assert/strict';
import {newGame,ensurePlayer,actGame,viewGame,tickGame,commitment,DAY,LIMITS,type Game,type GameAction,type GameView} from '../lib/pack-game.ts';
import {gameApi} from '../server/api.ts';
import {fileStore} from '../server/file-store.ts';
import {mkdtemp,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
const time=100000;
function setup(){const g=newGame(time);ensurePlayer(g,'alice',time);ensurePlayer(g,'bob',time);return g}
async function act(g:Game,who:string,body:GameAction,at=time,id=crypto.randomUUID(),h:'public'|'whale'='public',roll=.99){return actGame(g,who,h,body,id,at,()=>roll)}
test('purchase locks a hidden, backed result and reveal proves the commitment',async()=>{
 const g=setup();await act(g,'alice',{type:'buy',kind:'clownfish'});const p=g.players.alice.packs[0];
 assert.equal(g.players.alice.balance,1400);assert.equal(g.habitats.public.reserved,320);
 const visible=viewGame(g,'alice','public',time);assert.equal('payout' in visible.packs[0],false);assert.equal('nonce' in visible.packs[0],false);assert.equal('stock' in visible.packs[0],false);
 assert.equal(p.commitment,await commitment(p.id,p.payout,p.nonce));
 const out=await act(g,'alice',{type:'open',packId:p.id},time+20000);assert.equal(out.receipt?.credits,320);assert.equal(g.players.alice.balance,1720);assert.equal(g.habitats.public.remaining,9680);assert.equal(g.habitats.public.reserved,0);assert.equal(g.habitats.public.gross,-220);
});
test('ownership and maturity are checked by server time, not client fields',async()=>{
 const g=setup();await act(g,'alice',{type:'buy',kind:'shark'});const p=g.players.alice.packs[0];
 await assert.rejects(()=>act(g,'bob',{type:'open',packId:p.id},time+21000),/does not belong/);
 await assert.rejects(()=>act(g,'alice',{type:'open',packId:p.id},time+19999),/still hatching/);
 assert.equal(p.openedAt,undefined);assert.equal(g.players.bob.balance,1500);
});
test('request retry charges once and reusing its ID for another payload is rejected',async()=>{
 const g=setup(),id=crypto.randomUUID();await act(g,'alice',{type:'buy',kind:'clownfish'},time,id);await act(g,'alice',{type:'buy',kind:'clownfish'},time+1,id);
 assert.equal(g.players.alice.balance,1400);assert.equal(g.players.alice.packs.length,1);
 await assert.rejects(()=>act(g,'alice',{type:'buy',kind:'shark'},time+1,id),/different action/);
 const p=g.players.alice.packs[0],open=crypto.randomUUID();await act(g,'alice',{type:'open',packId:p.id},time+20000,open);await act(g,'alice',{type:'open',packId:p.id},time+20001,open);assert.equal(g.players.alice.balance,1720);
 await assert.rejects(()=>act(g,'alice',{type:'open',packId:p.id},time+20002),/already opened/);
});
test('purchase/open quotas are shared across habitats and batch counts every pack',async()=>{
 const g=setup();for(let i=0;i<3;i++)await act(g,'alice',{type:'buy',kind:'clownfish'},time+i);
 await assert.rejects(()=>act(g,'alice',{type:'buy',kind:'whale'},time+4,crypto.randomUUID(),'whale'),/Purchase limit/);
 const ids=g.players.alice.packs.map(p=>p.id);const result=await act(g,'alice',{type:'blackhole',packIds:ids,round:1},time+21000);
 assert.equal(result.receipt?.targets,3);assert.equal(g.players.alice.openings.length,3);assert.equal(viewGame(g,'alice','whale',time+21001).limits.opensLeft,0);
 assert.equal(viewGame(g,'alice','public',time+DAY+30000).limits.opensLeft,3);
});
test('black hole preserves another owner and never refills reserve',async()=>{
 const g=setup();await act(g,'alice',{type:'buy',kind:'shark'});await act(g,'bob',{type:'buy',kind:'clownfish'});
 const a=g.players.alice.packs[0],b=g.players.bob.packs[0];await act(g,'alice',{type:'blackhole',packIds:[a.id],round:1},time+21000);
 assert.equal(b.openedAt,undefined);assert.equal(g.habitats.public.reserved,320);assert.equal(g.habitats.public.remaining,9680);assert.equal(g.habitats.public.room.world.objects.length,0);
 await act(g,'bob',{type:'open',packId:b.id},time+22000);assert.equal(g.players.bob.balance,1720);assert.equal(g.habitats.public.reserved,0);
});
test('post-collapse scenery arrives progressively and never remints entitlements',async()=>{
 const g=setup();await act(g,'alice',{type:'buy',kind:'shark'});await act(g,'alice',{type:'blackhole',packIds:[g.players.alice.packs[0].id],round:1},time+21000);
 const s=g.habitats.public,at=s.recoveryAt;tickGame(g,at+14000);assert.equal(s.room.world.objects.length,0);tickGame(g,at+15000);assert.equal(s.room.world.objects.length,1);tickGame(g,at+45000);assert.equal(s.room.world.objects.length,3);assert.equal(g.players.alice.packs.length,1);assert.equal(s.remaining,9680);
});
test('inadequate reserve refuses a purchase without partial or capped promised payout',async()=>{
 const g=setup();g.habitats.public.remaining=319;await assert.rejects(()=>act(g,'alice',{type:'buy',kind:'shark'}),/cannot back/);assert.equal(g.players.alice.balance,1500);assert.equal(g.players.alice.packs.length,0);
});

test('published probability boundaries return exact outcomes in both habitats',async()=>{
 const cases:[[number,number],...[number,number][]]=[[0,40],[.599999,40],[.6,100],[.849999,100],[.85,200],[.949999,200],[.95,320],[.999999,320]];
 for(const h of ['public','whale'] as const)for(const [roll,credits] of cases){
  const g=setup();await act(g,'alice',{type:'buy',kind:'clownfish'},time,crypto.randomUUID(),h,roll);
  assert.equal(g.players.alice.packs[0].payout,credits*(h==='whale'?5:1));
 }
});

test('Whale souvenir ownership survives receipt retention',async()=>{
 const g=setup();await act(g,'alice',{type:'buy',kind:'whale'},time,crypto.randomUUID(),'whale',.99);
 await act(g,'alice',{type:'open',packId:g.players.alice.packs[0].id},time+21000,crypto.randomUUID(),'whale');
 assert.equal(g.players.alice.collection.MSFT,1);g.players.alice.receipts=[];
 assert.equal(viewGame(g,'alice','whale',time+22000).collection.MSFT,1);
});

test('black-hole retry reveals once and stale quotes spend nothing',async()=>{
 const g=setup();await act(g,'alice',{type:'buy',kind:'shark'});const pack=g.players.alice.packs[0];
 await assert.rejects(()=>act(g,'alice',{type:'blackhole',packIds:[pack.id],round:0},time+21000),/world changed/);
 assert.equal(g.players.alice.balance,1400);assert.equal(pack.openedAt,undefined);
 const id=crypto.randomUUID(),body:GameAction={type:'blackhole',packIds:[pack.id],round:1};
 const first=await act(g,'alice',body,time+21001,id);const repeat=await act(g,'alice',body,time+21002,id);
 assert.deepEqual(repeat.receipt,first.receipt);assert.equal(g.players.alice.balance,1690);assert.equal(g.players.alice.openings.length,1);assert.equal(g.habitats.public.round,2);
});

test('another owner’s swallowed pack returns once and retains its original commitment',async()=>{
 const g=setup();await act(g,'alice',{type:'buy',kind:'shark'});await act(g,'bob',{type:'buy',kind:'clownfish'});
 const bob=g.players.bob.packs[0],hash=bob.commitment;
 await act(g,'alice',{type:'blackhole',packIds:[g.players.alice.packs[0].id],round:1},time+21000);
 const returns=bob.returnsAt!;tickGame(g,returns-1);assert.equal(g.habitats.public.room.world.objects.some(o=>o.id===bob.id),false);
 tickGame(g,returns);tickGame(g,returns+1);assert.equal(g.habitats.public.room.world.objects.filter(o=>o.id===bob.id).length,1);
 assert.equal(bob.commitment,hash);assert.equal(bob.openedAt,undefined);assert.equal(g.players.bob.balance,1400);
});
test('queue provides exclusive world control while owned pack opening is independent',async()=>{
 const g=setup();await act(g,'alice',{type:'join'});await act(g,'bob',{type:'join'});assert.equal(g.habitats.public.room.active?.session,'alice');
 await assert.rejects(()=>act(g,'bob',{type:'command',prompt:'feed the fish'}),/not your turn/);
 await act(g,'bob',{type:'buy',kind:'clownfish'});await act(g,'bob',{type:'open',packId:g.players.bob.packs[0].id},time+21000);
 await act(g,'alice',{type:'leave'},time+22000);assert.equal(g.habitats.public.room.active?.session,'bob');
});
test('refill does not reset identity limits and has a server-enforced cooldown',async()=>{
 const g=setup();await act(g,'alice',{type:'refill'});assert.equal(g.players.alice.balance,2000);await assert.rejects(()=>act(g,'alice',{type:'refill'},time+1),/cooling down/);
});
test('file store persists cookies/ownership, serializes concurrent purchases and rolls back failure',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ctrl-game-test-'));let store=await fileStore(directory);
 try{
  const first=await gameApi(new Request('http://localhost:4174/api/demo'),store,{now:()=>time});assert.equal(first.status,200);const cookie=first.headers.get('set-cookie')!.split(';')[0];const me=(await first.json() as GameView).me;
  const buy=(requestId:string)=>new Request('http://localhost:4174/api/demo',{method:'POST',headers:{origin:'http://localhost:4174','content-type':'application/json',cookie},body:JSON.stringify({type:'buy',kind:'clownfish',requestId})});
  const id=crypto.randomUUID();const results=await Promise.all([gameApi(buy(id),store,{now:()=>time}),gameApi(buy(id),store,{now:()=>time})]);assert.ok(results.every(r=>r.status===200));
  await store.close();store=await fileStore(directory);
  const restored=await (await gameApi(new Request('http://localhost:4174/api/demo',{headers:{cookie}}),store,{now:()=>time+1})).json() as GameView;assert.equal(restored.me.id,me.id);assert.equal(restored.me.balance,1400);assert.equal(restored.packs.length,1);
  const denied=await gameApi(new Request('http://localhost:4174/api/demo',{method:'POST',headers:{origin:'https://attacker.invalid','content-type':'application/json',cookie},body:JSON.stringify({type:'refill',requestId:crypto.randomUUID()})}),store);assert.equal(denied.status,403);
  await assert.rejects(()=>store.transaction(g=>{g.players[me.id].balance=999999;throw new Error('forced save failure')}),/forced/);
  const after=await (await gameApi(new Request('http://localhost:4174/api/demo',{headers:{cookie}}),store,{now:()=>time+2})).json() as GameView;assert.equal(after.me.balance,1400);
 }finally{await store.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'ctrl-game-test-'));await rm(directory,{recursive:true,force:true});}
});
