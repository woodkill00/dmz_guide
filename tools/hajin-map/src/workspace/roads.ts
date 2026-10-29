import {validateJsonTree,utf8Bytes} from './validation.ts';

export type XY=[number,number];
export interface RoadNode{id:string;x:number;y:number}
export interface RoadEdge{id:string;from:string;to:string;direction:'both'|'forward';blocked:boolean;points:XY[]}
export interface RoadGraph{kind:'dmz-road-network';version:1;mapId:'hajin';coordinateSpaceVersion:'hajin-official-v1-4096';name:string;attribution:string;verification:'unverified'|'observed';nodes:RoadNode[];edges:RoadEdge[]}
export const graphLimits={nodes:5000,edges:10000,vertices:20000,bytes:2*1024*1024};
export function requireValue(ok:unknown,message:string):asserts ok{if(!ok)throw Error(message);}
export function exactKeys(v:unknown,keys:string[]):asserts v is Record<string,unknown>{requireValue(!!v&&typeof v==='object'&&!Array.isArray(v)&&Object.keys(v).length===keys.length&&keys.every(k=>Object.hasOwn(v,k)),'Unexpected fields.');}
export const validText=(v:unknown,max:number,empty=false):v is string=>typeof v==='string'&&v.length<=max&&(empty||!!v.trim());
export const coordinate=(v:unknown):v is number=>typeof v==='number'&&Number.isFinite(v)&&v>=0&&v<=4096;
export function pointValid(v:unknown):v is XY{return Array.isArray(v)&&v.length===2&&v.every(coordinate);}
export const distance=(a:XY,b:XY)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
export const length=(points:XY[])=>points.slice(1).reduce((n,p,i)=>n+distance(points[i],p),0);
export function validateRoadGraph(value:unknown):asserts value is RoadGraph{
 validateJsonTree(value);exactKeys(value,['kind','version','mapId','coordinateSpaceVersion','name','attribution','verification','nodes','edges']);
 requireValue(value.kind==='dmz-road-network'&&value.version===1&&value.mapId==='hajin'&&value.coordinateSpaceVersion==='hajin-official-v1-4096','Wrong road network map/version.');
 requireValue(validText(value.name,160)&&validText(value.attribution,1000)&&['unverified','observed'].includes(value.verification as string),'Road name, attribution or verification is invalid.');
 requireValue(Array.isArray(value.nodes)&&value.nodes.length<=graphLimits.nodes&&Array.isArray(value.edges)&&value.edges.length<=graphLimits.edges,'Road network count limit exceeded.');
 const nodes=new Map<string,XY>();for(const n of value.nodes){exactKeys(n,['id','x','y']);requireValue(validText(n.id,128)&&!n.id.startsWith('@')&&!nodes.has(n.id)&&coordinate(n.x)&&coordinate(n.y),'Invalid or duplicate road node.');nodes.set(n.id,[n.x,n.y]);}
 const ids=new Set<string>();let vertices=0;for(const e of value.edges){exactKeys(e,['id','from','to','direction','blocked','points']);requireValue(validText(e.id,128)&&!ids.has(e.id)&&typeof e.from==='string'&&typeof e.to==='string'&&e.from!==e.to&&nodes.has(e.from)&&nodes.has(e.to),'Invalid road edge identity/endpoints.');ids.add(e.id);requireValue(['both','forward'].includes(e.direction as string)&&typeof e.blocked==='boolean'&&Array.isArray(e.points)&&e.points.length>=2&&e.points.length<=2000&&e.points.every(pointValid),'Invalid road geometry/direction.');vertices+=e.points.length;const points=e.points as XY[];requireValue(distance(points[0],nodes.get(e.from)!)<.001&&distance(points.at(-1)!,nodes.get(e.to)!)<.001&&length(points)>.001,'Road geometry must meet its junction nodes and have positive length.');}
 requireValue(vertices<=graphLimits.vertices,'Road vertex budget exceeded.');requireValue(utf8Bytes(JSON.stringify(value))<=graphLimits.bytes,'Road network exceeds2MiB.');
}
export function parseRoadGraph(text:string):RoadGraph{requireValue(utf8Bytes(text)<=graphLimits.bytes,'Road file exceeds2MiB.');const v:unknown=JSON.parse(text);validateRoadGraph(v);return v;}
export function emptyRoadGraph():RoadGraph{return{kind:'dmz-road-network',version:1,mapId:'hajin',coordinateSpaceVersion:'hajin-official-v1-4096',name:'My road network',attribution:'Road centerlines authored locally; not independently verified.',verification:'unverified',nodes:[],edges:[]};}
interface Projection{edge:RoadEdge;point:XY;distance:number;along:number;total:number;before:XY[];after:XY[]}
export function projectOnEdge(p:XY,edge:RoadEdge):Projection{
 let best:Projection|undefined,along=0;const total=length(edge.points);
 for(let i=1;i<edge.points.length;i++){const a=edge.points[i-1],b=edge.points[i],segment=distance(a,b);if(segment===0)continue;const t=Math.max(0,Math.min(1,((p[0]-a[0])*(b[0]-a[0])+(p[1]-a[1])*(b[1]-a[1]))/(segment*segment))),q:XY=[a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])],d=distance(p,q);if(!best||d<best.distance)best={edge,point:q,distance:d,along:along+t*segment,total,before:[...edge.points.slice(0,i),q],after:[q,...edge.points.slice(i)]};along+=segment;}
 requireValue(best,'Cannot project onto zero-length road.');return best;
}
export function nearestRoad(p:XY,graph:RoadGraph):Projection|null{let best:Projection|null=null;for(const e of graph.edges){if(e.blocked)continue;const q=projectOnEdge(p,e);if(!best||q.distance<best.distance||(q.distance===best.distance&&e.id<best.edge.id))best=q;}return best;}
interface Arc{to:string;cost:number;points:XY[]}
class Heap{items:{id:string;cost:number}[]=[];push(v:{id:string;cost:number}){const a=this.items;a.push(v);let i=a.length-1;while(i){const p=(i-1)>>1;if(a[p].cost<=v.cost)break;a[i]=a[p];i=p;}a[i]=v;}pop(){const a=this.items,result=a[0],last=a.pop()!;if(a.length){let i=0;while(i*2+1<a.length){let c=i*2+1;if(c+1<a.length&&a[c+1].cost<a[c].cost)c++;if(a[c].cost>=last.cost)break;a[i]=a[c];i=c;}a[i]=last;}return result;}}
export interface RoadLeg{road:XY[];connectors:XY[][];roadLength:number;connectorLength:number;error:string|null}
export function roadRoute(graph:RoadGraph,start:XY,end:XY,maxSnap=160):RoadLeg{
 const fail=(error:string):RoadLeg=>({road:[],connectors:[],roadLength:0,connectorLength:0,error});
 const a=nearestRoad(start,graph),b=nearestRoad(end,graph);if(!a||!b)return fail('No usable roads are available.');if(a.distance>maxSnap||b.distance>maxSnap)return fail('Waypoint is outside road coverage (maximum160px off-road connector).');
 const adj=new Map<string,Arc[]>(),add=(from:string,to:string,points:XY[])=>{const list=adj.get(from)??[];list.push({to,points,cost:length(points)});adj.set(from,list);};
 for(const e of [...graph.edges].sort((a,b)=>a.id.localeCompare(b.id))){if(e.blocked)continue;add(e.from,e.to,e.points);if(e.direction==='both')add(e.to,e.from,[...e.points].reverse());}
 const S='@start',T='@end';add(S,a.edge.to,a.after);if(a.edge.direction==='both'||a.along<.001)add(S,a.edge.from,[...a.before].reverse());if(a.total-a.along<.001)add(S,a.edge.to,[a.point]);
 add(b.edge.from,T,b.before);if(b.edge.direction==='both'||b.total-b.along<.001)add(b.edge.to,T,[...b.after].reverse());if(b.along<.001)add(b.edge.from,T,[b.point]);
 if(a.edge.id===b.edge.id&&(a.along<=b.along||a.edge.direction==='both')){
  const lo=Math.min(a.along,b.along),hi=Math.max(a.along,b.along);let run=0;const interior:XY[]=[];for(let i=1;i<a.edge.points.length-1;i++){run+=distance(a.edge.points[i-1],a.edge.points[i]);if(run>lo+.0001&&run<hi-.0001)interior.push(a.edge.points[i]);}const pts:XY[]=[a.point,...(a.along<=b.along?interior:interior.reverse()),b.point];add(S,T,pts);
 }
 const heap=new Heap(),costs=new Map<string,number>([[S,0]]),previous=new Map<string,{from:string;arc:Arc}>();heap.push({id:S,cost:0});let work=0;
 while(heap.items.length){const current=heap.pop();if(current.cost!==costs.get(current.id))continue;if(current.id===T)break;for(const arc of adj.get(current.id)??[]){if(++work>100000)return fail('Road solve work limit reached.');const cost=current.cost+arc.cost;if(cost<(costs.get(arc.to)??Infinity)){costs.set(arc.to,cost);previous.set(arc.to,{from:current.id,arc});heap.push({id:arc.to,cost});}}}
 if(!costs.has(T))return fail('No connected road path between the nearest road snaps; check junctions, blocked roads and direction.');
 const arcs:XY[][]=[];let id=T;while(id!==S){const step=previous.get(id)!;arcs.push(step.arc.points);id=step.from;}const road=arcs.reverse().flat().filter((p,i,all)=>i===0||distance(p,all[i-1])>.0001),connectors:XY[][]=[];if(a.distance>.05)connectors.push([start,a.point]);if(b.distance>.05)connectors.push([b.point,end]);return{road,connectors,roadLength:costs.get(T)!,connectorLength:a.distance+b.distance,error:null};
}
/** Shared endpoints are explicit junctions; an interior crossing never creates one. */
export function addRoad(graph:RoadGraph,points:XY[],connect=true):RoadGraph{
 const next=structuredClone(graph);requireValue(points.length>=2&&points.length<=2000&&points.every(pointValid),'Enter2..2000 in-map X,Y vertices.');const pts=points.map(p=>[...p] as XY);
 const endpoint=(index:number)=>{const p=pts[index];let node=next.nodes.find(n=>distance([n.x,n.y],p)<.001);if(!node&&connect)node=[...next.nodes].filter(n=>distance([n.x,n.y],p)<=6).sort((a,b)=>distance([a.x,a.y],p)-distance([b.x,b.y],p))[0];if(node){pts[index]=[node.x,node.y];return node.id;}
  const projection=connect?nearestRoad(p,next):null;node={id:crypto.randomUUID(),x:p[0],y:p[1]};if(projection&&projection.distance<=6&&projection.along>.001&&projection.total-projection.along>.001){node.x=projection.point[0];node.y=projection.point[1];const e=projection.edge;next.edges=next.edges.filter(x=>x.id!==e.id);next.edges.push({...e,id:crypto.randomUUID(),to:node.id,points:projection.before},{...e,id:crypto.randomUUID(),from:node.id,points:projection.after});pts[index]=[node.x,node.y];}next.nodes.push(node);return node.id;};
 const from=endpoint(0),to=endpoint(pts.length-1);next.edges.push({id:crypto.randomUUID(),from,to,direction:'both',blocked:false,points:pts});next.verification='unverified';validateRoadGraph(next);return next;
}
