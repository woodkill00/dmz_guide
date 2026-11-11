import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {filteredHubMarkers,hubName,validateHubSnapshot} from '../src/x01/dmzhub-model.ts';

const raw=JSON.parse(readFileSync(new URL('../src/x01/dmzhub-snapshot.json',import.meta.url),'utf8'));
test('X01 DMZHub snapshot retains both complete floor feeds and source categories',()=>{
  const data=validateHubSnapshot(raw);
  assert.equal(data.markers.length,125);
  assert.equal(data.markers.filter(row=>row.floor===1).length,76);
  assert.equal(data.markers.filter(row=>row.floor===2).length,49);
  assert.equal(data.categories.length,21);
  const safe=data.categories.find(row=>row.slug==='safe')!;
  assert.equal(filteredHubMarkers(data,1,new Set([safe.id]),'').length,7);
  assert.equal(filteredHubMarkers(data,2,new Set([safe.id]),'').length,0);
  assert.match(hubName(data,data.markers.find(row=>row.categoryId===safe.id)!),/^Safe #\d+$/);
  assert.equal(data.markers.filter(row=>row.path).length,8);
});
test('X01 DMZHub snapshot rejects unsafe coordinates, IDs and icon names',()=>{
  for(const mutate of [
    (data:any)=>{data.markers[0].x=1.2;},
    (data:any)=>{data.markers[0].id='other';},
    (data:any)=>{data.categories[0].icon='../bad.webp';},
    (data:any)=>{data.markers.find((row:any)=>row.path).path[0][0]=-1;},
  ]){const copy=structuredClone(raw);mutate(copy);assert.throws(()=>validateHubSnapshot(copy));}
});
