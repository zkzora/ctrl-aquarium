import {isAddress,keccak256,decodeEventLog,type Address,type Hex} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {createSiweMessage} from 'viem/siwe';
import artifact from '../lib/keyboard.generated.json' with {type:'json'};
import {TESTNET_CHAIN,testnetCommitment,type TestnetStatus} from '../lib/testnet-config.ts';
import {newGame,type Game,type PackReceipt} from '../lib/pack-game.ts';
import {newKeyboardGame,keyboardPlayer,keyboardView,tickKeyboard,planCommand,projectKeyboard,type KeyboardGame,type KeyboardView,type KeyboardSecret} from '../lib/keyboard-game.ts';
import {keyboardTypes,keyboardDomain,type KeyboardQuote} from '../lib/keyboard-config.ts';
import {initialWorld,UserError} from '../lib/world.ts';
import type {Habitat} from '../lib/catalog.ts';
import {digest,type GameStore} from './api.ts';

import {makeTestnetClient,readKeyboardLogs,rpcFailure,type TestnetClient} from './keyboard-rpc.ts';
export {makeTestnetClient} from './keyboard-rpc.ts';
export type {TestnetClient} from './keyboard-rpc.ts';
type Secret=KeyboardSecret;
type Auth={wallet?:Address;expires?:number;challenge?:{message:string;nonce:string;address:Address;origin:string;expires:number};recent:number[]};
type Configuration={contract:Address;deployment:Hex;deployedBlock:string;lastBlock:string;deployer:Address};
export type State={game:KeyboardGame;sessions:Record<string,Auth>;quotes:Record<string,Secret>;config?:Configuration;syncPending?:boolean;migrated?:Record<string,boolean>;legacyBalances?:Record<string,{balance:number;lastClaim:number}>};
type Root=Game&{keyboard?:State};
export type TestnetView=KeyboardView&{testnet:TestnetStatus;actionReceipt?:PackReceipt};
export type TestnetOptions={client?:TestnetClient;oracleKey?:Hex;allowedOrigins?:string[];setupEnabled?:boolean;adminAddress?:Address;initialDeployment?:Hex;now?:()=>number};
const zero='0x0000000000000000000000000000000000000000';
function state(g:Game){return (g as Root).keyboard??=((g as Root).keyboard={game:newKeyboardGame(),sessions:{},quotes:{}});}
function player(s:State,wallet:string,now:number){return keyboardPlayer(s.game,wallet,now);}
function walletOf(auth:Auth,now:number){return auth.expires&&auth.expires>now?auth.wallet:undefined;}
export async function verifyKeyboard(client:TestnetClient,address:Address,oracle:Address){
 if(await client.getChainId()!==84532)throw new Error('RPC is not Base Sepolia');
 const code=await client.getCode({address});if(!code||keccak256(code)!==artifact.runtimeHash)throw new UserError('The deployed bytecode does not match the tested CTRL Aquarium contract.');
 const actual=await client.readContract({address,abi:artifact.abi,functionName:'oracle'}) as Address;
 if(actual.toLowerCase()!==oracle.toLowerCase())throw new UserError('This contract uses a different outcome signer.');
}

// Only confirmed, ordered events change credits or the world. Hidden command plans
// are durable before the purchase signature is returned.
export function project(s:State,logs:{eventName:string;args:Record<string,unknown>;transactionHash:Hex;logIndex:number;at:number}[]){
 for(const event of logs){const a=event.args,wallet=String(a.player??'').toLowerCase();if(!isAddress(wallet))continue;const p=player(s,wallet,event.at);
  if(event.eventName==='CreditsClaimed'){p.balance+=Number(a.amount);p.refills.push(event.at);}
  if(event.eventName==='CreditsMigrated'){(s.migrated??={})[wallet]=true;p.balance+=Number(a.amount);if(Number(a.previousClaim))p.refills.push(Number(a.previousClaim)*1000);}
  if(event.eventName==='TurnBought'){const secret=s.quotes[String(a.id)];if(!secret||secret.quote.buyer.toLowerCase()!==wallet)throw new Error('Missing private paid-command record');secret.boughtAt=event.at;secret.buyHash=event.transactionHash;p.balance-=Number(a.cost);p.purchases.push(event.at);if(secret.quote.flags&2){p.openings.push(event.at);s.game.keyboardMeta[Number(a.habitat)===0?'public':'whale'].contributions[p.id]--;}if(secret.quote.flags&8)p.holes.push(event.at);s.game.keyboardMeta[Number(a.habitat)===0?'public':'whale'].pending=secret.quote.id;}
  if(event.eventName==='TurnExecuted'){const secret=s.quotes[String(a.id)];if(!secret||secret.plan.payout!==Number(a.payout)||secret.nonce.toLowerCase()!==String(a.nonce).toLowerCase())throw new Error('Committed command reveal mismatch');projectKeyboard(s.game,secret,event.transactionHash,event.at,Number(a.poolShare),Number(a.devShare),Number(a.nextSeed));if(s.config?.deployer)player(s,s.config.deployer,event.at).balance+=Number(a.devShare);}
  if(event.eventName==='TurnExpired'){const secret=s.quotes[String(a.id)];if(!secret)throw new Error('Missing expired command');secret.refundedAt=event.at;const h=Number(a.habitat)===0?'public':'whale',m=s.game.keyboardMeta[h];delete m.pending;m.sequence=Number(a.sequence);s.game.habitats[h].remaining+=Number(a.poolShare);s.game.habitats[h].gross+=Number(a.devShare);s.game.habitats[h].sales+=Number(a.cost);if(s.config?.deployer)player(s,s.config.deployer,event.at).balance+=Number(a.devShare);}

 }
}

// Cursor updates and visual/accounting events commit atomically. Bounded catch-up
// is visible to users and disables purchases until it is complete.
export async function syncKeyboard(store:GameStore,client:TestnetClient){
 const config=await store.transaction(g=>structuredClone(state(g).config));if(!config)return;
 const latest=await client.getBlockNumber({cacheTime:0}),start=BigInt(config.lastBlock)+1n;
 if(start>latest){await store.transaction(g=>{const s=state(g);if(s.config?.lastBlock===config.lastBlock&&s.syncPending)s.syncPending=false;});return;}
 const {end,logs:raw}=await readKeyboardLogs(client,config.contract,start,latest);
 const timestamps=new Map<string,number>();
 for(const log of raw)if(log.blockNumber&&!timestamps.has(String(log.blockNumber))){const block=await client.getBlock({blockNumber:log.blockNumber});timestamps.set(String(log.blockNumber),Number(block.timestamp)*1000);}
 const logs=raw.flatMap(log=>{try{const decoded=decodeEventLog({abi:artifact.abi,data:log.data,topics:log.topics});if(!['CreditsClaimed','CreditsMigrated','TurnBought','TurnExecuted','TurnExpired'].includes(decoded.eventName??''))return [];return [{eventName:decoded.eventName!,args:Object.fromEntries(Object.entries(decoded.args??{})),transactionHash:log.transactionHash!,logIndex:log.logIndex!,blockNumber:Number(log.blockNumber),at:timestamps.get(String(log.blockNumber))!}];}catch{return [];}}).sort((a,b)=>a.blockNumber-b.blockNumber||a.logIndex-b.logIndex);
 await store.transaction(g=>{const s=state(g);if(s.config?.lastBlock!==config.lastBlock)return;project(s,logs);s.config.lastBlock=String(end);s.syncPending=end<latest;});
 return {latest,end};
}

export async function keyboardApi(request:Request,store:GameStore,options:TestnetOptions={}){
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
  const supplied=request.headers.get('cookie')?.match(/(?:^|;\s*)ctrl_keyboard=([a-f0-9]{64})(?:;|$)/)?.[1];
  const token=supplied??Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,'0')).join(''),sessionId=await digest(token);
  if(!supplied)headers['Set-Cookie']=`ctrl_keyboard=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${url.protocol==='https:'?'; Secure':''}`;
  if(request.method==='GET'){
   // One read, zero writes. Derived timers/scenery run on a detached snapshot;
   // viewing a page must not persist presence, sessions or an index cursor.
   const snapshot=await store.transaction(g=>structuredClone(g)),s=state(snapshot),at=now();
   const signedWallet=walletOf(s.sessions[sessionId]??{recent:[]},at),p=player(s,signedWallet??('watch-'+sessionId),at);
   tickKeyboard(s.game,at);const result=keyboardView(s.game,signedWallet??('watch-'+sessionId),h,at,s.quotes),lastClaim=p.refills.at(-1),claimAt=lastClaim?lastClaim+86400000:0;
   const old=s.legacyBalances?.[signedWallet?.toLowerCase()??''];if(old&&!s.migrated?.[signedWallet!.toLowerCase()]){result.me.balance=old.balance;result.keyboard.migrationRequired=old.balance>0||old.lastClaim>0;result.keyboard.legacyBalance=old.balance;}
   const effectiveClaim=old&&!s.migrated?.[signedWallet!.toLowerCase()]&&old.lastClaim?old.lastClaim+86400000:claimAt;
   result.limits.refillAt=effectiveClaim;result.limits.refillsLeft=signedWallet&&effectiveClaim<=at?1:0;
   if(!signedWallet){result.limits.purchasesLeft=0;result.limits.opensLeft=0;result.limits.blackholesLeft=0;}
   const oracle=options.oracleKey?privateKeyToAccount(options.oracleKey).address:undefined;
   const testnet:TestnetStatus={chainId:84532,wallet:signedWallet,contract:s.config?.contract,oracle,canDeploy:!!oracle&&options.setupEnabled!==false&&!s.config&&(!options.adminAddress||signedWallet?.toLowerCase()===options.adminAddress.toLowerCase()),configured:!!s.config,claimAt:effectiveClaim,holeAt:p.holes.length?p.holes.at(-1)!+86400000:0,block:s.config?.lastBlock,syncing:s.syncPending??false};
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
    await verifyKeyboard(client,deployment.contractAddress,oracle.address);
    await store.transaction(g=>{const s=state(g);s.config??={contract:deployment.contractAddress!,deployment:options.initialDeployment!,deployedBlock:String(deployment.blockNumber),lastBlock:String(deployment.blockNumber-1n),deployer:deployment.from};});
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
   const address=receipt.contractAddress;await verifyKeyboard(client,address,oracle.address);
   await store.transaction(g=>{const s=state(g);if(s.config&&s.config.contract.toLowerCase()!==address.toLowerCase())throw new UserError('This server already has a testnet deployment.');s.config??={contract:address,deployment:hash,deployedBlock:String(receipt.blockNumber),lastBlock:String(receipt.blockNumber-1n),deployer:receipt.from};});
  }
  let sync;
  for(let i=0;i<(body.type==='sync'?8:1);i++){sync=await syncKeyboard(store,client);if(!sync||sync.end>=sync.latest)break;}
  const syncing=!!sync&&sync.end<sync.latest;
  auth=await store.transaction(g=>structuredClone(state(g).sessions[sessionId]));const signedWallet=walletOf(auth,now());
  const config=await store.transaction(g=>structuredClone(state(g).config));
  if(body.type==='quote'){
   if(!signedWallet||!config||!oracle||syncing)throw new UserError('Connect and synchronize Base Sepolia first.');
   const prompt=String(body.prompt??'').trim(),requestId=String(body.requestId);if(!/^[a-zA-Z0-9-]{12,80}$/.test(requestId))throw new UserError('Request ID required.');
   const result=await store.transaction(async g=>{const s=state(g),prior=Object.values(s.quotes).find(q=>q.quote.buyer.toLowerCase()===signedWallet.toLowerCase()&&q.requestId===requestId);
    if(prior){if(prior.plan.prompt!==prompt||prior.quote.habitat!==(h==='public'?0:1))throw new UserError('Request ID reused for another command.');return {quote:prior.quote,signature:prior.signature};}
    tickKeyboard(s.game,now());const p=player(s,signedWallet,now()),view=keyboardView(s.game,signedWallet,h,now(),s.quotes);
    if(!view.keyboard.turnsLeft)throw new UserError('Daily limit: twenty settled turns across both aquariums.',429);
    const id=keccak256(new TextEncoder().encode(crypto.randomUUID())),nonce=keccak256(new TextEncoder().encode(crypto.randomUUID()+crypto.randomUUID()));
    const plan=planCommand(s.game,p.id,h,prompt,now(),id);
    if((plan.flags&2)&&!view.keyboard.rewardsLeft)throw new UserError('Daily limit: five reward commands across both aquariums.',429);
    if((plan.flags&8)&&!view.limits.blackholesLeft)throw new UserError('One black hole per wallet per rolling 24 hours.',429);
    const outstanding=Object.values(s.quotes).filter(q=>!q.boughtAt&&q.quote.buyer.toLowerCase()===signedWallet.toLowerCase()&&Number(q.quote.deadline)*1000>now());if(outstanding.length>=6)throw new UserError('Too many pending quotes. Wait two minutes.',429);
    const quote:KeyboardQuote={buyer:signedWallet,id,habitat:h==='public'?0:1,sequence:String(view.keyboard.sequence),round:String(view.round.round),actionHash:keccak256(new TextEncoder().encode(JSON.stringify({prompt,world:plan.world,flags:plan.flags}))),commitment:testnetCommitment(id,plan.payout,nonce),flags:plan.flags,targets:plan.targetIds.length,deadline:String(Math.floor(now()/1000)+120)};
    const signature=await oracle.signTypedData({domain:keyboardDomain(config.contract),types:keyboardTypes,primaryType:'Keyboard',message:{...quote,sequence:BigInt(quote.sequence),round:BigInt(quote.round),deadline:BigInt(quote.deadline)}});
    s.quotes[id]={quote,signature,nonce,plan,requestId,issuedAt:now()};
    // Delete only unused expired quotes; paid commitments are permanent recovery data.
    for(const [key,q] of Object.entries(s.quotes))if(!q.boughtAt&&Number(q.quote.deadline)*1000<now()-3600000)delete s.quotes[key];
    return {quote,signature};
   });return Response.json(result,{headers});
  }
  if(body.type==='reveal'){
   if(!signedWallet||!config||syncing)throw new UserError('Connect and synchronize your wallet first.',401);
   const proof=await store.transaction(g=>{const s=state(g),secret=s.quotes[String(body.id)];if(!secret||secret.quote.buyer.toLowerCase()!==signedWallet.toLowerCase()||!secret.boughtAt||secret.executedAt||secret.refundedAt)throw new UserError('No unspent paid turn belongs to this wallet.',403);return {id:secret.quote.id,payout:secret.plan.payout,nonce:secret.nonce};});return Response.json({proof},{headers});
  }
  if(body.type==='rename'){
   if(!signedWallet)throw new UserError('Connect your wallet first.',401);const name=String(body.name??'').trim();if(!/^[\p{L}\p{N} _.-]{2,20}$/u.test(name))throw new UserError('Use 2–20 letters, numbers, spaces, dots, underscores or dashes.');await store.transaction(g=>{player(state(g),signedWallet,now()).name=name;});
  }else if(body.type&&!['wallet-verify','wallet-disconnect','setup','sync'].includes(String(body.type)))throw new UserError('Use a paid keyboard turn. No fish purchases or free world mutations are accepted.');
  if(signedWallet&&config){
   const imported=await store.transaction(g=>!!state(g).migrated?.[signedWallet.toLowerCase()]);
   if(!imported){const legacy='0x06be0d3e30f135a3fd9a18a9e0476ed077fb5c15' as Address;const legacyAbi=[{type:'function',name:'balanceOf',stateMutability:'view',inputs:[{name:'who',type:'address'}],outputs:[{type:'uint256'}]},{type:'function',name:'lastClaim',stateMutability:'view',inputs:[{name:'who',type:'address'}],outputs:[{type:'uint64'}]}] as const;
    // Tests and fresh deployments may deliberately have no legacy contract.
    const source=await client.readContract({address:config.contract,abi:artifact.abi,functionName:'legacy'}) as Address;
    if(source!==zero){const [balance,lastClaim]=await Promise.all([client.readContract({address:source,abi:legacyAbi,functionName:'balanceOf',args:[signedWallet]}),client.readContract({address:source,abi:legacyAbi,functionName:'lastClaim',args:[signedWallet]})]);await store.transaction(g=>{(state(g).legacyBalances??={})[signedWallet.toLowerCase()]={balance:Number(balance),lastClaim:Number(lastClaim)*1000};});}void legacy;
   }
  }
  const payload=await store.transaction(g=>{
   const s=state(g),p=player(s,signedWallet??('watch-'+sessionId),now());p.seenAt=now();p.habitat=h;tickKeyboard(s.game,now());
   const result=keyboardView(s.game,signedWallet??('watch-'+sessionId),h,now(),s.quotes);if(!signedWallet){result.limits.purchasesLeft=0;result.limits.opensLeft=0;result.limits.blackholesLeft=0;result.limits.refillsLeft=0;}
   const old=s.legacyBalances?.[signedWallet?.toLowerCase()??''];if(old&&!s.migrated?.[signedWallet!.toLowerCase()]){result.me.balance=old.balance;result.keyboard.migrationRequired=old.balance>0||old.lastClaim>0;result.keyboard.legacyBalance=old.balance;if(old.lastClaim){result.limits.refillAt=old.lastClaim+86400000;result.limits.refillsLeft=result.limits.refillAt<=now()?1:0;}}
   const testnet:TestnetStatus={chainId:84532,wallet:signedWallet,contract:config?.contract,oracle:oracle?.address,canDeploy:!!oracle&&options.setupEnabled!==false&&!config&&(!options.adminAddress||signedWallet?.toLowerCase()===options.adminAddress.toLowerCase()),configured:!!config,claimAt:result.limits.refillAt,holeAt:p.holes.length?p.holes.at(-1)!+86400000:0,block:config?.lastBlock,syncing};
   if(body.type==='sync'&&s.game.habitats[h].effect?.id===body.hash)result.lastEffect=s.game.habitats[h].effect;return {...result,testnet,actionReceipt:body.type==='sync'&&typeof body.hash==='string'?p.receipts.find(r=>r.id===body.hash):undefined};
  });return Response.json(payload,{headers});
 }catch(error){const known=error instanceof UserError,rpc=rpcFailure(error);if(!known)console.error('CTRL keyboard API:',error instanceof Error?error.message:'Service unavailable');return Response.json({error:known?error.message:rpc?'Base Sepolia RPC is temporarily busy. Confirmed credits remain on chain. Use Continue synchronizing or Recover transaction; do not submit the transaction again.':'The shared state could not be loaded or updated. Confirmed credits remain on chain. Reconnect to recover; do not submit the transaction again.',...(!known?{code:rpc?'RPC_UNAVAILABLE':'STATE_UNAVAILABLE'}:{})},{status:known?error.status:503,headers});}
}
