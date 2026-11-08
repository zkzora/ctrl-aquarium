import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {generatePrivateKey} from 'viem/accounts';
import type {Hex} from 'viem';
export async function localOracleKey(directory:string):Promise<Hex>{
 const supplied=process.env.CTRL_TESTNET_ORACLE_PRIVATE_KEY;if(supplied){if(!/^0x[0-9a-fA-F]{64}$/.test(supplied))throw new Error('Invalid oracle key configuration');return supplied as Hex;}
 await mkdir(directory,{recursive:true});const file=path.join(directory,'testnet-oracle.key');
 try{return (await readFile(file,'utf8')).trim() as Hex;}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
 const generated=generatePrivateKey();try{await writeFile(file,generated,{flag:'wx',mode:0o600});return generated;}catch(e){if((e as NodeJS.ErrnoException).code==='EEXIST')return (await readFile(file,'utf8')).trim() as Hex;throw e;}
}
