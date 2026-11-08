import {redisStore} from './redis-store.ts';
import {testnetApi,makeTestnetClient} from './testnet-api.ts';
import type {Address,Hex} from 'viem';
export const config={maxDuration:60};
export default {async fetch(request:Request){
 if(request.method==='POST'){const body=await request.clone().json().catch(()=>({})) as {type?:string};if(['quote','join','leave','command'].includes(body.type??''))return Response.json({error:'Legacy purchases and free turns are retired. Use the keyboard economy at the main aquarium.'},{status:410});}
 const key=process.env.CTRL_TESTNET_ORACLE_PRIVATE_KEY;
 if(!key||!/^0x[0-9a-fA-F]{64}$/.test(key))return Response.json({error:'Testnet signing service is not configured.'},{status:503});
 return testnetApi(request,redisStore(),{client:makeTestnetClient(process.env.BASE_SEPOLIA_RPC_URL),oracleKey:key as Hex,adminAddress:process.env.CTRL_TESTNET_ADMIN_ADDRESS as Address,setupEnabled:!!process.env.CTRL_TESTNET_ADMIN_ADDRESS,initialDeployment:process.env.CTRL_TESTNET_DEPLOYMENT_HASH as Hex});
}};
