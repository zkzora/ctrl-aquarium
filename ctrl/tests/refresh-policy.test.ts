import {test} from 'node:test';
import assert from 'node:assert/strict';
import {refreshInterval} from '../lib/refresh-policy.ts';
const active={route:'room',hidden:false,online:true,authenticated:true,controller:false,idleFor:0};
test('passive, hidden, signed-out, idle and unavailable pages make no periodic API calls',()=>{
 for(const overrides of [{route:'home'},{route:'docs'},{route:'guide'},{hidden:true},{online:false},{authenticated:false},{idleFor:120001}])assert.equal(refreshInterval({...active,...overrides}),null);
});
test('active aquarium reads are bounded and controller timers still run locally',()=>{
 assert.equal(refreshInterval(active),30000);assert.equal(refreshInterval({...active,controller:true}),5000);
});
