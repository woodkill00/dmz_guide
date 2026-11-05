const assert=require('node:assert/strict');
exports.runNavigationBrowser=async function(parent,base,fixture){
 const t=await require('./upgrades.browser.cjs').isolated(parent,base,fixture),{page,ready,read}=t;
 let nojs;const extraErrors=[];t.context.on('page',p=>p.on('pageerror',e=>extraErrors.push(e.message)));
 try{
  // Fixed guide links are intercepted with labelled synthetic content; no service probes.
  let guideRequests=0;
  await t.context.route('http://127.0.0.1:4173/**',route=>{guideRequests++;return route.fulfill({contentType:'text/html',body:'<!doctype html><title>SYNTHETIC guide destination</title><h1>SYNTHETIC guide</h1>'});});
  await ready('points');await page.locator('#point-title').fill('SYNTHETIC retained navigation draft');await page.locator('#close-workspace').click();
  await page.locator('#zoom-in:enabled').waitFor();
  const camera=await page.evaluate(async()=>{const {viewer}=await import('/src/main.ts');viewer.map.setView([2048,2048],2,{animate:false});const c=viewer.map.containerPointToLatLng(viewer.map.getSize().divideBy(2));return[c.lat,c.lng,viewer.map.getZoom()];});
  await page.locator('#close-key').click();await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  assert.deepEqual(await page.evaluate(async()=>{const {viewer}=await import('/src/main.ts');const c=viewer.map.containerPointToLatLng(viewer.map.getSize().divideBy(2));return[c.lat,c.lng,viewer.map.getZoom()];}),camera,'Key resize keeps the exact displayed center and zoom');
  const before=JSON.stringify(await read()),nav=page.getByRole('navigation',{name:'Main navigation',exact:true});assert.equal(await nav.count(),1);assert.equal(guideRequests,0);
  const more=nav.locator('details.nav-more');if(!await more.evaluate(e=>e.open))await more.locator(':scope > summary').click();
  const boss=nav.getByRole('link',{name:'Boss checklist',exact:true});assert.equal(await boss.getAttribute('target'),'_blank');const bossEvent=t.context.waitForEvent('page');await boss.focus();await page.keyboard.press('Enter');const bossTab=await bossEvent;await bossTab.locator('#boss-list-heading').waitFor();assert.equal(await bossTab.getByRole('navigation',{name:'Main navigation'}).locator('a[aria-current=page]').textContent(),'Boss checklist');await bossTab.close();assert.equal(JSON.stringify(await read()),before);
  if(!await more.evaluate(e=>e.open))await more.locator(':scope > summary').click();
  const items=nav.locator('a[href="http://127.0.0.1:4173/items/"]');assert.equal(await items.getAttribute('rel'),'noopener noreferrer');assert.equal(await items.getAttribute('target'),'_blank');
  const popup=t.context.waitForEvent('page');await items.focus();await page.keyboard.press('Enter');const tab=await popup;await tab.waitForLoadState();assert.equal(new URL(tab.url()).pathname,'/items/');assert.equal(new URL(tab.url()).search,'');await tab.close();
  await page.locator('#workspace-open').click();assert.equal(await page.locator('#point-title').inputValue(),'SYNTHETIC retained navigation draft');await page.locator('#close-workspace').click();assert.equal(JSON.stringify(await read()),before);
  await page.setViewportSize({width:320,height:800});await page.evaluate(()=>document.documentElement.style.fontSize='200%');if(!await more.evaluate(e=>e.open))await more.locator(':scope > summary').click();
  const bounds=await nav.locator('.nav-more>div').boundingBox();assert.ok(bounds.x>=0&&bounds.x+bounds.width<=321);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
  // Real text resizing rather than only changing the root while nav stays in fixed px.
  assert.ok(await items.evaluate(e=>parseFloat(getComputedStyle(e).fontSize)>=23));
  const {default:AxeBuilder}=await import('@axe-core/playwright');assert.deepEqual((await new AxeBuilder({page}).include('nav[aria-label="Main navigation"]').withTags(['wcag2a','wcag2aa','wcag21aa']).analyze()).violations,[]);
  nojs=await parent.context().browser().newContext({javaScriptEnabled:false,viewport:{width:320,height:800}});
  await nojs.route('**/*',route=>new URL(route.request().url()).origin===base?route.continue():route.abort());
  const staticPage=await nojs.newPage();for(const path of ['/','/help.html']){await staticPage.goto(base+path);const n=staticPage.getByRole('navigation',{name:'Main navigation',exact:true});assert.equal(await n.count(),1);await n.locator('summary').click();assert.equal(await n.locator('a[href="/help.html"]').isVisible(),true);}
  assert.deepEqual(extraErrors,[]);t.verify();return ['Shared Main navigation is static on map/help, isolated on cross-app keyboard navigation, and preserves an unsaved draft','Shared navigation reflows at320px with real200%text, bounded dropdown, no-JS links and configured axe clean'];
 }finally{await nojs?.close();await t.context.close();}
};
