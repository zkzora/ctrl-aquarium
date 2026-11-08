import { env } from "cloudflare:workers";
import { initialRoom, UserError, type Room } from "./world";

export function database(): D1Database {
  if (!env.DB) throw new Error("Database binding is unavailable.");
  return env.DB;
}
export async function getRoom(id: string): Promise<Room> {
  const db=database(); const initial=initialRoom(id,Date.now());
  await db.prepare("INSERT OR IGNORE INTO rooms (id,document,revision) VALUES (?,?,0)").bind(id,JSON.stringify(initial)).run();
  const row=await db.prepare("SELECT document,revision FROM rooms WHERE id=?").bind(id).first<{document:string;revision:number}>();
  if(!row) throw new Error("Room could not be loaded.");
  return {...JSON.parse(row.document), version:row.revision};
}
export async function mutateRoom(id:string, mutation:(room:Room)=>void):Promise<Room> {
  for(let i=0;i<7;i++) {
    const room=await getRoom(id); const version=room.version;
    mutation(room); room.version=version+1;
    const res=await database().prepare("UPDATE rooms SET document=?,revision=? WHERE id=? AND revision=?").bind(JSON.stringify(room),room.version,id,version).run();
    if(res.meta.changes===1) return room;
  }
  throw new UserError("The world changed at the same time. Please try again.",409);
}
export type Session={id:string;name:string;wallet:string|null;challenge:string|null;challenge_expiry:number|null;created_at:number};
export async function getSession(request:Request):Promise<{session:Session;cookie?:string}> {
  const token=request.headers.get("cookie")?.match(/(?:^|;\s*)ctrl_session=([a-f0-9]{64})/)?.[1];
  let id=token ? await hash(token) : null;
  let session=id?await database().prepare("SELECT * FROM sessions WHERE id=?").bind(id).first<Session>():null;
  let cookie:string|undefined;
  if(!session) {
    const raw=Array.from(crypto.getRandomValues(new Uint8Array(32)),x=>x.toString(16).padStart(2,"0")).join(""); id=await hash(raw);
    const animals=["otter","manta","coral","orca","nautilus","turtle"];
    const name=`${animals[parseInt(raw.slice(0,2),16)%animals.length]}-${raw.slice(2,6)}`;
    session={id,name,wallet:null,challenge:null,challenge_expiry:null,created_at:Date.now()};
    await database().prepare("INSERT INTO sessions (id,name,created_at) VALUES (?,?,?)").bind(id,name,session.created_at).run();
    cookie=`ctrl_session=${raw}; HttpOnly; SameSite=Strict; Path=/; Max-Age=2592000${new URL(request.url).protocol==="https:"?"; Secure":""}`;
  }
  return {session,cookie};
}
export async function hash(value:string):Promise<string>{const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value));return Array.from(new Uint8Array(bytes),x=>x.toString(16).padStart(2,"0")).join("");}
export function checkOrigin(request:Request):void {
  const origin=request.headers.get("origin");
  if(!origin || origin!==new URL(request.url).origin) throw new UserError("Open CTRL in its own browser tab and try again.",403);
}
