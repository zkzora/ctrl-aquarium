// Forward only the outcome-oracle secret to Vercel via stdin. The one-use
// deployer key is never read by this script or configured in the website.
import {readFile} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
const cli=path.join(process.env.APPDATA,'npm/node_modules/vercel/dist/vc.js');
const oracle=(await readFile('.ctrl-data/testnet-oracle.key','utf8')).trim();
const deployment=JSON.parse(await readFile('.ctrl-data/testnet-deployment.json','utf8'));
const values={CTRL_TESTNET_ORACLE_PRIVATE_KEY:oracle,CTRL_TESTNET_ADMIN_ADDRESS:deployment.admin,CTRL_TESTNET_DEPLOYMENT_HASH:deployment.hash,BASE_SEPOLIA_RPC_URL:'https://sepolia.base.org'};
for(const environment of ['production'])for(const [name,value] of Object.entries(values)){
 const child=spawn(process.execPath,[cli,'env','add',name,environment,'--sensitive','--yes','--force','--no-color'],{stdio:['pipe','pipe','pipe'],windowsHide:true});
 let errors='';child.stdout.on('data',chunk=>{errors+=chunk.toString()});child.stderr.on('data',chunk=>{errors+=chunk.toString()});child.stdin.end(value+'\n');
 const code=await new Promise((resolve,reject)=>{child.on('error',reject);child.on('exit',resolve)});
 if(code!==0){for(const secret of Object.values(values))errors=errors.replaceAll(secret,'[redacted]');throw new Error(`Failed to configure ${name}: ${errors.slice(-1200)}`);}
 console.log(`Configured ${name} for ${environment} (value hidden).`);
}
