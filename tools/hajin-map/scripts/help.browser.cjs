const assert=require('node:assert/strict');
const fs=require('node:fs');
exports.runHelpBrowser=async function(parent,base,fixture){
  const browser=parent.context().browser(),context=await browser.newContext({viewport:{width:1440,height:1000}}),errors=[],external=[],mutations=[];
  let missing=false;
  const routing=async route=>{const u=new URL(route.request().url());if(u.origin!==base){external.push(u.href);return route.abort();}if(u.pathname.startsWith('/__map-updates')&&route.request().method()!=='GET'){mutations.push(u.pathname);return route.abort();}if(u.pathname.endsWith('/official/markers.json'))return route.fulfill({json:fixture.snapshot});if(u.pathname.endsWith('/background.webp'))return missing?route.fulfill({status:404,body:'Synthetic missing map'}):route.fulfill({body:fixture.image,contentType:'image/png'});if(u.pathname.startsWith('/maps/hajin/official/icons/'))return route.fulfill({body:fixture.image,contentType:'image/png'});if(u.pathname.startsWith('/maps/'))return route.fulfill({status:404,body:'Synthetic only'});return route.continue();};
  await context.route('**/*',routing);const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  const read=()=>page.evaluate(async()=>{const {openWorkspace}=await import('/src/workspace/store.ts');const db=await openWorkspace();try{return(await db.read()).current?.data??null;}finally{db.close();}});
  let nojs;
  try{
    await page.goto(base+'/?tool=points');await page.locator('#point-title').waitFor();
    await page.evaluate(async()=>{const {openWorkspace}=await import('/src/workspace/store.ts');const {emptyWorkspace}=await import('/src/workspace/model.ts');const db=await openWorkspace();try{const h=await db.read();if(!h.current)await db.commit(emptyWorkspace(),0);}finally{db.close();}});
    const before=await read();await page.locator('#point-title').fill('SYNTHETIC retained help draft');
    // Help remains available with an open modal via map information after closing the workspace.
    await page.locator('#close-workspace').click();
    const popup=context.waitForEvent('page');await page.locator('#open-help').click();const help=await popup;help.setDefaultTimeout(12000);help.on('pageerror',e=>errors.push(e.message));await help.waitForLoadState('domcontentloaded');
    await page.locator('#workspace-open').click();assert.equal(await page.locator('#point-title').inputValue(),'SYNTHETIC retained help draft');
    assert.equal(await help.title(),'How to use your map — Hajin Field Guide');assert.equal(await help.locator('main section').count(),14);
    assert.match(await help.locator('#explore').textContent(),/names, categories and source names/);
    assert.match(await help.locator('#backgrounds').textContent(),/Preview background[\s\S]*Keep local background[\s\S]*Calibrate background[\s\S]*Validate calibration[\s\S]*Accept registration/);
    const ids=await help.locator('[id]').evaluateAll(nodes=>nodes.map(n=>n.id));assert.equal(new Set(ids).size,ids.length);
    for(const href of await help.locator('a[href^="#"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('href'))))assert.ok(ids.includes(href.slice(1)),'Missing help anchor '+href);
    const sourceURLs=await help.locator('#sources a').evaluateAll(nodes=>nodes.map(n=>n.href));assert.deepEqual(sourceURLs,[
      'https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin','https://codmunity.gg/dmz/map','https://wzstats.gg/mw4/dmz/map','https://codcentral.net/blog/mw4-dmz-map/','https://mapgenie.io/call-of-duty-modern-warfare-4/maps/hajin-dmz']);
    const targets=[...new Set(await help.locator('a[href^="/?tool="]').evaluateAll(nodes=>nodes.map(n=>new URL(n.href).searchParams.get('tool'))))];
    const tabs={health:'health',points:'points',icons:'icons',sources:'sources',review:'review',backups:'backup',explore:'explore',duplicates:'explore','saved-views':'explore',completeness:'explore',discrepancies:'explore',backgrounds:'sources'};
    const sections={explore:'search',duplicates:'duplicates','saved-views':'presets',completeness:'coverage',discrepancies:'flags'};
    assert.equal(targets.length,17);
    for(const tool of targets){await help.goto(base+'/?tool='+tool);await help.locator('#workspace-open:enabled').waitFor();if(tabs[tool]){await help.locator(`#workspace-tab-${tabs[tool]}[aria-current="true"]`).waitFor();assert.equal(await help.locator('#workspace-dialog').evaluate(n=>n.open),true);if(sections[tool])await help.locator(`#explore-${sections[tool]}[aria-current="true"]`).waitFor();if(tool==='backgrounds')assert.equal(await help.locator('#background-file').evaluate(n=>n===document.activeElement),true);}else if(tool==='layers'){assert.equal(await help.locator('#layers-dialog').evaluate(n=>n.open),true);}else if(tool!=='map'){assert.equal(await help.locator('#map-key').isVisible(),true);}assert.equal(await help.locator('#tool-navigation-error').count(),0);}
    assert.deepEqual(await read(),before);assert.equal(await page.locator('#point-title').inputValue(),'SYNTHETIC retained help draft');
    await help.goto(base+'/?tool=icons&tool=points');await help.locator('#workspace-open:enabled').waitFor();assert.equal(await help.locator('#workspace-dialog').evaluate(n=>n.open),false);
    await help.goto(base+'/?tool=%3Cscript%3E');await help.locator('#workspace-open:enabled').waitFor();assert.equal(await help.locator('#workspace-dialog').evaluate(n=>n.open),false);
    missing=true;await help.goto(base+'/?tool=icons');await help.locator('#icon-studio').waitFor();await help.locator('#retry').waitFor();
    await help.goto(base+'/help.html');await help.setViewportSize({width:360,height:800});await help.keyboard.press('Tab');assert.equal(await help.locator('.skip').evaluate(n=>n===document.activeElement),true);await help.keyboard.press('Enter');assert.equal(await help.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    fs.mkdirSync('.local/browser-checks',{recursive:true});await help.screenshot({path:'.local/browser-checks/synthetic-help-mobile.png'});await help.setViewportSize({width:1440,height:1000});await help.screenshot({path:'.local/browser-checks/synthetic-help-desktop.png'});
    nojs=await browser.newContext({javaScriptEnabled:false,viewport:{width:360,height:800}});await nojs.route('**/*',routing);const staticPage=await nojs.newPage();await staticPage.goto(base+'/help.html');assert.equal(await staticPage.locator('main section').count(),14);assert.match(await staticPage.locator('body').innerText(),/Download private backup/);assert.equal(await staticPage.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    // Storage failure cannot leave a tool deep link silently unopened.
    const failed=await context.newPage();await failed.addInitScript(()=>{indexedDB.open=()=>{throw new Error('Synthetic storage unavailable');};});await failed.goto(base+'/?tool=icons');await failed.locator('#tool-navigation-error').waitFor();assert.match(await failed.locator('#tool-navigation-error').textContent(),/Workspace tools could not open/);await failed.close();
    assert.deepEqual(mutations,[]);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
    return ['Help has complete shipped-workflow sections, valid contents/provider links and every direct tool destination without auto updates or saved-state changes','Help preserves the existing map draft and works with missing terrain, failed storage, unknown targets, disabled JavaScript and360px keyboard navigation'];
  }finally{await nojs?.close();await context.close();}
};
if(require.main===module){(async()=>{const {createServer}=await import('vite'),{chromium}=require('playwright');let server,browser;try{server=await createServer({define:{'import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS':'"0"'},server:{host:'127.0.0.1',port:5281,strictPort:true,hmr:false}});await server.listen();browser=await chromium.launch({chromiumSandbox:true});const context=await browser.newContext(),parent=await context.newPage();const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aV1sAAAAASUVORK5CYII=','base64');const snapshot={schemaVersion:1,sourcePage:'https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin',capturedAt:'2026-10-28T00:00:00Z',categories:[],records:[]};console.log(await exports.runHelpBrowser(parent,'http://127.0.0.1:5281',{image,snapshot}));}finally{await browser?.close();await server?.close();}})().catch(e=>{console.error(e);process.exitCode=1;});}
