import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {emptyState,encodeStoredState,decodeStoredState,makeBackup} from '../src/x01/workbench-store.ts';
const hash=(bytes:Uint8Array)=>createHash('sha256').update(bytes).digest('hex');
test('095 X01 storage reads legacy, stores bounded bytes and preserves exact photo/backup bytes',async()=>{
 const legacy=emptyState();legacy.points.push({id:'mine_synthetic',name:'Synthetic codec fixture',kind:'Place',floor:1,x:.5,y:.5,notes:'Test only',createdAt:'2026-11-20T12:00:00.000Z'});
 const bytes=Uint8Array.from(Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64'));
 legacy.photos.push({id:'photo_synthetic',pointId:'mine_synthetic',name:'synthetic.png',mime:'image/png',blob:new Blob([bytes],{type:'image/png'})});
 assert.equal(decodeStoredState(legacy),legacy);
 const oldBackup=structuredClone(await makeBackup(legacy));
 const pending=encodeStoredState(legacy);legacy.revision=9;legacy.points[0].name='Changed live draft';const stored=await pending;
 assert.equal(stored.state.revision,0);assert.equal(stored.state.points[0].name,'Synthetic codec fixture');assert.ok(stored.state.photos[0].bytes instanceof Uint8Array);
 const decoded=decodeStoredState(structuredClone(stored));assert.equal(hash(new Uint8Array(await decoded.photos[0].blob.arrayBuffer())),hash(bytes));assert.deepEqual((await makeBackup(decoded)).state,oldBackup.state);
 for(const value of [null,{...stored,version:2},{...stored,state:{...stored.state,photos:[{...stored.state.photos[0],bytes:new Uint8Array(2*1024*1024+1)}]}},{...stored,state:{...stored.state,revision:'invalid'}},{...stored,extra:true}])assert.throws(()=>decodeStoredState(value));
});
