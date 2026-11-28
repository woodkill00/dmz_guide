import assert from "node:assert/strict";
import { test } from "node:test";
import snapshot from "../src/x01/codcentral-snapshot.json" with { type: "json" };
import { filteredMarkers, layerNames, validateSnapshot } from "../src/x01/model.ts";
import { parseX01 } from "../scripts/capture-x01.mjs";

test("112 hidden rooms have an explicit category and never imply a key requirement",()=>{
  const value=parseX01('<button class="dmzm-pin" data-slug="x01-hidden-synthetic" data-name="SYNTHETIC hidden room" data-floor="1" data-layer="hidden" data-grid="C2" data-text="SYNTHETIC keypad access, no keycard report." style="left:30%;top:40%"></button>');
  assert.equal(value.markers[0].layer,'hidden');
  assert.equal(layerNames.hidden,'Hidden rooms');
  validateSnapshot(value);
  assert.equal(filteredMarkers(value,1,new Set(['hidden']),'').length,1);
  assert.equal(filteredMarkers(value,1,new Set(['key']),'').length,0);
  assert.equal(filteredMarkers(value,2,new Set(['hidden']),'').length,0);
  assert.throws(()=>validateSnapshot({...value,markers:[{...value.markers[0],layer:'unreviewed'}]}));
});

test("X01 source snapshot uses one coordinate frame and separate floor identities",()=>{
  const value=validateSnapshot(snapshot);
  assert.equal(value.markers.length,52);
  assert.equal(value.markers.filter(row=>row.floor===1).length,31);
  assert.equal(value.markers.filter(row=>row.floor===2).length,21);
  assert.equal(value.markers.filter(row=>row.layer==='hidden').length,4);
  assert.equal(new Set(value.markers.map(row=>row.id)).size,value.markers.length);
  assert(value.markers.every(row=>!!layerNames[row.layer]));
  assert.equal(filteredMarkers(value,1,new Set(["printer"]),"").length,1);
  assert.equal(filteredMarkers(value,2,new Set(["printer"]),"").length,0);
  assert.throws(()=>validateSnapshot({...value,coordinateVersion:"hajin-official-v1-4096"}));
  assert.throws(()=>validateSnapshot({...value,markers:[value.markers[0],value.markers[0]]}));
});
test("X01 importer rejects malformed, duplicate and out-of-frame source buttons",()=>{
  const tag=(id:string,x:string,y:string)=>`<button class="dmzm-pin" data-slug="${id}" data-name="SYNTHETIC Room" data-floor="1" data-layer="poi" data-grid="C2" data-text="Synthetic test" style="left:${x}%;top:${y}%"></button>`;
  assert.equal(parseX01(tag("x01-test", "30", "40"),"2026-11-11T00:00:00Z").markers[0].x,.3);
  assert.throws(()=>parseX01(tag("x01-test", "130", "40")));
  assert.throws(()=>parseX01(tag("x01-test", "30", "40")+tag("x01-test", "32", "40")));
  assert.throws(()=>parseX01(tag("x01-test", "30", "40").replace('data-name="SYNTHETIC Room"','data-name="<script>"')));
});
