import type {Annotation,Workspace,IconAsset} from './model.ts';
import {emptyWorkspace} from './model.ts';
import {emptyFieldGuide,validateFieldGuide,waypointToken,type Waypoint,type PlannedRoute,type FieldGuide} from './field-guide.ts';
import {annotationValid,saveAnnotation} from './annotations.ts';
import {validateWorkspace} from './backup.ts';
import {verifyIcon} from './icons.ts';
import {verifyEvidence} from './owned-assets.ts';
import {exactKeys,requireValue,validText,type RoadGraph} from './roads.ts';
import {validateJsonTree,utf8Bytes} from './validation.ts';
import {sha256} from './import.ts';
export interface Mission{id:string;name:string;objectives:{id:string;text:string;done:boolean;waypoint:Waypoint|null}[]}
export interface Collection{id:string;name:string;members:Waypoint[];visible:boolean}
export interface RoutePreference{routeId:string;graphSignature:string;avoidedEdges:string[];visible:boolean}
export interface Toolkit{version:1;missions:Mission[];collections:Collection[];routePrefs:RoutePreference[];trash:Annotation[]}
export const emptyToolkit=():Toolkit=>({version:1,missions:[],collections:[],routePrefs:[],trash:[]});
export const tools=(f:FieldGuide)=>f.toolkit??(f.toolkit=emptyToolkit());
export function validateStops(stops:unknown,max=100){requireValue(Array.isArray(stops)&&stops.length<=max,'Too many locations.');for(let i=0;i<stops.length;i+=32){const f=emptyFieldGuide();f.routes=[{id:'validation',name:'Validation',mode:'direct',color:'#ffffff',waypoints:stops.slice(i,i+32) as Waypoint[]}];validateFieldGuide(f);}requireValue(new Set((stops as Waypoint[]).map(waypointToken)).size===stops.length,'Duplicate locations.');}
export function validateToolkit(value:unknown):asserts value is Toolkit{
 validateJsonTree(value);exactKeys(value,['version','missions','collections','routePrefs','trash']);requireValue(value.version===1,'Invalid toolkit version.');
 for(const [key,max] of [['missions',20],['collections',30],['routePrefs',20],['trash',20]] as const){const rows=value[key];requireValue(Array.isArray(rows)&&rows.length<=max,'Toolkit limit exceeded.');}
 const t=value as unknown as Toolkit;const unique=(ids:string[])=>requireValue(ids.every(id=>validText(id,128))&&new Set(ids).size===ids.length,'Invalid/duplicate identity.');
 unique(t.missions.map(m=>m.id));unique(t.collections.map(c=>c.id));unique(t.routePrefs.map(r=>r.routeId));unique(t.trash.map(a=>a.id));
 for(const m of t.missions){exactKeys(m,['id','name','objectives']);requireValue(validText(m.name,100)&&Array.isArray(m.objectives)&&m.objectives.length<=32,'Invalid mission.');unique(m.objectives.map(o=>o.id));for(const o of m.objectives){exactKeys(o,['id','text','done','waypoint']);requireValue(validText(o.text,300)&&typeof o.done==='boolean','Invalid objective.');if(o.waypoint!==null)validateStops([o.waypoint]);}}
 for(const c of t.collections){exactKeys(c,['id','name','members','visible']);requireValue(validText(c.name,100)&&typeof c.visible==='boolean','Invalid collection.');validateStops(c.members);}
 for(const r of t.routePrefs){exactKeys(r,['routeId','graphSignature','avoidedEdges','visible']);requireValue(typeof r.visible==='boolean'&&typeof r.graphSignature==='string'&&(r.graphSignature===''||/^[a-f0-9]{64}$/.test(r.graphSignature))&&Array.isArray(r.avoidedEdges)&&r.avoidedEdges.length<=1000,'Invalid route preferences.');unique(r.avoidedEdges);requireValue(!r.avoidedEdges.length||!!r.graphSignature,'Road avoidance needs graph identity.');}
 requireValue(utf8Bytes(JSON.stringify(t.trash))<=2*1024*1024,'Deleted-point bin exceeds2MiB. Restore or permanently remove entries first.');t.trash.forEach(annotationValid);
}
export function addToCollection(f:FieldGuide,id:string,stops:Waypoint[]){const c=tools(f).collections.find(c=>c.id===id);requireValue(c,'Choose a collection first.');const tokens=new Set(c.members.map(waypointToken));for(const stop of stops)if(!tokens.has(waypointToken(stop))){c.members.push(structuredClone(stop));tokens.add(waypointToken(stop));}validateToolkit(tools(f));}
export function routeFromStops(f:FieldGuide,name:string,stops:Waypoint[]){const seen=new Set<string>(),unique=stops.filter(w=>{const token=waypointToken(w);if(seen.has(token))return false;seen.add(token);return true;});requireValue(unique.length>0&&unique.length<=32,'Choose1–32 distinct locations.');requireValue(f.routes.length<20,'Route limit20 reached.');const route:PlannedRoute={id:crypto.randomUUID(),name:name.slice(0,100),color:'#f5cf68',mode:'road',waypoints:structuredClone(unique)};f.routes.push(route);f.activeRouteId=route.id;return route;}
export function trashPoint(state:Workspace,id:string){const point=state.annotations.find(a=>a.id===id);requireValue(point,'Point not found.');state.fieldGuide??=emptyFieldGuide();const t=tools(state.fieldGuide);requireValue(t.trash.length<20,'Deleted-point bin is full. Restore or permanently remove entries first.');const next=structuredClone(t);next.trash.push(structuredClone(point));validateToolkit(next);t.trash=next.trash;state.annotations=state.annotations.filter(a=>a.id!==id);}
export function restorePoint(state:Workspace,id:string){const t=state.fieldGuide?.toolkit,point=t?.trash.find(a=>a.id===id);requireValue(point&&t,'Deleted point unavailable.');requireValue(!state.annotations.some(a=>a.id===id),'A point with this identity already exists.');saveAnnotation(state,point);t.trash=t.trash.filter(a=>a.id!==id);}
const graphCache=new WeakMap<RoadGraph,Promise<string>>();
export function graphFingerprint(graph:RoadGraph){let job=graphCache.get(graph);if(!job){job=sha256(new TextEncoder().encode(JSON.stringify(graph)));graphCache.set(graph,job);}return job;}
export function avoidedGraph(graph:RoadGraph,pref:RoutePreference|undefined,signature:string){if(!pref?.avoidedEdges.length)return graph;requireValue(pref.graphSignature===signature,'Road network changed. Reset or review this route’s road avoidance.');return{...graph,edges:graph.edges.filter(e=>!pref.avoidedEdges.includes(e.id))};}
export interface SelectionPack{kind:'dmz-map-selection';version:1;routes:PlannedRoute[];missions:Mission[];collections:Collection[];points:Annotation[];icons:IconAsset[]}
export interface PackSelection{routes:string[];missions:string[];collections:string[];points:string[]}
export function selectionPack(state:Workspace,selected:PackSelection):SelectionPack{
 const f=state.fieldGuide??emptyFieldGuide(),t=f.toolkit??emptyToolkit(),pack:SelectionPack={kind:'dmz-map-selection',version:1,routes:structuredClone(f.routes.filter(r=>selected.routes.includes(r.id))),missions:structuredClone(t.missions.filter(m=>selected.missions.includes(m.id))),collections:structuredClone(t.collections.filter(c=>selected.collections.includes(c.id))),points:structuredClone(state.annotations.filter(a=>selected.points.includes(a.id))),icons:[]};
 const iconIds=new Set(pack.points.map(a=>a.iconId??state.categoryIcons.find(c=>c.category===a.category)?.iconId));for(const point of pack.points)point.iconId=point.iconId??state.categoryIcons.find(c=>c.category===point.category)?.iconId??null;
 pack.icons=structuredClone(state.icons.filter(i=>iconIds.has(i.id)));validatePack(pack);return pack;
}
export function validatePack(value:unknown):asserts value is SelectionPack{
 requireValue(utf8Bytes(JSON.stringify(value))<=8*1024*1024,'Selection pack exceeds8MiB.');validateJsonTree(value);exactKeys(value,['kind','version','routes','missions','collections','points','icons']);requireValue(value.kind==='dmz-map-selection'&&value.version===1&&Array.isArray(value.points)&&value.points.length<=500,'Invalid selection pack.');
 const pack=value as unknown as SelectionPack,w=emptyWorkspace(),f=emptyFieldGuide();f.routes=pack.routes;f.toolkit={...emptyToolkit(),missions:pack.missions,collections:pack.collections};w.fieldGuide=f;w.annotations=pack.points;w.icons=pack.icons;validateWorkspace(w);requireValue(pack.icons.every(icon=>pack.points.some(p=>p.iconId===icon.id)),'Pack contains an unreferenced icon.');
}
export async function parseSelectionPack(text:string,signal?:AbortSignal){requireValue(utf8Bytes(text)<=8*1024*1024,'Selection pack exceeds8MiB.');const value:unknown=JSON.parse(text);validatePack(value);const deadline=performance.now()+15000;const check=()=>{signal?.throwIfAborted();requireValue(performance.now()<deadline,'Selection pack asset validation timed out.');};for(const icon of value.icons){check();await verifyIcon(icon,signal);}for(const point of value.points)for(const asset of point.attachments??[]){check();await verifyEvidence(asset,signal);}check();return value;}
const canonical=(value:unknown):string=>JSON.stringify(value,(_key,v)=>v&&typeof v==='object'&&!Array.isArray(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
const semanticPoint=(p:Annotation)=>canonical([p.kind,p.title,p.category,p.x,p.y,p.notes,p.evidence,p.verificationState,p.applicability,p.iconId,p.observedAt??'',p.geometry??null,p.metadata??null,p.attachments??[]]);
export function planPack(state:Workspace,pack:SelectionPack){
 validatePack(pack);const projected=structuredClone(state);projected.fieldGuide??=emptyFieldGuide();const f=projected.fieldGuide,t=tools(f),mapping=new Map<string,string>();let added=0,duplicates=0;
 for(const point of pack.points){const match=projected.annotations.find(a=>semanticPoint(a)===semanticPoint(point));if(match){mapping.set(point.id,match.id);duplicates++;continue;}const copy=structuredClone(point);if(copy.id.startsWith('pack-unresolved:')||projected.annotations.some(a=>a.id===copy.id)||t.trash.some(a=>a.id===copy.id))copy.id=crypto.randomUUID();mapping.set(point.id,copy.id);projected.annotations.push(copy);added++;}
 for(const icon of pack.icons)if(!projected.icons.some(i=>i.id===icon.id))projected.icons.push(structuredClone(icon));
 const remap=(w:Waypoint):Waypoint=>{const copy=structuredClone(w);if(copy.kind==='record'&&copy.key.startsWith('custom:')){const id=mapping.get(copy.key.slice(7));if(id){copy.key='custom:'+id;const p=projected.annotations.find(a=>a.id===id)!;const original=w.kind==='record'?pack.points.find(a=>a.id===w.key.slice(7)):undefined;if(original&&w.kind==='record'){if(w.identity===original.updatedAt)copy.identity=p.updatedAt;else if(w.identity===p.updatedAt)copy.key='custom:pack-unresolved:'+id;}}}if(copy.kind==='record'){if(copy.key.startsWith('custom:')&&!mapping.has(w.kind==='record'?w.key.slice(7):'')&&!copy.key.startsWith('custom:pack-unresolved:'))copy.key='custom:pack-unresolved:'+copy.key.slice(7);if(copy.key.startsWith('reviewed:')&&!copy.key.startsWith('reviewed:pack-unresolved:'))copy.key='reviewed:pack-unresolved:'+copy.key.slice(9);}return copy;};
 const stopSemantic=(w:Waypoint)=>w.kind==='manual'?JSON.stringify([w.kind,w.x,w.y,w.label]):JSON.stringify([w.kind,w.key,w.identity]);
 const routeSemantic=(r:PlannedRoute)=>JSON.stringify([r.name,r.color,r.mode,r.waypoints.map(stopSemantic),r.waypoints.map(w=>(r.reached??[]).includes(waypointToken(w)))]);
 for(const route of pack.routes){const copy=structuredClone(route),oldTokens=copy.waypoints.map(waypointToken),oldReached=new Set(copy.reached??[]);copy.waypoints=copy.waypoints.map(remap);if(copy.reached!==undefined)copy.reached=copy.waypoints.flatMap((w,i)=>oldReached.has(oldTokens[i])?[waypointToken(w)]:[]);if(f.routes.some(r=>routeSemantic(r)===routeSemantic(copy))){duplicates++;continue;}if(f.routes.some(r=>r.id===copy.id))copy.id=crypto.randomUUID();f.routes.push(copy);added++;}
 const missionSemantic=(m:Mission)=>JSON.stringify([m.name,m.objectives.map(o=>[o.text,o.done,o.waypoint?stopSemantic(o.waypoint):null])]);
 for(const mission of pack.missions){const copy=structuredClone(mission);copy.objectives=copy.objectives.map(o=>({...o,waypoint:o.waypoint?remap(o.waypoint):null}));if(t.missions.some(m=>missionSemantic(m)===missionSemantic(copy))){duplicates++;continue;}if(t.missions.some(m=>m.id===copy.id))copy.id=crypto.randomUUID();t.missions.push(copy);added++;}
 const collectionSemantic=(c:Collection)=>JSON.stringify([c.name,c.visible,c.members.map(stopSemantic)]);
 for(const collection of pack.collections){const copy=structuredClone(collection);copy.members=copy.members.map(remap);if(t.collections.some(c=>collectionSemantic(c)===collectionSemantic(copy))){duplicates++;continue;}if(t.collections.some(c=>c.id===copy.id))copy.id=crypto.randomUUID();t.collections.push(copy);added++;}
 validateWorkspace(projected);
 const dependencies=[...pack.routes.flatMap(r=>r.waypoints),...pack.collections.flatMap(c=>c.members),...pack.missions.flatMap(m=>m.objectives.flatMap(o=>o.waypoint?[o.waypoint]:[]))].map(remap).filter(w=>w.kind==='record');
 return{projected,added,duplicates,dependencies};
}
