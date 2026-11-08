// Separate SET NX document: the old ledger, sessions, commitments and archive stay intact.
import fs from 'node:fs/promises';
import {redisCommands} from '../server/redis-store.ts';
import {newGame} from '../lib/pack-game.ts';
import {newKeyboardGame,keyboardPlayer} from '../lib/keyboard-game.ts';
import {makeTestnetClient,verifyKeyboard} from '../server/keyboard-api.ts';
import type {Address,Hex} from 'viem';
import type {WorldObject} from '../lib/world.ts';
process.loadEnvFile('.env.production.local');
const redis=redisCommands(),key='ctrl:state:keyboard:v1';
const deployment=JSON.parse(await fs.readFile('.ctrl-data/keyboard-deployment.json','utf8')) as {contract:Address;hash:Hex;block:string;oracle:Address;admin:Address};
const client=makeTestnetClient(process.env.BASE_SEPOLIA_RPC_URL);await verifyKeyboard(client,deployment.contract,deployment.oracle);
const existing=await redis.command<string|null>(['GET',key]);if(existing){const parsed=JSON.parse(existing);if(parsed.keyboard?.config?.contract.toLowerCase()!==deployment.contract.toLowerCase())throw new Error('Destination differs from reviewed deployment');console.log('Existing keyboard document retained. No balance or world reset.');process.exit(0);}
const oldRaw=await redis.command<string|null>(['GET','ctrl:state:v4']);if(!oldRaw)throw new Error('Legacy state missing; migration stopped');
await fs.mkdir('.ctrl-data/backups',{recursive:true});await fs.writeFile('.ctrl-data/backups/before-keyboard-migration.json',oldRaw);
const old=JSON.parse(oldRaw),at=Date.now(),root=newGame(at),game=newKeyboardGame(at);
for(const p of Object.values(old.testnet?.game.players??{}) as {id:string;name:string;collection:{NVDA:number;AAPL:number;MSFT:number}}[]){const match=p.id.match(/^wallet:(0x[a-fA-F0-9]{40})$/);if(!match)continue;const person=keyboardPlayer(game,match[1],at);person.name=p.name;person.collection=p.collection;}
for(const h of ['public','whale'] as const){const source=old.testnet?.game.habitats[h];if(!source)continue;const room=game.habitats[h].room;room.history=structuredClone(source.room.history??[]);room.world=structuredClone(source.room.world);room.world.round=1;room.world.biome=h;room.world.objects=room.world.objects.map(({packOwner:_,sealedUntil:__,...o}:WorldObject)=>o);room.queue=[];room.active=null;}
Object.assign(root,{keyboard:{game,sessions:{},quotes:{},migrated:{},legacyBalances:{},config:{contract:deployment.contract,deployment:deployment.hash,deployedBlock:deployment.block,lastBlock:String(BigInt(deployment.block)-1n),deployer:deployment.admin}}});
const serialized=JSON.stringify(root);if(await redis.command(['SET',key,serialized,'NX'])!=='OK')throw new Error('Destination was concurrently created; nothing overwritten');
await fs.writeFile('.ctrl-data/backups/keyboard-initial.json',serialized);
console.log(JSON.stringify({key,contract:deployment.contract,profiles:Object.keys(game.players).length,legacyRetained:true,publicPool:game.habitats.public.remaining,whalePool:game.habitats.whale.remaining}));
