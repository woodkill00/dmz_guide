import {exactKeys,requireValue,validText} from './roads.ts';
import {validateJsonTree} from './validation.ts';
import {validateStops} from './toolkit.ts';
import {emptyCommand,applyCapture,type Command,type Capture,type Candidate} from './command.ts';
import type {FieldGuide,Waypoint} from './field-guide.ts';

export type BossType='commander'|'lieutenant';
export interface BossSource{sourceId:string;recordId:string;recordDigest:string;captureDigest:string}
export interface TagSettings{enabled:boolean;starting:number;goal:number|null}
export interface BossEntry{tags?:TagSettings;id:string;name:string;type:BossType;goal:number;starting:number;notes:string;pinned:boolean;waypoint:Waypoint|null;source:BossSource|null}
export interface Kill{id:string;entryId:string;date:string;at:string;notes:string;session:{id:string;name:string}|null}
export interface Checklists{dogTags?:Kill[];attempts?:Kill[];version:1;entries:BossEntry[];kills:Kill[]}
export const emptyChecklists=():Checklists=>({version:1,entries:[],kills:[]});
export const checklists=(f:FieldGuide)=>f.checklists??(f.checklists=emptyChecklists());
export const bossName=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const id=(v:unknown)=>validText(v,128),sha=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const realDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const iso=(v:unknown)=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function localDate(date=new Date()){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function killTotal(c:Checklists,entry:BossEntry){return entry.starting+c.kills.filter(k=>k.entryId===entry.id).length;}
export function validateChecklists(value:unknown):asserts value is Checklists{
 validateJsonTree(value);exactKeys(value,['version','entries','kills',...(Object.hasOwn(value as object,'dogTags')?['dogTags']:[]),...(Object.hasOwn(value as object,'attempts')?['attempts']:[])]);requireValue(value.version===1&&Array.isArray(value.entries)&&value.entries.length<=200&&Array.isArray(value.kills)&&value.kills.length<=2000,'Boss checklist capacity exceeded (200 targets/2000 logs).');
 if(value.dogTags!==undefined)requireValue(Array.isArray(value.dogTags)&&value.dogTags.length<=2000,'Dog tag log capacity exceeded (2000).');
 if(value.attempts!==undefined)requireValue(Array.isArray(value.attempts)&&value.attempts.length<=2000,'Attempt log capacity exceeded (2000).');
 const c=value as unknown as Checklists,ids=new Set<string>(),names=new Set<string>(),sources=new Set<string>();
 for(const e of c.entries){exactKeys(e,['id','name','type','goal','starting','notes','pinned','waypoint','source',...(Object.hasOwn(e,'tags')?['tags']:[])]);if(e.tags!==undefined){exactKeys(e.tags,['enabled','starting','goal']);requireValue(typeof e.tags.enabled==='boolean'&&Number.isInteger(e.tags.starting)&&e.tags.starting>=0&&e.tags.starting<=9999&&(e.tags.goal===null||Number.isInteger(e.tags.goal)&&e.tags.goal>=1&&e.tags.goal<=9999),'Invalid dog tag settings.');}requireValue(id(e.id)&&!ids.has(e.id)&&validText(e.name,100)&&!!bossName(e.name)&&['commander','lieutenant'].includes(e.type)&&Number.isInteger(e.goal)&&e.goal>=1&&e.goal<=9999&&Number.isInteger(e.starting)&&e.starting>=0&&e.starting<=9999&&validText(e.notes,2000,true)&&typeof e.pinned==='boolean','Invalid boss target.');const key=JSON.stringify([e.type,bossName(e.name)]);requireValue(!names.has(key),'A target with this name and type already exists.');ids.add(e.id);names.add(key);if(e.waypoint!==null)validateStops([e.waypoint]);if(e.source!==null){exactKeys(e.source,['sourceId','recordId','recordDigest','captureDigest']);requireValue(e.source.sourceId==='dmztracker-bosses'&&id(e.source.recordId)&&sha(e.source.recordDigest)&&sha(e.source.captureDigest),'Invalid boss source reference.');const sourceKey=JSON.stringify([e.source.sourceId,e.source.recordId]);requireValue(!sources.has(sourceKey),'This source boss already has a checklist entry.');sources.add(sourceKey);}}
 const logs=new Set<string>(),totals=new Map(c.entries.map(e=>[e.id,e.starting])),tagTotals=new Map(c.entries.map(e=>[e.id,tagSettings(e).starting]));for(const [isTag,rows] of [[false,c.kills],[true,c.dogTags??[]],[null,c.attempts??[]]] as const)for(const k of rows){exactKeys(k,['id','entryId','date','at','notes','session']);requireValue(id(k.id)&&!logs.has(k.id)&&ids.has(k.entryId)&&realDate(k.date)&&iso(k.at)&&validText(k.notes,2000,true),'Invalid kill log.');logs.add(k.id);if(isTag!==null){const counts=isTag?tagTotals:totals;counts.set(k.entryId,(counts.get(k.entryId)??0)+1);}if(k.session!==null){exactKeys(k.session,['id','name']);requireValue(id(k.session.id)&&validText(k.session.name,100),'Invalid match association.');}}
 requireValue([...totals.values(),...tagTotals.values()].every(n=>n<=9999),'Kill or dog tag total cannot exceed9999.');
}
export function sourceCandidate(c:Command|undefined,source:BossSource|null):{capture:Capture;record:Candidate}|null{if(!source)return null;const capture=c?.captures.find(cap=>cap.sourceId===source.sourceId&&cap.digest===source.captureDigest),record=capture?.records.find(r=>r.id===source.recordId&&r.digest===source.recordDigest);return capture&&record?{capture,record}:null;}
export function validateChecklistSources(c:Checklists|undefined,command:Command|undefined){for(const e of c?.entries??[]){if(!e.source)continue;const ref=sourceCandidate(command,e.source);requireValue(ref&&ref.record.kind===e.type&&validText(ref.record.title,100),'Keep the source capture used by this boss target, or explicitly detach its source first.');}}
export function recordKill(f:FieldGuide,entryId:string,date:string,notes='',now=new Date().toISOString(),logId:string=crypto.randomUUID()){
 const c=checklists(f),entry=c.entries.find(e=>e.id===entryId);requireValue(entry&&realDate(date)&&validText(notes,2000,true)&&iso(now),'Choose a valid target, date and notes.');requireValue(c.kills.length<2000&&killTotal(c,entry)<9999,'Kill log capacity reached. Export and remove history explicitly.');requireValue(![...c.kills,...(c.dogTags??[]),...(c.attempts??[])].some(k=>k.id===logId),'This kill has already been recorded.');const active=f.operations?.sessions.find(s=>s.id===f.operations?.activeSessionId&&s.endedAt===null),kill:Kill={id:logId,entryId,date,at:now,notes,session:active?{id:active.id,name:active.name}:null};c.kills.push(kill);return kill;
}
export function recordAttempt(f:FieldGuide,entryId:string,date:string,notes='',now=new Date().toISOString(),logId:string=crypto.randomUUID()){
 const c=checklists(f),entry=c.entries.find(e=>e.id===entryId);requireValue(entry&&realDate(date)&&validText(notes,2000,true)&&iso(now)&&id(logId),'Choose a valid target, date and notes.');requireValue((c.attempts?.length??0)<2000,'Attempt log capacity reached.');requireValue(![...c.kills,...(c.dogTags??[]),...(c.attempts??[])].some(k=>k.id===logId),'This attempt has already been recorded.');const active=f.operations?.sessions.find(s=>s.id===f.operations?.activeSessionId&&s.endedAt===null),attempt:Kill={id:logId,entryId,date,at:now,notes,session:active?{id:active.id,name:active.name}:null};(c.attempts??=[]).push(attempt);return attempt;
}
export function latestKill(c:Checklists,entryId:string){return[...c.kills].reverse().find(k=>k.entryId===entryId);}
export function undoKill(c:Checklists,entryId:string,expectedId:string){const latest=latestKill(c,entryId);requireValue(latest&&latest.id===expectedId,'The latest kill changed; review the history before undoing.');c.kills=c.kills.filter(k=>k.id!==latest.id);}
export function deleteTarget(c:Checklists,id:string){requireValue(c.entries.some(e=>e.id===id),'Target no longer exists.');c.entries=c.entries.filter(e=>e.id!==id);c.kills=c.kills.filter(k=>k.entryId!==id);if(c.dogTags!==undefined)c.dogTags=c.dogTags.filter(k=>k.entryId!==id);if(c.attempts!==undefined)c.attempts=c.attempts.filter(k=>k.entryId!==id);}
export const tagSettings=(entry:BossEntry):TagSettings=>entry.tags??{enabled:entry.type==='lieutenant',starting:0,goal:null};
export function dogTagTotal(c:Checklists,entry:BossEntry){return tagSettings(entry).starting+(c.dogTags??[]).filter(k=>k.entryId===entry.id).length;}
export function recordDogTag(f:FieldGuide,entryId:string,date:string,notes='',now=new Date().toISOString(),logId:string=crypto.randomUUID()){
 const c=checklists(f),entry=c.entries.find(e=>e.id===entryId);requireValue(entry&&tagSettings(entry).enabled,'Enable dog tag tracking for this target first.');requireValue(realDate(date)&&validText(notes,2000,true)&&iso(now)&&id(logId),'Choose a valid dog tag date and notes.');requireValue((c.dogTags?.length??0)<2000&&dogTagTotal(c,entry)<9999,'Dog tag log capacity reached. Export and remove history explicitly.');requireValue(![...c.kills,...(c.dogTags??[]),...(c.attempts??[])].some(k=>k.id===logId),'This event has already been recorded.');const active=f.operations?.sessions.find(s=>s.id===f.operations?.activeSessionId&&s.endedAt===null),log:Kill={id:logId,entryId,date,at:now,notes,session:active?{id:active.id,name:active.name}:null};(c.dogTags??=[]).push(log);return log;
}
export function latestDogTag(c:Checklists,entryId:string){return[...(c.dogTags??[])].reverse().find(k=>k.entryId===entryId);}
export function undoDogTag(c:Checklists,entryId:string,expectedId:string){const last=latestDogTag(c,entryId);requireValue(last&&last.id===expectedId,'The latest dog tag changed; review history before undoing.');c.dogTags=c.dogTags!.filter(k=>k.id!==last.id);}
export function checklistIdentities(c:Checklists|undefined){return c?.entries.flatMap(e=>e.waypoint?.kind==='record'&&e.waypoint.key.startsWith('[')?[e.waypoint.identity]:[])??[];}
export function planRoster(f:FieldGuide,pack:Capture){
 requireValue(pack.sourceId==='dmztracker-bosses'&&pack.records.length>0&&pack.records.length<=200,'Choose a boss roster containing1–200 targets.');const names=new Set<string>();for(const r of pack.records){const key=JSON.stringify([r.kind,bossName(r.title)]);requireValue(['commander','lieutenant'].includes(r.kind)&&validText(r.title,100)&&!!bossName(r.title)&&!names.has(key),'Roster must contain distinct labelled Commander/Lieutenant names.');names.add(key);}
 const next=structuredClone(f.checklists??emptyChecklists()),cmd=structuredClone(f.command??emptyCommand());applyCapture(cmd,pack);let added=0,reused=0,renamed=0;
 for(const row of pack.records){let entry=next.entries.find(e=>e.source?.sourceId===pack.sourceId&&e.source.recordId===row.id);if(entry)requireValue(entry.type===row.kind,'Source type changed; review the target explicitly.');if(!entry){const matches=next.entries.filter(e=>!e.source&&e.type===row.kind&&bossName(e.name)===bossName(row.title));requireValue(matches.length<=1,'Ambiguous custom target match.');entry=matches[0];}
  if(entry){const old=sourceCandidate(f.command,entry.source);if(old&&old.record.title!==row.title)renamed++;reused++;}else{requireValue(!next.entries.some(e=>bossName(e.name)===bossName(row.title)),'A similarly named target has another type/source; resolve it explicitly first.');entry={id:crypto.randomUUID(),name:row.title,type:row.kind as BossType,goal:1,starting:0,notes:'',pinned:false,waypoint:null,source:null};next.entries.push(entry);added++;}
  entry.source={sourceId:pack.sourceId,recordId:row.id,recordDigest:row.digest,captureDigest:pack.digest};
 }
 validateChecklists(next);validateChecklistSources(next,cmd);const present=new Set(pack.records.map(r=>r.id)),missing=next.entries.filter(e=>e.source?.sourceId===pack.sourceId&&!present.has(e.source.recordId)).length;return{checklists:next,command:cmd,added,reused,renamed,missing,noop:JSON.stringify(next)===JSON.stringify(f.checklists??emptyChecklists())&&JSON.stringify(cmd)===JSON.stringify(f.command??emptyCommand())};
}

export function decreaseBossCount(c:Checklists,entryId:string,kind:'kills'|'tags',expectedTotal:number){
 requireValue(kind==='kills'||kind==='tags','Unknown boss counter.');const entry=c.entries.find(e=>e.id===entryId);requireValue(entry,'Target no longer exists.');const total=kind==='kills'?killTotal(c,entry):dogTagTotal(c,entry);requireValue(total===expectedTotal,'Count changed; review the latest count before lowering it.');requireValue(total>0,'Count is already zero.');
 if(kind==='kills'){const latest=latestKill(c,entryId);if(latest)undoKill(c,entryId,latest.id);else entry.starting--;}
 else{const latest=latestDogTag(c,entryId);if(latest)undoDogTag(c,entryId,latest.id);else entry.tags={...tagSettings(entry),starting:tagSettings(entry).starting-1};}
}

export function moveBoss(c:Checklists,entryId:string,targetId:string,side:'before'|'after'){
 requireValue(side==='before'||side==='after','Choose before or after the target.');requireValue(entryId!==targetId,'Choose a different boss to move beside.');const from=c.entries.findIndex(e=>e.id===entryId),target=c.entries.findIndex(e=>e.id===targetId);requireValue(from>=0&&target>=0,'A boss in this move no longer exists.');const [entry]=c.entries.splice(from,1),at=c.entries.findIndex(e=>e.id===targetId);c.entries.splice(at+(side==='after'?1:0),0,entry);
}

export function groupedBosses(entries:BossEntry[]){return{lieutenants:entries.filter(e=>e.type==='lieutenant'),commanders:entries.filter(e=>e.type==='commander')};}
export function bossTagsComplete(c:Checklists,entry:BossEntry){return entry.type==='lieutenant'&&dogTagTotal(c,entry)>=5;}
