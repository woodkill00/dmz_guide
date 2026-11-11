import assert from "node:assert/strict";

export async function runX01Browser(browser,base){
  const context=await browser.newContext({viewport:{width:1280,height:800}}),errors=[],external=[];
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScL/nwAAAABJRU5ErkJggg==","base64");
  await context.route("**/*",route=>{const url=new URL(route.request().url());if(url.origin!==base){external.push(url.href);return route.abort();}if(url.pathname.startsWith("/maps/x01/"))return route.fulfill({body:png,contentType:"image/png"});return route.continue();});
  const page=await context.newPage();page.on("pageerror",error=>errors.push(error.message));
  try{
    await page.goto(`${base}/x01.html?marker=x01-bounty-station`);
    await page.locator("#x01-results button").first().waitFor();
    assert.match(await page.locator("#x01-detail-body").textContent(),/Bounty Station/);
    assert.equal(await page.locator('input[name="x01-floor"]:checked').inputValue(),"2");
    assert.equal(await page.locator(".x01-grid-label").count(),19);
    await page.locator("#x01-grid").uncheck();
    assert.equal(await page.locator(".x01-grid-label").count(),0);
    await page.locator("#x01-grid").check();
    assert.equal(await page.locator(".x01-grid-label").count(),19);
    await page.locator('input[name="x01-floor"][value="1"]').check();
    assert.match(await page.locator("#x01-count").textContent(),/30 of 30/);
    assert.match(await page.locator("#x01-detail-body").textContent(),/Bounty Station/);
    await page.locator("#x01-search").fill("printer");
    assert.match(await page.locator("#x01-count").textContent(),/[1-9] of 30/);
    await page.locator("#x01-results button").filter({hasText:"3D Printer"}).click();
    assert.match(await page.locator("#x01-detail-body").textContent(),/3D Printer/);
    await page.reload();
    await page.locator("#x01-results button").first().waitFor();
    assert.match(await page.locator("#x01-detail-body").textContent(),/3D Printer/);
    await page.locator("#x01-hide-all").click();
    assert.match(await page.locator("#x01-count").textContent(),/0 of 30/);
    assert.match(await page.locator("#x01-detail-body").textContent(),/3D Printer/);
    await page.locator("#x01-show-all").click();
    assert.match(await page.locator("#x01-count").textContent(),/30 of 30/);
    await page.setViewportSize({width:390,height:844});
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);
    await page.locator(".x01-sources summary").click();
    assert.equal(await page.locator('a[href="https://dmzhub.gg/maps/x01-black-site"]').count(),1);
    assert.equal(await page.locator('a[href="/x01-dmzhub.html"]').count(),2);
    const missing=await context.newPage();
    await missing.route("**/maps/x01/codcentral/*.webp",route=>route.fulfill({status:404,body:"Missing local image"}));
    await missing.goto(`${base}/x01.html`);
    await missing.waitForFunction(()=>document.querySelector("#x01-image-status")?.textContent.includes("Floor image missing"));
    assert.match(await missing.locator("#x01-count").textContent(),/30 of 30/);
    await missing.close();
    assert.deepEqual(errors,[]);assert.deepEqual(external,[]);
    return ["X01 direct link, two floors, persistent selection, search, filters, reload, 390px, source reference and missing-image recovery passed"];
  }finally{await context.close();}
}
