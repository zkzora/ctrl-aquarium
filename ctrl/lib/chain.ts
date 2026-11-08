import {createPublicClient,http,keccak256,isAddress,type Address} from "viem";
import {baseSepolia} from "viem/chains";
import artifacts from "./contracts.generated.json";
import {UserError,type Room,type Turn} from "./world";
import {env} from "cloudflare:workers";
export function chainClient(){return createPublicClient({chain:baseSepolia,transport:http((env as unknown as Record<string,string>).BASE_SEPOLIA_RPC_URL||"https://sepolia.base.org",{timeout:12_000,retryCount:1})})}
export function contractAddress(id:string):Address|null {
  if(id==="sandbox")return null;
  if(!isAddress(id))throw new UserError("That room link isn't valid.");
  return id.toLowerCase() as Address;
}
export async function verifyRoom(address:Address):Promise<Address>{
  const client=chainClient();const code=await client.getCode({address});
  if(!code||keccak256(code)!==artifacts.CTRLTurns.runtimeHash)throw new UserError("This address isn't a supported CTRL testnet room.");
  const token=await client.readContract({address,abi:artifacts.CTRLTurns.abi,functionName:"token"}) as Address;
  const tokenCode=await client.getCode({address:token});
  if(!tokenCode||keccak256(tokenCode)!==artifacts.CTRLTestToken.runtimeHash)throw new UserError("This room doesn't use the supported test token.");
  return token;
}
export async function readTicket(address:Address,id:string):Promise<{wallet:string;start:number;end:number;active:boolean;cancelled:boolean}>{
  if(!/^\d{1,20}$/.test(id))throw new UserError("Invalid ticket number.");
  const t=await chainClient().readContract({address,abi:artifacts.CTRLTurns.abi,functionName:"tickets",args:[BigInt(id)]}) as readonly [Address,bigint,bigint,boolean,boolean];
  return {wallet:t[0].toLowerCase(),start:Number(t[1])*1000,end:Number(t[2])*1000,active:t[3],cancelled:t[4]};
}
export async function syncChain(room:Room,now:number):Promise<{active:Turn|null;queue:Turn[]}>{
  if(!room.contract)return {active:room.active,queue:room.queue};
  const candidates=[...(room.active?[room.active]:[]),...room.queue];
  const verified=await Promise.all(candidates.map(async t=>{const v=await readTicket(room.contract as Address,t.ticket!);return {...t,startedAt:v.start,endsAt:v.end,activated:v.active,cancelled:v.cancelled}}));
  const current=verified.find(t=>!t.cancelled&&t.startedAt<=now&&t.endsAt>now);
  return {active:current?.activated?current:null,queue:verified.filter(t=>!t.cancelled&&t.endsAt>now&&(!current?.activated||t.id!==current.id)).sort((a,b)=>a.startedAt-b.startedAt)};
}
