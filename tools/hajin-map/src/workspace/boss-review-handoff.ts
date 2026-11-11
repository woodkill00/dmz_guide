import { el, button, note } from './dom.ts';
import { recordKill, recordAttempt, recordDogTag, realDate } from './checklist.ts';
import type { FieldGuide } from './field-guide.ts';

interface Report { bossId:string; event:'kill'|'attempt'|'dog-tag'; date:string; notes:string }
interface Pending { entryId:string; report:Report; origin:string; source:Window }
interface Host { field:()=>FieldGuide; revision:()=>number; save:(change:(field:FieldGuide)=>void)=>Promise<void>; allowed:()=>boolean; show:()=>void; refresh:()=>void; error:(reason:unknown)=>void }
const ids=(value:unknown)=>typeof value==='string'&&/^[a-zA-Z0-9:._-]{1,120}$/.test(value);
const nonceValues=new URLSearchParams(location.search).getAll('boss-review');
const nonce=nonceValues.length===1&&/^[a-f0-9-]{36}$/i.test(nonceValues[0])?nonceValues[0]:null;

export function createBossReviewHandoff(h:Host){
 let pending:Pending|null=null,disposed=false;
 const send=(type:string,extra:Record<string,unknown>={})=>{
  if(pending&&!pending.source.closed)pending.source.postMessage({type,nonce,...extra},pending.origin);
 };
 const ready=()=>{if(nonce&&!disposed&&h.allowed()&&window.opener&&!window.opener.closed)window.opener.postMessage({type:'dmz-boss-review-ready',nonce},'*');};
 const timer=nonce?setInterval(ready,500):undefined;
 const deadline=nonce?setTimeout(()=>clearInterval(timer),30000):undefined;
 const onMessage=(event:MessageEvent)=>{
  if(disposed||!nonce||event.source!==window.opener||!['http://127.0.0.1:4173','http://localhost:4173'].includes(event.origin)||event.data?.type!=='dmz-boss-review-report'||event.data?.nonce!==nonce)return;
  try{
   if(!h.allowed())throw Error('Save or cancel the current map draft before reviewing this boss report.');
   const value=event.data.payload;
   if(!ids(event.data.entryId)||!value||Object.keys(value).sort().join()!==['bossId','date','event','notes'].sort().join()||!ids(value.bossId)||!['kill','attempt','dog-tag'].includes(value.event)||!realDate(value.date)||typeof value.notes!=='string'||value.notes.length>500)throw Error('Invalid after-run boss report.');
   pending={entryId:event.data.entryId,report:value as Report,origin:event.origin,source:event.source as Window};
   clearInterval(timer);clearTimeout(deadline);
   h.show();h.refresh();
  }catch(reason){h.error(reason);}
 };
 window.addEventListener('message',onMessage);ready();
 function panel(){
  if(!pending)return null;
  const root=el('section',undefined,'workspace-card');root.id='boss-review-handoff';
  root.append(el('h3','Review after-run boss event'));
  const {entryId,report}=pending,c=h.field().checklists;
  const target=c?.entries.find(row=>row.id===report.bossId);
  const existing=[...(c?.kills??[]),...(c?.dogTags??[]),...(c?.attempts??[])].find(row=>row.id===entryId);
  if(!target){root.append(note('This exact boss ID is not in the current map checklist. Add or restore the target, then reopen the handoff from Field desk. No event was saved.'));return root;}
  root.append(note(`${target.name} · ${target.type} · ${report.event} · ${report.date}`));
  if(report.notes)root.append(note(report.notes));
  if(existing){
   root.append(note(existing.entryId===target.id?'This exact event ID is already saved. Return its receipt without another write.':'This event ID belongs to another target. Review the map backup before continuing.'));
   if(existing.entryId===target.id)root.append(button('Return saved receipt',()=>{send('dmz-boss-review-saved',{entryId,ownerRevision:h.revision()});pending=null;h.refresh();},'boss-review-receipt'));
   return root;
  }
  root.append(note('No game credit is inferred. This records only your private report in the map boss tracker.'));
  const confirm=button(`Record ${report.event}`,async()=>{
   if(!pending||pending.entryId!==entryId||!h.allowed())throw Error('Boss report changed. Reopen the handoff.');
   await h.save(field=>{
    if(report.event==='kill')recordKill(field,report.bossId,report.date,report.notes,new Date().toISOString(),entryId);
    else if(report.event==='attempt')recordAttempt(field,report.bossId,report.date,report.notes,new Date().toISOString(),entryId);
    else recordDogTag(field,report.bossId,report.date,report.notes,new Date().toISOString(),entryId);
   });
   send('dmz-boss-review-saved',{entryId,ownerRevision:h.revision()});
   pending=null;h.refresh();
  },'boss-review-confirm');
  const decline=button('Decline without saving',()=>{
   if([...(h.field().checklists?.kills??[]),...(h.field().checklists?.dogTags??[]),...(h.field().checklists?.attempts??[])].some(row=>row.id===entryId))throw Error('Event is already saved; return its receipt instead.');
   send('dmz-boss-review-declined',{entryId});pending=null;h.refresh();
  },'boss-review-decline');
  root.append(confirm,decline);
  return root;
 }
 return{panel,destroy(){disposed=true;clearInterval(timer);clearTimeout(deadline);window.removeEventListener('message',onMessage);}};
}
