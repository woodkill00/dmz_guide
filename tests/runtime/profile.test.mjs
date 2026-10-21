import{test}from'node:test';import assert from'node:assert/strict';import{newProfile,validateProfile,parseProfile,previewProfile}from'../../src/domain/profile.mjs';
const pack={id:'demo:pack',contentVersion:'1',items:[{id:'demo:x'}],recipes:[],objectives:[]};
test('profile round trip and unknown references',()=>{const p=newProfile(pack);p.inventory['retired:x']=5;assert.deepEqual(parseProfile(JSON.stringify(p)),p);assert.deepEqual(previewProfile(p,pack).unresolved,['retired:x']);});
for(const value of[-1,.5,Infinity,1000001])test(`reject quantity ${value}`,()=>{const p=newProfile(pack);p.inventory['demo:x']=value;assert.throws(()=>validateProfile(p));});
test('bounds/version/hostile fields',()=>{assert.throws(()=>parseProfile('{"__proto__":1}'));const p=newProfile(pack);p.schemaVersion=2;assert.throws(()=>validateProfile(p));assert.throws(()=>parseProfile(' '.repeat(1048577)));});
test('mismatch preview',()=>{const p=newProfile(pack);p.contentVersion='old';assert.equal(previewProfile(p,pack).versionMismatch,true);});
