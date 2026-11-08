export type Kind = "fish-orange" | "fish-blue" | "fish-yellow" | "shark" | "jellyfish" | "crab" | "shelter" | "treasure" | "seaweed" | "clownfish" | "blue-tang" | "lionfish" | "manta-ray" | "anglerfish" | "whale";
export type WorldObject = { id: string; kind: Kind; x: number; y: number; seed: number; born: number; opened?: boolean; rewardEmpty?: boolean; packOwner?: string; sealedUntil?: number };
export type World = { objects: WorldObject[]; light: "day" | "night" | "sunset"; gravity: "normal" | "reverse"; frozen: boolean; frozenAt?:number; bubbles: boolean; disco: boolean; speed: number; fedAt: number; epoch: number; biome?: "public" | "whale"; round?: number };
export type Command = { type: "add"; kind: Kind; count: number } | { type: "light"; value: World["light"] } | { type: "gravity"; value: World["gravity"] } | { type: "speed"; value: number } | { type: "freeze" | "thaw" | "feed" | "bubbles" | "disco" | "remove-sharks" | "undo" };
export type Turn = { id: string; session: string; name: string; joinedAt: number; startedAt?: number; endsAt?: number; actions: number; wallet?: string; ticket?: string; processing?: { id:string; until:number } };
export type Change = { id: string; actor: string; session: string; prompt: string; summary: string; at: number; world: World; interpreter: "rules" | "openai" };
export type Room = { id: string; version: number; world: World; queue: Turn[]; active: Turn | null; history: Change[]; turns: number; contract?: string; token?: string };
export const TURN_MS = 60_000;
export const MAX_ACTIONS = 3;
export const KINDS: Kind[] = ["fish-orange","fish-blue","fish-yellow","shark","jellyfish","crab","shelter","treasure","seaweed","clownfish","blue-tang","lionfish","manta-ray","anglerfish","whale"];
export const EXAMPLES = ["Add a friendly shark", "Build a shelter for the fish", "Turn gravity upside down", "Make it nighttime", "Add three jellyfish", "Freeze the aquarium", "Feed the fish", "Throw an underwater disco"];

export function initialWorld(now: number): World {
  return { epoch: now, light: "day", gravity: "normal", frozen: false, bubbles: true, disco: false, speed: 1, fedAt: 0,
    objects: Array.from({ length: 7 }, (_, i) => ({ id: `first-${i}`, kind: (["fish-orange","fish-blue","fish-yellow"] as Kind[])[i%3], x: 0.12 + i*0.11, y: 0.27 + (i%3)*0.16, seed: i*47+9, born: now })) };
}
export function initialRoom(id: string, now: number): Room {
  return { id, version: 0, world: initialWorld(now), queue: [], active: null, history: [], turns: 0 };
}
export function advance(room: Room, now: number): boolean {
  if (room.contract) return false;
  let changed = false;
  if (room.active && now >= room.active.endsAt!) { room.active = null; changed = true; }
  if (!room.active && room.queue.length) {
    room.active = { ...room.queue.shift()!, startedAt: now, endsAt: now + TURN_MS, actions: 0 };
    room.turns++; changed = true;
  }
  return changed;
}
export class UserError extends Error { status: number; constructor(message: string, status = 400) { super(message); this.status = status; } }
export function join(room: Room, session: string, name: string, now: number, id: string): void {
  if (room.contract) throw new UserError("This room uses testnet tickets.");
  advance(room, now);
  if (room.active?.session === session || room.queue.some(t => t.session === session)) throw new UserError("You already have a turn in this room.", 409);
  if (room.queue.length >= 6) throw new UserError("The queue is full. Try again after a turn ends.", 409);
  room.queue.push({ id, session, name, joinedAt: now, actions: 0 }); advance(room, now);
}
export function leave(room: Room, session: string, now: number): void {
  if (room.contract) throw new UserError("Testnet reservations are managed by the ticket contract.");
  room.queue = room.queue.filter(t => t.session !== session);
  if (room.active?.session === session) room.active = null;
  advance(room, now);
}

export function parseCommand(input: string): Command {
  const p = input.trim().toLowerCase();
  if (!p || p.length > 240) throw new UserError("Write a command between 1 and 240 characters.");
  if (/\b(undo|revert)\b|batalkan perubahan/.test(p)) return { type: "undo" };
  if (/remove.*shark|hapus.*hiu/.test(p)) return { type: "remove-sharks" };
  if (/\b(unfreeze|thaw|cairkan|mencair)\b/.test(p)) return { type: "thaw" };
  if (/\b(freeze|frozen|ice|beku|bekukan)\b/.test(p)) return { type: "freeze" };
  if (/\b(feed|food|makan|pakan)\b/.test(p)) return { type: "feed" };
  if (/\b(disco|party|pesta)\b/.test(p)) return { type: "disco" };
  if (/\b(bubble|bubbles|gelembung)\b/.test(p)) return { type: "bubbles" };
  if (/gravity|gravitasi|upside down|terbalik/.test(p)) return { type: "gravity", value: /normal|restore|kembalikan/.test(p) ? "normal" : "reverse" };
  if (/night|malam|gelap/.test(p)) return { type: "light", value: "night" };
  if (/sunset|senja|sunrise/.test(p)) return { type: "light", value: "sunset" };
  if (/daytime|sunlight|siang|terang|daylight/.test(p)) return { type: "light", value: "day" };
  if (/slow|slower|lambat|pelan/.test(p)) return { type: "speed", value: 0.45 };
  if (/fast|faster|cepat|speed up/.test(p)) return { type: "speed", value: 1.8 };
  if (/normal speed|kecepatan normal/.test(p)) return { type: "speed", value: 1 };
  let kind: Kind | undefined;
  if (/whale|paus/.test(p)) kind = "whale";
  else if (/manta|stingray|ikan pari/.test(p)) kind = "manta-ray";
  else if (/angler|lentera/.test(p)) kind = "anglerfish";
  else if (/lionfish|ikan singa/.test(p)) kind = "lionfish";
  else if (/clownfish|clown fish|ikan badut/.test(p)) kind = "clownfish";
  else if (/blue tang|blue-tang/.test(p)) kind = "blue-tang";
  else if (/shark|hiu/.test(p)) kind = "shark";
  else if (/jellyfish|jelly|ubur/.test(p)) kind = "jellyfish";
  else if (/crab|kepiting/.test(p)) kind = "crab";
  else if (/shelter|hideout|hiding|persembunyian|berlindung|rumah/.test(p)) kind = "shelter";
  else if (/treasure|chest|harta|peti/.test(p)) kind = "treasure";
  else if (/seaweed|kelp|rumput|coral|karang/.test(p)) kind = "seaweed";
  else if (/fish|ikan/.test(p)) kind = /blue|biru/.test(p) ? "fish-blue" : /yellow|kuning/.test(p) ? "fish-yellow" : "fish-orange";
  if (kind) {
    const n = p.match(/\b([1-3])\b/);
    const count = n ? Number(n[1]) : /three|tiga/.test(p) ? 3 : /two|dua/.test(p) ? 2 : 1;
    return { type: "add", kind, count };
  }
  throw new UserError("That change isn't supported yet. Try adding fish, a shark or shelter, changing light or gravity, feeding, freezing, bubbles, or disco.");
}
export function validateCommand(c: unknown): Command {
  if (!c || typeof c !== "object") throw new UserError("The interpreter returned an unsupported change.");
  const x = c as Record<string,unknown>;
  if (x.type === "add" && KINDS.includes(x.kind as Kind) && Number.isInteger(x.count) && Number(x.count)>=1 && Number(x.count)<=3) return {type:"add",kind:x.kind as Kind,count:Number(x.count)};
  if (x.type === "light" && ["day","night","sunset"].includes(String(x.value))) return {type:"light",value:x.value as World["light"]};
  if (x.type === "gravity" && ["normal","reverse"].includes(String(x.value))) return {type:"gravity",value:x.value as World["gravity"]};
  if (x.type === "speed" && [0.45,1,1.8].includes(Number(x.value))) return {type:"speed",value:Number(x.value)};
  if (["freeze","thaw","feed","bubbles","disco","remove-sharks","undo"].includes(String(x.type))) return {type:x.type} as Command;
  throw new UserError("The interpreter returned an unsupported change. Your action wasn't spent.");
}
export function apply(room: Room, session: string, prompt: string, command: Command, now: number, changeId: string, interpreter: Change["interpreter"] = "rules"): Change {
  if (!room.contract) advance(room, now);
  const turn = room.active;
  if (!turn || turn.session !== session || now < turn.startedAt! || now >= turn.endsAt!) throw new UserError("It's not your turn. Join the queue to change the aquarium.",403);
  if (turn.actions >= MAX_ACTIONS) throw new UserError("You've used your three changes. Watch what happens next or pass the keyboard.",409);
  const w = structuredClone(room.world); let summary = "";
  switch(command.type) {
    case "add":
      if (w.objects.length + command.count > 32) throw new UserError("The aquarium has reached its 32-object limit. Try changing the environment.");
      for(let i=0;i<command.count;i++) {
        const seed = [...changeId].reduce((a,c)=>a+c.charCodeAt(0),0)+i*83;
        w.objects.push({id:`${changeId}-${i}`, kind:command.kind, seed, x:0.18+(seed%63)/100, y:0.25+(seed%40)/100, born:now});
      }
      summary = `Added ${command.count} ${command.kind.replace("fish-","")+ (command.kind.startsWith("fish-") ? " fish" : "")}${command.count>1 && !command.kind.includes("fish")?"s":""}`; break;
    case "light": w.light=command.value; summary=`Set the light to ${command.value}`; break;
    case "gravity": w.gravity=command.value; summary=command.value==="reverse"?"Turned gravity upside down":"Restored normal gravity"; break;
    case "speed": w.speed=command.value; summary=command.value<1?"Slowed everything down":command.value>1?"Sped everything up":"Restored normal speed"; break;
    case "freeze": if(w.frozen)throw new UserError("The aquarium is already frozen.");w.frozen=true;w.frozenAt=now; summary="Froze the aquarium"; break;
    case "thaw": if(!w.frozen)throw new UserError("The aquarium isn't frozen.");w.epoch+=now-(w.frozenAt??now);w.frozen=false;delete w.frozenAt; summary="Thawed the aquarium"; break;
    case "feed": w.fedAt=now; summary="Fed the fish"; break;
    case "bubbles": w.bubbles=!w.bubbles; summary=w.bubbles?"Turned on the bubbles":"Turned off the bubbles"; break;
    case "disco": w.disco=!w.disco; summary=w.disco?"Started an underwater disco":"Ended the disco"; break;
    case "remove-sharks":
      if (!w.objects.some(o=>o.kind==="shark")) throw new UserError("There are no sharks to remove.");
      w.objects=w.objects.filter(o=>o.kind!=="shark"); summary="Sent the sharks home"; break;
    case "undo": {
      const last=room.history.at(-1);
      if (!last || last.session!==session) throw new UserError("You can undo only your own most recent change.");
      const old=room.history.at(-2)?.world ?? initialWorld(room.world.epoch);
      Object.assign(w,structuredClone(old)); summary="Undid their previous change"; break;
    }
  }
  room.world=w; turn.actions++;
  const change:Change={id:changeId,actor:turn.name,session,prompt,summary,at:now,world:structuredClone(w),interpreter};
  room.history.push(change); if(room.history.length>80) room.history.shift();
  return change;
}
