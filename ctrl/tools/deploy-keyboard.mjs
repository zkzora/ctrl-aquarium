// Dedicated testnet deployment only. Secret is read from stdin with terminal echo off.
import fs from 'node:fs/promises';
import {createPublicClient,createWalletClient,http,keccak256} from 'viem';
import {privateKeyToAccount} from 'viem/accounts';
import {baseSepolia} from 'viem/chains';
const artifact=JSON.parse(await fs.readFile('lib/keyboard.generated.json','utf8'));
const admin='0xd41C88eE843dcCBe6E8AD3D62e4c33Ccb6C9787b',legacy='0x06be0d3e30f135a3fd9a18a9e0476ed077fb5c15';
try{process.loadEnvFile('.env.production.local');}catch{}
const oracleKey=process.env.CTRL_TESTNET_ORACLE_PRIVATE_KEY||String(await fs.readFile('.ctrl-data/testnet-oracle.key','utf8')).trim();
const oracle=privateKeyToAccount(oracleKey).address;
const publicClient=createPublicClient({chain:baseSepolia,transport:http(process.env.BASE_SEPOLIA_RPC_URL??'https://sepolia.base.org')});
const previous=await fs.readFile('.ctrl-data/keyboard-deployment.json','utf8').catch(()=>null);
if(previous){const p=JSON.parse(previous);if(keccak256(await publicClient.getCode({address:p.contract}))!==artifact.runtimeHash)throw new Error('Existing deployment has different bytecode; do not deploy silently');console.log('Already deployed '+p.contract);process.exit(0);}
console.log('Waiting for the authorized testnet deployer key on stdin (echo disabled).');
if(process.stdin.isTTY)process.stdin.setRawMode(true);process.stdin.resume();
let input='';const key=await new Promise((resolve,reject)=>{process.stdin.on('data',data=>{input+=data.toString();if(/[\r\n]/.test(input)){const candidate=input.trim();if(!/^0x[0-9a-fA-F]{64}$/.test(candidate))reject(new Error('Invalid testnet key input'));else resolve(candidate);}});});
if(process.stdin.isTTY)process.stdin.setRawMode(false);process.stdin.pause();
const account=privateKeyToAccount(key);if(account.address.toLowerCase()!==admin.toLowerCase())throw new Error('Unexpected testnet deployment administrator');
const wallet=createWalletClient({account,chain:baseSepolia,transport:http(process.env.BASE_SEPOLIA_RPC_URL??'https://sepolia.base.org')});
const hash=await wallet.deployContract({abi:artifact.abi,bytecode:artifact.bytecode,args:[oracle,legacy]});console.log('Submitted '+hash);
const receipt=await publicClient.waitForTransactionReceipt({hash,timeout:180000});if(receipt.status!=='success'||!receipt.contractAddress)throw new Error('Deployment failed');
if(keccak256(await publicClient.getCode({address:receipt.contractAddress}))!==artifact.runtimeHash)throw new Error('Runtime mismatch');
const result={contract:receipt.contractAddress,hash,block:String(receipt.blockNumber),chainId:84532,admin,oracle,legacy,runtimeHash:artifact.runtimeHash,deployedAt:new Date().toISOString()};
await fs.writeFile('.ctrl-data/keyboard-deployment.json',JSON.stringify(result,null,2)+'\n');await fs.writeFile('public/docs/keyboard-deployment.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));process.exit(0);
