import { test } from 'node:test';
import assert from 'node:assert/strict';
import { iconTemplates, validateIconDesign, iconSVG } from '../src/workspace/icon-design.ts';
import { emptyWorkspace } from '../src/workspace/model.ts';
import { validateWorkspace, exportPrivateBackup, parsePrivateBackup } from '../src/workspace/backup.ts';
import { commitIcon } from '../src/workspace/icons.ts';

test('025 original SVG templates are deterministic bounded self-contained vectors with escaped descriptions',()=>{
  assert.ok(iconTemplates.length>=6);
  for(const t of iconTemplates){
    const d=validateIconDesign(t.design),svg=iconSVG(d,'<script>alert("x")</script>&');
    assert.equal(svg,iconSVG(d,'<script>alert("x")</script>&'));
    assert.match(svg,/viewBox="0 0 64 64"/);
    assert.ok(svg.length<6000);
    assert.doesNotMatch(svg,/<script|<image|<foreignObject|\bon\w+=|href=|url\(/i);
    assert.match(svg,/&lt;script&gt;/);
  }
});
test('025 recipes reject unknown fields, hostile values, accessors and out-of-bounds settings',()=>{
  const good=iconTemplates[0].design;
  for(const bad of [{version:2},{frame:'<svg>'},{symbol:'unknown'},{foreground:'url(https://bad.invalid)'},{label:'<x>'},{label:'LONG'},{borderWidth:-1},{borderWidth:4.1},{symbolSize:33},{rotation:360},{rotation:NaN},{script:'alert(1)'}])assert.throws(()=>validateIconDesign({...good,...bad}));
  let called=false;const accessor={...good};Object.defineProperty(accessor,'label',{enumerable:true,get(){called=true;return 'A';}});
  assert.throws(()=>validateIconDesign(accessor));assert.equal(called,false);
  assert.throws(()=>iconSVG(good,''));assert.throws(()=>iconSVG(good,'x'.repeat(201)));
  assert.equal(validateIconDesign({...good,label:'A1'}).label,'A1');
});
test('025 optional designs survive private backups, old raster icons remain valid and identical pixels do not overwrite references',()=>{
  const s=emptyWorkspace(),icon={id:'a'.repeat(64),base64:'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=',width:1,height:1,description:'SYNTHETIC icon',rightsDeclaration:'Original synthetic pixels'};
  commitIcon(s,icon);validateWorkspace(s);assert.deepEqual(parsePrivateBackup(JSON.stringify(exportPrivateBackup(s))).icons,s.icons);
  commitIcon(s,{...icon,description:"New metadata must not replace original",design:validateIconDesign(iconTemplates[0].design)});assert.equal(s.icons.length,1);assert.equal(s.icons[0].description,icon.description);assert.deepEqual(s.icons[0].design,iconTemplates[0].design);
  const original=structuredClone(s.icons[0]);commitIcon(s,{...icon,description:'New copy',design:iconTemplates[1].design});assert.equal(s.icons.length,1);assert.deepEqual(s.icons[0],original);
  const restored=parsePrivateBackup(JSON.stringify(exportPrivateBackup(s)));assert.deepEqual(restored.icons,s.icons);
  const invalid=structuredClone(restored);(invalid.icons[0].design as any).external='https://bad.invalid';assert.throws(()=>validateWorkspace(invalid));assert.deepEqual(s.icons[0],original);
});
