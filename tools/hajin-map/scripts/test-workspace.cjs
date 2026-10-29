// Synthetic integration evidence only: never fetches game resources or reads owner-local assets.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = '.local/browser-checks';
let browser, server;
const checks = [];
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const { createServer } = await import('vite');
  server = await createServer({ define: {'import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS': '"0"'}, server: { host: '127.0.0.1', port: 5275, strictPort: true, hmr: false } });
  await server.listen();
  const base = 'http://127.0.0.1:5275';
  browser = await chromium.launch({ headless: true, chromiumSandbox: true, ...(process.env.CI ? { channel: 'chrome' } : process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {}) });
  const painter = await browser.newPage();
  const image = Buffer.from(await painter.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
    const context = canvas.getContext('2d'); context.fillStyle = '#304837'; context.fillRect(0, 0, 128, 128);
    context.strokeStyle = '#d5e4b8'; context.strokeRect(8, 8, 112, 112);
    return canvas.toDataURL('image/png').split(',')[1];
  }), 'base64');
  await painter.close();
  const icon = '/maps/hajin/official/icons/synthetic.png';
  const snapshot = {
    schemaVersion: 1, sourcePage: 'https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin', capturedAt: '2026-10-26T00:00:00Z', synthetic: true,
    categories: [
      { id: 'poiLabel', name: 'Synthetic places', group: 'Place names', icon },
      { id: 'dmz_ammoCache', name: 'Synthetic caches', group: 'Facilities', icon },
      { id: 'dmz_gasStation', name: 'Synthetic stations', group: 'Facilities', icon },
      { id: 'dmz_exfil', name: 'Synthetic empty category', group: 'Facilities', icon },
    ],
    records: Array.from({ length: 6 }, (_, i) => ({ id: `synthetic-${i}`, name: `Synthetic location ${i}`, category: i === 0 ? 'poiLabel' : i < 4 ? 'dmz_ammoCache' : 'dmz_gasStation', mapId: 'hajin', coordinateSpaceVersion: 'hajin-official-v1-4096', x: .2 + i * .1, y: .3 + i * .05 })),
  };
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const errors = [], external = [];
  let mode = 'valid', background = true;
  await context.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== base) { external.push(url.origin); return route.abort(); }
    if (url.pathname === '/maps/hajin/v1/background.webp') return background ? route.fulfill({ body: image, contentType: 'image/png' }) : route.fulfill({ status: 404, body: 'synthetic missing background' });
    if (url.pathname.startsWith('/maps/hajin/official/icons/')) return route.fulfill({ body: image, contentType: 'image/png' });
    if (url.pathname === '/synthetic-second.json') return route.fulfill({ json: { ...structuredClone(snapshot), sourcePage: 'https://example.invalid/synthetic', records: snapshot.records.slice(0, 2) } });
    if (url.pathname.endsWith('/official/markers.json')) {
      if (mode === 'missing') return route.fulfill({ status: 404, body: 'synthetic missing snapshot' });
      if (mode === 'oversize') return route.fulfill({ body: JSON.stringify({ padding: 'x'.repeat(2 * 1024 * 1024) }), contentType: 'application/json' });
      const data = structuredClone(snapshot);
      if (mode === 'invalid') data.records[0].x = 4;
      if (mode === 'many') data.records = Array(5001).fill(data.records[0]);
      return route.fulfill({ json: data });
    }
    return route.continue();
  });
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  async function ready() { await page.goto(base); await page.locator('#key-show-all:enabled').waitFor({ state: 'attached' }); await page.locator('#zoom-in:enabled').waitFor(); }
  const count = () => page.locator('[data-source-id="official"]').count();
  await ready();
  assert.equal(await count(), 6);
  const fits = await page.evaluate(() => {
    const image = document.querySelector('.leaflet-image-layer').getBoundingClientRect();
    const map = document.querySelector('#map').getBoundingClientRect();
    return image.left >= map.left - 1 && image.top >= map.top - 1 && image.right <= map.right + 1 && image.bottom <= map.bottom + 1;
  });
  assert.ok(fits, 'Complete source bounds fit the initial viewport.');
  await page.locator('#toggle-key').click(); await page.locator('#toggle-key').click();
  assert.ok(await page.locator('#map-key').isVisible());
  assert.equal(await page.locator('#layers-dialog').isVisible(), false);
  assert.equal(await page.locator('.key-item').count(), 4);
  assert.ok(await page.locator('[data-key-category="dmz_exfil"]').isDisabled());
  await page.locator('#key-hide-all').click(); assert.equal(await count(), 0);
  await page.locator('[data-key-category="dmz_ammoCache"]').check(); assert.equal(await count(), 3);
  await page.locator('#layers').click();
  assert.ok(await page.locator('[data-category="dmz_ammoCache"]').isChecked());
  assert.equal(await page.locator('.source-selection').textContent(), 'Mixed');
  await page.locator('#official-visible').uncheck(); assert.equal(await count(), 0);
  await page.locator('#official-visible').check(); assert.equal(await count(), 3);
  await page.keyboard.press('Escape');
  await ready(); assert.equal(await count(), 3);
  await page.locator('#key-show-all').click(); assert.equal(await count(), 6);
  checks.push('direct/repeated key opening before Layers', 'individual/all/none and source/key synchronization', 'source visibility and saved mix', 'empty category retained without points');
  const oldZoom = await page.locator('#zoom-level').textContent();
  async function aligned() {
    const error = await page.evaluate(() => {
      const image = document.querySelector('.leaflet-image-layer').getBoundingClientRect();
      const marker = document.querySelector('[data-official-id="synthetic-0"]').getBoundingClientRect();
      return Math.hypot(marker.left + marker.width / 2 - image.left - image.width * .2, marker.top + marker.height / 2 - image.top - image.height * .3);
    });
    assert.ok(error <= 2, `Synthetic marker/image drift ${error}px`);
  }
  await aligned();
  await page.locator('#zoom-in').click(); await page.waitForTimeout(350);
  assert.notEqual(await page.locator('#zoom-level').textContent(), oldZoom);
  await aligned();
  await page.locator('#reset').click();
  await page.locator('#info').click(); assert.ok(await page.locator('#info-dialog').isVisible()); await page.keyboard.press('Escape');
  assert.equal(await page.evaluate(() => document.activeElement.id), 'info');
  checks.push('zoom/reset and dialog focus recovery');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#map-key').waitFor({ state: 'hidden' });
  await page.waitForTimeout(100); await aligned();
  assert.equal(await page.locator('#map-key').isVisible(), false);
  await page.locator('#toggle-key').click(); assert.ok(await page.locator('#map-key').isVisible());
  assert.equal(await page.locator('#layers-dialog').isVisible(), false);
  await page.locator('#close-key').click();
  assert.equal(await page.evaluate(() => document.activeElement.id), 'toggle-key');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  checks.push('mobile direct key opening/close and no horizontal overflow');
  for (const failure of ['missing', 'invalid', 'many', 'oversize']) {
    mode = failure;
    await page.goto(base); await page.locator('#zoom-in:enabled').waitFor();
    await page.locator('#layers').click(); await page.locator('#retry-official').waitFor();
    assert.equal(await count(), 0);
    mode = 'valid'; await page.locator('#retry-official').click(); await page.locator('#official-count').waitFor();
    assert.equal(await count(), 6);
  }
  checks.push('missing/invalid/oversized/count-limited snapshot failure and retry');
  background = false; await page.goto(base); await page.locator('#retry').waitFor();
  assert.ok(await page.locator('#zoom-in').isDisabled());
  background = true; await page.locator('#retry').click(); await page.locator('#zoom-in:enabled').waitFor();
  checks.push('missing raster failure and retry');
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new Error('synthetic unavailable storage'); };
    Storage.prototype.setItem = () => { throw new Error('synthetic unavailable storage'); };
  });
  await ready();
  await page.locator('#toggle-key').click(); await page.locator('#key-hide-all').click(); assert.equal(await count(), 0);
  await page.locator('#key-show-all').click(); assert.equal(await count(), 6);
  checks.push('storage failure does not prevent filtering');
  await page.evaluate(async () => {
    const { viewer } = await import('/src/main.ts');
    const { createSourceMarkers } = await import('/src/map/source-markers.ts');
    const slot = document.createElement('section'); slot.id = 'synthetic-source'; document.querySelector('#source-controls').append(slot);
    window.__syntheticSource = createSourceMarkers({ id: 'synthetic', name: 'Synthetic second source', website: 'example.invalid', page: 'https://example.invalid/synthetic', snapshot: '/synthetic-second.json', iconDirectory: '/maps/hajin/official/icons/', labelCategories: { poiLabel: 'major' }, recordLink: id => `https://example.invalid/synthetic?id=${encodeURIComponent(id)}` }, viewer.map, slot, () => {});
  });
  await page.locator('#synthetic-count').waitFor({ state: 'attached' });
  if (await page.locator('#map-key').isVisible()) await page.locator('#close-key').click();
  await page.locator('#layers').click();
  assert.equal(await page.locator('[data-source-id="synthetic"]').count(), 2);
  await page.locator('#hide-official').click(); assert.equal(await count(), 0);
  assert.equal(await page.locator('[data-source-id="synthetic"]').count(), 2);
  await page.locator('#show-official').click(); await page.locator('#hide-synthetic').click();
  assert.equal(await count(), 6); assert.equal(await page.locator('[data-source-id="synthetic"]').count(), 0);
  await page.evaluate(() => { window.__syntheticSource.destroy(); document.querySelector('#synthetic-source').remove(); });
  await page.keyboard.press('Escape');
  checks.push('two source websites with matching IDs retain independent visibility');
  // Exercise the real decode deadline without changing its production threshold.
  const delayed = await context.newPage();
  await delayed.addInitScript(() => { HTMLImageElement.prototype.decode = () => new Promise(() => {}); });
  await delayed.goto(base);
  await delayed.locator('#retry').waitFor({ timeout: 20000 });
  assert.ok(await delayed.locator('#zoom-in').isDisabled());
  await delayed.evaluate(() => { HTMLImageElement.prototype.decode = () => Promise.resolve(); });
  await delayed.locator('#retry').click(); await delayed.locator('#zoom-in:enabled').waitFor();
  await delayed.close();
  checks.push('15-second image-decode deadline produces recoverable failure');
  const { runWorkspaceBrowser } = await import('../tests/workspace.browser.ts');
  checks.push(...await runWorkspaceBrowser(page, base));
  const { runAuthoringBrowser } = await import('../tests/authoring.browser.ts');
  checks.push(...await runAuthoringBrowser(page, base));
  const { runAdvancedBrowser } = await import('../tests/advanced.browser.ts');
  checks.push(...await runAdvancedBrowser(page, base));
  const { runRaceBrowser } = await import('../tests/races.browser.ts');
  checks.push(...await runRaceBrowser(page, base));
  const { runProviderBrowser } = await import('../tests/providers.browser.ts');
  checks.push(...await runProviderBrowser(page));
  const { runUsabilityBrowser } = await import('../tests/usability.browser.ts');
  checks.push(...await runUsabilityBrowser(page, base, {image,snapshot}));
  const { runSourceUpdatesBrowser } = await import('../tests/source-updates.browser.ts');
  checks.push(...await runSourceUpdatesBrowser(page, {image,snapshot}));
  const { runTacticalGridBrowser } = await import('../tests/tactical-grid.browser.ts');
  checks.push(...await runTacticalGridBrowser(page, base, {image,snapshot}));
  const {runUpgradesBrowser}=require('./upgrades.browser.cjs');
  checks.push(...await runUpgradesBrowser(page,base,{image,snapshot}));
  const {runPlannerBrowser}=require('./planner.browser.cjs');
  checks.push(...await runPlannerBrowser(page,base,{image,snapshot}));
  const {runWaypointTrackingBrowser}=require('./waypoint-tracking.browser.cjs');
  checks.push(...await runWaypointTrackingBrowser(page,base,{image,snapshot}));
  checks.push(...await require('./menu-layout.browser.cjs').runMenuLayoutBrowser(page,base,{image,snapshot}));
  const {runHelpBrowser}=require('./help.browser.cjs');
  checks.push(...await runHelpBrowser(page,base,{image,snapshot}));
  const {runIconStudioBrowser}=require('./icon-studio.browser.cjs');
  checks.push(...await runIconStudioBrowser(page,base,{image,snapshot}));
  await page.locator('#toggle-key').click();
  await page.evaluate(() => {
    const banner = document.createElement('div'); banner.textContent = 'SYNTHETIC TEST FIXTURE — NOT GAME DATA';
    Object.assign(banner.style, { position: 'fixed', top: '0', left: '0', zIndex: '9999', background: '#512a25', color: '#fff', padding: '6px', fontSize: '11px' }); document.body.append(banner);
  });
  await page.screenshot({ path: `${out}/synthetic-mobile.png` });
  await page.setViewportSize({ width: 1440, height: 1000 }); await page.waitForTimeout(150);
  await page.screenshot({ path: `${out}/synthetic-desktop.png` });
  assert.deepEqual(external, []); assert.deepEqual(errors, []);
  const result = { date: new Date().toISOString(), synthetic: true, checks, runtimeErrors: errors, externalRequests: external, physicalDeviceTested: false };
  fs.writeFileSync(`${out}/results.json`, JSON.stringify(result, null, 2)); console.log(JSON.stringify(result, null, 2));
})().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => { if (browser) await browser.close(); if (server) await server.close(); });
