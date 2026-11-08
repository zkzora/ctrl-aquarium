"use client";
import {createWalletClient,createPublicClient,custom,type Address,type Hex} from 'viem';
import {baseSepolia} from 'viem/chains';
import artifact from './keyboard.generated.json';
import type {PurchaseQuote} from './testnet-config';
import type {EIP1193Provider} from 'viem';
declare global {interface Window {ethereum?:EIP1193Provider}}
function provider(){if(!window.ethereum)throw new Error('No injected wallet here. Open this same URL in Chrome or Brave with MetaMask, Rabby or Coinbase Wallet. Never paste a private key.');return window.ethereum;}
export async function connectTestnetWallet(){
 const wallet=createWalletClient({chain:baseSepolia,transport:custom(provider())});const [address]=await wallet.requestAddresses();if(!address)throw new Error('Choose a wallet account.');
 try{await wallet.switchChain({id:84532})}catch(e){let cause:unknown=e,unknownChain=false;for(let i=0;i<6&&cause&&typeof cause==='object';i++){if('code'in cause&&cause.code===4902)unknownChain=true;cause='cause'in cause?cause.cause:undefined;}if(unknownChain){await wallet.addChain({chain:baseSepolia});await wallet.switchChain({id:84532});}else throw e;}
 return {wallet,address};
}
async function walletFor(expected:Address){
 const wallet=createWalletClient({chain:baseSepolia,transport:custom(provider())});const [address]=await wallet.getAddresses();
 if(!address||address.toLowerCase()!==expected.toLowerCase())throw new Error('Your wallet account changed. Disconnect and sign in with the active account.');
 if(await wallet.getChainId()!==84532)throw new Error('Switch your wallet to Base Sepolia (84532), then try again.');
 return {wallet,address,publicClient:createPublicClient({chain:baseSepolia,transport:custom(provider())})};
}
export async function signTestnetLogin(message:string,address:Address){const {wallet}=await walletFor(address);return wallet.signMessage({account:address,message});}
export async function deployAquarium(oracle:Address,address:Address){const {wallet}=await walletFor(address);return wallet.deployContract({account:address,abi:artifact.abi,bytecode:artifact.bytecode as Hex,args:[oracle,'0x06be0d3e30f135a3fd9a18a9e0476ed077fb5c15']});}
export async function testnetTransaction(contract:Address,address:Address,method:'claimCredits'|'buyTurn'|'executeTurn'|'expireTurn'|'migrate',args:unknown[]=[]){
 const {wallet,publicClient}=await walletFor(address);
 await publicClient.simulateContract({account:address,address:contract,abi:artifact.abi,functionName:method,args});
 return wallet.writeContract({account:address,address:contract,abi:artifact.abi,functionName:method,args});
}
export function purchaseArgs(q:PurchaseQuote,signature:Hex){return [{...q,deadline:BigInt(q.deadline)},signature];}
export async function waitTestnet(hash:Hex,address:Address){const {publicClient}=await walletFor(address);const receipt=await publicClient.waitForTransactionReceipt({hash,confirmations:1,timeout:120000});if(receipt.status!=='success')throw new Error('Transaction reverted. No test-credit action completed.');return receipt;}
export function describeWalletError(error:unknown){const e=error as {shortMessage?:string;message?:string};const message=e.shortMessage??e.message??'Wallet request failed.';if(/reject|denied/i.test(message))return 'Wallet request declined. No new transaction was confirmed.';if(/insufficient funds/i.test(message))return 'Your wallet needs Base Sepolia test ETH for gas. Use the test-ETH faucet link; tCTRL credits do not pay gas.';if(/timeout|timed out/i.test(message))return 'Confirmation is taking longer. The submitted hash is saved. Use Recover transaction; do not pay for the turn again.';return message.slice(0,360);}
