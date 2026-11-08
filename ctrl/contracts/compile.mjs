import fs from 'node:fs';
import path from 'node:path';
import solc from 'solc';
import { keccak256 } from 'viem';
const source=fs.readFileSync('contracts/CTRL.sol','utf8');
const result=JSON.parse(solc.compile(JSON.stringify({language:'Solidity',sources:{'CTRL.sol':{content:source}},settings:{optimizer:{enabled:true,runs:200},evmVersion:'shanghai',outputSelection:{'*':{'*':['abi','evm.bytecode.object','evm.deployedBytecode.object']}}}}),{import(file){try{return {contents:fs.readFileSync(path.join('node_modules',file),'utf8')}}catch{return {error:`Cannot read ${file}`}}}}));
const errors=(result.errors??[]).filter(x=>x.severity==='error');
if(errors.length)throw new Error(errors.map(x=>x.formattedMessage).join('\n'));
const output={};
for(const name of ['CTRLTestToken','CTRLTurns']){const c=result.contracts['CTRL.sol'][name];output[name]={abi:c.abi,bytecode:`0x${c.evm.bytecode.object}`,runtimeHash:keccak256(`0x${c.evm.deployedBytecode.object}`)}}
fs.writeFileSync('lib/contracts.generated.json',JSON.stringify(output));
console.log(JSON.stringify({compiled:Object.keys(output),compiler:solc.version()}));
