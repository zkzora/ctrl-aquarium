import {createPublicClient,fallback,http,type Address} from 'viem';
import {TESTNET_CHAIN} from '../lib/testnet-config.ts';
// No background health polling: fail over only when an actual read fails.
export function makeTestnetClient(rpc?:string,alternatives:readonly string[]=['https://base-sepolia-rpc.publicnode.com','https://sepolia.base.org']){
 const configured=rpc?.trim(),preferred=configured?.replace(/\/+$/,'')==='https://sepolia.base.org'?undefined:configured;
 const urls=[...new Set([preferred,...alternatives].filter((x):x is string=>!!x))];
 return createPublicClient({chain:TESTNET_CHAIN,transport:fallback(urls.map(url=>http(url,{timeout:6000,retryCount:0})),{rank:false,retryCount:0})});
}
export type TestnetClient=ReturnType<typeof makeTestnetClient>;
export function rpcFailure(error:unknown){let cause=error;for(let i=0;i<8&&cause&&typeof cause==='object';i++){
 const e=cause as {name?:string;status?:number;code?:number;cause?:unknown};
 if(e.name==='HttpRequestError'||e.name==='TimeoutError'||e.name==='RpcRequestError'||e.status===429||e.code===-32005)return true;cause=e.cause;
}return false;}
function rangeFailure(error:unknown){return /block range|range.*(?:large|limit|maximum)|(?:maximum|max).*block|limited to|exceed.*(?:range|block)|query returned more|response.*(?:large|size)/i.test(error instanceof Error?error.message:String(error));}
export async function readKeyboardLogs(client:TestnetClient,address:Address,start:bigint,latest:bigint){
 const end=start+49999n<latest?start+49999n:latest;
 try{return {end,logs:await client.getLogs({address,fromBlock:start,toBlock:end})};}
 catch(error){
  // A strict fallback may cap logs at 200 blocks. Never advance past a range
  // that was not successfully read; rate limits are not a reason to subdivide.
  if(end-start<200n||!rangeFailure(error))throw error;
  const smaller=start+199n<latest?start+199n:latest;
  return {end:smaller,logs:await client.getLogs({address,fromBlock:start,toBlock:smaller})};
 }
}
