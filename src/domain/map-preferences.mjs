export const preferenceKeys=Object.freeze(['hajin-safe-run-v1','hajin-loot-run-v1','hajin-loot-run-roads-v1','hajin-loot-run-options-v1','hajin-loot-run-observations-v1','hajin-coordinate-grid-v1','hajin-map-menu-layout-v1','dmz-ui-map-pane-v1','hajin-selection-layout-v1','hajin-waypoint-tracker-collapsed-v1','hajin-marker-size-v1','dmz-x01-map-ui-v1','dmz-x01-dmzhub-ui-v1',...['official','codmunity','wzstats','codcentral','mapgenie'].map(s=>'hajin.source-filters.v1.'+s)]);
const bytes=s=>new TextEncoder().encode(s).length;
export function parsePreferences(text){
 if(typeof text!=='string'||bytes(text)>3*1024*1024)throw Error('Preference file exceeds 3 MiB');
 const v=JSON.parse(text);
 if(!v||Object.keys(v).sort().join()!=='entries,kind,sourceOrigin,version'||v.kind!=='dmz-map-preferences'||v.version!==1||!/^http:\/\/127\.0\.0\.1:([1-9]\d{0,4})$/.test(v.sourceOrigin)||Number(v.sourceOrigin.split(':').at(-1))>65535||!v.entries||Array.isArray(v.entries)||typeof v.entries!=='object')throw Error('Invalid preference envelope');
 for(const [k,s] of Object.entries(v.entries))if(!preferenceKeys.includes(k)||typeof s!=='string'||bytes(s)>(k==='hajin-loot-run-roads-v1'?2*1024*1024:256*1024))throw Error('Unknown or oversized preference');
 return v;
}
export function exportPreferences(storage,sourceOrigin){const entries={};for(const k of preferenceKeys){const v=storage.getItem(k);if(v!==null)entries[k]=v;}return parsePreferences(JSON.stringify({kind:'dmz-map-preferences',version:1,sourceOrigin,entries}));}
// Original bytes remain exportable; malformed values never become applicable.
export function validPreference(k,s){
 if(!preferenceKeys.includes(k)||k.startsWith('hajin.source-filters.'))return false;
 if(k==='hajin-coordinate-grid-v1')return s==='0'||s==='1';
 if(k==='hajin-marker-size-v1')return ['small','normal','large'].includes(s);
 if(k==='hajin-waypoint-tracker-collapsed-v1')return ['0','1'].includes(s);
 try{const value=JSON.parse(s);let nodes=0;const visit=(v,depth)=>{if(++nodes>100000||depth>24)throw Error('Preference complexity');if(v&&typeof v==='object')for(const [key,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(key))throw Error('Unsafe key');visit(x,depth+1);}else if(typeof v==='number'&&!Number.isFinite(v))throw Error('Invalid number');};visit(value,0);
 if(!value||typeof value!=='object'||Array.isArray(value))return false;
 if(k==='dmz-ui-map-pane-v1')return Object.keys(value).sort().join()==='version,width'&&value.version===1&&Number.isFinite(value.width)&&value.width>=180&&value.width<=4096;
 if(k==='hajin-selection-layout-v1')return typeof value.collapsed==='boolean'&&Number.isFinite(value.width)&&value.width>=320&&value.width<=600&&Number.isFinite(value.height)&&value.height>=160&&value.height<=700;
 if(k==='hajin-map-menu-layout-v1')return Object.entries(value).every(([id,p])=>['navigation','map-tools','workspace','routes','tracker','gameplay'].includes(id)&&p&&typeof p==='object'&&Object.keys(p).sort().join()==='x,y'&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=1&&p.y>=0&&p.y<=1);
 if(k.startsWith('dmz-x01-'))return [1,2].includes(value.floor)&&Array.isArray(value.enabled)&&value.enabled.length<=100&&value.enabled.every(id=>k==='dmz-x01-map-ui-v1'?typeof id==='string'&&id.length<=80:Number.isSafeInteger(id));
 return true;}catch{return false;}
}
export function reviewPreferences(candidate,keys,storage,origin){
 parsePreferences(JSON.stringify(candidate));
 const selected=[...new Set(keys)];if(!selected.length||selected.some(k=>!Object.hasOwn(candidate.entries,k)||!validPreference(k,candidate.entries[k])))throw Error('Select valid settings; source filters stay owned by the main workspace backup');
 return {candidate,origin,selected,before:new Map(selected.map(k=>[k,storage.getItem(k)])),active:true};
}
export function applyPreferences(review,storage,origin){
 if(!review.active||review.origin!==origin)throw Error('Review expired');review.active=false;
 if(review.selected.some(k=>storage.getItem(k)!==review.before.get(k)))throw Error('Target changed; review again. Nothing applied.');
 const written=[];
 try{for(const k of review.selected){storage.setItem(k,review.candidate.entries[k]);written.push(k);}return {applied:written.length};}
 catch{let uncertain=false;for(const k of written.reverse()){try{if(storage.getItem(k)!==review.candidate.entries[k]){uncertain=true;continue;}const old=review.before.get(k);if(old===null)storage.removeItem(k);else storage.setItem(k,old);}catch{uncertain=true;}}throw Error(uncertain?'Save failed; rollback uncertain. Keep your export and review storage before retrying.':'Save failed; earlier changes rolled back. Keep your export and review again.');}
}
