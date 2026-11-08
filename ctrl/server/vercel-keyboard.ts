import {redisStore} from './redis-store.ts';
import {keyboardApi,makeTestnetClient} from './keyboard-api.ts';
import type {Address,Hex} from 'viem';
export const config={maxDuration:60};
export default {fetch(request:Request){
 const key=process.env.CTRL_TESTNET_ORACLE_PRIVATE_KEY;
 if(!key||!/^0x[0-9a-fA-F]{64}$/.test(key))return Response.json({error:'Testnet signing service is not configured.'},{status:503});
 return keyboardApi(request,redisStore('ctrl:state:keyboard:v1'),{client:makeTestnetClient(process.env.BASE_SEPOLIA_RPC_URL),oracleKey:key as Hex,adminAddress:process.env.CTRL_TESTNET_ADMIN_ADDRESS as Address,setupEnabled:!!process.env.CTRL_TESTNET_ADMIN_ADDRESS,initialDeployment:process.env.CTRL_KEYBOARD_DEPLOYMENT_HASH as Hex});
}};
