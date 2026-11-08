// Reads a one-use dedicated TESTNET deploy key from stdin. Never saves/logs it.
import {readFile,writeFile} from 'node:fs/promises';
import {createPublicClient,createWalletClient,http,keccak256,parseEther,encodeDeployData} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {baseSepolia} from 'viem/chains';
import {localOracleKey} from '../server/oracle-key.ts';
import {verifyAquarium} from '../server/testnet-api.ts';
const expected='0xd41c88ee843dccbe6e8ad3d62e4c33ccb6c9787b';
const publicClient=createPublicClient({chain:baseSepolia,transport:http('https://sepolia.base.org',{timeout:15000,retryCount:1})});
if(await publicClient.getChainId()!==84532)throw new Error('Refusing deployment outside Base Sepolia');
const artifact=JSON.parse(await readFile('lib/aquarium.generated.json','utf8'));
const oracleKey=await localOracleKey('.ctrl-data'),oracle=privateKeyToAccount(oracleKey).address;
try{const existing=JSON.parse(await readFile('.ctrl-data/testnet-deployment.json','utf8'));await verifyAquarium(publicClient,existing.contract,oracle);console.log(JSON.stringify({reused:true,...existing}));process.exit(0);}catch(e){if(e.code!=='ENOENT')throw e;}
try{
 const prior=JSON.parse(await readFile('.ctrl-data/deployment-pending.json','utf8'));
 const r=await publicClient.waitForTransactionReceipt({hash:prior.hash,confirmations:1,timeout:180000});
 if(r.status!=='success'||!r.contractAddress)throw new Error('Earlier deployment failed. Review the saved transaction before retrying.');
 await verifyAquarium(publicClient,r.contractAddress,oracle);
 const recovered={contract:r.contractAddress,hash:prior.hash,block:String(r.blockNumber),oracle,admin:expected,chainId:84532,runtimeHash:artifact.runtimeHash};
 await writeFile('.ctrl-data/testnet-deployment.json',JSON.stringify(recovered,null,2));console.log(JSON.stringify({recovered:true,...recovered}));process.exit(0);
}catch(e){if(e.code!=='ENOENT')throw e;}
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for dedicated testnet deploy key on stdin (not echoed).');
let raw='';for await(const chunk of process.stdin){raw+=chunk.toString();if(/[\r\n]/.test(raw))break;}
if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();if(!/^0x[0-9a-fA-F]{64}$/.test(raw.trim()))throw new Error('A valid dedicated testnet key is required through stdin');
const account=privateKeyToAccount(raw.trim());raw='';
if(account.address.toLowerCase()!==expected)throw new Error('Deploy key does not match the authorized administrator address');
const gas=await publicClient.estimateGas({account,data:encodeDeployData({abi:artifact.abi,bytecode:artifact.bytecode,args:[oracle]})}).catch(()=>null);
const gasLimit=gas?gas*12n/10n:3000000n;
const fees=await publicClient.estimateFeesPerGas();if(gasLimit*(fees.maxFeePerGas??0n)>parseEther('.005'))throw new Error('Testnet gas estimate exceeds the 0.005 test ETH deployment budget');
const wallet=createWalletClient({account,chain:baseSepolia,transport:http('https://sepolia.base.org')});
const hash=await wallet.deployContract({account,abi:artifact.abi,bytecode:artifact.bytecode,args:[oracle],gas:gasLimit,...fees});
// Persist only public metadata immediately; recover the same hash on slow receipts.
await writeFile('.ctrl-data/deployment-pending.json',JSON.stringify({hash,oracle,admin:account.address}));
console.log(JSON.stringify({submitted:hash,network:'Base Sepolia',chainId:84532}));
const receipt=await publicClient.waitForTransactionReceipt({hash,confirmations:1,timeout:180000});if(receipt.status!=='success'||!receipt.contractAddress)throw new Error('Deployment did not succeed');
await verifyAquarium(publicClient,receipt.contractAddress,oracle);
const result={contract:receipt.contractAddress,hash,block:String(receipt.blockNumber),oracle,admin:account.address,chainId:84532,runtimeHash:artifact.runtimeHash};
await writeFile('.ctrl-data/testnet-deployment.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result));
