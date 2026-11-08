import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {startPreview} from '../tools/preview-website.mjs';
import type {GameView} from '../lib/pack-game.ts';

test('HTTP preview shares a world between three cookies and keeps ownership after server restart',async()=>{
 const directory=await mkdtemp(path.join(os.tmpdir(),'ctrl-http-test-'));
 let app=await startPreview({port:0,dataDirectory:directory});
 try{
  const cookies:string[]=[];
  for(let i=0;i<3;i++){
   const response=await fetch(`${app.origin}/api/demo`);
   assert.equal(response.status,200);
   assert.match(response.headers.get('set-cookie')!,/HttpOnly; SameSite=Strict/);
   cookies.push(response.headers.get('set-cookie')!.split(';')[0]);
  }
  async function read(i:number){return await (await fetch(`${app.origin}/api/demo`,{headers:{cookie:cookies[i]}})).json() as GameView}
  async function write(i:number,body:Record<string,unknown>){return fetch(`${app.origin}/api/demo`,{method:'POST',headers:{origin:app.origin,cookie:cookies[i],'content-type':'application/json'},body:JSON.stringify({requestId:crypto.randomUUID(),...body})})}
  const [a,b,c]=await Promise.all([read(0),read(1),read(2)]);
  assert.equal(new Set([a.me.id,b.me.id,c.me.id]).size,3);
  assert.equal((await write(0,{type:'join'})).status,200);
  assert.equal((await write(1,{type:'join'})).status,200);
  assert.equal((await write(2,{type:'join'})).status,200);
  assert.equal((await write(0,{type:'command',prompt:'Make it nighttime'})).status,200);
  assert.equal((await read(2)).room.world.light,'night');
  assert.deepEqual((await read(2)).room.queue.map(p=>p.session),[b.me.id,c.me.id]);
  assert.equal((await write(1,{type:'command',prompt:'Make it daytime'})).status,403);
  assert.equal((await write(0,{type:'buy',kind:'shark'})).status,200);
  const purchased=await read(0),id=purchased.packs[0].id;
  assert.equal((await read(1)).packs.length,0);
  assert.equal((await write(1,{type:'open',packId:id})).status,403);
  assert.equal((await write(0,{type:'leave'})).status,200);
  assert.equal((await read(2)).room.active?.session,b.me.id);
  await app.close();app=await startPreview({port:0,dataDirectory:directory});
  const recovered=await read(0);
  assert.equal(recovered.me.balance,1400);assert.equal(recovered.packs[0].id,id);
  assert.equal(recovered.room.world.light,'night');
  const forged=await fetch(`${app.origin}/api/demo`,{method:'POST',headers:{origin:'https://attacker.invalid','content-type':'application/json',cookie:cookies[0]},body:JSON.stringify({type:'refill',requestId:crypto.randomUUID()})});
  assert.equal(forged.status,403);
  const page=await fetch(app.origin);assert.equal(page.status,200);assert.match(await page.text(),/CTRL/);
 }finally{
  await app.close();assert.ok(path.resolve(directory).startsWith(path.resolve(os.tmpdir())+path.sep+'ctrl-http-test-'));
  await rm(directory,{recursive:true,force:true});
 }
});
