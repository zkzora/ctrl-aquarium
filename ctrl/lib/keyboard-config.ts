import type {Address,Hex} from 'viem';
export const KEYBOARD_RULES={public:{price:10,multiplier:1,seed:300,reserve:10000},whale:{price:50,multiplier:5,seed:300,reserve:50000}} as const;
export const KEYBOARD_ODDS=[{chance:.6,value:0,label:'Zonk'},{chance:.25,value:10,label:'Small discovery'},{chance:.1,value:30,label:'Rare discovery'},{chance:.05,value:80,label:'Jackpot'}] as const;
export const keyboardTypes={Keyboard:[{name:'buyer',type:'address'},{name:'id',type:'bytes32'},{name:'habitat',type:'uint8'},{name:'sequence',type:'uint64'},{name:'round',type:'uint64'},{name:'actionHash',type:'bytes32'},{name:'commitment',type:'bytes32'},{name:'flags',type:'uint8'},{name:'targets',type:'uint8'},{name:'deadline',type:'uint64'}]} as const;
export type KeyboardQuote={buyer:Address;id:Hex;habitat:number;sequence:string;round:string;actionHash:Hex;commitment:Hex;flags:number;targets:number;deadline:string};
export function keyboardDomain(contract:Address){return {name:'CTRL Keyboard',version:'1',chainId:84532,verifyingContract:contract} as const;}
export function keyboardArgs(q:KeyboardQuote,signature:Hex){return [{...q,sequence:BigInt(q.sequence),round:BigInt(q.round),deadline:BigInt(q.deadline)},signature];}
