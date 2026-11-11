// Synthetic area data only. Never reads captured provider assets or player storage.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
const server = await createServer({define:{"import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS":'"0"'},server:{host:"127.0.0.1",port:5279,strictPort:true,hmr:false}});
await server.listen();
try {
 for(const [name,engine] of Object.entries({chromium,firefox,webkit})) {
  const browser = await engine.launch();
  try {
   const context=await browser.newContext(),page=await context.newPage(),errors=[];
   page.on("pageerror",error=>errors.push(error.message));
   await page.goto("about:blank");
   const png=await page.evaluate(()=>{const canvas=document.createElement("canvas");canvas.width=canvas.height=64;canvas.getContext("2d").fillRect(0,0,64,64);return canvas.toDataURL().split(",")[1];});
   const image=Buffer.from(png,"base64");
   await context.route("**/maps/hajin/v1/background.webp",route=>route.fulfill({body:image,contentType:"image/png"}));
   await context.route("**/maps/hajin/official/icons/*",route=>route.fulfill({body:image,contentType:"image/png"}));
   await context.route("**/maps/hajin/official/markers.json",route=>route.fulfill({json:{schemaVersion:1,sourcePage:"https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",capturedAt:"2026-11-10T00:00:00Z",synthetic:true,categories:[{id:"poiLabel",name:"Synthetic places",group:"Locations",icon:"/maps/hajin/official/icons/synthetic.png"}],records:[{id:"synthetic-area",name:"Synthetic Item Area",category:"poiLabel",mapId:"hajin",coordinateSpaceVersion:"hajin-official-v1-4096",x:.2,y:.3},{id:"synthetic-other",name:"Unrelated synthetic place",category:"poiLabel",mapId:"hajin",coordinateSpaceVersion:"hajin-official-v1-4096",x:.8,y:.8}]}}));
   await page.goto("http://127.0.0.1:5279/?tool=explore&area=Synthetic%20Item%20Area");
   await page.locator("#explorer-search").waitFor({state:"attached"});
   assert.equal(await page.locator("#explorer-search").inputValue(),'"Synthetic Item Area"');
   assert.match(await page.locator("#item-area-context").innerText(),/Spawns are not guaranteed/);
   await page.locator("#explorer-results .search-result").waitFor({state:"attached"});
   assert.equal(await page.locator("#explorer-results .search-result").count(),1);
   const areaRing=page.locator("[data-item-area-highlight]");
   await areaRing.waitFor();
   assert.equal(await areaRing.count(),1);
   await page.locator('[data-item-area-highlight-notice="true"]').waitFor();
   assert.match(await page.locator('[data-item-area-highlight-notice="true"]').innerText(), /Synthetic Item Area · highlighted/);
   await page.locator("#zoom-in:enabled").waitFor();
   await page.waitForFunction(()=>{const ring=document.querySelector("[data-item-area-highlight]"),map=document.querySelector("#map");if(!ring||!map)return false;const a=ring.getBoundingClientRect(),b=map.getBoundingClientRect();return a.width>=40&&a.left>=b.left&&a.right<=b.right&&a.top>=b.top&&a.bottom<=b.bottom;});
   const notice=page.locator('[data-item-area-highlight-notice="true"]');
   assert(await notice.evaluate(node=>{const a=node.getBoundingClientRect(),b=document.querySelector('#toggle-key').getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;}));
   assert(await notice.evaluate(node=>{const a=node.getBoundingClientRect(),b=document.querySelector('.map-bottom-bar').getBoundingClientRect();return a.right<=b.left||a.left>=b.right||a.bottom<=b.top||a.top>=b.bottom;}));
   await page.locator("#zoom-in").click();
   await page.waitForTimeout(800);
   assert.equal(await areaRing.count(),1);
   await page.evaluate(async()=>{const {viewer}=await import("/src/main.ts");viewer.map.setView([3500,3500],1,{animate:false});});
   await page.locator("#find-locations").click();
   const jump=page.locator("#explorer-results [data-search-jump]").first();
   const before=await page.evaluate(async()=>{const {viewer}=await import("/src/main.ts");return viewer.map.getCenter();});
   await jump.click();
   await page.waitForFunction(async before=>{const {viewer}=await import("/src/main.ts");const center=viewer.map.getCenter();return Math.abs(center.lat-before.lat)+Math.abs(center.lng-before.lng)>1;},before);
   await page.waitForTimeout(500);
   const after=await page.evaluate(async()=>{const {viewer}=await import("/src/main.ts");return viewer.map.getCenter();});
   assert.notDeepEqual(after,before);
   assert.equal(await areaRing.count(),1);
   await page.getByRole("button",{name:"Clear area highlight",exact:true}).click();
   assert.equal(await areaRing.count(),0);
   await page.locator("#find-locations").click();
   await page.locator("#explorer-search").fill('"Synthetic Item Area"');
   await page.waitForTimeout(400);
   assert.equal(await areaRing.count(),0);

   await page.goto("http://127.0.0.1:5279/?tool=explore&area=Unknown%20Area");
   await page.locator("#explorer-search").waitFor();
   await page.getByText("No results match these filters.",{exact:false}).waitFor();
   assert.equal(await page.locator("[data-item-area-highlight]").count(),0);
   await page.goto("http://127.0.0.1:5279/?tool=explore&area=A&area=B");
   await page.locator("#explorer-search").waitFor();
   assert.equal(await page.locator("#explorer-search").inputValue(),"");
   assert.equal(await page.locator("#item-area-context").count(),0);
   assert.deepEqual(errors,[]);
   console.log(`PASS ${name} item-area map search: automatic visible highlight/framing, zoom persistence, result jump, dismiss persistence, honest empty state and duplicate rejection`);
  } finally {await browser.close();}
 }
} finally {await server.close();}
