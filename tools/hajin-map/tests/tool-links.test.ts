import destinations from '../../../src/ui/map-destinations.json' with {type:'json'};
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

test('042 planner deep links are exact, navigation-only and cover boss/reference/route tools',()=>{for(const target of ['boss-checklist','routes','missions','reference-library','workspace-search','match-mode'])assert.deepEqual(workspaceDestination(parseToolTarget('?tool='+target)!),{tab:'planner',plannerSection:target});for(const query of ['?tool=enabled','?tool=largeMarkers','?tool=update','?tool=apply','?tool=delete','?tool=boss-checklist&tool=routes','?tool=Boss-checklist'])assert.equal(parseToolTarget(query),null);assert.equal(new Set(toolTargets).size,toolTargets.length);});

test('042 static registry and strict tool allowlist cannot drift',()=>{assert.deepEqual([...toolTargets].sort(),[...destinations.tools,...destinations.planner].map(([id])=>id).sort());});
