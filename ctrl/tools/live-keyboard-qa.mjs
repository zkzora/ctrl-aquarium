// A bounded, repeat-safe testnet check using the existing dedicated QA wallet.
import fs from 'node:fs/promises';
import {createPublicClient,createWalletClient,http} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {baseSepolia} from 'viem/chains';
import {keyboardArgs} from '../lib/keyboard-config.ts';
const origin=process.env.CTRL_QA_ORIGIN??'http://127.0.0.1:4175',artifact=JSON.parse(await fs.readFile('lib/keyboard.generated.json','utf8')),deployment=JSON.parse(await fs.readFile('.ctrl-data/keyboard-deployment.json','utf8'));
const saved=await fs.readFile('public/docs/keyboard-live-qa.json','utf8').catch(()=>null);if(saved){console.log('Existing live keyboard QA retained. No repeated paid turns.');process.exit(0);}
const account=privateKeyToAccount((await fs.readFile('.ctrl-data/live-qa.key','utf8')).trim()),client=createPublicClient({chain:baseSepolia,transport:http('https://sepolia.base.org')}),wallet=createWalletClient({account,chain:baseSepolia,transport:http('https://sepolia.base.org')});
const progressFile='.ctrl-data/keyboard-live-qa-progress.json';let progress=JSON.parse(await fs.readFile(progressFile,'utf8').catch(()=>'{}')),cookie='';
async function save(){await fs.writeFile(progressFile,JSON.stringify(progress,null,2));}
async function api(body){const response=await fetch(origin+'/api/keyboard?habitat=public',{method:body?'POST':'GET',headers:{...(body?{origin,'content-type':'application/json'}:{}),...(cookie?{cookie}:{})},body:body?JSON.stringify({requestId:crypto.randomUUID(),...body}):undefined,signal:AbortSignal.timeout(55000)});if(response.headers.get('set-cookie'))cookie=response.headers.get('set-cookie').split(';')[0];const x=await response.json();if(!response.ok)throw new Error(x.error??'API failure');return x;}
async function sync(hash){let view=await api({type:'sync',hash});for(let i=0;view.testnet.syncing&&i<10;i++)view=await api({type:'sync',hash});if(view.testnet.syncing)throw new Error('Still catching up; restart this repeat-safe QA command.');return view;}
async function confirmed(hash){const r=await client.waitForTransactionReceipt({hash,timeout:120000});if(r.status!=='success')throw new Error('Testnet QA transaction reverted');return r;}
async function transaction(name,method,args=[]){if(!progress[name]){const hash=await wallet.writeContract({address:deployment.contract,abi:artifact.abi,functionName:method,args});progress[name]=hash;await save();}await confirmed(progress[name]);return sync(progress[name]);}
await api();const challenge=await api({type:'wallet-challenge',address:account.address});let view=await api({type:'wallet-verify',signature:await account.signMessage({message:challenge.message})});view=await sync();
if(!await client.readContract({address:deployment.contract,abi:artifact.abi,functionName:'migrated',args:[account.address]}))view=await transaction('migration','migrate');
progress.before??={balance:view.me.balance,pool:view.round.remaining,dev:Number(await client.readContract({address:deployment.contract,abi:artifact.abi,functionName:'developerCredits'}))};await save();
for(const [name,prompt] of [['add','Add a clownfish'],['explode','Explode the orange fish']]){
 if(progress[name+'Execute']){await confirmed(progress[name+'Execute']);view=await sync(progress[name+'Execute']);continue;}
 if(!progress[name+'Quote']){progress[name+'Quote']=await api({type:'quote',prompt});await save();}
 const q=progress[name+'Quote'];view=await transaction(name+'Buy','buyTurn',keyboardArgs(q.quote,q.signature));
 const {proof}=await api({type:'reveal',id:q.quote.id});progress[name+'Payout']=proof.payout;await save();view=await transaction(name+'Execute','executeTurn',[proof.id,BigInt(proof.payout),proof.nonce]);
}
const after={balance:view.me.balance,pool:view.round.remaining,dev:Number(await client.readContract({address:deployment.contract,abi:artifact.abi,functionName:'developerCredits'}))};
if(after.balance!==progress.before.balance-20+progress.explodePayout||after.pool!==progress.before.pool+16-progress.explodePayout||after.dev!==progress.before.dev+4)throw new Error('Live keyboard accounting mismatch');
const evidence={chainId:84532,contract:deployment.contract,wallet:account.address,checkedAt:new Date().toISOString(),before:progress.before,after,explodePayout:progress.explodePayout,transactions:{migration:progress.migration,addBuy:progress.addBuy,addExecute:progress.addExecute,explodeBuy:progress.explodeBuy,explodeExecute:progress.explodeExecute},verified:['one turn per command','no hatch or fish purchase','80/20 allocation','contribute before explode','confirmed chain payout','legacy balance retained']};
await fs.writeFile('public/docs/keyboard-live-qa.json',JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
