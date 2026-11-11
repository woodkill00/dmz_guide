import assert from 'node:assert/strict';
import {routeSharedIconFixture,sharedIconPaths} from './x01-shared-icon-fixture.mjs';

export async function runX01HubBrowser(browser,base){
  const context=await browser.newContext({viewport:{width:1280,height:800}}),errors=[],external=[];
  const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==','base64');
  await context.route('**/*',async route=>{const url=new URL(route.request().url());if(url.origin!==base){external.push(url.href);return route.abort();}if(await routeSharedIconFixture(route,png))return;if(url.pathname.startsWith('/maps/x01/dmzhub/'))return route.fulfill({body:png,contentType:'image/png'});return route.continue();});
  const page=await context.newPage();page.on('pageerror',error=>errors.push(error.message));
  try{
    await page.goto(`${base}/x01-dmzhub.html?marker=dmzhub-667`);
    await page.locator('#x01-results button').first().waitFor();
    await page.locator('.x01-shared-marker').first().waitFor();
    assert.ok(await page.locator(`.x01-shared-marker img[src="${sharedIconPaths.dmz_exfil}"]`).count()>0);
    assert.ok(await page.locator(`.x01-layers img[src="${sharedIconPaths.dmz_exfil}"]`).count()>0);
    assert.match(await page.locator('#x01-detail-body').textContent(),/Superintendent's Office/);
    assert.equal(await page.locator('input[name="x01-floor"]:checked').inputValue(),'2');
    assert.match(await page.locator('#x01-count').textContent(),/49 of 49/);
    assert.equal(await page.locator('.leaflet-marker-icon').count(),49);
    await page.locator('input[name="x01-floor"][value="1"]').check();
    assert.match(await page.locator('#x01-count').textContent(),/76 of 76/);
    await page.locator('#x01-search').fill('safe');
    assert.match(await page.locator('#x01-count').textContent(),/7 of 76/);
    await page.locator('#x01-results button').first().click();
    assert.match(await page.locator('#x01-detail-body').textContent(),/Safe #/);
    await page.reload();await page.locator('#x01-results button').first().waitFor();
    assert.match(await page.locator('#x01-detail-body').textContent(),/Safe #/);
    await page.locator('#x01-hide-all').click();assert.match(await page.locator('#x01-count').textContent(),/0 of 76/);
    assert.match(await page.locator('#x01-detail-body').textContent(),/Safe #/);
    await page.locator('#x01-show-all').click();assert.match(await page.locator('#x01-count').textContent(),/76 of 76/);
    assert.equal(await page.getByRole('link',{name:/COD Central X01 map/}).count(),1);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.locator('#x01-fit').click();
    await page.waitForTimeout(250);
    assert.equal(await page.evaluate(()=>{const map=document.querySelector('#x01-map').getBoundingClientRect();return [...document.querySelectorAll('#x01-map .leaflet-marker-icon')].every(element=>{const box=element.getBoundingClientRect(),x=box.left+box.width/2,y=box.top+box.height/2;return x>=map.left&&x<=map.right&&y>=map.top&&y<=map.bottom;});}),true,'Fit floor keeps every first-floor marker in the mobile viewport');
    const fallback=await context.newPage();
    await fallback.route('**/official/icons/exfil.png',route=>route.fulfill({status:404,body:'Missing Hajin icon'}));
    await fallback.goto(`${base}/x01-dmzhub.html`);
    await fallback.locator('.x01-shared-marker img[src^="/maps/x01/dmzhub/icons/"]').first().waitFor();
    assert.match(await fallback.locator('#x01-count').textContent(),/76 of 76/);
    await fallback.close();
    const missing=await context.newPage();
    await missing.route('**/maps/x01/dmzhub/tiles/**',route=>route.fulfill({status:404,body:'Missing local tile'}));
    await missing.goto(`${base}/x01-dmzhub.html`);
    await missing.waitForFunction(()=>document.querySelector('#x01-image-status')?.textContent.includes('Floor tiles missing'));
    assert.match(await missing.locator('#x01-count').textContent(),/76 of 76/);
    await missing.close();
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    return ['X01 DMZHub 76/49 markers, source icons, filters, stable details, deep links, reload, mobile and missing tiles passed'];
  }finally{await context.close();}
}
