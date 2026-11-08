import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createServer,type Server} from 'node:http';
import {encodeEventTopics,encodeAbiParameters,type Address,type Hex} from 'viem';
import {makeTestnetClient,readKeyboardLogs,rpcFailure,type TestnetClient} from '../server/keyboard-rpc.ts';
import {syncKeyboard} from '../server/keyboard-api.ts';
import {newGame,type Game} from '../lib/pack-game.ts';
import {newKeyboardGame} from '../lib/keyboard-game.ts';
import artifact from '../lib/keyboard.generated.json' with {type:'json'};
const address='0x1111111111111111111111111111111111111111' as Address;
const hash=('0x'+'22'.repeat(32)) as Hex;
async function endpoint(status:number,result?:string){let calls=0;const server=createServer(async(req,res)=>{for await(const _ of req){}calls++;res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(status===200?{jsonrpc:'2.0',id:1,result}:{error:{code:-32005,message:'Rate limited'}}));});await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));const bound=server.address();if(!bound||typeof bound==='string')throw new Error('No port');return {server,url:`http://127.0.0.1:${bound.port}`,calls:()=>calls};}
async function close(server:Server){await new Promise<void>((resolve,reject)=>server.close(error=>error?reject(error):resolve()));}
test('RPC switches from a 429 endpoint to the backup without retrying the limited endpoint',async()=>{const limited=await endpoint(429),backup=await endpoint(200,'0x64');try{const client=makeTestnetClient(limited.url,[backup.url]);assert.equal(await client.getBlockNumber({cacheTime:0}),100n);assert.equal(limited.calls(),1);assert.equal(backup.calls(),1);}finally{await Promise.all([close(limited.server),close(backup.server)]);}});
test('large idle gaps need one bounded 50k log query, not 250 queries',async()=>{const seen:{fromBlock:bigint;toBlock:bigint}[]=[];const client={async getLogs(range:{fromBlock:bigint;toBlock:bigint}){seen.push(range);return [];}} as unknown as TestnetClient;const result=await readKeyboardLogs(client,address,10n,200000n);assert.equal(result.end,50009n);assert.equal(seen.length,1);assert.equal(seen[0].fromBlock,10n);});
test('strict RPC range limit retries 200 blocks without skipping unread history',async()=>{const ranges:bigint[]=[];const client={async getLogs({fromBlock,toBlock}:{fromBlock:bigint;toBlock:bigint}){ranges.push(toBlock-fromBlock+1n);if(ranges.length===1)throw new Error('maximum block range exceeded');return [];}} as unknown as TestnetClient;const result=await readKeyboardLogs(client,address,1000n,200000n);assert.equal(result.end,1199n);assert.deepEqual(ranges,[50000n,200n]);});
test('a rate limit is reported as RPC failure without hammering smaller log ranges',async()=>{let calls=0;const error=Object.assign(new Error('Too many requests'),{name:'HttpRequestError',status:429});const client={async getLogs(){calls++;throw error;}} as unknown as TestnetClient;await assert.rejects(()=>readKeyboardLogs(client,address,0n,100000n),e=>e===error);assert.equal(calls,1);assert.equal(rpcFailure(error),true);assert.equal(rpcFailure(new Error('Missing durable state')),false);});
test('catch-up projects a confirmed claim once across a 250k-block idle gap and clears stale sync flags',async()=>{
 let root=Object.assign(newGame(1),{keyboard:{game:newKeyboardGame(1),sessions:{},quotes:{},config:{contract:address,deployment:hash,deployedBlock:'1',lastBlock:'0',deployer:address},syncPending:true}});
 const store={async transaction<T>(fn:(g:Game)=>T|Promise<T>){const copy=structuredClone(root),result=await fn(copy);root=copy;return result;}};
 const ranges:[bigint,bigint][]=[];
 const client={async getBlockNumber(){return 250000n;},async getBlock(){return {timestamp:1000n};},async getLogs({fromBlock,toBlock}:{fromBlock:bigint;toBlock:bigint}){ranges.push([fromBlock,toBlock]);return fromBlock<=40000n&&toBlock>=40000n?[{blockNumber:40000n,logIndex:0,transactionHash:hash,topics:encodeEventTopics({abi:artifact.abi,eventName:'CreditsClaimed',args:{player:address}}),data:encodeAbiParameters([{type:'uint256'}],[1500n])}]:[];}} as unknown as TestnetClient;
 for(let i=0;i<5;i++)await syncKeyboard(store,client);
 assert.equal(root.keyboard.game.players['wallet:'+address].balance,1500);assert.equal(root.keyboard.config.lastBlock,'250000');assert.equal(root.keyboard.syncPending,false);assert.deepEqual(ranges,[[1n,50000n],[50001n,100000n],[100001n,150000n],[150001n,200000n],[200001n,250000n]]);
 root.keyboard.syncPending=true;await syncKeyboard(store,client);assert.equal(root.keyboard.syncPending,false);assert.equal(root.keyboard.game.players['wallet:'+address].balance,1500);
});
