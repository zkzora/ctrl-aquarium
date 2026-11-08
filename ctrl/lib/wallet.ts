"use client";
import {createWalletClient,createPublicClient,custom,http,type Address,type Hex,type EIP1193Provider,decodeEventLog,parseEther} from "viem";
import {baseSepolia} from "viem/chains";
import artifacts from "./contracts.generated.json";
declare global {interface Window {ethereum?:EIP1193Provider}}
export async function connectWallet(){
 if(!window.ethereum)throw new Error("No browser wallet detected. Open this page in a browser with MetaMask, Rabby, or Coinbase Wallet installed.");
 const wallet=createWalletClient({chain:baseSepolia,transport:custom(window.ethereum)});const [address]=await wallet.requestAddresses();return {wallet,address};
}
export async function switchToTestnet(){
 const {wallet,address}=await connectWallet();
 try{await wallet.switchChain({id:baseSepolia.id})}catch(error){if((error as {code?:number}).code===4902)await wallet.addChain({chain:baseSepolia});else throw error}
 return {wallet,address};
}
export const publicChain=()=>createPublicClient({chain:baseSepolia,transport:http("https://sepolia.base.org",{timeout:15_000})});
export async function confirmed(hash:Hex){const r=await publicChain().waitForTransactionReceipt({hash,confirmations:1,timeout:90_000});if(r.status!=="success")throw new Error("The transaction reverted. No confirmed action was recorded.");return r}
export async function deployLab(onProgress:(text:string)=>void){
 const {wallet,address}=await switchToTestnet();let token=localStorage.getItem(`ctrl-deploy-token:${address}`) as Address|null;
 if(!token){onProgress("Deploying the test token. Confirm in your wallet…");const hash=await wallet.deployContract({account:address,abi:artifacts.CTRLTestToken.abi,bytecode:artifacts.CTRLTestToken.bytecode as Hex});const r=await confirmed(hash);token=r.contractAddress!;localStorage.setItem(`ctrl-deploy-token:${address}`,token)}
 onProgress("Deploying the turn contract. Confirm in your wallet…");const hash=await wallet.deployContract({account:address,abi:artifacts.CTRLTurns.abi,bytecode:artifacts.CTRLTurns.bytecode as Hex,args:[token]});const r=await confirmed(hash);
 localStorage.removeItem(`ctrl-deploy-token:${address}`);return {token,contract:r.contractAddress!};
}
export async function faucet(token:Address,onProgress:(text:string)=>void){const {wallet,address}=await switchToTestnet();onProgress("Claiming 100 tCTRL. Confirm in your wallet…");const hash=await wallet.writeContract({account:address,address:token,abi:artifacts.CTRLTestToken.abi,functionName:"faucet"});await confirmed(hash);return hash}
export async function book(token:Address,contract:Address,onProgress:(text:string)=>void){
 const {wallet,address}=await switchToTestnet();const client=publicChain();
 const allowance=await client.readContract({address:token,abi:artifacts.CTRLTestToken.abi,functionName:"allowance",args:[address,contract]}) as bigint;
 if(allowance<parseEther("10")){onProgress("Approve exactly 10 tCTRL for this turn…");await confirmed(await wallet.writeContract({account:address,address:token,abi:artifacts.CTRLTestToken.abi,functionName:"approve",args:[contract,parseEther("10")]}))}
 onProgress("Reserving your turn. Confirm in your wallet…");const hash=await wallet.writeContract({account:address,address:contract,abi:artifacts.CTRLTurns.abi,functionName:"bookTurn"});const r=await confirmed(hash);
 for(const log of r.logs){try{if(log.address.toLowerCase()!==contract.toLowerCase())continue;const decoded=decodeEventLog({abi:artifacts.CTRLTurns.abi,data:log.data,topics:log.topics});const args=decoded.args;if(decoded.eventName==="Booked"&&args&&typeof args==="object"&&"ticketId" in args&&typeof args.ticketId==="bigint")return {hash,ticket:String(args.ticketId)}}catch{}}
 throw new Error("The reservation confirmed, but its ticket wasn't found. Use Recover reservation.");
}
export async function ticketTransaction(contract:Address,ticket:string,action:"activate"|"refund",onProgress:(text:string)=>void){const {wallet,address}=await switchToTestnet();onProgress(action==="activate"?"Activating your turn and consuming 10 tCTRL…":"Returning your unused 10 tCTRL…");const hash=await wallet.writeContract({account:address,address:contract,abi:artifacts.CTRLTurns.abi,functionName:action,args:[BigInt(ticket)]});await confirmed(hash);return hash}
export async function latestTicket(contract:Address,address:Address){return String(await publicChain().readContract({address:contract,abi:artifacts.CTRLTurns.abi,functionName:"latestTicket",args:[address]}))}
export function walletError(error:unknown){const e=error as {shortMessage?:string;message?:string};const s=e.shortMessage||e.message||"Wallet request failed.";if(/reject|denied/i.test(s))return "You declined the wallet request. Nothing was confirmed.";if(/insufficient funds/i.test(s))return "Your wallet needs Base Sepolia test ETH for gas. Use the faucet link below.";if(/FaucetCooldown/i.test(s))return "This wallet can claim test credits once every 24 hours.";return s.slice(0,260)}
