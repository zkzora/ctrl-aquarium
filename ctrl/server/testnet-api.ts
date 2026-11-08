import {createPublicClient,http,isAddress,keccak256,decodeEventLog,type Address,type Hex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {createSiweMessage} from 'viem/siwe';
import artifact from '../lib/aquarium.generated.json' with {type:'json'};
import {TESTNET_CHAIN,SPECIES,purchaseTypes,purchaseDomain,testnetCommitment,type PurchaseQuote,type TestnetStatus} from '../lib/testnet-config.ts';
import {newGame,ensurePlayer,viewGame,tickGame,actGame,PACK_ODDS,type Game,type GameView,type PackReceipt,type GameAction} from '../lib/pack-game.ts';
import {initialWorld,UserError} from '../lib/world.ts';
import type {Habitat} from '../lib/catalog.ts';
import {digest,type GameStore} from './api.ts';

export const makeTestnetClient=(rpc='https://sepolia.base.org')=>createPublicClient({chain:TESTNET_CHAIN,transport:http(rpc,{timeout:12000,retryCount:1})});
export type TestnetClient=ReturnType<typeof makeTestnetClient>;
type Secret={quote:PurchaseQuote;payout:number;nonce:Hex;signature:Hex;issuedAt:number};
type Auth={wallet?:Address;expires?:number;challenge?:{message:string;nonce:string;address:Address;origin:string;expires:number};recent:number[]};
type Configuration={contract:Address;deployment:Hex;deployedBlock:string;lastBlock:string};
type State={game:Game;sessions:Record<string,Auth>;quotes:Record<string,Secret>;config?:Configuration;syncPending?:boolean};
type Root=Game&{testnet?:State};
export type TestnetView=GameView&{testnet:TestnetStatus;actionReceipt?:PackReceipt};
export type TestnetOptions={client?:TestnetClient;oracleKey?:Hex;allowedOrigins?:string[];setupEnabled?:boolean;adminAddress?:Address;initialDeployment?:Hex;now?:()=>number};
const zero='0x0000000000000000000000000000000000000000';
function state(g:Game){return (g as Root).testnet??=((g as Root).testnet={game:newGame(),sessions:{},quotes:{}});}
function player(s:State,wallet:string,now:number){const id='wallet:'+wallet.toLowerCase();const exists=!!s.game.players[id];const p=ensurePlayer(s.game,id,now);if(!exists){p.balance=0;p.name='diver-'+wallet.slice(2,6);}return p;}
function walletOf(auth:Auth,now:number){return auth.expires&&auth.expires>now?auth.wallet:undefined;}
export async function verifyAquarium(client:TestnetClient,address:Address,oracle:Address){
 if(await client.getChainId()!==84532)throw new Error('RPC is not Base Sepolia');
 const code=await client.getCode({address});if(!code||keccak256(code)!==artifact.runtimeHash)throw new UserError('The deployed bytecode does not match the tested CTRL Aquarium contract.');
 const actual=await client.readContract({address,abi:artifact.abi,functionName:'oracle'}) as Address;
 if(actual.toLowerCase()!==oracle.toLowerCase())throw new UserError('This contract uses a different outcome signer.');
}

// Project confirmed contract events into the shared visual world. Never execute
// the sandbox payout engine here. Purchases, credits, limits and rewards live on chain.
export function project(s:State,logs:{eventName:string;args:Record<string,unknown>;transactionHash:Hex;logIndex:number;at:number}[]){
 const groups=new Map<string,typeof logs>();for(const log of logs){const group=groups.get(log.transactionHash)??[];group.push(log);groups.set(log.transactionHash,group);}
 for(const [hash,events] of groups){
  const reveals:{id:Hex;payout:number;nonce:Hex;habitat:Habitat}[]=[];let collapse:{habitat:Habitat;round:number;fee:number}|undefined;let owner='';let before;
  for(const event of events){
   const a=event.args,wallet=String(a.player??'').toLowerCase();if(!isAddress(wallet))continue;owner=wallet;
   const p=player(s,wallet,event.at),h=Number(a.habitat??0),habitat:Habitat=Number(h)===0?'public':'whale',pool=s.game.habitats[habitat];
   if(event.eventName==='CreditsClaimed'){p.balance+=Number(a.amount);p.refills.push(event.at);}
   if(event.eventName==='PackBought'){
    const id=String(a.packId) as Hex;if(p.packs.some(x=>x.id===id))continue;
    const secret=s.quotes[id];if(!secret||secret.quote.buyer.toLowerCase()!==wallet||secret.quote.commitment.toLowerCase()!==String(a.commitment).toLowerCase())throw new Error('Missing or mismatched private purchase record. Restore the private state backup.');
    const kind=SPECIES[Number(a.species)],price=habitat==='public'?100:500,maximum=habitat==='public'?320:1600;
    p.balance-=price;p.purchases.push(event.at);p.packs.push({id,owner:p.id,habitat,kind,price,maxPayout:maximum,payout:secret.payout,nonce:secret.nonce,commitment:String(a.commitment),createdAt:event.at,maturesAt:Number(a.maturesAt)*1000,label:secret.payout/(habitat==='public'?1:5)>=200?'Rare':'Common'});
    pool.reserved+=maximum;pool.sales+=price;
    if(pool.room.world.objects.length<32)pool.room.world.objects.push({id,kind,x:.35+(Number(a.species)%3)*.1,y:kind==='whale'?.34:.45,seed:event.at%9999,born:event.at,packOwner:p.id,sealedUntil:Number(a.maturesAt)*1000});
    pool.room.history.push({id:hash,session:p.id,actor:p.name,prompt:'Buy sealed '+kind,summary:'Added a sealed '+kind+' pack',at:event.at,world:structuredClone(pool.room.world),interpreter:'rules'});
   }
   if(event.eventName==='PackOpened'){
    before??=structuredClone(pool.room.world);const id=String(a.packId) as Hex,pack=p.packs.find(x=>x.id===id);if(!pack)throw new Error('Purchased pack is missing from private state');
    pack.openedAt=event.at;p.openings.push(event.at);p.balance+=Number(a.payout);pool.reserved-=pack.maxPayout;pool.remaining-=Number(a.payout);pool.paidOut+=Number(a.payout);pool.gross+=pack.price-Number(a.payout);
    pool.room.world.objects=pool.room.world.objects.filter(o=>o.id!==id);reveals.push({id,payout:Number(a.payout),nonce:String(a.nonce) as Hex,habitat});
   }
   if(event.eventName==='RoundCollapsed'){
    const fee=Number(a.fee);p.balance-=fee;p.holes.push(event.at);pool.gross+=fee;collapse={habitat,round:Number(a.round),fee};
    pool.round=Number(a.round);pool.lastCollapse=event.at;pool.recoveryAt=event.at+4200;pool.spawned=0;pool.room.world={...initialWorld(event.at),objects:[],biome:habitat,round:pool.round};
    let index=0;for(const person of Object.values(s.game.players))for(const pack of person.packs)if(pack.habitat===habitat&&!pack.openedAt)pack.returnsAt=pool.recoveryAt+(++index)*15000;
   }
  }
  if(reveals.length){
   const at=events[0].at,p=player(s,owner,at),h=reveals[0].habitat,pool=s.game.habitats[h],packs=reveals.map(r=>p.packs.find(x=>x.id===r.id)!);
   const cards=reveals.flatMap(r=>r.habitat==='whale'&&r.payout>=1000?[(['NVDA','AAPL','MSFT'] as const)[Number(BigInt(r.nonce)%3n)]]:[]);
   const receipt:PackReceipt={id:hash,action:collapse?'blackhole':packs[0].kind==='treasure'?'treasure':'explode',habitat:h,round:collapse?collapse.round-1:pool.round,credits:reveals.reduce((n,r)=>n+r.payout,0),cost:collapse?.fee??0,targets:reveals.length,stockCards:cards,empty:false,at,packIds:reveals.map(r=>r.id),purchaseCost:packs.reduce((n,p)=>n+p.price,0),commitments:reveals.map(r=>({id:r.id,nonce:r.nonce,payout:r.payout,commitment:packs.find(p=>p.id===r.id)!.commitment}))};
   if(!p.receipts.some(r=>r.id===hash)){p.receipts.push(receipt);if(p.receipts.length>100)p.receipts.shift();for(const card of cards)p.collection[card]++;}
   pool.effect={id:hash,type:receipt.action,startedAt:at,duration:collapse?4200:1400,world:before!,targetIds:reveals.map(r=>r.id)};
   pool.room.history.push({id:hash,session:p.id,actor:p.name,prompt:collapse?'Create a black hole':'Open owned pack',summary:collapse?`Collapsed round ${collapse.round-1} · opened ${reveals.length} owned packs`:`Opened pack · ${receipt.credits} tCTRL`,at,world:structuredClone(pool.room.world),interpreter:'rules'});
  }
  for(const pool of Object.values(s.game.habitats))if(pool.room.history.length>80)pool.room.history=pool.room.history.slice(-80);
 }
}

// Cursor updates and visual/accounting events commit atomically. Bounded catch-up
// is visible to users and disables purchases until it is complete.
export async function syncTestnet(store:GameStore,client:TestnetClient){
 const config=await store.transaction(g=>structuredClone(state(g).config));if(!config)return;
 const latest=await client.getBlockNumber({cacheTime:0}),start=BigInt(config.lastBlock)+1n;
 if(start>latest)return;
 const end=start+199n<latest?start+199n:latest;
 const raw=await client.getLogs({address:config.contract,fromBlock:start,toBlock:end});
 const timestamps=new Map<string,number>();
 for(const log of raw)if(log.blockNumber&&!timestamps.has(String(log.blockNumber))){const block=await client.getBlock({blockNumber:log.blockNumber});timestamps.set(String(log.blockNumber),Number(block.timestamp)*1000);}
 const logs=raw.flatMap(log=>{try{const decoded=decodeEventLog({abi:artifact.abi,data:log.data,topics:log.topics});if(!['CreditsClaimed','PackBought','PackOpened','RoundCollapsed'].includes(decoded.eventName??''))return [];return [{eventName:decoded.eventName!,args:Object.fromEntries(Object.entries(decoded.args??{})),transactionHash:log.transactionHash!,logIndex:log.logIndex!,at:timestamps.get(String(log.blockNumber))!}];}catch{return [];}}).sort((a,b)=>a.at-b.at||a.logIndex-b.logIndex);
 await store.transaction(g=>{const s=state(g);if(s.config?.lastBlock!==config.lastBlock)return;project(s,logs);s.config.lastBlock=String(end);s.syncPending=end<latest;});
 return {latest,end};
}

export async function testnetApi(request:Request,store:GameStore,options:TestnetOptions={}){
 const url=new URL(request.url),h=url.searchParams.get('habitat')??'public',now=options.now??Date.now,client=options.client??makeTestnetClient();
 const headers:Record<string,string>={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
 try{
  if(h!=='public'&&h!=='whale')throw new UserError('Unknown aquarium.',404);
  if(!['GET','POST'].includes(request.method))return Response.json({error:'Method not allowed'},{status:405});
  const origin=request.headers.get('origin')??url.origin;
  if(request.method==='POST'&&(!request.headers.get('origin')||![url.origin,...(options.allowedOrigins??[])].includes(origin)))throw new UserError('Open CTRL in its own tab before signing in.',403);
  let body:Record<string,unknown>={};
  if(request.method==='POST'){
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new UserError('JSON required.',415);
   const raw=await request.text();if(raw.length>8192)throw new UserError('Request too large.',413);try{body=JSON.parse(raw)}catch{throw new UserError('Invalid JSON.');}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new UserError('Invalid request.');
  }
  const supplied=request.headers.get('cookie')?.match(/(?:^|;\s*)ctrl_testnet=([a-f0-9]{64})(?:;|$)/)?.[1];
  const token=supplied??Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join(''),sessionId=await digest(token);
  if(!supplied)headers['Set-Cookie']=`ctrl_testnet=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${url.protocol==='https:'?'; Secure':''}`;
  if(request.method==='GET'){
   // One read, zero writes. Derived timers/scenery run on a detached snapshot;
   // viewing a page must not persist presence, sessions or an index cursor.
   const snapshot=await store.transaction(g=>structuredClone(g)),s=state(snapshot),at=now();
   const signedWallet=walletOf(s.sessions[sessionId]??{recent:[]},at),p=player(s,signedWallet??('watch-'+sessionId),at);
   tickGame(s.game,at);const result=viewGame(s.game,p.id,h,at),lastClaim=p.refills.at(-1),claimAt=lastClaim?lastClaim+86400000:0;
   result.limits.refillAt=claimAt;result.limits.refillsLeft=signedWallet&&claimAt<=at?1:0;
   if(!signedWallet){result.limits.purchasesLeft=0;result.limits.opensLeft=0;result.limits.blackholesLeft=0;}
   const oracle=options.oracleKey?privateKeyToAccount(options.oracleKey).address:undefined;
   const testnet:TestnetStatus={chainId:84532,wallet:signedWallet,contract:s.config?.contract,oracle,canDeploy:!!oracle&&options.setupEnabled!==false&&!s.config&&(!options.adminAddress||signedWallet?.toLowerCase()===options.adminAddress.toLowerCase()),configured:!!s.config,claimAt,holeAt:p.holes.length?p.holes.at(-1)!+86400000:0,block:s.config?.lastBlock,syncing:s.syncPending??false};
   return Response.json({...result,testnet},{headers});
  }
  let auth=await store.transaction(g=>{const s=state(g),a=s.sessions[sessionId]??={recent:[]};if(request.method==='POST'){a.recent=a.recent.filter(t=>t>now()-60000);if(a.recent.length>=30)throw new UserError('Too many requests. Wait a minute.',429);a.recent.push(now());}return structuredClone(a);});
  const wallet=walletOf(auth,now()),oracle=options.oracleKey?privateKeyToAccount(options.oracleKey):undefined;
  if(options.initialDeployment&&oracle){
   const existing=await store.transaction(g=>structuredClone(state(g).config));
   if(existing&&existing.deployment.toLowerCase()!==options.initialDeployment.toLowerCase())throw new Error('Configured deployment changed. Explicit migration is required.');
   if(!existing){
    const deployment=await client.getTransactionReceipt({hash:options.initialDeployment});
    if(deployment.status!=='success'||!deployment.contractAddress||(options.adminAddress&&deployment.from.toLowerCase()!==options.adminAddress.toLowerCase()))throw new Error('Initial deployment is not a successful administrator deployment');
    await verifyAquarium(client,deployment.contractAddress,oracle.address);
    await store.transaction(g=>{const s=state(g);s.config??={contract:deployment.contractAddress!,deployment:options.initialDeployment!,deployedBlock:String(deployment.blockNumber),lastBlock:String(deployment.blockNumber-1n)};});
   }
  }
  if(body.type==='wallet-challenge'){
   if(!isAddress(String(body.address)))throw new UserError('Invalid wallet address.');const address=String(body.address) as Address,nonce=crypto.randomUUID().replaceAll('-',''),expires=now()+300000;
   const message=createSiweMessage({address,chainId:84532,domain:new URL(origin).host,uri:origin,version:'1',nonce,issuedAt:new Date(now()),expirationTime:new Date(expires),statement:'Sign in to CTRL on Base Sepolia. No funds move. Test credits have no monetary value.'});
   await store.transaction(g=>{state(g).sessions[sessionId].challenge={message,nonce,address,origin,expires};});return Response.json({message},{headers});
  }
  if(body.type==='wallet-verify'){
   const c=auth.challenge,signature=String(body.signature);if(!c||c.expires<now()||c.origin!==origin||!/^0x[0-9a-fA-F]+$/.test(signature))throw new UserError('Sign-in expired. Connect again.',401);
   if(!await client.verifySiweMessage({message:c.message,signature:signature as Hex,address:c.address,nonce:c.nonce,domain:new URL(origin).host,time:new Date(now())}))throw new UserError('The wallet signature does not match.',401);
   await store.transaction(g=>{const a=state(g).sessions[sessionId];if(a.challenge?.nonce!==c.nonce||a.challenge.expires<now())throw new UserError('Sign-in already used or expired.',401);a.wallet=c.address.toLowerCase() as Address;a.expires=now()+8*3600000;delete a.challenge;});
  }
  if(body.type==='wallet-disconnect')await store.transaction(g=>{const a=state(g).sessions[sessionId];delete a.wallet;delete a.expires;delete a.challenge;});
  if(body.type==='setup'){
   if(!wallet||!oracle||options.setupEnabled===false||(options.adminAddress&&wallet.toLowerCase()!==options.adminAddress.toLowerCase()))throw new UserError('Only the deployment administrator can configure this testnet.',403);
   const hash=String(body.hash) as Hex;if(!/^0x[\da-fA-F]{64}$/.test(hash))throw new UserError('Confirmed deployment hash required.');
   const receipt=await client.getTransactionReceipt({hash});if(receipt.status!=='success'||!receipt.contractAddress||receipt.from.toLowerCase()!==wallet.toLowerCase())throw new UserError('Deploy this contract from your signed-in wallet first.');
   const address=receipt.contractAddress;await verifyAquarium(client,address,oracle.address);
   await store.transaction(g=>{const s=state(g);if(s.config&&s.config.contract.toLowerCase()!==address.toLowerCase())throw new UserError('This server already has a testnet deployment.');s.config??={contract:address,deployment:hash,deployedBlock:String(receipt.blockNumber),lastBlock:String(receipt.blockNumber-1n)};});
  }
  let sync;
  for(let i=0;i<(body.type==='sync'?8:1);i++){sync=await syncTestnet(store,client);if(!sync||sync.end>=sync.latest)break;}
  const syncing=!!sync&&sync.end<sync.latest;
  auth=await store.transaction(g=>structuredClone(state(g).sessions[sessionId]));const signedWallet=walletOf(auth,now());
  const config=await store.transaction(g=>structuredClone(state(g).config));
  if(body.type==='quote'){
   if(!signedWallet||!config||!oracle||syncing)throw new UserError('Connect, deploy and synchronize Base Sepolia before buying.');
   const species=SPECIES.indexOf(String(body.kind) as typeof SPECIES[number]);if(species<0||(h==='public'&&species<3))throw new UserError('Choose a creature supported by this habitat.');
   const requestId=String(body.requestId);if(!/^[a-zA-Z0-9-]{12,80}$/.test(requestId))throw new UserError('Request ID required.');
   const result=await store.transaction(async g=>{
    const s=state(g),prior=Object.values(s.quotes).find(q=>q.quote.buyer.toLowerCase()===signedWallet.toLowerCase()&&(q as Secret&{requestId?:string}).requestId===requestId);
    if(prior){if(prior.quote.species!==species||prior.quote.habitat!==(h==='public'?0:1))throw new UserError('Request ID reused for a different purchase.');return {quote:prior.quote,signature:prior.signature};}
    const outstanding=Object.values(s.quotes).filter(q=>q.quote.buyer.toLowerCase()===signedWallet.toLowerCase()&&BigInt(q.quote.deadline)*1000n>BigInt(now()));if(outstanding.length>=6)throw new UserError('Too many pending quotes. Wait for them to expire.',429);
    const rand=crypto.getRandomValues(new Uint32Array(1))[0]/4294967296;let acc=0;const outcome=PACK_ODDS.find(o=>(acc+=o.chance)>rand)??PACK_ODDS[3];
    const packId=keccak256(new TextEncoder().encode(crypto.randomUUID())),nonce=keccak256(new TextEncoder().encode(crypto.randomUUID()+crypto.randomUUID())),payout=outcome.value*(h==='public'?1:5);
    const quote:PurchaseQuote={buyer:signedWallet,packId,habitat:h==='public'?0:1,species,commitment:testnetCommitment(packId,payout,nonce),deadline:String(Math.floor(now()/1000)+300)};
    const signature=await oracle.signTypedData({domain:purchaseDomain(config.contract),types:purchaseTypes,primaryType:'Purchase',message:{...quote,deadline:BigInt(quote.deadline)}});
    s.quotes[packId]={quote,payout,nonce,signature,issuedAt:now(),requestId} as Secret;return {quote,signature};
   });return Response.json(result,{headers});
  }
  if(body.type==='reveal'){
   if(!signedWallet||!config||syncing)throw new UserError('Connect and synchronize your wallet first.',401);
   const ids=body.packIds;if(!Array.isArray(ids)||!ids.length||ids.length>3||new Set(ids).size!==ids.length)throw new UserError('Choose one to three owned ready packs.');
   const proofs=await store.transaction(g=>{const s=state(g),p=player(s,signedWallet,now());return ids.map(id=>{const pack=p.packs.find(p=>p.id===id&&p.habitat===h&&!p.openedAt);if(!pack||pack.maturesAt>now())throw new UserError('Pack is not ready or does not belong to this wallet.',403);return {id:pack.id,payout:pack.payout,nonce:pack.nonce,commitment:pack.commitment};});});return Response.json({proofs},{headers});
  }
  if(['join','leave','command','rename'].includes(String(body.type))){
   if(!signedWallet||!config||syncing)throw new UserError('Connect a wallet to the configured testnet first.',401);
   await store.transaction(async g=>{const s=state(g),p=player(s,signedWallet,now());await actGame(s.game,p.id,h,body as GameAction,String(body.requestId),now());});
  }else if(body.type&&!['wallet-verify','wallet-disconnect','setup','sync'].includes(String(body.type)))throw new UserError('Unsupported testnet action. Credits can only change through confirmed contract transactions.');
  // Read the actual balance/caps, pinned to one confirmed block; never trust client amounts.
  let chainPlayer:readonly [bigint,bigint,number,number,bigint,readonly Hex[]]|undefined;
  if(config&&signedWallet&&!syncing){chainPlayer=await client.readContract({address:config.contract,abi:artifact.abi,functionName:'playerState',args:[signedWallet],blockNumber:BigInt(config.lastBlock)}) as typeof chainPlayer;}
  const payload=await store.transaction(g=>{
   const s=state(g),p=player(s,signedWallet??('watch-'+sessionId),now());p.seenAt=now();p.habitat=h;tickGame(s.game,now());
   const result=viewGame(s.game,p.id,h,now());if(!signedWallet){result.limits.purchasesLeft=0;result.limits.opensLeft=0;result.limits.blackholesLeft=0;result.limits.refillsLeft=0;}if(chainPlayer){result.me.balance=Number(chainPlayer[0]);result.limits.purchasesLeft=Number(chainPlayer[2]);result.limits.opensLeft=Number(chainPlayer[3]);result.limits.blackholesLeft=Number(chainPlayer[4])*1000<=now()?1:0;result.limits.refillAt=Number(chainPlayer[1])*1000;result.limits.refillsLeft=result.limits.refillAt<=now()?1:0;}
   const testnet:TestnetStatus={chainId:84532,wallet:signedWallet,contract:config?.contract,oracle:oracle?.address,canDeploy:!!oracle&&options.setupEnabled!==false&&!config&&(!options.adminAddress||signedWallet?.toLowerCase()===options.adminAddress.toLowerCase()),configured:!!config,claimAt:Number(chainPlayer?.[1]??0n)*1000,holeAt:Number(chainPlayer?.[4]??0n)*1000,block:config?.lastBlock,syncing};
   if(body.type==='sync'&&s.game.habitats[h].effect?.id===body.hash)result.lastEffect=s.game.habitats[h].effect;return {...result,testnet,actionReceipt:body.type==='sync'&&typeof body.hash==='string'?p.receipts.find(r=>r.id===body.hash):undefined};
  });return Response.json(payload,{headers});
 }catch(error){const known=error instanceof UserError;if(!known)console.error('CTRL testnet API:',error instanceof Error?error.message:'Service unavailable');return Response.json({error:known?error.message:'Base Sepolia or durable storage is unavailable. No successful transaction is being reported. Reconnect to recover confirmed activity.'},{status:known?error.status:503,headers});}
}
