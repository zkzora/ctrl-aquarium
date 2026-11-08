import {mkdir,readFile,writeFile,rename,open,unlink} from 'node:fs/promises';
import path from 'node:path';
import {newGame,type Game} from '../lib/pack-game.ts';
import type {GameStore} from './api.ts';
// One process owns this store; transactions serialize, clone, persist, then commit.
export async function fileStore(directory:string):Promise<GameStore&{close:()=>Promise<void>}> {
 await mkdir(directory,{recursive:true});const file=path.join(directory,'game-v3.json'),lock=path.join(directory,'game-v3.lock');
 async function acquire(){const f=await open(lock,'wx',0o600);await f.writeFile(String(process.pid));await f.close()}
 try{await acquire()}catch(e){
  if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
  const pid=Number(await readFile(lock,'utf8'));let stale=false;
  if(Number.isInteger(pid)&&pid>0){try{process.kill(pid,0)}catch(check){if((check as NodeJS.ErrnoException).code==='ESRCH')stale=true;}}
  if(!stale)throw new Error('This game directory is already locked by another process.');
  await unlink(lock);await acquire();
 }
 let current:Game;
 try{current=JSON.parse(await readFile(file,'utf8'));if(current.schema!==3)throw new Error('Incompatible game data. Preserve the file and migrate it explicitly.');}
 catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')current=newGame();else{await unlink(lock);throw e;}}
 let serial:Promise<unknown>=Promise.resolve();
 return {
  transaction<T>(fn:(game:Game)=>Promise<T>|T){
   const task=serial.then(async()=>{const candidate=structuredClone(current),result=await fn(candidate);const temporary=file+'.tmp';await writeFile(temporary,JSON.stringify(candidate),{mode:0o600});await rename(temporary,file);current=candidate;return result;});
   serial=task.catch(()=>{});return task;
  },
  async close(){await serial;await unlink(lock).catch(()=>{});},
 };
}
