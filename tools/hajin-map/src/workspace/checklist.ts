import {exactKeys,requireValue,validText} from './roads.ts';
import {validateJsonTree} from './validation.ts';
import {validateStops} from './toolkit.ts';
import {emptyCommand,applyCapture,type Command,type Capture,type Candidate} from './command.ts';
import type {FieldGuide,Waypoint} from './field-guide.ts';

export type BossType='commander'|'lieutenant';
export interface BossSource{sourceId:string;recordId:string;recordDigest:string;captureDigest:string}
export interface BossEntry{id:string;name:string;type:BossType;goal:number;starting:number;notes:string;pinned:boolean;waypoint:Waypoint|null;source:BossSource|null}
export interface Kill{id:string;entryId:string;date:string;at:string;notes:string;session:{id:string;name:string}|null}
export interface Checklists{version:1;entries:BossEntry[];kills:Kill[]}
export const emptyChecklists=():Checklists=>({version:1,entries:[],kills:[]});
export const checklists=(f:FieldGuide)=>f.checklists??(f.checklists=emptyChecklists());
export const bossName=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
const id=(v:unknown)=>validText(v,128),sha=(v:unknown)=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const realDate=(v:unknown):v is string=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const iso=(v:unknown)=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export function localDate(date=new Date()){return`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function killTotal(c:Checklists,entry:BossEntry){return entry.starting+c.kills.filter(k=>k.entryId===entry.id).length;}
export function validateChecklists(value:unknown):asserts value is Checklists{
 validateJsonTree(value);exactKeys(value,['version','entries','kills']);requireValue(value.version===1&&Array.isArray(value.entries)&&value.entries.length<=200&&Array.isArray(value.kills)&&value.kills.length<=2000,'Boss checklist capacity exceeded (200 targets/2000 logs).');
 const c=value as unknown as Checklists,ids=new Set<string>(),names=new Set<string>(),sources=new Set<string>();
 for(const e of c.entries){exactKeys(e,['id','name','type','goal','starting','notes','pinned','waypoint','source']);requireValue(id(e.id)&&!ids.has(e.id)&&validText(e.name,100)&&!!bossName(e.name)&&['commander','lieutenant'].includes(e.type)&&Number.isInteger(e.goal)&&e.goal>=1&&e.goal<=9999&&Number.isInteger(e.starting)&&e.starting>=0&&e.starting<=9999&&validText(e.notes,2000,true)&&typeof e.pinned==='boolean','Invalid boss target.');const key=JSON.stringify([e.type,bossName(e.name)]);requireValue(!names.has(key),'A target with this name and type already exists.');ids.add(e.id);names.add(key);if(e.waypoint!==null)validateStops([e.waypoint]);if(e.source!==null){exactKeys(e.source,['sourceId','recordId','recordDigest','captureDigest']);requireValue(e.source.sourceId==='dmztracker-bosses'&&id(e.source.recordId)&&sha(e.source.recordDigest)&&sha(e.source.captureDigest),'Invalid boss source reference.');const sourceKey=JSON.stringify([e.source.sourceId,e.source.recordId]);requireValue(!sources.has(sourceKey),'This source boss already has a checklist entry.');sources.add(sourceKey);}}
 const logs=new Set<string>(),totals=new Map(c.entries.map(e=>[e.id,e.starting]));for(const k of c.kills){exactKeys(k,['id','entryId','date','at','notes','session']);requireValue(id(k.id)&&!logs.has(k.id)&&ids.has(k.entryId)&&realDate(k.date)&&iso(k.at)&&validText(k.notes,2000,true),'Invalid kill log.');logs.add(k.id);totals.set(k.entryId,(totals.get(k.entryId)??0)+1);if(k.session!==null){exactKeys(k.session,['id','name']);requireValue(id(k.session.id)&&validText(k.session.name,100),'Invalid match association.');}}
 requireValue([...totals.values()].every(n=>n<=9999),'Kill total cannot exceed9999.');
}
export function sourceCandidate(c:Command|undefined,source:BossSource|null):{capture:Capture;record:Candidate}|null{if(!source)return null;const capture=c?.captures.find(cap=>cap.sourceId===source.sourceId&&cap.digest===source.captureDigest),record=capture?.records.find(r=>r.id===source.recordId&&r.digest===source.recordDigest);return capture&&record?{capture,record}:null;}
export function validateChecklistSources(c:Checklists|undefined,command:Command|undefined){for(const e of c?.entries??[]){if(!e.source)continue;const ref=sourceCandidate(command,e.source);requireValue(ref&&ref.record.kind===e.type&&validText(ref.record.title,100),'Keep the source capture used by this boss target, or explicitly detach its source first.');}}
export function recordKill(f:FieldGuide,entryId:string,date:string,notes='',now=new Date().toISOString(),logId:string=crypto.randomUUID()){
 const c=checklists(f),entry=c.entries.find(e=>e.id===entryId);requireValue(entry&&realDate(date)&&validText(notes,2000,true)&&iso(now),'Choose a valid target, date and notes.');requireValue(c.kills.length<2000&&killTotal(c,entry)<9999,'Kill log capacity reached. Export and remove history explicitly.');requireValue(!c.kills.some(k=>k.id===logId),'This kill has already been recorded.');const active=f.operations?.sessions.find(s=>s.id===f.operations?.activeSessionId&&s.endedAt===null),kill:Kill={id:logId,entryId,date,at:now,notes,session:active?{id:active.id,name:active.name}:null};c.kills.push(kill);return kill;
}
export function latestKill(c:Checklists,entryId:string){return[...c.kills].reverse().find(k=>k.entryId===entryId);}
export function undoKill(c:Checklists,entryId:string,expectedId:string){const latest=latestKill(c,entryId);requireValue(latest&&latest.id===expectedId,'The latest kill changed; review the history before undoing.');c.kills=c.kills.filter(k=>k.id!==latest.id);}
export function deleteTarget(c:Checklists,id:string){requireValue(c.entries.some(e=>e.id===id),'Target no longer exists.');c.entries=c.entries.filter(e=>e.id!==id);c.kills=c.kills.filter(k=>k.entryId!==id);}
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
