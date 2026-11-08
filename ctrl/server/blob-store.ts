import {get,put,head,BlobPreconditionFailedError} from '@vercel/blob';
import {newGame,type Game} from '../lib/pack-game.ts';
import type {GameStore} from './api.ts';
// Private object, uncached reads and ETag conditional writes. No local filesystem
// fallback: losing the durable store must never remint balances or secret results.
export function blobStore(pathname='ctrl/state-v4.json'):GameStore{
 return {async transaction<T>(fn:(game:Game)=>Promise<T>|T):Promise<T>{
  for(let attempt=0;attempt<12;attempt++){
   const saved=await get(pathname,{access:'private',useCache:false});
   if(!saved){try{await put(pathname,JSON.stringify(newGame()),{access:'private',addRandomSuffix:false,allowOverwrite:false,contentType:'application/json'});}catch(error){if(attempt===11)throw error;}continue;}
   if(saved.statusCode!==200)throw new Error('Unexpected conditional storage response');
   const original=await new Response(saved.stream).text(),game=JSON.parse(original) as Game;
   if(game.schema!==3)throw new Error('Incompatible saved state. An explicit migration is required.');
   const result=await fn(game),document=JSON.stringify(game);if(document===original)return result;
   // Compressed private GETs may expose W/ ETags. Confirm the underlying
   // strong storage ETag without applying a newer revision to an older body.
   const etag=saved.blob.etag.startsWith('W/')?(await head(pathname)).etag:saved.blob.etag;
   if(etag!==saved.blob.etag.replace(/^W\//,''))continue;
   try{await put(pathname,document,{access:'private',addRandomSuffix:false,allowOverwrite:true,ifMatch:etag,contentType:'application/json'});return result;}catch(error){if(!(error instanceof BlobPreconditionFailedError))throw error;}
  }
  throw new Error('The shared world is busy. Retry with the same request ID.');
 }};
}
