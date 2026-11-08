import {encodePacked,keccak256,type Address,type Hex} from 'viem';
import {baseSepolia} from 'viem/chains';
export const TESTNET_CHAIN=baseSepolia;
export const TESTNET_EXPLORER='https://sepolia.basescan.org';
export const SPECIES=['whale','manta-ray','anglerfish','shark','lionfish','clownfish','blue-tang','jellyfish','crab','fish-orange','fish-blue','fish-yellow','treasure'] as const;
export const purchaseTypes={Purchase:[{name:'buyer',type:'address'},{name:'packId',type:'bytes32'},{name:'habitat',type:'uint8'},{name:'species',type:'uint8'},{name:'commitment',type:'bytes32'},{name:'deadline',type:'uint64'}]} as const;
export type PurchaseQuote={buyer:Address;packId:Hex;habitat:number;species:number;commitment:Hex;deadline:string};
export function purchaseDomain(contract:Address){return {name:'CTRL Aquarium',version:'1',chainId:84532,verifyingContract:contract} as const;}
export function testnetCommitment(id:Hex,payout:number,nonce:Hex){return keccak256(encodePacked(['bytes32','uint256','bytes32'],[id,BigInt(payout),nonce]));}
export type TestnetStatus={chainId:84532;wallet?:Address;contract?:Address;oracle?:Address;canDeploy:boolean;configured:boolean;claimAt:number;holeAt:number;block?:string;syncing:boolean;};
