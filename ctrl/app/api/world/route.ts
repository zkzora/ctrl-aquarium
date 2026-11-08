import {database,getRoom,mutateRoom,getSession,checkOrigin,hash,type Session} from "@/lib/store";
import {advance,join,leave,apply,UserError,MAX_ACTIONS,type Room,type Turn} from "@/lib/world";
import {contractAddress,verifyRoom,readTicket,syncChain} from "@/lib/chain";
import {aiConfigured,interpret} from "@/lib/interpreter";
import {verifyMessage,isAddress,type Address,type Hex} from "viem";

export const dynamic="force-dynamic";
function json(value:unknown,status=200,cookie?:string){return Response.json(value,{status,headers:{"Cache-Control":"no-store",...(cookie?{"Set-Cookie":cookie}:{})}})}
async function roomId(request:Request){const raw=new URL(request.url).searchParams.get("room")||"sandbox";return contractAddress(raw)?.toLowerCase()||"sandbox"}
async function ensureRoom(id:string):Promise<Room>{
  let room=await getRoom(id);
  if(id!=="sandbox"&&!room.contract){const token=await verifyRoom(id as Address);room=await mutateRoom(id,r=>{r.contract=id;r.token=token})}
  return room;
}
async function refresh(id:string):Promise<Room>{
  const room=await ensureRoom(id);const now=Date.now();
  if(room.contract){const sync=await syncChain(room,now);
    if(JSON.stringify(sync.active)!==JSON.stringify(room.active)||JSON.stringify(sync.queue)!==JSON.stringify(room.queue)){
      return mutateRoom(id,r=>{
        // Merge action counts and processing state from the latest revision.
        const newest=[...(r.active?[r.active]:[]),...r.queue];
        const merge=(t:Turn)=>{const n=newest.find(x=>x.id===t.id);return n?{...t,actions:n.actions,processing:n.processing}:t};
        if(sync.active?.id!==r.active?.id && sync.active)r.turns++;
        r.active=sync.active?merge(sync.active):null;r.queue=sync.queue.map(merge);
      });
    }
  }else if((room.active&&now>=room.active.endsAt!)||(!room.active&&room.queue.length)){return mutateRoom(id,r=>{advance(r,Date.now())})}
  return room;
}
async function state(request:Request,session:Session){
  const id=await roomId(request);const room=await refresh(id);const now=Date.now();
  await database().prepare("INSERT INTO presence (id,room,session,seen_at) VALUES (?,?,?,?) ON CONFLICT(id) DO UPDATE SET seen_at=excluded.seen_at").bind(`${id}:${session.id}`,id,session.id,now).run();
  const count=await database().prepare("SELECT COUNT(*) AS count FROM presence WHERE room=? AND seen_at>?").bind(id,now-15_000).first<{count:number}>();
  let reservation=null;
  if(room.contract&&session.wallet){
    const known=[...(room.active?[room.active]:[]),...room.queue].find(t=>t.wallet===session.wallet);
    if(known?.ticket)reservation={ticket:known.ticket,...await readTicket(room.contract as Address,known.ticket)};
  }
  return {room,me:{id:session.id,name:session.name,wallet:session.wallet},viewers:count?.count??1,serverTime:now,interpreter:aiConfigured()?"openai":"rules",reservation};
}
export async function GET(request:Request){let cookie:string|undefined;try{const auth=await getSession(request);cookie=auth.cookie;return json(await state(request,auth.session),200,cookie)}catch(e){return failure(e,cookie)}}
export async function POST(request:Request){
  let cookie:string|undefined;
  try{
    checkOrigin(request);
    const text=await request.text();if(text.length>4000)throw new UserError("That request is too large.",413);
    let body:Record<string,unknown>;try{body=JSON.parse(text)}catch{throw new UserError("Invalid request.")}
    const auth=await getSession(request);cookie=auth.cookie;const session=auth.session;
    const id=await roomId(request);await ensureRoom(id);
    switch(body.action){
      case "rename":{
        const name=String(body.name??"").trim();
        if(!/^[\p{L}\p{N} _.-]{2,24}$/u.test(name))throw new UserError("Use 2–24 letters, numbers, spaces, dots, or dashes.");
        await database().prepare("UPDATE sessions SET name=? WHERE id=?").bind(name,session.id).run();session.name=name;
        await mutateRoom(id,r=>{if(r.active?.session===session.id)r.active.name=name;r.queue.forEach(t=>{if(t.session===session.id)t.name=name})});
        break;
      }
      case "join":await mutateRoom(id,r=>join(r,session.id,session.name,Date.now(),crypto.randomUUID()));break;
      case "leave":await mutateRoom(id,r=>leave(r,session.id,Date.now()));break;
      case "command":{
        const prompt=String(body.prompt??"").trim();const requestId=String(body.requestId??"");
        if(!prompt||prompt.length>240||!/^[-a-zA-Z0-9]{10,70}$/.test(requestId))throw new UserError("Write a command of up to 240 characters and try again.");
        const room=await refresh(id);
        if(room.history.some(c=>c.id===requestId&&c.session===session.id))return json(await state(request,session),200,cookie);
        if(room.contract){const a=room.active;if(!a?.ticket)throw new UserError("Activate your testnet ticket when its turn begins.",403);const t=await readTicket(room.contract as Address,a.ticket);if(t.wallet!==session.wallet||!t.active||t.cancelled||Date.now()>=t.end)throw new UserError("That ticket isn't active for your wallet.",403)}
        await mutateRoom(id,r=>{
          if(!r.contract)advance(r,Date.now());const turn=r.active;
          if(!turn||turn.session!==session.id||Date.now()>=turn.endsAt!)throw new UserError("It's not your turn. Join the queue first.",403);
          if(turn.actions>=MAX_ACTIONS)throw new UserError("Your three changes are used. Pass the keyboard or enjoy the view.",409);
          if(turn.processing&&turn.processing.until>Date.now())throw new UserError("Your last change is still being processed.",409);
          turn.processing={id:requestId,until:Date.now()+15_000};
        });
        try{
          const interpreted=await interpret(prompt);
          await mutateRoom(id,r=>{
            if(r.history.some(c=>c.id===requestId&&c.session===session.id))return;
            if(r.active?.processing?.id!==requestId)throw new UserError("Your turn changed before this command finished. Your action wasn't spent.",409);
            apply(r,session.id,prompt,interpreted.command,Date.now(),requestId,interpreted.interpreter);
            if(r.active)delete r.active.processing;
          });
        }catch(e){await mutateRoom(id,r=>{if(r.active?.processing?.id===requestId)delete r.active.processing});throw e}
        break;
      }
      case "wallet-challenge":{
        const address=String(body.address??"").toLowerCase();if(!isAddress(address))throw new UserError("Invalid wallet address.");
        const expires=Date.now()+300_000;
        const message=`CTRL wallet connection\nOrigin: ${new URL(request.url).origin}\nWallet: ${address}\nSession: ${session.id}\nNonce: ${crypto.randomUUID()}\nExpires: ${new Date(expires).toISOString()}\nThis signature connects your wallet. It does not move funds.`;
        await database().prepare("UPDATE sessions SET challenge=?,challenge_expiry=? WHERE id=?").bind(message,expires,session.id).run();
        return json({message},200,cookie);
      }
      case "wallet-verify":{
        const address=String(body.address??"").toLowerCase();const signature=String(body.signature??"");
        if(!isAddress(address)||!/^0x[0-9a-fA-F]{130}$/.test(signature)||!session.challenge||!session.challenge_expiry||Date.now()>session.challenge_expiry||!session.challenge.includes(`Wallet: ${address}\n`))throw new UserError("The wallet challenge expired. Connect again.",401);
        const valid=await verifyMessage({address:address as Address,message:session.challenge,signature:signature as Hex});
        if(!valid)throw new UserError("The wallet signature doesn't match.",401);
        const result=await database().prepare("UPDATE sessions SET wallet=?,challenge=NULL,challenge_expiry=NULL WHERE id=? AND challenge=? AND challenge_expiry>?").bind(address,session.id,session.challenge,Date.now()).run();
        if(result.meta.changes!==1)throw new UserError("This wallet challenge has already been used. Connect again.",401);
        session.wallet=address;break;
      }
      case "wallet-disconnect":await database().prepare("UPDATE sessions SET wallet=NULL,challenge=NULL,challenge_expiry=NULL WHERE id=?").bind(session.id).run();session.wallet=null;break;
      case "link-ticket":{
        if(!session.wallet||id==="sandbox")throw new UserError("Connect a wallet and open a testnet room first.",403);
        const ticket=String(body.ticket??"");const t=await readTicket(id as Address,ticket);
        if(t.wallet!==session.wallet||t.cancelled||t.end<=Date.now())throw new UserError("This reservation isn't available for your wallet.",403);
        await mutateRoom(id,r=>{
          const ticketId=`ticket-${ticket}`;const prior=[...(r.active?[r.active]:[]),...r.queue].find(x=>x.id===ticketId);
          if(prior){prior.session=session.id;prior.name=session.name;return}
          if(r.queue.length>=12)throw new UserError("This room is busy. Try linking your ticket again shortly.",409);
          r.queue.push({id:ticketId,ticket,session:session.id,name:session.name,wallet:session.wallet!,joinedAt:Date.now(),startedAt:t.start,endsAt:t.end,actions:0});
        });break;
      }
      default:throw new UserError("Unsupported action.");
    }
    return json(await state(request,session),200,cookie);
  }catch(e){return failure(e,cookie)}
}
function failure(error:unknown,cookie?:string){
  if(error instanceof UserError)return json({error:error.message},error.status,cookie);
  console.error("CTRL request failed",error instanceof Error?error.message:"Unknown error");
  return json({error:"Couldn't reach the aquarium service. Try again in a moment."},503,cookie);
}
