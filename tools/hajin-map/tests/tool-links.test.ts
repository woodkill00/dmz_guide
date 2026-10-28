import {test} from 'node:test';
import assert from 'node:assert/strict';
import {toolTargets,parseToolTarget,workspaceDestination} from '../src/tool-links.ts';
test('026 help routes admit only one exact known tool and never accept action-like or arbitrary targets',()=>{
  for(const tool of toolTargets)assert.equal(parseToolTarget('?tool='+tool),tool);
  for(const query of ['', '?tool=icons&tool=points','?tool=constructor','?tool=__proto__','?tool=save','?tool=reset','?tool=https://bad.invalid','?tool=%3Cscript%3E','?tool=Icons'])assert.equal(parseToolTarget(query),null);
  assert.deepEqual(workspaceDestination('icons'),{tab:'icons'});
  assert.deepEqual(workspaceDestination('saved-views'),{tab:'explore',section:'presets'});
  assert.deepEqual(workspaceDestination('backgrounds'),{tab:'sources',focus:'background-file'});
  assert.equal(workspaceDestination('updates'),null);
});
