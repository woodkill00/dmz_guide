import {LIMITS,assert,boundedWalk,safeURL} from './limits.mjs';
export function validateSchema(value,schema,root=schema,path='$'){
 if(schema.$ref){assert(schema.$ref.startsWith('#/'),'Only local schema references supported');let target=root;for(const part of schema.$ref.slice(2).split('/'))target=target?.[part.replaceAll('~1','/').replaceAll('~0','~')];assert(target,'Unknown schema reference');return validateSchema(value,target,root,path);}
 if(schema.anyOf){assert(schema.anyOf.some(s=>{try{validateSchema(value,s,root,path);return true;}catch{return false;}}),`${path}: invalid variant`);return;}
 if(schema.allOf)for(const s of schema.allOf)validateSchema(value,s,root,path);
 if(schema.if){let matches=true;try{validateSchema(value,schema.if,root,path);}catch{matches=false;}if(matches&&schema.then)validateSchema(value,schema.then,root,path);}
 if('const'in schema)assert(value===schema.const,`${path}: unsupported value/version`);
 if(schema.enum)assert(schema.enum.includes(value),`${path}: invalid choice`);
 const type=Array.isArray(value)?'array':value===null?'null':typeof value;
 if(schema.type){const allowed=[schema.type].flat();assert(allowed.includes(type)||(allowed.includes('integer')&&Number.isInteger(value)),`${path}: invalid type`);}
 if(typeof value==='number'){assert(Number.isFinite(value),`${path}: nonfinite`);if(schema.minimum!==undefined)assert(value>=schema.minimum,`${path}: too small`);if(schema.maximum!==undefined)assert(value<=schema.maximum,`${path}: too large`);}
 if(typeof value==='string'){if(schema.maxLength!==undefined)assert(value.length<=schema.maxLength,`${path}: text too long`);if(schema.minLength!==undefined)assert(value.length>=schema.minLength,`${path}: text empty`);if(schema.pattern)assert(new RegExp(schema.pattern).test(value),`${path}: invalid format`);if(schema.format==='date')assert(/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value)),`${path}: invalid date`);}
 if(Array.isArray(value)){if(schema.maxItems!==undefined)assert(value.length<=schema.maxItems,`${path}: too many entries`);if(schema.minItems!==undefined)assert(value.length>=schema.minItems,`${path}: too few entries`);if(schema.items)value.forEach((v,i)=>validateSchema(v,schema.items,root,`${path}[${i}]`));}
 else if(value&&typeof value==='object'){for(const k of schema.required||[])assert(Object.hasOwn(value,k),`${path}: missing ${k}`);for(const[k,v]of Object.entries(value)){if(schema.properties?.[k])validateSchema(v,schema.properties[k],root,`${path}.${k}`);else if(schema.additionalProperties===false)throw new Error(`${path}: unexpected field ${k}`);}}
 return value;
}
export const scopeOf=(pack,r)=>r.scope?`${r.scope.gameId}|${r.scope.mode}|${r.scope.build}`:`${pack.game.id}|${pack.game.mode}|${pack.game.build}`;
export function validatePack(pack,schema){boundedWalk(pack);validateSchema(pack,schema);const groups=['sources','items','recipes','objectives','guides','maps','locations','claims','assets'];const all=groups.flatMap(k=>pack[k]);assert(all.length<=LIMITS.records,'Total record limit exceeded');const index=new Map();for(const r of all){assert(!index.has(r.id),`Duplicate ID ${r.id}`);index.set(r.id,r);}
 const ref=(id,group,from,join=false)=>{const r=pack[group].find(x=>x.id===id);assert(r,`Unknown ${group} reference ${id}`);if(join)assert(scopeOf(pack,r)===scopeOf(pack,from),`Scope mismatch ${id}`);return r;};
 for(const s of pack.sources)assert(safeURL(s.url),`Unsafe source URL ${s.id}`);
 for(const r of all){for(const id of r.sourceIds||[])ref(id,'sources',r);if(r.assetId)ref(r.assetId,'assets',r);if(['verified','observed','disputed','stale'].includes(r.status))assert(r.sourceIds?.length||r.sourceId,`Evidence required ${r.id}`);if(pack.game.id==='fictional-training'&&r.status)assert(r.status==='fictional','Fixture facts must be labeled fictional');}
 for(const r of [...pack.recipes,...pack.objectives]){for(const c of r.inputs||r.requirements||[])ref(c.itemId,'items',r,true);for(const id of r.prerequisites)ref(id,'objectives',r,true);if(r.output)ref(r.output.itemId,'items',r,true);}
 for(const item of pack.items){assert(item.unit===(item.kind==='currency'?'dmz-cash':item.kind==='resource'?'resource-unit':'count'),'Item kind/unit mismatch');}for(const item of pack.items)for(const stat of item.stats){for(const id of stat.sourceIds)ref(id,'sources',item);if(stat.value===null)assert(['unknown','unverified','disputed','stale'].includes(stat.status),'Unknown stat must not be verified');if(stat.value!==null){assert(!['unknown','unverified'].includes(stat.status),'Numeric stat status must identify evidence');assert(stat.sourceIds.length,'Numeric stat needs its own evidence');}if(stat.context.rangeMeters)assert(stat.context.rangeMeters.min<=stat.context.rangeMeters.max,'Reversed range');}
 for(const g of pack.guides)for(const id of g.relatedIds)assert(index.has(id),`Unknown related ID ${id}`);
 for(const c of pack.claims){assert(index.has(c.entityId),'Unknown claim target');ref(c.sourceId,'sources',c);}
 for(const l of pack.locations){const m=ref(l.mapId,'maps',l,true);for(const id of l.itemIds)ref(id,'items',l,true);if(l.coordinates){assert(m.extent&&m.floors.includes(l.coordinates.floor),'Unknown coordinate frame/floor');const[x0,y0,x1,y1]=m.extent;assert(l.coordinates.x>=x0&&l.coordinates.x<=x1&&l.coordinates.y>=y0&&l.coordinates.y<=y1,'Coordinates outside extent');}}
 for(const m of pack.maps)if(m.extent)assert(m.extent[0]<m.extent[2]&&m.extent[1]<m.extent[3],'Invalid map extent');
 assert(pack.assets.length<=LIMITS.assets,'Too many assets');let bytes=0;for(const a of pack.assets){assert(/^assets\/[a-zA-Z0-9_-]+\.(png|jpe?g|webp)$/.test(a.path),'Unsafe asset path');assert(a.bytes<=LIMITS.assetBytes&&a.width<=LIMITS.dimension&&a.height<=LIMITS.dimension&&a.width*a.height<=LIMITS.pixels,'Asset size exceeds limits');assert(!a.sourceUrl||safeURL(a.sourceUrl),'Unsafe asset source');bytes+=a.bytes;}assert(bytes<=LIMITS.totalAssetBytes,'Total asset limit exceeded');
 const graph=new Map(pack.objectives.map(r=>[r.id,r.prerequisites]));checkGraph(graph);
 // Selected recipe routes are checked by the planner; unused alternatives are not blanket-rejected.

 return pack;
}

export function checkGraph(graph){const color=new Map();let work=0;for(const root of graph.keys()){if(color.get(root)===2)continue;const stack=[{id:root,next:0}],path=[];while(stack.length){assert(++work<=500000,'Graph work limit exceeded');const frame=stack.at(-1);if(!color.has(frame.id)){color.set(frame.id,1);path.push(frame.id);}const edges=graph.get(frame.id)||[];if(frame.next>=edges.length){color.set(frame.id,2);stack.pop();path.pop();continue;}const child=edges[frame.next++];if(color.get(child)===1)throw new Error(`Dependency cycle: ${[...path,child].join(' -> ')}`);if(color.get(child)!==2)stack.push({id:child,next:0});}}}
