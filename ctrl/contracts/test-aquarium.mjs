import ganache from 'ganache';
import assert from 'node:assert/strict';
import {createPublicClient,createWalletClient,custom,keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import fs from 'node:fs';
import {testnetApi,verifyAquarium} from '../server/testnet-api.ts';
import {newGame} from '../lib/pack-game.ts';
import {baseSepolia} from 'viem/chains';
const artifact=JSON.parse(fs.readFileSync('lib/aquarium.generated.json','utf8'));
const provider=ganache.provider({logging:{quiet:true},chain:{chainId:84532,hardfork:'shanghai'},wallet:{totalAccounts:4}});
const accounts=Object.values(provider.getInitialAccounts()).map(a=>privateKeyToAccount(a.secretKey));
const wallets=accounts.map(account=>createWalletClient({account,chain:baseSepolia,transport:custom(provider)}));
const client=createPublicClient({chain:baseSepolia,transport:custom(provider)}),key=Object.values(provider.getInitialAccounts())[3].secretKey;
let game=newGame(),serial=Promise.resolve(),checks=0,clockOffset=0;
const store={transaction(fn){const task=serial.then(async()=>{const candidate=structuredClone(game),result=await fn(candidate);game=candidate;return result});serial=task.catch(()=>{});return task}};
const cookies=[];const origin='http://localhost:4174';
async function api(i,body,h='public'){
 const response=await testnetApi(new Request(origin+'/api/testnet?habitat='+h,{method:body?'POST':'GET',headers:{...(body?{origin,'content-type':'application/json'}:{}),...(cookies[i]?{cookie:cookies[i]}:{})},body:body?JSON.stringify({...body,requestId:body.requestId??crypto.randomUUID()}):undefined}),store,{client,oracleKey:key,now:()=>Date.now()+clockOffset});
 if(response.headers.get('set-cookie'))cookies[i]=response.headers.get('set-cookie').split(';')[0];
 return {status:response.status,data:await response.json()};
}
async function good(name,fn){await fn();checks++;console.log('PASS '+name)}
async function confirmed(hash){const r=await client.waitForTransactionReceipt({hash});assert.equal(r.status,'success');return r;}
let contract;
async function write(i,functionName,args=[]){const receipt=await confirmed(await wallets[i].writeContract({address:contract,abi:artifact.abi,functionName,args}));await api(i,{type:'sync',hash:receipt.transactionHash});return receipt;}
async function quote(i,kind='clownfish',h='public'){const r=await api(i,{type:'quote',kind},h);assert.equal(r.status,200,JSON.stringify(r.data));return r.data;}
async function buy(i,q){return write(i,'buyPack',[{...q.quote,deadline:BigInt(q.quote.deadline)},q.signature]);}
try{
 const deployed=await confirmed(await wallets[0].deployContract({abi:artifact.abi,bytecode:artifact.bytecode,args:[accounts[3].address]}));contract=deployed.contractAddress;
 await good('deployed bytecode is verified and signer matches',async()=>{assert.equal(keccak256(await client.getCode({address:contract})),artifact.runtimeHash);await verifyAquarium(client,contract,accounts[3].address);});
 await good('SIWE connects three independent wallets and consumes challenges once',async()=>{
  for(let i=0;i<3;i++){await api(i);const challenge=await api(i,{type:'wallet-challenge',address:accounts[i].address});assert.equal(challenge.status,200);const signature=await accounts[i].signMessage({message:challenge.data.message});const signed=await api(i,{type:'wallet-verify',signature});assert.equal(signed.status,200);assert.equal(signed.data.testnet.wallet,accounts[i].address.toLowerCase());assert.equal((await api(i,{type:'wallet-verify',signature})).status,401);}
 });
 await good('administrator attaches a genuine deployment',async()=>{const setup=await api(0,{type:'setup',hash:deployed.transactionHash});assert.equal(setup.status,200,JSON.stringify(setup.data));assert.equal(setup.data.testnet.contract.toLowerCase(),contract.toLowerCase());});
 await good('twenty ordinary refreshes leave durable state byte-for-byte unchanged',async()=>{
  const before=JSON.stringify(game);for(let i=0;i<20;i++){const r=await api(0);assert.equal(r.status,200);}assert.equal(JSON.stringify(game),before);
 });
 await good('claim creates 1,500 on-chain test credits per wallet, with daily cooldown',async()=>{
  for(let i=0;i<3;i++){await write(i,'claimCredits');const r=await api(i);assert.equal(r.status,200);assert.equal(r.data.me.balance,1500);}
  await assert.rejects(()=>write(0,'claimCredits'));await assert.rejects(()=>write(0,'transfer',[accounts[1].address,1n]));
 });
 let a,b;
 await good('signed purchases bind buyer and lock maximum treasury liability',async()=>{
  a=await quote(0,'shark');b=await quote(1);await assert.rejects(()=>buy(2,a));await buy(0,a);await buy(1,b);
  const v=(await api(0)).data;assert.equal(v.me.balance,1400);assert.equal(v.round.reserved,640);assert.equal(v.packs.length,1);assert.equal('payout' in v.packs[0],false);assert.equal((await api(1)).data.packs.length,1);
 });
 await good('hatching and reveal ownership are server- and contract-enforced',async()=>{
  assert.equal((await api(0,{type:'reveal',packIds:[a.quote.packId]})).status,403);
  assert.equal((await api(1,{type:'reveal',packIds:[a.quote.packId]})).status,403);
  clockOffset+=21000;await provider.request({method:'evm_increaseTime',params:[21]});await provider.request({method:'evm_mine',params:[]});
 });
 let proof;
 await good('black hole opens only caller-owned packs and emits verifiable settlement',async()=>{
  proof=(await api(0,{type:'reveal',packIds:[a.quote.packId]})).data.proofs[0];
  await assert.rejects(()=>write(1,'openPack',[proof.id,BigInt(proof.payout),proof.nonce]));
  const tx=await write(0,'blackHole',[0,1n,[proof.id],[BigInt(proof.payout)],[proof.nonce]]);
  const v=await api(0,{type:'sync',hash:tx.transactionHash});assert.equal(v.status,200,JSON.stringify(v.data));assert.equal(v.data.actionReceipt.credits,proof.payout);assert.equal(v.data.me.balance,1400+proof.payout-30);assert.equal(v.data.round.round,2);assert.equal(v.data.round.reserved,320);assert.equal(v.data.packs.length,0);
  const bob=(await api(1)).data;assert.equal(bob.packs.length,1);assert.equal(bob.me.balance,1400);
 });
 await good('repeat opening fails and another owner can still settle a swallowed fish',async()=>{
  await assert.rejects(()=>write(0,'openPack',[proof.id,BigInt(proof.payout),proof.nonce]));
  const bob=(await api(1,{type:'reveal',packIds:[b.quote.packId]})).data.proofs[0];await write(1,'openPack',[bob.id,BigInt(bob.payout),bob.nonce]);assert.equal((await api(1)).data.me.balance,1400+bob.payout);
 });
 await good('three Whale purchases exhaust shared daily quota and a batch counts three openings',async()=>{
  const quotes=[];for(let i=0;i<3;i++){const q=await quote(2,'whale','whale');quotes.push(q);await buy(2,q);}
  let v=(await api(2,undefined,'whale')).data;assert.equal(v.me.balance,0);assert.equal(v.limits.purchasesLeft,0);assert.equal(v.packs.length,3);assert.equal(v.round.reserved,4800);
  const fourth=await quote(2,'clownfish','public');await assert.rejects(()=>buy(2,fourth));
  // The black-hole fee requires an existing balance; regular opening is free.
  clockOffset+=21000;await provider.request({method:'evm_increaseTime',params:[21]});await provider.request({method:'evm_mine',params:[]});
  const proofs=(await api(2,{type:'reveal',packIds:quotes.map(q=>q.quote.packId)},'whale')).data.proofs;
  const first=proofs[0];await write(2,'openPack',[first.id,BigInt(first.payout),first.nonce]);await api(2);
  const remaining=proofs.slice(1);await write(2,'blackHole',[1,1n,remaining.map(p=>p.id),remaining.map(p=>BigInt(p.payout)),remaining.map(p=>p.nonce)]);
  v=(await api(2,undefined,'whale')).data;assert.equal(v.limits.opensLeft,0);assert.equal(v.limits.blackholesLeft,0);assert.equal(v.packs.length,0);assert.equal(v.round.reserved,0);
 });
 await good('wallet reconnect restores the same account without another faucet credit',async()=>{
  const balance=(await api(0)).data.me.balance;await api(0,{type:'wallet-disconnect'});assert.equal((await api(0)).data.testnet.wallet,undefined);
  const c=await api(0,{type:'wallet-challenge',address:accounts[0].address});await api(0,{type:'wallet-verify',signature:await accounts[0].signMessage({message:c.data.message})});assert.equal((await api(0)).data.me.balance,balance);
 });
 console.log(JSON.stringify({checks,network:'local EVM using Base Sepolia chain ID',liveDeployment:false}));
}finally{await provider.disconnect();}
