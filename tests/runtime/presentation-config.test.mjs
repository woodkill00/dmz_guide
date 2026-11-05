import test from 'node:test';import assert from 'node:assert/strict';
import {resolvePresentation,validatePresentationFlags} from '../../src/ui/presentation-config.mjs';
const flags={version:1,surfaces:{guide:'legacy',map:'legacy','safe-runs':'legacy',studio:'legacy',manager:'legacy'}};
test('071 variants are trusted per-surface defaults with validated process precedence',()=>{
 assert.equal(resolvePresentation('map',{flags,override:undefined}).variant,'legacy');
 assert.equal(resolvePresentation('safe-runs',{flags,override:'modern'}).variant,'modern');
 assert.throws(()=>resolvePresentation('map',{flags,override:'unknown'}));assert.throws(()=>resolvePresentation('unknown',{flags}));
 assert.throws(()=>validatePresentationFlags({...flags,surfaces:{guide:'modern'}}));
 assert.throws(()=>validatePresentationFlags({...flags,extra:true}));
});
