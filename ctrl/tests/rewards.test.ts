import {test} from 'node:test';
import assert from 'node:assert/strict';
import {makeRound,parseLootPrompt,performLoot} from '../website/reward-engine.ts';
import {HABITATS} from '../lib/catalog.ts';
import {parseCommand} from '../lib/world.ts';
function active(habitat:'public'|'whale'='public',remaining?:number){const r=makeRound(habitat,10000,1,remaining);r.room.active={id:'turn',session:'you',name:'Tester',actions:0,joinedAt:10000,startedAt:10000,endsAt:70000};return r}
test('explicit loot grammar targets a single creature or chest without broad noun matching',()=>{
 assert.deepEqual(parseLootPrompt('explode the orange fish'),{type:'explode',kind:'fish-orange'});
 assert.deepEqual(parseLootPrompt('open the treasure'),{type:'treasure'});
 assert.deepEqual(parseLootPrompt('create a black hole'),{type:'blackhole'});
 assert.throws(()=>parseLootPrompt('explode the shark and whale'),/one supported/);
 assert.deepEqual(parseCommand('add a blue tang'),{type:'add',kind:'blue-tang',count:1});
});
test('empty reveal spends one action, grants nothing and leaves the source immutable',()=>{
 const r=active(),before=JSON.stringify(r),out=performLoot(r,300,{type:'explode',kind:'fish-orange'},11000,'empty',()=>0);
 assert.equal(out.receipt.empty,true);assert.equal(out.balance,300);assert.equal(out.next.room.active?.actions,1);assert.equal(out.next.room.world.objects.length,r.room.world.objects.length-1);assert.equal(JSON.stringify(r),before);
});
test('treasure opens once, visibly stays empty or full, and cannot grant twice',()=>{
 const r=active(),out=performLoot(r,300,{type:'treasure'},11000,'open',()=>.99);
 assert.equal(out.receipt.credits,15);assert.equal(out.next.room.world.objects.find(o=>o.kind==='treasure')?.opened,true);
 assert.throws(()=>performLoot(out.next,out.balance,{type:'treasure'},12000,'repeat',()=>.99),/No unopened/);
 assert.equal(out.next.room.active?.actions,1);
});
test('prompt-added scenery has no allocation even when a winning roll is supplied',()=>{
 const r=active();r.room.world.objects.unshift({id:'not-funded',kind:'whale',x:.5,y:.3,seed:1,born:11000});
 const out=performLoot(r,300,{type:'explode',kind:'whale'},12000,'scenery',()=>.99);
 assert.equal(out.receipt.credits,0);assert.equal(out.next.remaining,r.remaining);
});
test('whale habitat applies the demo multiplier and collectible cards are symbols only',()=>{
 const rolls=[.9,.5,.1,0],r=active('whale');
 const out=performLoot(r,300,{type:'explode',kind:'whale'},11000,'whale',()=>rolls.shift()??.9);
 assert.equal(out.receipt.credits,48*5);assert.deepEqual(out.receipt.stockCards,['NVDA']);assert.equal(out.balance,540);assert.equal(out.next.remaining,HABITATS.whale.budget-240);
});
test('reserve caps a winning reward without creating an unfunded promise',()=>{
 const r=active('whale',3),out=performLoot(r,300,{type:'explode',kind:'whale'},11000,'cap',()=>.99);
 assert.equal(out.receipt.credits,3);assert.equal(out.next.remaining,0);assert.equal(out.balance,303);
});
test('black hole charges exactly once, keeps remaining reserve and retains the current turn',()=>{
 const r=active('whale'),out=performLoot(r,300,{type:'blackhole'},11000,'collapse',()=>0);
 assert.equal(out.balance,180);assert.equal(out.receipt.credits,0);assert.equal(out.next.round,2);assert.equal(out.next.remaining,2500);assert.equal(out.next.room.active?.actions,1);assert.ok(out.next.room.world.objects.some(o=>o.kind==='whale'));
 assert.equal(out.effect.world.round,1);assert.equal(out.next.room.world.round,2);assert.ok(out.next.fundedIds.every(id=>!r.fundedIds.includes(id)));
});
test('insufficient credits, expiry and exhausted action budget cannot change a round',()=>{
 const r=active('whale'),before=JSON.stringify(r);
 assert.throws(()=>performLoot(r,119,{type:'blackhole'},11000,'cost'),/costs 120/);assert.equal(JSON.stringify(r),before);
 assert.throws(()=>performLoot(r,300,{type:'treasure'},70000,'late'),/active turn/);
 r.room.active!.actions=3;assert.throws(()=>performLoot(r,300,{type:'treasure'},11000,'budget'),/three changes/);
});
test('restoring a previously claimed object never restores its reward allocation',()=>{
 const r=active(),target=structuredClone(r.room.world.objects.find(o=>o.kind==='fish-orange')!),first=performLoot(r,300,{type:'explode',kind:'fish-orange'},11000,'first',()=>.99);
 first.next.room.world.objects.unshift(target);const second=performLoot(first.next,first.balance,{type:'explode',kind:'fish-orange'},12000,'second',()=>.99);
 assert.equal(second.receipt.credits,0);assert.equal(second.next.remaining,first.next.remaining);
});
