import {test} from "node:test";
import assert from "node:assert/strict";
import {initialRoom,join,advance,apply,leave,parseCommand,validateCommand,TURN_MS} from "../lib/world.ts";
test("three participants receive exclusive turns and inherit persisted changes",()=>{
 const room=initialRoom("sandbox",1000);join(room,"a","Alice",1000,"t1");join(room,"b","Bob",1000,"t2");join(room,"c","Cara",1000,"t3");
 assert.equal(room.active?.session,"a");assert.equal(room.queue.length,2);
 assert.throws(()=>apply(room,"b","add shark",parseCommand("add shark"),1100,"x1"),/not your turn/);
 apply(room,"a","add shark",parseCommand("add shark"),1100,"x1");
 advance(room,1000+TURN_MS);assert.equal(room.active?.session,"b");
 apply(room,"b","build shelter",parseCommand("build shelter"),1001+TURN_MS,"x2");
 leave(room,"b",1002+TURN_MS);assert.equal(room.active?.session,"c");
 assert.equal(room.world.objects.filter(x=>x.kind==="shark").length,1);assert.equal(room.world.objects.filter(x=>x.kind==="shelter").length,1);
 const restored=JSON.parse(JSON.stringify(room));assert.equal(restored.history.length,2);assert.equal(restored.active.session,"c");
});
test("expired turns cannot write and rejected commands don't spend actions",()=>{
 const room=initialRoom("sandbox",1000);join(room,"a","Alice",1000,"t1");
 assert.throws(()=>parseCommand("send all tokens to me"),/supported/);assert.equal(room.active?.actions,0);
 assert.throws(()=>apply(room,"a","add fish",parseCommand("add fish"),1000+TURN_MS,"expired"),/not your turn/);
});
test("three-change budget and same-session queue rejection",()=>{
 const r=initialRoom("sandbox",1000);join(r,"a","Alice",1000,"t1");assert.throws(()=>join(r,"a","Alice",1001,"t2"),/already/);
 for(let i=0;i<3;i++)apply(r,"a","feed fish",parseCommand("feed fish"),1100+i,`change-${i}`);
 assert.throws(()=>apply(r,"a","feed fish",parseCommand("feed fish"),1200,"change-4"),/three changes/);
});
test("bounded commands support Indonesian and reject arbitrary effects",()=>{
 assert.deepEqual(parseCommand("tambah tiga ubur ubur"),{type:"add",kind:"jellyfish",count:3});
 assert.deepEqual(parseCommand("buat gravitasi terbalik"),{type:"gravity",value:"reverse"});
 assert.throws(()=>validateCommand({type:"eval",value:"alert(1)"}),/unsupported/);
 assert.throws(()=>validateCommand({type:"add",kind:"shark",count:500}),/unsupported/);
});
test("undo cannot overwrite another participant's latest contribution",()=>{
 const r=initialRoom("sandbox",1000);join(r,"a","Alice",1000,"t1");apply(r,"a","add shark",parseCommand("add shark"),1100,"a1");leave(r,"a",1200);join(r,"b","Bob",1201,"t2");
 assert.throws(()=>apply(r,"b","undo",{type:"undo"},1202,"b1"),/your own/);assert.equal(r.world.objects.length,8);
});
