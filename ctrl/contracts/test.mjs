import ganache from 'ganache';
import { createPublicClient,createWalletClient,custom,parseEther,getContract,defineChain } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import fs from 'node:fs';
import assert from 'node:assert/strict';
const artifacts=JSON.parse(fs.readFileSync('lib/contracts.generated.json','utf8'));
const provider=ganache.provider({logging:{quiet:true},chain:{chainId:31337,hardfork:'shanghai'},wallet:{totalAccounts:3}});
const chain=defineChain({id:31337,name:'Local CTRL test',nativeCurrency:{name:'ETH',symbol:'ETH',decimals:18},rpcUrls:{default:{http:['http://localhost']}}});
const accounts=Object.values(provider.getInitialAccounts()).map(x=>privateKeyToAccount(x.secretKey));
const clients=accounts.map(account=>createWalletClient({account,chain,transport:custom(provider)}));
const pub=createPublicClient({chain,transport:custom(provider)});
let checks=0;
async function good(label,fn){await fn();checks++;console.log(`PASS ${label}`)}
async function receipt(hash){const r=await pub.waitForTransactionReceipt({hash});assert.equal(r.status,'success');return r}
async function fails(fn){await assert.rejects(fn)}
try {
 const tr=await receipt(await clients[0].deployContract({...artifacts.CTRLTestToken}));const token=tr.contractAddress;
 const cr=await receipt(await clients[0].deployContract({...artifacts.CTRLTurns,args:[token]}));const turns=cr.contractAddress;
 const tk=getContract({address:token,abi:artifacts.CTRLTestToken.abi,client:{public:pub,wallet:clients[0]}});
 const ct=getContract({address:turns,abi:artifacts.CTRLTurns.abi,client:{public:pub,wallet:clients[0]}});
 await good('faucet mints 100 valueless test tokens',async()=>{await receipt(await tk.write.faucet());assert.equal(await tk.read.balanceOf([accounts[0].address]),parseEther('100'))});
 await good('repeat faucet is rejected',()=>fails(()=>tk.write.faucet()));
 await good('booking without approval is rejected',()=>fails(()=>ct.write.bookTurn()));
 await receipt(await tk.write.approve([turns,parseEther('10')]));
 await good('booking escrows exactly 10 tokens',async()=>{await receipt(await ct.write.bookTurn());assert.equal(await tk.read.balanceOf([turns]),parseEther('10'));assert.equal(await tk.read.balanceOf([accounts[0].address]),parseEther('90'))});
 await good('duplicate active booking is rejected',()=>fails(()=>ct.write.bookTurn()));
 await good('another wallet cannot activate someone else ticket',()=>fails(()=>clients[1].writeContract({address:turns,abi:artifacts.CTRLTurns.abi,functionName:'activate',args:[1n]})));
 await good('activation burns the fee',async()=>{await receipt(await ct.write.activate([1n]));assert.equal(await tk.read.totalSupply(),parseEther('90'));assert.equal(await tk.read.balanceOf([turns]),0n)});
 await good('activated ticket cannot refund or activate twice',async()=>{await fails(()=>ct.write.refund([1n]));await fails(()=>ct.write.activate([1n]))});
 const tk2=getContract({address:token,abi:artifacts.CTRLTestToken.abi,client:{public:pub,wallet:clients[1]}});
 const ct2=getContract({address:turns,abi:artifacts.CTRLTurns.abi,client:{public:pub,wallet:clients[1]}});
 await receipt(await tk2.write.faucet());await receipt(await tk2.write.approve([turns,parseEther('10')]));await receipt(await ct2.write.bookTurn());
 await good('next player receives a later non-overlapping turn',async()=>{const first=await ct.read.tickets([1n]);const next=await ct.read.tickets([2n]);assert.equal(next[1],first[2]);await fails(()=>ct2.write.activate([2n]))});
 await good('unactivated ticket refunds in full once',async()=>{await receipt(await ct2.write.refund([2n]));assert.equal(await tk2.read.balanceOf([accounts[1].address]),parseEther('100'));await fails(()=>ct2.write.refund([2n]))});
 await provider.request({method:'evm_increaseTime',params:[180]});await provider.request({method:'evm_mine',params:[]});
 await receipt(await tk2.write.approve([turns,parseEther('10')]));await receipt(await ct2.write.bookTurn());
 await provider.request({method:'evm_increaseTime',params:[61]});await provider.request({method:'evm_mine',params:[]});
 await good('expired ticket cannot activate and remains refundable',async()=>{await fails(()=>ct2.write.activate([3n]));await receipt(await ct2.write.refund([3n]));assert.equal(await tk2.read.balanceOf([accounts[1].address]),parseEther('100'))});
 console.log(JSON.stringify({checks,chain:'local EVM',mainnet:false,token,turns}));
}finally{await provider.disconnect()}
