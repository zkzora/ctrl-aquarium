import {newGame,ensurePlayer,tickGame,actGame,viewGame,type Game,type GameAction,type PackReceipt} from '../lib/pack-game.ts';
import type {WorldEffect} from '../website/reward-engine.ts';
import {UserError} from '../lib/world.ts';
export interface GameStore {transaction<T>(fn:(game:Game)=>Promise<T>|T):Promise<T>}
export async function digest(value:string){const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value));return [...new Uint8Array(bytes)].map(x=>x.toString(16).padStart(2,'0')).join('')}
export async function gameApi(request:Request,store:GameStore,options:{now?:()=>number;allowedOrigins?:string[]}={}){
 const clock=options.now??Date.now;const url=new URL(request.url),h=url.searchParams.get('habitat')??'public';
 const headers:Record<string,string>={'Cache-Control':'no-store','Content-Type':'application/json; charset=utf-8'};
 try{
  if(h!=='public'&&h!=='whale')throw new UserError('Unknown aquarium.',404);
  if(request.method!=='GET'&&request.method!=='POST')return Response.json({error:'Method not allowed'},{status:405});
  if(request.method==='POST'){
   const origin=request.headers.get('origin');if(!origin||![url.origin,...(options.allowedOrigins??[])].includes(origin))throw new UserError('Open CTRL in its own browser tab before changing the world.',403);
   if(!request.headers.get('content-type')?.startsWith('application/json'))throw new UserError('Expected a JSON request.',415);
  }
  const supplied=request.headers.get('cookie')?.match(/(?:^|;\s*)ctrl_game=([a-f0-9]{64})(?:;|$)/)?.[1];
  const raw=supplied??[...crypto.getRandomValues(new Uint8Array(32))].map(x=>x.toString(16).padStart(2,'0')).join(''),actor=await digest(raw);
  let action:GameAction|undefined,id='';
  if(request.method==='POST'){
   const text=await request.text();if(text.length>4096)throw new UserError('Request too large.',413);
   let body;try{body=JSON.parse(text)}catch{throw new UserError('Invalid JSON request.')}
   if(!body||typeof body!=='object'||Array.isArray(body))throw new UserError('Invalid action.');
   id=String(body.requestId??'');if(!/^[a-zA-Z0-9-]{12,80}$/.test(id))throw new UserError('A request ID is required.');
   const {requestId,...rest}=body;action=rest;
  }
  const payload=await store.transaction(async saved=>{
   // A read can derive queue expiry and scenery without saving a fresh identity
   // or presence timestamp. Actual actions retain atomic persistent writes.
   const g=request.method==='GET'?structuredClone(saved):saved;
   const now=clock();
   if(g.schema!==3)throw new Error('Unsupported saved game schema');
   const player=ensurePlayer(g,actor,now);player.seenAt=now;player.habitat=h;tickGame(g,now);
   const result:{receipt?:PackReceipt;effect?:WorldEffect}=action?await actGame(g,actor,h,action,id,now):{};
   return {...viewGame(g,actor,h,now,result.effect),actionReceipt:result.receipt};
  });
  if(!supplied)headers['Set-Cookie']=`ctrl_game=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${url.protocol==='https:'?'; Secure':''}`;
  return new Response(JSON.stringify(payload),{headers});
 }catch(error){
  const known=error instanceof UserError;
  if(!known)console.error('CTRL game API:',error);
  return new Response(JSON.stringify({error:known?error.message:'The shared game could not be saved. No successful action is being reported.'}),{status:known?error.status:503,headers});
 }
}
export {newGame};
