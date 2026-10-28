// Original/synthetic icons and map fixtures only. Never reads owner profiles/assets.
const assert=require('node:assert/strict');
const fs=require('node:fs');
async function downloaded(page,action){const event=page.waitForEvent('download');await action();const handle=await event,stream=await handle.createReadStream(),chunks=[];for await(const c of stream)chunks.push(c);return {name:handle.suggestedFilename(),bytes:Buffer.concat(chunks)};}
exports.runIconStudioBrowser=async function(parent,base,fixture){
 const context=await parent.context().browser().newContext({viewport:{width:1440,height:1000}}),errors=[],external=[],checks=[];
 await context.route('**/*',route=>{const u=new URL(route.request().url());if(u.origin!==base){external.push(u.href);return route.abort();}if(u.pathname.endsWith('/official/markers.json'))return route.fulfill({json:fixture.snapshot});if(u.pathname.endsWith('/background.webp')||u.pathname.startsWith('/maps/hajin/official/icons/'))return route.fulfill({body:fixture.image,contentType:'image/png'});if(u.pathname.startsWith('/maps/'))return route.fulfill({status:404,body:'Synthetic fixture only'});return route.continue();});
 const page=await context.newPage();page.setDefaultTimeout(10000);page.on('pageerror',e=>errors.push(e.message));
 const ready=async()=>{await page.goto(base);await page.locator('#workspace-open:enabled').waitFor();await page.locator('#workspace-open').click();};
 const read=()=>page.evaluate(async()=>{const {openWorkspace}=await import('/src/workspace/store.ts');const db=await openWorkspace();try{return(await db.read()).current.data;}finally{db.close();}});
 const saved=async name=>{await page.getByRole('heading',{name,exact:true}).waitFor();await page.waitForFunction(()=>document.querySelector('#workspace-body')?.inert!==true);};
 try{
  await ready();await page.locator('#workspace-tab-icons').click();
  assert.equal(await page.locator('[data-icon-template]').count(),6);
  await page.locator('[data-icon-template="medical"]').click();await page.locator('#icon-design-description').fill('SYNTHETIC medical icon');await page.locator('#icon-design-label').fill('A1');
  await page.locator('#icon-design-foreground').fill('#ffdd11');await page.locator('#icon-design-rotation').fill('15');
  await page.waitForFunction(()=>[...document.querySelectorAll('.icon-design-previews img')].every(i=>i.complete&&i.naturalWidth===256));
  await page.locator('#workspace-tab-points').click();assert.ok(await page.locator('#icon-studio').isVisible());
  assert.match(await page.locator('#workspace-message').textContent(),/Save or cancel/);
  await page.locator('#icon-design-description').fill('');assert.equal(await page.locator('#save-designed-icon').isDisabled(),true);
  await page.locator('#icon-design-description').fill('SYNTHETIC medical icon');
  await page.locator('#icon-design-rotation').fill('360');assert.equal(await page.locator('#save-designed-icon').isDisabled(),true);
  await page.locator('#icon-design-rotation').fill('15');
  const vector=await downloaded(page,()=>page.locator('#download-designed-svg').click());
  assert.match(vector.name,/\.svg$/);assert.match(vector.bytes.toString(),/<title[^>]*>SYNTHETIC medical icon/);assert.doesNotMatch(vector.bytes.toString(),/<script|href=|<image|foreignObject|onload=/i);
  const raster=await downloaded(page,()=>page.locator('#download-designed-png').click());assert.equal(raster.bytes.readUInt32BE(16),256);
  // One form owns the draft; the other remains inert until explicit cancellation.
  assert.equal(await page.locator('#icon-raster-upload').evaluate(n=>n.inert),true);
  assert.equal(await page.locator('#icon-design-label').inputValue(),'A1');await page.locator('#cancel-workspace-draft').click();
  assert.equal(await page.locator('#icon-raster-upload').evaluate(n=>n.inert),false);
  // Content-identical raster-only image gains a recipe without changing ID/pixels/metadata.
  await page.locator('#custom-icon-file').setInputFiles({name:'synthetic-designed.png',mimeType:'image/png',buffer:raster.bytes});await page.locator('#custom-icon-description').fill('SYNTHETIC medical icon');await page.locator('#custom-icon-rights').fill('Synthetic locally authored design');await page.locator('#custom-icon-owned').check();
  assert.equal(await page.locator('#icon-studio').evaluate(n=>n.inert),true);
  await page.locator('#preview-custom-icon').click();await page.locator('#commit-custom-icon').click();await saved('SYNTHETIC medical icon');const rasterOnly=(await read()).icons[0];assert.equal(rasterOnly.design,undefined);
  await page.locator('[data-icon-template="medical"]').click();await page.locator('#icon-design-description').fill('SYNTHETIC medical icon');await page.locator('#icon-design-label').fill('A1');await page.locator('#icon-design-foreground').fill('#ffdd11');await page.locator('#icon-design-rotation').fill('15');
  await page.locator('#save-designed-icon').click();await page.waitForFunction(()=>document.querySelector('#workspace-message')?.textContent.includes('Editable design added'));await saved('SYNTHETIC medical icon');let state=await read();assert.equal(state.icons[0].id,rasterOnly.id);assert.equal(state.icons[0].rightsDeclaration,rasterOnly.rightsDeclaration);assert.equal(state.icons.length,1);const first=structuredClone(state.icons[0]);assert.equal(first.design.label,'A1');
  assert.equal(first.base64,raster.bytes.toString('base64'));
  const alpha=await page.evaluate(async base64=>{const image=new Image();image.src='data:image/png;base64,'+base64;await image.decode();const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d');x.drawImage(image,0,0);return x.getImageData(0,0,1,1).data[3];},first.base64);assert.equal(alpha,0);
  await page.locator('#workspace-tab-points').click();await page.locator('#point-title').fill('SYNTHETIC designed POI');await page.locator('#point-icon').selectOption(first.id);await page.locator('#point-owned').check();await page.locator('#save-point').click();await saved('SYNTHETIC designed POI');
  await page.reload();await page.locator('#workspace-open:enabled').waitFor();await page.locator('#workspace-open').click();await page.locator('#workspace-tab-icons').click();assert.equal((await read()).icons[0].design.label,'A1');
  const firstCard=page.locator(`[data-library-icon="${first.id}"]`);
  await firstCard.getByRole('button',{name:'Edit a copy',exact:true}).click();assert.equal(await page.locator('#icon-design-label').inputValue(),'A1');
  await page.locator('#save-designed-icon').click();await page.waitForFunction(()=>document.querySelector('#workspace-message')?.textContent.includes('Already saved'));assert.equal((await read()).icons.length,1);
  await firstCard.getByRole('button',{name:'Edit a copy',exact:true}).click();await page.locator('#icon-design-description').fill('SYNTHETIC variant');await page.locator('#icon-design-frame').selectOption('shield');await page.locator('#icon-design-background').fill('#1144cc');await page.locator('#save-designed-icon').click();await saved('SYNTHETIC variant');
  state=await read();assert.equal(state.icons.length,2);assert.deepEqual(state.icons[0],first);assert.equal(state.annotations[0].iconId,first.id);
  checks.push('SVG studio creates original editable icons; live previews/validation, immutable variants, content dedup and POI assignment survive reload');
  // Category assignment uses the existing saved PNG identity.
  const variant=state.icons[1],card=page.locator(`[data-library-icon="${variant.id}"]`);await card.getByLabel('Category to use this icon by default').fill('SYNTHETIC categories');await card.getByRole('button',{name:'Set category icon',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#workspace-message')?.textContent==='Category icon updated');assert.equal((await read()).categoryIcons[0].iconId,variant.id);await page.locator('#cancel-workspace-draft').click();
  await page.locator('#workspace-tab-backup').click();const backup=await downloaded(page,()=>page.locator('#export-workspace').click());assert.deepEqual(JSON.parse(backup.bytes).workspace.icons,state.icons);
  await page.locator('#workspace-backup-file').setInputFiles({name:'synthetic.json',mimeType:'application/json',buffer:backup.bytes});await page.locator('#preview-restore-workspace').click();await page.locator('#restore-preview').waitFor();await downloaded(page,()=>page.locator('#backup-before-restore').click());await page.locator('#confirm-restore-workspace').click();await page.waitForFunction(()=>document.querySelector('#workspace-message')?.textContent.includes('Backup restored'));
  assert.deepEqual((await read()).icons,state.icons);await page.locator('#workspace-tab-icons').click();await page.locator(`[data-library-icon="${variant.id}"]`).getByRole('button',{name:'Edit a copy',exact:true}).click();assert.equal(await page.locator('#icon-design-frame').inputValue(),'shield');await page.locator('#cancel-workspace-draft').click();
  checks.push('SVG and transparent PNG downloads match saved pixels; private backup/restore retains editable designs and category assignments');
  // Cancel leaves persisted library unchanged, and invalid restored recipes fail safely.
  await page.locator('[data-icon-template="danger"]').click();await page.locator('#icon-design-description').fill('SYNTHETIC cancelled draft');await page.locator('#cancel-workspace-draft').click();assert.equal((await read()).icons.length,2);
  // Abort after SVG decode but before PNG callback; late work must never save.
  await page.locator('[data-icon-template="danger"]').click();await page.locator('#icon-design-description').fill('SYNTHETIC aborted creation');
  await page.evaluate(()=>{window.__originalToBlob=HTMLCanvasElement.prototype.toBlob;HTMLCanvasElement.prototype.toBlob=function(callback,...args){window.__originalToBlob.call(this,blob=>{window.__lateIconBlob=()=>callback(blob);},...args);};});
  await page.locator('#save-designed-icon').click();await page.waitForFunction(()=>typeof window.__lateIconBlob==='function');
  assert.equal(await page.locator('#icon-studio').evaluate(n=>n.parentElement.inert),true);
  await page.locator('#cancel-workspace-processing').click();await page.waitForFunction(()=>document.querySelector('#workspace-message')?.textContent.includes('cancelled'));
  await page.evaluate(()=>{HTMLCanvasElement.prototype.toBlob=window.__originalToBlob;window.__lateIconBlob();});
  assert.equal((await read()).icons.length,2);assert.equal(await page.locator('#icon-design-description').inputValue(),'SYNTHETIC aborted creation');await page.locator('#cancel-workspace-draft').click();
  // A real transaction failure preserves the draft and existing icons; retry succeeds.
  await page.locator('[data-icon-template="loot"]').click();await page.locator('#icon-design-description').fill('SYNTHETIC quota retry');
  await page.evaluate(()=>{window.__originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(this.name==='state'&&key==='current')throw new DOMException('Synthetic icon quota failure','QuotaExceededError');return window.__originalPut.call(this,value,key);};});
  await page.locator('#save-designed-icon').click();await page.waitForFunction(()=>document.querySelector('#workspace-message')?.textContent.includes('quota'));
  assert.equal((await read()).icons.length,2);assert.equal(await page.locator('#icon-design-description').inputValue(),'SYNTHETIC quota retry');
  await page.evaluate(()=>{IDBObjectStore.prototype.put=window.__originalPut;});await page.locator('#save-designed-icon').click();await saved('SYNTHETIC quota retry');assert.equal((await read()).icons.length,3);
  checks.push('SVG icon cancellation ignores late encoding callbacks; quota failure preserves the saved library/draft and supports retry');
  await page.setViewportSize({width:360,height:800});await page.locator('#icon-design-description').focus();await page.keyboard.press('ControlOrMeta+A');await page.keyboard.type('SYNTHETIC keyboard icon');await page.keyboard.press('Tab');assert.equal(await page.locator('#icon-design-frame').evaluate(n=>n===document.activeElement),true);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.equal(await page.locator('#workspace-dialog').evaluate(d=>d.scrollWidth<=d.clientWidth+1),true);
  fs.mkdirSync('.local/browser-checks',{recursive:true});await page.locator('#workspace-dialog').evaluate(d=>d.scrollTop=0);await page.screenshot({path:'.local/browser-checks/synthetic-icon-studio-mobile.png'});await page.setViewportSize({width:1440,height:1000});await page.locator('#workspace-dialog').evaluate(d=>d.scrollTop=0);await page.screenshot({path:'.local/browser-checks/synthetic-icon-studio-desktop.png'});
  checks.push('SVG studio dirty guards/cancel and keyboard controls work at360px without horizontal overflow');
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);return checks;
 }finally{await context.close();}
};

if(require.main===module){
 (async()=>{const {createServer}=await import('vite'),{chromium}=require('playwright');let server,browser;try{server=await createServer({define:{'import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS':'"0"'},server:{host:'127.0.0.1',port:5280,strictPort:true,hmr:false}});await server.listen();browser=await chromium.launch({chromiumSandbox:true});const context=await browser.newContext(),parent=await context.newPage();const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=','base64');const snapshot={schemaVersion:1,sourcePage:'https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin',capturedAt:'2026-10-28T00:00:00Z',categories:[],records:[]};console.log(await exports.runIconStudioBrowser(parent,'http://127.0.0.1:5280',{image,snapshot}));}finally{await browser?.close();await server?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
}
