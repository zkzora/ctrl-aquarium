import type { Kind } from './world';
export type Tier = 'D' | 'C' | 'B' | 'A' | 'S';
export type Habitat = 'public' | 'whale';
export const TIERS: Tier[] = ['S', 'A', 'B', 'C', 'D'];
export const TIER_RULES: Record<Tier,{label:string;empty:number;min:number;max:number}> = {
  D:{label:'Everyday',empty:.60,min:1,max:4}, C:{label:'Uncommon',empty:.50,min:3,max:7},
  B:{label:'Rare',empty:.35,min:8,max:15}, A:{label:'Abyssal',empty:.25,min:16,max:30},
  S:{label:'Leviathan',empty:.10,min:35,max:60},
};
export const CREATURES: {kind:Kind;name:string;tier:Tier;habitat:'both'|'whale';description:string}[] = [
  {kind:'whale',name:'The blue leviathan',tier:'S',habitat:'whale',description:'A slow, enormous resident of the Whale Aquarium. The silhouette of this entire room.'},
  {kind:'manta-ray',name:'Manta ray',tier:'A',habitat:'whale',description:'Broad wings and a long, elegant glide. A quiet giant with an unmistakable shape.'},
  {kind:'anglerfish',name:'Lantern angler',tier:'A',habitat:'whale',description:'A glowing lure in deep water. Small enough to miss, strange enough to remember.'},
  {kind:'shark',name:'Reef shark',tier:'B',habitat:'both',description:'Rebuilt with a streamlined body, natural fins and a proper tail. Small fish seek shelter nearby.'},
  {kind:'lionfish',name:'Lionfish',tier:'B',habitat:'both',description:'A fan of striped fins and dramatic spines. A tiny moving sculpture.'},
  {kind:'clownfish',name:'Clownfish',tier:'C',habitat:'both',description:'A bright orange resident with white bands and a compact, rounded silhouette.'},
  {kind:'blue-tang',name:'Blue tang',tier:'C',habitat:'both',description:'Electric blue, a dark palette pattern and a golden tail. Made for slow laps.'},
  {kind:'jellyfish',name:'Jellyfish',tier:'C',habitat:'both',description:'A translucent bell and drifting tentacles. It takes the scenic route.'},
  {kind:'crab',name:'Floor manager',tier:'C',habitat:'both',description:'A bottom-dweller who has strong opinions about reverse gravity.'},
  {kind:'fish-orange',name:'Orange reef fish',tier:'D',habitat:'both',description:'A familiar little regular. Feeds near the surface and gathers around shelter.'},
  {kind:'fish-blue',name:'Blue reef fish',tier:'D',habitat:'both',description:'A cool blue companion to the orange school. Every small change still counts.'},
  {kind:'fish-yellow',name:'Yellow reef fish',tier:'D',habitat:'both',description:'A little ray of yellow in a world full of other people’s ideas.'},
];
export const creature = (kind:Kind) => CREATURES.find(c=>c.kind===kind);
export const isCreature = (kind:Kind) => !!creature(kind);
export const HABITATS = {
  public:{name:'The public aquarium',short:'Public Aquarium',id:'001',budget:250,blackHoleCost:30,multiplier:1,backdrop:'aquarium-backdrop.png',description:'Small discoveries. Shared consequences.'},
  whale:{name:'The whale aquarium',short:'Whale Aquarium',id:'002',budget:2500,blackHoleCost:120,multiplier:5,backdrop:'whale-backdrop.png',description:'Bigger inhabitants. Larger demo rewards.'},
} as const;
