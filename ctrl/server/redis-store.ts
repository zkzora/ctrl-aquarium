import type {GameStore} from './api.ts';
import type {Game} from '../lib/pack-game.ts';
export interface RedisCommands {command<T>(args:(string|number)[]):Promise<T>}
export function redisCommands(env:Record<string,string|undefined>=process.env):RedisCommands{
 const url=env.UPSTASH_REDIS_REST_URL??env.KV_REST_API_URL,token=env.UPSTASH_REDIS_REST_TOKEN??env.KV_REST_API_TOKEN;
 if(!url?.startsWith('https://')||!token)throw new Error('Redis storage is not configured');
 return {async command<T>(args:(string|number)[]):Promise<T>{
  const response=await fetch(url,{method:'POST',headers:{authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify(args),cache:'no-store',signal:AbortSignal.timeout(12000)});
  if(!response.ok)throw new Error(`Durable Redis request failed (${response.status})`);
  const body=await response.json() as {result?:T;error?:string};if(body.error)throw new Error('Durable Redis command failed');return body.result as T;
 }};
}
const cas="if redis.call('GET', KEYS[1]) == ARGV[1] then redis.call('SET', KEYS[1], ARGV[2]); return 1 else return 0 end";
// Redis persistence has no TTL and eviction is disabled. Missing state fails
// closed; only the reviewed migration script may seed a document with SET NX.
export function redisStore(key='ctrl:state:v4',client:RedisCommands=redisCommands()):GameStore{
 return {async transaction<T>(fn:(game:Game)=>Promise<T>|T):Promise<T>{
  for(let attempt=0;attempt<8;attempt++){
   const original=await client.command<string|null>(['GET',key]);if(!original)throw new Error('Durable state is missing. Restore a verified backup; do not reset balances.');
   const game=JSON.parse(original) as Game;if(game.schema!==3)throw new Error('Unsupported durable state schema');
   const result=await fn(game),next=JSON.stringify(game);if(next===original)return result;
   if(await client.command<number>(['EVAL',cas,1,key,original,next])===1)return result;
  }
  throw new Error('Concurrent updates exhausted storage retries. Retry the same request ID.');
 }};
}
