// Local shared credit game + production frontend; no blockchain or model calls.
import {createServer} from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {gameApi} from '../server/api.ts';
import {fileStore} from '../server/file-store.ts';
import {keyboardApi} from '../server/keyboard-api.ts';
import {testnetApi,makeTestnetClient} from '../server/testnet-api.ts';
import {localOracleKey} from '../server/oracle-key.ts';
import {redisStore} from '../server/redis-store.ts';
const base=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.wav':'audio/wav','.json':'application/json','.md':'text/plain; charset=utf-8'};
export async function startPreview({port=4174,dataDirectory=path.join(base,'.ctrl-data')}={}){
 try{process.loadEnvFile(path.join(base,'.env.production.local'));}catch(e){if(e.code!=='ENOENT')throw e;}
 const root=path.join(base,'website-dist'),store=await fileStore(dataDirectory),oracleKey=await localOracleKey(dataDirectory),client=makeTestnetClient(process.env.BASE_SEPOLIA_RPC_URL);
 const hasSharedRedis=!!(process.env.KV_REST_API_URL||process.env.UPSTASH_REDIS_REST_URL);
 const testnetStore=hasSharedRedis?redisStore():store;
 const server=createServer(async(req,res)=>{
  try{
   const host=req.headers.host??'';
   if(!/^(127\.0\.0\.1|localhost):\d+$/.test(host)){res.writeHead(403).end('Loopback preview only');return;}
   const url=new URL(req.url,`http://${host}`);
   if(url.pathname==='/api/demo'||url.pathname==='/api/testnet'||url.pathname==='/api/keyboard'){
    let data='';for await(const part of req){data+=part.toString();if(Buffer.byteLength(data)>8192){res.writeHead(413).end('Request too large');return;}}
    const request=new Request(url,{method:req.method,headers:req.headers,body:req.method==='POST'?data:undefined});
    const allowedOrigins=['http://127.0.0.1:4173','http://localhost:4173'];let deployment;try{deployment=JSON.parse(await readFile(path.join(dataDirectory,'testnet-deployment.json'),'utf8'));}catch{}
    if(url.pathname==='/api/testnet'&&deployment&&!hasSharedRedis){res.writeHead(503,{'content-type':'application/json'}).end(JSON.stringify({error:'This deployed contract requires its shared private Redis store. Configure the production storage environment before running the local testnet mirror.'}));return;}
    const response=url.pathname==='/api/keyboard'?await keyboardApi(request,hasSharedRedis?redisStore('ctrl:state:keyboard:v1'):store,{oracleKey,client,allowedOrigins,adminAddress:process.env.CTRL_TESTNET_ADMIN_ADDRESS,initialDeployment:process.env.CTRL_KEYBOARD_DEPLOYMENT_HASH}):url.pathname==='/api/testnet'?await testnetApi(request,testnetStore,{oracleKey,client,allowedOrigins,adminAddress:process.env.CTRL_TESTNET_ADMIN_ADDRESS,initialDeployment:deployment?.hash}):await gameApi(request,store,{allowedOrigins});
    res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
   }
   if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end('Method not allowed');return;}
   const pathname=decodeURIComponent(url.pathname),file=path.resolve(root,`.${pathname.endsWith('/')?pathname+'index.html':pathname}`);
   if(!file.startsWith(root+path.sep)){res.writeHead(403).end('Forbidden');return;}
   if(!(await stat(file)).isFile())throw new Error('Not a file');
   res.writeHead(200,{'content-type':types[path.extname(file)]??'application/octet-stream','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(req.method==='HEAD'?undefined:await readFile(file));
  }catch(error){res.writeHead(404,{'content-type':'text/plain'}).end('Could not load this page. Run npm run website:build first.');}
 });
 try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',resolve)})}catch(error){await store.close();throw error;}
 const address=server.address();const origin=`http://127.0.0.1:${address.port}`;
 return {server,store,origin,async close(){await new Promise(resolve=>server.close(resolve));await store.close();}};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const app=await startPreview({port:Number(process.env.CTRL_PORT??4174)});console.log(`CTRL shared credit game: ${app.origin}/`);
 for(const signal of ['SIGINT','SIGTERM'])process.once(signal,()=>{void app.close().finally(()=>process.exit(0))});
}
