import {evidenceBytes} from './owned-assets.ts';
import type {Workspace} from './model.ts';
import {exportPrivateBackup} from './backup.ts';
import {iconBytes} from './icons.ts';
import {sourcePolicies} from './policy.ts';
export interface CaptureHealth {id:string;capturedAt:string|null;records:number;files?:{snapshot:string;iconDirectory:string;digest:string|null}}
export function workspaceHealth(state:Workspace,captures:CaptureHealth[]=[],now=Date.now()){
 const backup=exportPrivateBackup(state),bytes=new TextEncoder().encode(JSON.stringify(backup)).byteLength;
 const current=new Map(captures.map(c=>[c.id,c]));for(const e of state.snapshots)current.set(e.snapshot.sourceId,{id:e.snapshot.sourceId,capturedAt:e.snapshot.capturedAt,records:e.snapshot.records.length});
 return{
  budgets:[{label:'Private backup',used:bytes,max:20*1024*1024,unit:'bytes'},{label:'Saved source snapshots',used:state.snapshots.length,max:20,unit:'items'},{label:'Retained source records',used:state.snapshots.reduce((n,e)=>n+e.snapshot.records.length,0),max:20000,unit:'items'},{label:'My points / annotations',used:state.annotations.length,max:5000,unit:'items'},{label:'Custom icons',used:state.icons.length,max:32,unit:'items'},{label:'Icon images',used:state.icons.reduce((n,i)=>n+iconBytes(i).length,0),max:8*1024*1024,unit:'bytes'},{label:'Screenshot copies',used:state.annotations.flatMap(a=>a.attachments??[]).length,max:32,unit:'items'},{label:'Screenshot images',used:state.annotations.flatMap(a=>a.attachments??[]).reduce((n,a)=>n+evidenceBytes(a).length,0),max:8*1024*1024,unit:'bytes'},{label:'Routes and areas',used:state.annotations.filter(a=>a.geometry).length,max:500,unit:'items'},{label:'Shape vertices',used:state.annotations.reduce((n,a)=>n+(a.geometry?.vertices.length??0),0),max:20000,unit:'items'}],
  sources:Object.values(sourcePolicies).map(p=>{const c=current.get(p.id),date=c?.capturedAt?Date.parse(c.capturedAt):NaN;return{id:p.id,name:p.name,url:p.page,capturedAt:c?.capturedAt??null,records:c?.records??0,ageDays:Number.isFinite(date)?Math.floor((now-date)/86400000):null};}),
  manifest:{kind:'dmz-local-recovery-manifest',version:1,createdAt:new Date(now).toISOString(),localCaptureFiles:captures.filter(c=>c.files).map(c=>({sourceId:c.id,...c.files})),canonicalBackground:'/maps/hajin/v1/background.webp',instructions:'Restore your private backup in the intended browser profile. Reattach separately retained background images and reviewed local source captures. This manifest contains dependency references only, not restricted source records or image pixels.',backgrounds:state.basemaps.map(b=>({id:b.id,description:b.description,frameId:b.frame.id,storedSeparately:true})),sourceSnapshots:state.snapshots.map(e=>({sourceId:e.snapshot.sourceId,snapshotId:e.snapshot.snapshotId,digest:e.digest,capturedAt:e.snapshot.capturedAt,omittedFromPrivateBackup:!backup.workspace.snapshots.some(s=>s.key===e.key)})),omittedDependencies:backup.workspace.omittedDependencies},
 };
}
