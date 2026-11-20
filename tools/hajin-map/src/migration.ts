import {exportPreferences,parsePreferences,validPreference,reviewPreferences,applyPreferences} from '../../../src/domain/map-preferences.mjs';
import {parsePreference} from './safe-run/domain.ts';
import {parseLootOptions,parseLootJournal} from './safe-run/loot-state.ts';
import {parseRoadGraph} from './workspace/roads.ts';
import {layerNames} from './x01/model.ts';
import hubSnapshot from './x01/dmzhub-snapshot.json';
function valid(key:string,value:any){
 if(!validPreference(key,value))return false;
 try{if(key==='hajin-safe-run-v1'||key==='hajin-loot-run-v1')parsePreference(value);if(key==='hajin-loot-run-roads-v1')parseRoadGraph(value);if(key==='hajin-loot-run-options-v1')parseLootOptions(value);if(key==='hajin-loot-run-observations-v1')parseLootJournal(value);if(key==='dmz-x01-map-ui-v1'&&!JSON.parse(value).enabled.every((id:string)=>!!layerNames[id]))return false;if(key==='dmz-x01-dmzhub-ui-v1'&&!JSON.parse(value).enabled.every((id:number)=>hubSnapshot.categories.some(row=>row.id===id)))return false;return true;}catch{return false;}
}
const status=document.querySelector('#status')!,choices=document.querySelector('#choices')!,apply=document.querySelector<HTMLButtonElement>('#apply')!,review=document.querySelector<HTMLButtonElement>('#review')!;
let candidate:any,receipt:any,generation=0;
const expire=()=>{generation++;if(receipt)receipt.active=false;receipt=null;apply.disabled=true;};
window.addEventListener('pagehide',expire);
window.addEventListener('pagehide',expire);window.addEventListener('storage',expire);
document.querySelector('#export')!.addEventListener('click',()=>{try{const blob=new Blob([JSON.stringify(exportPreferences(localStorage,location.origin),null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='private-map-settings.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){status.textContent=String(e);}});
document.querySelector('#import')!.addEventListener('change',async event=>{expire();const epoch=generation;choices.replaceChildren();review.disabled=true;try{const file=(event.target as HTMLInputElement).files?.[0];if(!file)return;if(file.size>3*1024*1024)throw Error('File exceeds 3 MiB');const text=await file.text();if(epoch!==generation)return;candidate=parsePreferences(text);for(const [key,value]of Object.entries(candidate.entries)){const label=document.createElement('label'),box=document.createElement('input');box.type='checkbox';box.value=key;box.disabled=!valid(key,value);box.checked=!box.disabled;box.addEventListener('change',expire);label.append(box,document.createTextNode(key+(box.disabled?' — recovery only / invalid or workspace-owned':'')));choices.append(label,document.createElement('br'));}review.disabled=false;status.textContent='Restore main and X01 backups first. Review selected settings before applying.';}catch(e){status.textContent=String(e);}});
review.addEventListener('click',()=>{expire();try{receipt=reviewPreferences(candidate,Array.from(choices.querySelectorAll<HTMLInputElement>('input:checked')).map(x=>x.value),localStorage,location.origin);status.textContent=receipt.selected.map((k:string)=>k+': '+(receipt.before.get(k)===candidate.entries[k]?'unchanged':'replace current setting')).join('\n');apply.disabled=false;}catch(e){status.textContent=String(e);}});
apply.addEventListener('click',()=>{try{const result=applyPreferences(receipt,localStorage,location.origin);status.textContent=`Saved ${result.applied} settings. Reload the map. Original data at port 5175 remains unchanged.`;}catch(e){status.textContent=String(e);}finally{expire();}});
