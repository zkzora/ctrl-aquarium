import {test} from 'node:test';
import assert from 'node:assert/strict';
import {redisStore,type RedisCommands} from '../server/redis-store.ts';
import {newGame} from '../lib/pack-game.ts';
function memory(seed:string|null){let value=seed;const calls:string[]=[];const client:RedisCommands={async command<T>(args:(string|number)[]):Promise<T>{calls.push(String(args[0]));if(args[0]==='GET')return value as T;if(args[0]==='EVAL'){if(value===args[4]){value=String(args[5]);return 1 as T;}return 0 as T;}throw Error('Unexpected command');}};return {client,calls,read:()=>value};}
test('ordinary reads use one GET each and never write a database document',async()=>{
 const m=memory(JSON.stringify(newGame(1))),store=redisStore('test',m.client),original=m.read();
 for(let i=0;i<20;i++)await store.transaction(g=>structuredClone(g));assert.deepEqual(m.calls,Array(20).fill('GET'));assert.equal(m.read(),original);
});
test('concurrent mutations retry CAS without dropping updates',async()=>{
 const m=memory(JSON.stringify(newGame(1))),store=redisStore('test',m.client);
 await Promise.all([1,2,3].map(()=>store.transaction(async g=>{await Promise.resolve();g.version++;})));
 assert.equal(JSON.parse(m.read()!).version,3);
});
test('missing state and thrown actions never mint new state or save a mutation',async()=>{
 const absent=memory(null);await assert.rejects(()=>redisStore('test',absent.client).transaction(g=>g),/missing/);assert.equal(absent.read(),null);
 const m=memory(JSON.stringify(newGame(1))),before=m.read();await assert.rejects(()=>redisStore('test',m.client).transaction(g=>{g.version=123;throw Error('reject');}));assert.equal(m.read(),before);assert.deepEqual(m.calls,['GET']);
});
