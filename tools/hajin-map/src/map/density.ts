import type {ExplorerRecord} from '../workspace/explorer-index.ts';
export interface MarkerCluster{key:string;x:number;y:number;members:ExplorerRecord[]}
/** Stable screen-size grid; all admitted records occur in exactly one bucket. */
export function markerClusters(records:ExplorerRecord[],zoom:number):MarkerCluster[]{
 if(records.length>30000)throw Error('Marker grouping exceeds30,000 admitted records.');
 const cell=48*16/Math.pow(2,zoom),buckets=new Map<string,MarkerCluster>();
 for(const r of records){if(!r.visible||r.x===null||r.y===null)continue;const key=`${Math.floor(r.x/cell)},${Math.floor(r.y/cell)}`,b=buckets.get(key)??{key,x:0,y:0,members:[]};b.x+=r.x;b.y+=r.y;b.members.push(r);buckets.set(key,b);}
 return [...buckets.values()].map(b=>({...b,x:b.x/b.members.length,y:b.y/b.members.length}));
}
