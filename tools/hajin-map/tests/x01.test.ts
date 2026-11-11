import assert from "node:assert/strict";
import { test } from "node:test";
import snapshot from "../src/x01/codcentral-snapshot.json" with { type: "json" };
import { filteredMarkers, layerNames, validateSnapshot } from "../src/x01/model.ts";
import { parseX01 } from "../scripts/capture-x01.mjs";

test("X01 source snapshot uses one coordinate frame and separate floor identities",()=>{
  const value=validateSnapshot(snapshot);
  assert.equal(value.markers.length,48);
  assert.equal(value.markers.filter(row=>row.floor===1).length,30);
  assert.equal(value.markers.filter(row=>row.floor===2).length,18);
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
