// Animation/timer ticks are local. A passive page must not poll a database.
export function refreshInterval(input:{route:string;hidden:boolean;online:boolean;authenticated:boolean;controller:boolean;idleFor:number}){
 if(input.hidden||!input.online||input.route!=='room'||!input.authenticated||input.idleFor>120000)return null;
 return input.controller?5000:30000;
}
