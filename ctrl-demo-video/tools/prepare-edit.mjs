import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
const story=JSON.parse(fs.readFileSync('src/story.json','utf8'));
const raw=JSON.parse(fs.readFileSync('out/voice-words.json','utf8'));
const words=raw.words.filter(w=>w.text.trim()&&!/^\[.*\]$/.test(w.text.trim()));
const norm=s=>s.toLowerCase().replace(/[^a-z0-9]/g,'');
const anchors=['one world','add a shark','connect your wallet','public turns cost','our completed testnet','add a fish','a black hole','each wallet can','payments fee splitting','try control'];
const indices=[];let after=0;
for(const anchor of anchors){const parts=anchor.split(' '),index=words.findIndex((_,i)=>i>=after&&parts.every((s,j)=>norm(words[i+j]?.text??'')===s));if(index<0)throw new Error('Missing spoken scene anchor: '+anchor);indices.push(index);after=index+parts.length;}
const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','json','public/voice/take-1.mp3'],{encoding:'utf8'});if(probe.status!==0)throw new Error(probe.stderr);const duration=Number(JSON.parse(probe.stdout).format.duration);
const bounds=indices.map((index,i)=>i===0?Math.max(.21,words[index].start-.02):(words[index-1].end+words[index].start)/2);bounds.push(duration);
const manifest={voiceReady:true,voiceName:'Ryan | Neutral Australian Calm Presenter',voiceId:'IkwJPJ8u0E0LT3Zg2pM6',model:'eleven_v4',flowId:'lWQrn6McTJHHdfLa8Xh8',generationId:'WYQBKjucAG1nh7aUvZQq',segments:{}};
const captions={},timeline=[];let offset=0,cueIndex=1;const srt=[];
const time=ms=>{const h=Math.floor(ms/3600000),m=Math.floor(ms/60000)%60,s=Math.floor(ms/1000)%60,n=Math.round(ms)%1000;return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')},${String(n).padStart(3,'0')}`;};
for(let i=0;i<story.length;i++){
 const scene=story[i],start=bounds[i],end=bounds[i+1],seconds=end-start,file=`voice/${scene.id}.wav`;
 const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i','public/voice/take-1.mp3','-t',String(seconds),'-ar','48000','-ac','2','-c:a','pcm_s16le','public/'+file],{encoding:'utf8'});if(r.status!==0)throw new Error(r.stderr);
 manifest.segments[scene.id]={file,seconds,sourceStart:start,sourceEnd:end};const frames=Math.ceil(Math.max(scene.seconds,seconds+1)*30);
 const list=words.slice(indices[i],i+1<indices.length?indices[i+1]:words.length);const cues=[];
 // Voice begins 12 frames (400 ms) into each scene. Keep the word timings,
 // including pauses, instead of distributing captions by character count.
 for(let j=0;j<list.length;j+=8){const group=list.slice(j,j+8),a=Math.max(0,group[0].start-start)*1000+400,b=Math.min(seconds,group.at(-1).end-start)*1000+400;const cue={text:group.map(w=>w.text).join(' '),startMs:Math.round(a),endMs:Math.round(Math.max(a+1,b)),timestampMs:null,confidence:null};cues.push(cue);srt.push(`${cueIndex++}\n${time(offset*1000+cue.startMs)} --> ${time(offset*1000+cue.endMs)}\n${cue.text}\n`);}
 captions[scene.id]=cues;timeline.push({id:scene.id,from:Math.round(offset*30),frames,seconds:frames/30,voiceSeconds:seconds});offset+=frames/30;
}
fs.writeFileSync('src/audio.json',JSON.stringify(manifest,null,2)+'\n');fs.writeFileSync('src/captions.json',JSON.stringify(captions,null,2)+'\n');fs.writeFileSync('out/timeline.json',JSON.stringify(timeline,null,2)+'\n');fs.writeFileSync('out/CTRL-demo-en.srt',srt.join('\n'));
fs.writeFileSync('out/elevenlabs-generation.json',JSON.stringify({...manifest,segments:undefined,sourceTake:'take-1.mp3',alternateGenerationId:'8u9I0oQrUFET8X8JDoMK',note:'Narration generated through the user-authorized ElevenLabs MCP connection. Exact word timings from ElevenLabs Scribe.'},null,2)+'\n');
console.log(JSON.stringify({seconds:offset,scenes:timeline,captions:cueIndex-1},null,2));
