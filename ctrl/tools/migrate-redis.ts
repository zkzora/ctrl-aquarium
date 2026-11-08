// Recover testnet accounting from a preserved local snapshot and chain events.
// Never fabricate a missing secret for an unopened on-chain entitlement.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {createPublicClient,http,type Address,type Hex} from 'viem';
import {baseSepolia} from 'viem/chains';
import {redisCommands} from '../server/redis-store.ts';
import {project} from '../server/testnet-api.ts';
import {testnetCommitment} from '../lib/testnet-config.ts';
import artifact from '../lib/aquarium.generated.json' with {type:'json'};
import assert from 'node:assert/strict';
const client=createPublicClient({chain:baseSepolia,transport:http('https://sepolia.base.org')}),redis=redisCommands();
const recovery=JSON.parse(await readFile('.ctrl-data/recovery/chain-events.json','utf8'));
const original=await readFile('.ctrl-data/game-v3.json','utf8'),root=JSON.parse(original),s=root.testnet;
assert.equal(root.schema,3);assert.ok(s?.config);assert.equal(s.config.contract.toLowerCase(),recovery.deployment.contract.toLowerCase());
const bought=recovery.logs.filter((l:{eventName:string})=>l.eventName==='PackBought');
const opened=recovery.logs.filter((l:{eventName:string})=>l.eventName==='PackOpened');
for(const buy of bought){
 const id=buy.args.packId,open=opened.find((l:{args:{packId:string}})=>l.args.packId===id),saved=s.quotes[id];
 if(!open){if(!saved||testnetCommitment(id,saved.payout,saved.nonce)!==buy.args.commitment)throw new Error('Unopened pack has no recoverable secret; migration blocked. Restore the suspended private Blob first.');continue;}
 assert.equal(testnetCommitment(id,Number(open.args.payout),open.args.nonce),buy.args.commitment);
 // Closed results/nonces are public chain data. No unpublished result is drawn.
 s.quotes[id]??={quote:{buyer:buy.args.player,packId:id,habitat:Number(buy.args.habitat),species:Number(buy.args.species),commitment:buy.args.commitment,deadline:'0'},payout:Number(open.args.payout),nonce:open.args.nonce,signature:'0x',issuedAt:0};
}
const events=[];const timestamp=new Map<string,number>();
for(const log of recovery.logs){
 if(BigInt(log.block)<=BigInt(s.config.lastBlock))continue;
 if(!timestamp.has(log.block)){const block=await client.getBlock({blockNumber:BigInt(log.block)});timestamp.set(log.block,Number(block.timestamp)*1000);}
 events.push({...log,at:timestamp.get(log.block)!});
}
project(s,events);s.config.lastBlock=recovery.latest;s.syncPending=false;
for(const habitat of [0,1]){
 const pool=await client.readContract({address:s.config.contract as Address,abi:artifact.abi,functionName:'pools',args:[habitat],blockNumber:BigInt(recovery.latest)}) as readonly [bigint,bigint,bigint,bigint];
 const local=s.game.habitats[habitat===0?'public':'whale'];assert.equal(local.remaining,Number(pool[0]));assert.equal(local.reserved,Number(pool[1]));assert.equal(local.round,Number(pool[2]));
}
for(const p of Object.values(s.game.players) as {id:string;balance:number;packs:{id:string;openedAt?:number}[]}[]){
 if(!/^wallet:0x[0-9a-f]{40}$/.test(p.id))continue;
 const actual=await client.readContract({address:s.config.contract as Address,abi:artifact.abi,functionName:'playerState',args:[p.id.slice(7)],blockNumber:BigInt(recovery.latest)}) as readonly [bigint,bigint,number,number,bigint,readonly Hex[]];
 assert.equal(p.balance,Number(actual[0]));assert.deepEqual(p.packs.filter(x=>!x.openedAt).map(x=>x.id).sort(),[...actual[5]].sort());
}
const body=JSON.stringify(root),checksum=createHash('sha256').update(body).digest('hex');
await mkdir('.ctrl-data/backups',{recursive:true});await writeFile('.ctrl-data/backups/testnet-recovered-for-redis.json',body,{mode:0o600});
const existing=await redis.command<string|null>(['GET','ctrl:state:v4']);
if(existing){assert.equal(createHash('sha256').update(existing).digest('hex'),checksum,'Destination already contains a different state; refusing overwrite.');console.log('Verified existing matching migration.');}
else {assert.equal(await redis.command(['SET','ctrl:state:v4',body,'NX']),'OK');}
const persisted=await redis.command<string>(['GET','ctrl:state:v4']);assert.equal(createHash('sha256').update(persisted).digest('hex'),checksum);
const report={migratedAt:new Date().toISOString(),contract:s.config.contract,indexedBlock:s.config.lastBlock,chainPurchases:bought.length,chainOpenings:opened.length,pending:bought.length-opened.length,bytes:body.length,sha256:checksum,preservedSource:'.ctrl-data/game-v3.json',blobSource:'retained, suspended, not deleted',verifiedBalances:true,verifiedReserves:true};
await writeFile('.ctrl-data/recovery/redis-migration.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
