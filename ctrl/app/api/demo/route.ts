import {env} from 'cloudflare:workers';
import {gameApi,newGame,type GameStore} from '../../../server/api';
import type {Game} from '../../../lib/pack-game';
export const dynamic='force-dynamic';
const store:GameStore={async transaction<T>(fn:(game:Game)=>Promise<T>|T){
 if(!env.DB)throw new Error('D1 database binding is required');
 // Same atomic document contains rooms, balances, entitlements and idempotency.
 await env.DB.prepare('CREATE TABLE IF NOT EXISTS ctrl_game_v3 (id TEXT PRIMARY KEY, document TEXT NOT NULL, revision INTEGER NOT NULL)').run();
 await env.DB.prepare('INSERT OR IGNORE INTO ctrl_game_v3 VALUES (?,?,0)').bind('main',JSON.stringify(newGame())).run();
 for(let attempt=0;attempt<10;attempt++){
  const row=await env.DB.prepare('SELECT document,revision FROM ctrl_game_v3 WHERE id=?').bind('main').first<{document:string;revision:number}>();if(!row)throw new Error('Missing game');
  const candidate=JSON.parse(row.document) as Game,result=await fn(candidate);
  const update=await env.DB.prepare('UPDATE ctrl_game_v3 SET document=?,revision=? WHERE id=? AND revision=?').bind(JSON.stringify(candidate),row.revision+1,'main',row.revision).run();if(update.meta.changes===1)return result;
 }
 throw new Error('The shared game is busy. Retry with the same request ID.');
}};
export async function GET(request:Request){return gameApi(request,store)}
export async function POST(request:Request){return gameApi(request,store)}
