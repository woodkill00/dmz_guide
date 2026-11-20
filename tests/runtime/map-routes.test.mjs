import test from 'node:test';
import assert from 'node:assert/strict';
import {mapPath,mapEntry,MAP_ENTRIES} from '../../src/domain/map-routes.mjs';
test('095 namespaced canonical routes preserve deep queries/hash and standalone paths',()=>{
 for(const [input,expected] of [['/','/map/'],['/safes.html?start=G6#order','/map/safes/?start=G6#order'],['/x01-workspace.html?floor=2','/map/x01/?floor=2'],['/maps/hajin/v1/background.webp','/map/maps/hajin/v1/background.webp'],['/?tool=routes','/map/?tool=routes'],['/map/loot/','/map/loot/'],['https://example.com/a','https://example.com/a'],['blob:test','blob:test'],['//example.com/a','//example.com/a']]){
  assert.equal(mapPath(input),expected);assert.equal(mapPath(input,{standalone:true}),input);
 }
 assert.equal(mapEntry('/map/x01/'),'x01-workspace.html');
 for(const entry of MAP_ENTRIES)assert.equal(mapEntry('/map/'+entry),entry);
 for(const path of ['/maps/','/map/unknown.html','/map/../index.html','/map/assets/a.js'])assert.equal(mapEntry(path),null);
});
