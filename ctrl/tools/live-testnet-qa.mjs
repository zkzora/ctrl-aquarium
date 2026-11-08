// Uses a fresh disposable test wallet. Only an optional bounded test-ETH funding
// transaction uses the dedicated admin key from stdin; it is never persisted.
import {readFile,writeFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createPublicClient,createWalletClient,http,parseEther} from 'viem';
import {generatePrivateKey,privateKeyToAccount} from 'viem/accounts';
import {baseSepolia} from 'viem/chains';
import {parseSiweMessage} from 'viem/siwe';
import {testnetCommitment} from '../lib/testnet-config.ts';
const origin=process.argv[2]??'https://ctrl-aquarium.vercel.app';
if(origin!=='https://ctrl-aquarium.vercel.app')throw new Error('This QA script is scoped to the authorized CTRL deployment');
const artifact=JSON.parse(await readFile('lib/aquarium.generated.json','utf8')),deployment=JSON.parse(await readFile('.ctrl-data/testnet-deployment.json','utf8'));
const client=createPublicClient({chain:baseSepolia,transport:http('https://sepolia.base.org',{timeout:15000})});assert.equal(await client.getChainId(),84532);
let key;try{key=(await readFile('.ctrl-data/live-qa.key','utf8')).trim();}catch(e){if(e.code!=='ENOENT')throw e;key=generatePrivateKey();await writeFile('.ctrl-data/live-qa.key',key,{flag:'wx',mode:0o600});}
const account=privateKeyToAccount(key),wallet=createWalletClient({account,chain:baseSepolia,transport:http('https://sepolia.base.org')});key='';
const transactions={};
async function confirmed(hash){const r=await client.waitForTransactionReceipt({hash,confirmations:1,timeout:120000});assert.equal(r.status,'success');return r;}
if(await client.getBalance({address:account.address})<parseEther('.00005')){
 if(process.stdin.isTTY)process.stdin.setRawMode(true);console.log('Ready for testnet-only funding key on stdin (not echoed).');
 let raw='';for await(const part of process.stdin){raw+=part.toString();if(/[\r\n]/.test(raw))break;}
 if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();assert.match(raw.trim(),/^0x[0-9a-fA-F]{64}$/);
 const admin=privateKeyToAccount(raw.trim());raw='';assert.equal(admin.address.toLowerCase(),deployment.admin.toLowerCase());
 const funder=createWalletClient({account:admin,chain:baseSepolia,transport:http('https://sepolia.base.org')});
 const hash=await funder.sendTransaction({to:account.address,value:parseEther('.0002')});await confirmed(hash);transactions.funding=hash;
 console.log('Funded isolated QA wallet with 0.0002 test ETH.');
}
let cookie;
async function api(body){const r=await fetch(origin+'/api/testnet?habitat=public',{method:body?'POST':'GET',headers:{...(body?{origin,'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify({requestId:crypto.randomUUID(),...body}):undefined,signal:AbortSignal.timeout(59000)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];const data=await r.json();assert.equal(r.status,200,JSON.stringify(data));return data;}
let initial=await api();for(let i=0;initial.testnet.syncing&&i<20;i++)initial=await api();assert.equal(initial.testnet.syncing,false);
const challenge=await api({type:'wallet-challenge',address:account.address}),siwe=parseSiweMessage(challenge.message);assert.equal(siwe.domain,new URL(origin).host);assert.equal(siwe.chainId,84532);assert.equal(siwe.address.toLowerCase(),account.address.toLowerCase());
let view=await api({type:'wallet-verify',signature:await account.signMessage({message:challenge.message})});console.log('PASS hosted wallet signature and durable account');
if(view.me.balance===0){transactions.claim=await wallet.writeContract({address:deployment.contract,abi:artifact.abi,functionName:'claimCredits'});await confirmed(transactions.claim);view=await api({type:'sync',hash:transactions.claim});assert.equal(view.me.balance,1500);console.log('PASS live claim: 1,500 tCTRL');}
if(view.packs.length||view.receipts.length)throw new Error('QA wallet already has game history; inspect the saved evidence instead of repeating purchases.');
const quote=await api({type:'quote',kind:'shark'});assert.equal('payout'in quote,false);assert.equal('nonce'in quote,false);
transactions.purchase=await wallet.writeContract({address:deployment.contract,abi:artifact.abi,functionName:'buyPack',args:[{...quote.quote,deadline:BigInt(quote.quote.deadline)},quote.signature]});await confirmed(transactions.purchase);view=await api({type:'sync',hash:transactions.purchase});
assert.equal(view.me.balance,1400);assert.equal(view.packs.length,1);assert.equal(view.packs[0].commitment,quote.quote.commitment);assert.equal(view.round.reserved,320);console.log('PASS live owned purchase and maximum backing');
const wait=Math.max(0,view.packs[0].maturesAt-Date.now()+2200);assert.ok(wait<26000);await new Promise(resolve=>setTimeout(resolve,wait));
const {proofs}=await api({type:'reveal',packIds:[quote.quote.packId]}),proof=proofs[0];assert.equal(testnetCommitment(proof.id,proof.payout,proof.nonce),quote.quote.commitment);
transactions.open=await wallet.writeContract({address:deployment.contract,abi:artifact.abi,functionName:'openPack',args:[proof.id,BigInt(proof.payout),proof.nonce]});await confirmed(transactions.open);view=await api({type:'sync',hash:transactions.open});
assert.equal(view.me.balance,1400+proof.payout);assert.equal(view.packs.length,0);assert.equal(view.round.reserved,0);assert.equal(view.actionReceipt.credits,proof.payout);assert.equal(view.limits.opensLeft,2);assert.equal(view.limits.purchasesLeft,2);
const actual=await client.readContract({address:deployment.contract,abi:artifact.abi,functionName:'balanceOf',args:[account.address]});assert.equal(Number(actual),view.me.balance);
const report={verifiedAt:new Date().toISOString(),origin,chainId:84532,contract:deployment.contract,qaWallet:account.address,transactions,payout:proof.payout,balance:view.me.balance,net:proof.payout-100,passed:true};
await writeFile('.ctrl-data/live-qa-evidence.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
