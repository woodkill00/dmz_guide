import test from 'node:test';
import assert from 'node:assert/strict';
import {codSharedIcon,hubSharedIcon,loadSharedHajinIcons} from '../src/x01/shared-icons.ts';

const generation='11111111-1111-1111-1111-111111111111';
const sources=['official','codcentral','mapgenie'].map(id=>({id,generation,snapshot:`/maps/hajin/captures/${generation}/${id}/markers.json`,iconDirectory:`/maps/hajin/captures/${generation}/${id}/icons/`}));
const bySource:Record<string,[string,string][]>= {official:[['dmz_exfil','exfil.png'],['dmz_ammoCache','ammo.png']],codcentral:[['safe','safe.svg'],['bounty','bounty.svg'],['key','key.png']],mapgenie:[['mapgenie-28409','spawn.png']]};
function fixture(overrides:Record<string,string>={}){return (async(path:string)=>{
  if(path==='/maps/hajin/current-captures.local.json')return new Response(JSON.stringify({version:1,sources}));
  const source=sources.find(row=>row.snapshot===path);
  if(source)return new Response(JSON.stringify({categories:bySource[source.id].map(([id,file])=>({id,icon:overrides[id]??source.iconDirectory+file}))}));
  return new Response('',{status:404});
}) as typeof fetch;}
test('X01 shared symbols follow current Hajin capture categories only for equivalent types',async()=>{
  const icons=await loadSharedHajinIcons(fixture());
  assert.equal(hubSharedIcon('safe',icons),icons.safe);
  assert.equal(hubSharedIcon('exfiltration',icons),icons.exfil);
  assert.equal(hubSharedIcon('emergency-exfil',icons),icons.exfil);
  assert.equal(codSharedIcon('key',icons),icons.key);
  assert.equal(codSharedIcon('bounty',icons),icons.bounty);
  assert.equal(codSharedIcon('spawn',icons),icons.spawn);
  assert.equal(hubSharedIcon('key-room',icons),undefined);
  assert.equal(hubSharedIcon('weapon-locker',icons),undefined);
});
test('X01 shared symbol lookup rejects foreign paths and falls back when local captures are missing',async()=>{
  const icons=await loadSharedHajinIcons(fixture({safe:'https://example.com/unsafe.svg',bounty:'/maps/hajin/captures/../secret.svg'}));
  assert.equal(icons.safe,undefined);assert.equal(icons.bounty,undefined);assert.ok(icons.exfil);
  const missing=await loadSharedHajinIcons((async()=>new Response('',{status:404})) as typeof fetch);
  assert.deepEqual(missing,{});
});
