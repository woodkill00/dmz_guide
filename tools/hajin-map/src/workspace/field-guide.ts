import type {ExplorerRecord} from './explorer-index.ts';
import type {VisibilityState,SourceSnapshot} from './types.ts';
import {parseIdentity} from './usability.ts';
import {sourcePolicies} from './policy.ts';
import {displayKind,displayDuplicates,type DisplayRecord} from '../map/display-duplicates.ts';
import {validateJsonTree,utf8Bytes} from './validation.ts';
import {exactKeys,requireValue,validText,coordinate,validateRoadGraph,type RoadGraph,type XY} from './roads.ts';

export interface RecordHandle{kind:'record';key:string;identity:string}
export type Waypoint=RecordHandle|{kind:'manual';id:string;x:number;y:number;label:string};
export interface PlannedRoute{id:string;name:string;color:string;mode:'road'|'direct';waypoints:Waypoint[]}
export interface Tracking{key:string;identity:string;favorite:boolean;visited:boolean;checked:boolean;revisit:boolean;confidence:'unverified'|'observed'|'confirmed';date:string;evidence:string;updatedAt:string}
export interface DuplicateDecision{a:string;b:string;decision:'same'|'separate'|'later';at:string}
export interface FieldGuide{version:1;tracking:Tracking[];duplicateDecisions:DuplicateDecision[];routes:PlannedRoute[];roadGraph:RoadGraph|null;gameplay:{enabled:boolean;largeMarkers:boolean;favoriteCategories:string[];savedQueries:{name:string;query:string}[]};density:boolean}
export const emptyFieldGuide=():FieldGuide=>({version:1,tracking:[],duplicateDecisions:[],routes:[],roadGraph:null,gameplay:{enabled:false,largeMarkers:false,favoriteCategories:[],savedQueries:[]},density:false});
const bool=(v:unknown)=>typeof v==='boolean';
const date=(v:unknown)=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString().slice(0,10)===v;
const timestamp=(v:unknown)=>typeof v==='string'&&v.length<=40&&Number.isFinite(Date.parse(v))&&new Date(v).toISOString()===v;
export const stableKey=(r:ExplorerRecord)=>r.kind==='source'?JSON.stringify([r.sourceId,r.id]):r.key;
export const recordVersion=(r:ExplorerRecord)=>r.version??r.identity??r.capturedAt??r.status.split(" · My ")[0];
export const recordHandle=(r:ExplorerRecord):RecordHandle=>({kind:'record',key:stableKey(r),identity:recordVersion(r)});
function handleValid(key:unknown,identity:unknown){requireValue(validText(key,300)&&validText(identity,512),'Invalid location reference.');if(key.startsWith('custom:')||key.startsWith('reviewed:'))return;const parts:unknown=JSON.parse(key);requireValue(Array.isArray(parts)&&parts.length===2&&typeof parts[0]==='string'&&Object.hasOwn(sourcePolicies,parts[0])&&validText(parts[1],128),'Invalid source location reference.');const capture=parseIdentity(identity);requireValue(capture[0]===parts[0]&&capture[3]===parts[1],'Source reference and capture do not match.');}
export function validateFieldGuide(value:unknown):asserts value is FieldGuide{
 validateJsonTree(value);exactKeys(value,['version','tracking','duplicateDecisions','routes','roadGraph','gameplay','density']);requireValue(value.version===1&&bool(value.density),'Invalid field-guide version/preferences.');
 requireValue(Array.isArray(value.tracking)&&value.tracking.length<=5000&&Array.isArray(value.duplicateDecisions)&&value.duplicateDecisions.length<=2000&&Array.isArray(value.routes)&&value.routes.length<=20,'Planner count limit exceeded.');
 const keys=new Set<string>();for(const t of value.tracking){exactKeys(t,['key','identity','favorite','visited','checked','revisit','confidence','date','evidence','updatedAt']);handleValid(t.key,t.identity);requireValue(!keys.has(t.key as string),'Duplicate tracking entry.');keys.add(t.key as string);requireValue([t.favorite,t.visited,t.checked,t.revisit].every(bool)&&['unverified','observed','confirmed'].includes(t.confidence as string)&&validText(t.evidence,4000,true)&&(t.date===''||date(t.date))&&timestamp(t.updatedAt),'Invalid observation.');requireValue(t.confidence!=='confirmed'||(date(t.date)&&validText(t.evidence,4000)),'Owner-confirmed observations require a date and evidence.');}
 const pairs=new Set<string>();for(const d of value.duplicateDecisions){exactKeys(d,['a','b','decision','at']);const a=parseIdentity(d.a),b=parseIdentity(d.b),key=JSON.stringify([d.a,d.b].sort());requireValue(a[0]!==b[0]&&!pairs.has(key)&&['same','separate','later'].includes(d.decision as string)&&timestamp(d.at),'Invalid/duplicate comparison decision.');pairs.add(key);}
 const routes=new Set<string>();for(const r of value.routes){exactKeys(r,['id','name','color','mode','waypoints']);requireValue(validText(r.id,128)&&!routes.has(r.id)&&validText(r.name,100)&&typeof r.color==='string'&&/^#[0-9a-f]{6}$/i.test(r.color)&&['road','direct'].includes(r.mode as string)&&Array.isArray(r.waypoints)&&r.waypoints.length<=32,'Invalid route.');routes.add(r.id);const stops=new Set<string>();for(const w of r.waypoints){requireValue(!!w&&typeof w==='object','Invalid waypoint.');if(w.kind==='record'){exactKeys(w,['kind','key','identity']);handleValid(w.key,w.identity);requireValue(!stops.has(w.key as string),'Location is already in the route.');stops.add(w.key as string);}else{exactKeys(w,['kind','id','x','y','label']);requireValue(w.kind==='manual'&&validText(w.id,128)&&coordinate(w.x)&&coordinate(w.y)&&validText(w.label,100)&&!stops.has(w.id),'Invalid manual stop.');stops.add(w.id);}}}
 if(value.roadGraph!==null)validateRoadGraph(value.roadGraph);
 exactKeys(value.gameplay,['enabled','largeMarkers','favoriteCategories','savedQueries']);const g=value.gameplay;requireValue(bool(g.enabled)&&bool(g.largeMarkers)&&Array.isArray(g.favoriteCategories)&&g.favoriteCategories.length<=50&&g.favoriteCategories.every(x=>validText(x,200))&&new Set(g.favoriteCategories).size===g.favoriteCategories.length&&Array.isArray(g.savedQueries)&&g.savedQueries.length<=20,'Invalid gameplay preferences.');for(const q of g.savedQueries){exactKeys(q,['name','query']);requireValue(validText(q.name,60)&&validText(q.query,256),'Invalid saved search.');}
}
export function findRecord(records:ExplorerRecord[],key:string){return records.find(r=>stableKey(r)===key);}
export function resolveWaypoint(w:Waypoint,records:ExplorerRecord[]):{point:XY|null;label:string;error:string|null}{if(w.kind==='manual')return{point:[w.x,w.y],label:w.label,error:null};const r=findRecord(records,w.key);if(!r)return{point:null,label:'Unavailable location',error:'Source/location missing; restore its capture or remove this stop.'};if(recordVersion(r)!==w.identity)return{point:null,label:r.title,error:'Location capture changed; explicitly reselect this stop.'};if(r.x===null||r.y===null)return{point:null,label:r.title,error:'Reference has no map position.'};return{point:[r.x,r.y],label:r.title,error:null};}
export function trackingStatus(meta:FieldGuide|undefined,r:ExplorerRecord){const t=meta?.tracking.find(t=>t.key===stableKey(r));return t?{entry:t,stale:t.identity!==recordVersion(r)}:null;}
export function decorateRecord(meta:FieldGuide|undefined,r:ExplorerRecord):ExplorerRecord{const t=trackingStatus(meta,r);if(!t)return r;const flags=[t.entry.favorite?'favorite':'',t.entry.visited?'visited':'',t.entry.checked?'checked':'',t.entry.revisit?'revisit':''].filter(Boolean);return{...r,status:r.status+` · My ${t.entry.confidence==='confirmed'?'owner-confirmed':t.entry.confidence} observation${t.stale?' (stale capture)':''}${flags.length?' · '+flags.join(', '):''}`,notes:[r.notes,'My tracking: '+t.entry.confidence+' '+flags.join(', '),t.entry.evidence,t.entry.date?'My observation '+t.entry.date:''].filter(Boolean).join('\n')};}
export const normalizedName=(s:string)=>s.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]+/gu,' ').trim();
export interface Candidate{a:ExplorerRecord;b:ExplorerRecord;distance:number;automatic:boolean;decision:DuplicateDecision|null}
export function duplicateQueue(records:ExplorerRecord[],decisions:DuplicateDecision[]=[]){
 requireValue(records.length<=30000&&records.filter(r=>r.kind==='source').length<=20000,'Comparison record admission limit exceeded.');
 const cells=new Map<string,ExplorerRecord[]>(),out:Candidate[]=[];let work=0,truncated=false;
 outer:for(const r of [...records].filter(r=>r.kind==='source'&&r.identity&&r.x!==null&&r.y!==null).sort((a,b)=>a.sourceId.localeCompare(b.sourceId)||a.id.localeCompare(b.id))){const x=r.x!,y=r.y!,gx=Math.floor(x/96),gy=Math.floor(y/96),kind=displayKind(r.categoryId),name=normalizedName(r.title);for(let i=gx-1;i<=gx+1;i++)for(let j=gy-1;j<=gy+1;j++)for(const a of cells.get(`${kind}:${i},${j}`)??[]){if(++work>250000){truncated=true;break outer;}if(a.sourceId===r.sourceId||!name||normalizedName(a.title)!==name||(a.floor!==null&&r.floor!==null&&a.floor!==r.floor)||(a.build!==null&&r.build!==null&&a.build!==r.build))continue;const d=Math.hypot(x-a.x!,y-a.y!);if(d>96)continue;const decision=decisions.find(v=>(v.a===a.identity&&v.b===r.identity)||(v.b===a.identity&&v.a===r.identity))??null;out.push({a,b:r,distance:d,automatic:d<=24,decision});if(out.length===2000){truncated=true;break outer;}}
 const key=`${kind}:${gx},${gy}`,bucket=cells.get(key)??[];bucket.push(r);cells.set(key,bucket);}
 return{candidates:out,truncated,work};
}
/** Explicit equivalence remains display-only; capture identities are mandatory. */
export function plannedDuplicates(records:DisplayRecord[],showAll:boolean,separate:readonly {a:string;b:string}[],decisions:DuplicateDecision[]=[]){
 const blocked=new Set([...separate,...decisions.filter(d=>d.decision==='separate')].map(d=>JSON.stringify([d.a,d.b].sort())));
 const result=displayDuplicates(records,showAll,[...separate,...decisions.filter(d=>d.decision==='separate')]);
 if(!decisions.some(d=>d.decision==='same'))return result;
 const parent=new Map(records.map(r=>[r.key,r.key])),byIdentity=new Map(records.filter(r=>r.identity).map(r=>[r.identity!,r]));
 const root=(id:string):string=>{let r=id;while(parent.get(r)!==r)r=parent.get(r)!;while(parent.get(id)!==id){const p=parent.get(id)!;parent.set(id,r);id=p;}return r;};
 for(const g of result.groups)for(const m of g.members)parent.set(root(m.key),root(g.representative.key));
 const groups=new Map<string,DisplayRecord[]>();for(const r of records){const key=root(r.key),list=groups.get(key)??[];list.push(r);groups.set(key,list);}
 for(const d of decisions){if(d.decision!=='same')continue;const a=byIdentity.get(d.a),b=byIdentity.get(d.b);if(!a||!b||a.sourceId===b.sourceId||displayKind(a.category)!==displayKind(b.category)||normalizedName(a.title)!==normalizedName(b.title)||Math.hypot(a.x-b.x,a.y-b.y)>96)continue;
  const ra=root(a.key),rb=root(b.key);if(ra===rb)continue;const ga=groups.get(ra)!,gb=groups.get(rb)!,members=[...ga,...gb],sources=members.map(r=>r.sourceId),floors=new Set(members.flatMap(r=>r.floor===null?[]:[r.floor])),builds=new Set(members.flatMap(r=>r.build===null?[]:[r.build]));
  if(new Set(sources).size!==sources.length||floors.size>1||builds.size>1||ga.some(a=>gb.some(b=>a.identity&&b.identity&&blocked.has(JSON.stringify([a.identity,b.identity].sort())))))continue;
  parent.set(rb,ra);groups.set(ra,members);groups.delete(rb);
 }
 result.suppressed.clear();result.matches.clear();result.groups=[];
 for(const members of groups.values()){if(members.length<2)continue;members.sort((a,b)=>Number(b.sourceId==='official')-Number(a.sourceId==='official')||a.sourceId.localeCompare(b.sourceId)||a.key.localeCompare(b.key));const representative=members.find(r=>r.visible)??members[0];result.groups.push({members,representative});for(const r of members)if(r.key!==representative.key){result.matches.set(r.key,`${representative.sourceId}: ${representative.title}`);if(r.visible&&!showAll)result.suppressed.add(r.key);}}
 return result;
}

export function reorder<T>(items:T[],from:number,to:number){requireValue(Number.isInteger(from)&&Number.isInteger(to)&&from>=0&&to>=0&&from<items.length&&to<items.length,'Invalid waypoint order.');const next=[...items],[item]=next.splice(from,1);next.splice(to,0,item);return next;}

export interface PublicView{v:1;center:XY;zoom:number;sources:Record<string,boolean>;categories:Record<string,Record<string,boolean>>}
export function makePublicView(center:XY,zoom:number,v:VisibilityState,available:Record<string,string[]>):PublicView{return{v:1,center,zoom,sources:Object.fromEntries(Object.keys(available).filter(id=>Object.hasOwn(sourcePolicies,id)).map(id=>[id,v.sourceEnabled[id]!==false])),categories:Object.fromEntries(Object.entries(available).filter(([id])=>Object.hasOwn(sourcePolicies,id)).map(([id,cats])=>[id,Object.fromEntries(cats.map(cat=>[cat,v.categoryMask[id]?.[cat]!==false]))]))};}
export function parsePublicView(text:string,available:Record<string,string[]>):PublicView{
 requireValue(utf8Bytes(text)<=16384,'Shared view exceeds16KiB.');const value:unknown=JSON.parse(text);validateJsonTree(value);exactKeys(value,['v','center','zoom','sources','categories']);requireValue(value.v===1&&Array.isArray(value.center)&&value.center.length===2&&value.center.every(coordinate)&&typeof value.zoom==='number'&&Number.isFinite(value.zoom)&&value.zoom>=-4&&value.zoom<=4,'Invalid shared map view.');
 for(const mask of [value.sources,value.categories])requireValue(!!mask&&typeof mask==='object'&&!Array.isArray(mask)&&Object.keys(mask).length<=5,'Invalid public masks.');
 const sources=value.sources as Record<string,unknown>,categories=value.categories as Record<string,unknown>;requireValue(Object.keys(sources).length===Object.keys(categories).length&&Object.keys(sources).every(id=>Object.hasOwn(categories,id)),'Shared masks do not match.');
 for(const [id,on] of Object.entries(sources)){requireValue(Object.hasOwn(sourcePolicies,id)&&Object.hasOwn(available,id)&&bool(on),'Unknown, private or unavailable website source.');const cats=categories[id];requireValue(!!cats&&typeof cats==='object'&&!Array.isArray(cats)&&Object.keys(cats).length<=2000,'Invalid category masks.');for(const [key,on] of Object.entries(cats))requireValue(available[id].includes(key)&&bool(on),'Unknown or unavailable source category.');}
 return value as unknown as PublicView;
}
export interface ChangeRow{id:string;types:('added'|'missing'|'renamed'|'moved'|'other')[];before:{title:string;x:number|null;y:number|null}|null;after:{title:string;x:number|null;y:number|null}|null}
export function sourceChanges(before:SourceSnapshot|undefined,after:SourceSnapshot){const previous=new Map(before?.records.map(r=>[r.id,r])??[]),next=new Map(after.records.map(r=>[r.id,r])),rows:ChangeRow[]=[];for(const id of new Set([...previous.keys(),...next.keys()])){const a=previous.get(id),b=next.get(id),types:ChangeRow['types']=[];if(!a)types.push('added');else if(!b)types.push('missing');else{if(a.title!==b.title)types.push('renamed');if(a.rawGeometry.x!==b.rawGeometry.x||a.rawGeometry.y!==b.rawGeometry.y)types.push('moved');if(JSON.stringify(a)!==JSON.stringify(b)&&!types.length)types.push('other');}if(types.length)rows.push({id,types,before:a?{title:a.title,x:a.rawGeometry.x??null,y:a.rawGeometry.y??null}:null,after:b?{title:b.title,x:b.rawGeometry.x??null,y:b.rawGeometry.y??null}:null});}return rows;}

export function fieldGuideIdentities(f:FieldGuide|undefined):string[]{return f?[...new Set([...f.tracking.filter(t=>t.key.startsWith('[')).map(t=>t.identity),...f.duplicateDecisions.flatMap(d=>[d.a,d.b]),...f.routes.flatMap(r=>r.waypoints.flatMap(w=>w.kind==='record'&&w.key.startsWith('[')?[w.identity]:[]))])]:[];}
