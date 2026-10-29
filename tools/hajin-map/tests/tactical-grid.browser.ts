import assert from "node:assert/strict";
export async function runTacticalGridBrowser(parent, base, fixture) {
  const context = await parent
      .context()
      .browser()
      .newContext({ viewport: { width: 1440, height: 1000 } }),
    errors = [],
    external = [];
  await context.route("**/*", (route) => {
    const u = new URL(route.request().url());
    if (u.origin !== base) {
      external.push(u.href);
      return route.abort();
    }
    if (u.pathname.endsWith("/official/markers.json"))
      return route.fulfill({ json: fixture.snapshot });
    if (
      u.pathname.endsWith("/background.webp") ||
      u.pathname.startsWith("/maps/hajin/official/icons/")
    )
      return route.fulfill({ body: fixture.image, contentType: "image/png" });
    return route.continue();
  });
  const page = await context.newPage();
  page.setDefaultTimeout(10000);
  page.on("pageerror", (e) => errors.push(e.message));
  const ready = async () => {
    await page.goto(base);
    await page.locator("#workspace-open:enabled").waitFor();
    await page.locator("#zoom-in:enabled").waitFor();
  };
  const alignment = async () => {
    const max = await page.evaluate(async () => {
      const { viewer } = await import("/src/main.ts"),
        { gridGeometry } = await import("/src/map/tactical-grid.ts");
      const svg = document.querySelector(".hajin-coordinate-grid"),
        matrix = svg.getScreenCTM(),
        rect = document.querySelector("#map").getBoundingClientRect();
      return Math.max(
        ...gridGeometry().lines.flatMap((ends, i) =>
          ends.map((p, j) => {
            const line = svg.querySelectorAll("line")[i];
            const actual = new DOMPoint(
                Number(line.getAttribute(j ? "x2" : "x1")),
                Number(line.getAttribute(j ? "y2" : "y1")),
              ).matrixTransform(matrix),
              expected = viewer.map.latLngToContainerPoint([p.y, p.x]);
            return Math.hypot(
              actual.x - rect.left - expected.x,
              actual.y - rect.top - expected.y,
            );
          }),
        ),
      );
    });
    assert.ok(max <= 1, `Grid projection drift ${max}px`);
  };
  try {
    await ready();
    assert.equal(await page.locator(".hajin-coordinate-grid line").count(), 21);
    assert.equal(await page.locator(".coordinate-grid-cell").count(), 90);
    assert.equal(
      await page.locator('.coordinate-grid-cell[data-grid="G6"]').textContent(),
      "G6",
    );
    assert.equal(await page.locator(".leaflet-image-layer").count(), 1);
    await alignment();
    const markerCount = await page
      .locator('[data-source-id="official"]')
      .count();
    await page.locator("#key-hide-all").click();
    assert.equal(
      await page.locator(".hajin-coordinate-grid").isVisible(),
      true,
    );
    await page.locator("#key-show-all").click();
    assert.equal(
      await page.locator('[data-source-id="official"]').count(),
      markerCount,
    );
    await page.evaluate(async () => {
      const { viewer } = await import("/src/main.ts"),
        { gridGeometry } = await import("/src/map/tactical-grid.ts");
      const p = gridGeometry().cells.find((c) => c.reference === "G6").center;
      viewer.map.setView([p.y, p.x], 2, { animate: false });
    });
    await alignment();
    assert.equal(await page.locator("#grid-position").textContent(), "G6");
    const before = await page.locator('[data-grid="G6"]').boundingBox();
    await page.evaluate(async () => {
      const { viewer } = await import("/src/main.ts");
      viewer.map.setZoom(3, { animate: false });
    });
    await alignment();
    const after = await page.locator('[data-grid="G6"]').boundingBox();
    assert.ok(
      Math.abs(before.height - after.height) <= 1 &&
        Math.abs(before.width - after.width) <= 1,
      `Grid text stays screen-sized: ${JSON.stringify({ before, after })}`,
    );
    await page.locator('#map').focus();await page.keyboard.press('ArrowRight');await page.waitForTimeout(350);await alignment();
    const centerReference=await page.evaluate(async()=>{const {viewer}=await import('/src/main.ts'),{gridReferenceAt}=await import('/src/map/tactical-grid.ts');const c=viewer.map.getCenter();return gridReferenceAt(c.lng,c.lat);});assert.equal(await page.locator('#grid-position').textContent(),centerReference);
    await page.evaluate(async()=>{const {viewer}=await import('/src/main.ts'),{gridGeometry}=await import('/src/map/tactical-grid.ts');const c=gridGeometry().cells.find(c=>c.reference==='G6').center;viewer.map.setView([c.y,c.x],3,{animate:false});});
    if(await page.locator('#fullscreen').isVisible()){await page.locator('#fullscreen').click();await page.waitForFunction(()=>!!document.fullscreenElement);await page.waitForTimeout(200);await alignment();await page.evaluate(()=>document.exitFullscreen());await page.waitForTimeout(200);await alignment();}
    const target = await page.evaluate(async () => {
      const { viewer } = await import("/src/main.ts"),
        { gridGeometry } = await import("/src/map/tactical-grid.ts");
      const p = gridGeometry().cells.find((c) => c.reference === "G6").center,
        q = viewer.map.latLngToContainerPoint([p.y, p.x]),
        rect = document.querySelector("#map").getBoundingClientRect();
      return { x: q.x + rect.left, y: q.y + rect.top, canonical: p };
    });
    await page.mouse.move(target.x, target.y);
    assert.equal(await page.locator("#grid-position").textContent(), "G6");
    await page.mouse.click(target.x, target.y, { button: "right" });
    await page.locator("#point-x").waitFor();
    assert.ok(
      Math.abs(
        Number(await page.locator("#point-x").inputValue()) -
          target.canonical.x,
      ) < 3,
    );
    assert.ok(
      Math.abs(
        Number(await page.locator("#point-y").inputValue()) -
          target.canonical.y,
      ) < 3,
    );
    await page.locator("#cancel-workspace-draft").click();
    await page.locator("#close-workspace").click();
    await page.locator("#show-coordinate-grid").focus();
    await page.keyboard.press("Space");
    assert.equal(await page.locator(".hajin-coordinate-grid").count(), 0);
    assert.equal(
      await page.locator('[data-source-id="official"]').count(),
      markerCount,
    );
    await ready();
    assert.equal(
      await page.locator("#show-coordinate-grid").isChecked(),
      false,
    );
    assert.equal(await page.locator(".hajin-coordinate-grid").count(), 0);
    await page.locator("#show-coordinate-grid").check();
    await alignment();
    await page.locator("#reset").click();
    await page.waitForTimeout(150);
    await alignment();
    await page.setViewportSize({ width: 360, height: 800 });
    await page.waitForTimeout(200);
    await alignment();
    await page.locator("#toggle-key").click();
    assert.equal(await page.locator("#show-coordinate-grid").isVisible(), true);
    await page.locator("#show-coordinate-grid").focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("Space");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    );
    await page.locator("#close-key").click();
    await page.evaluate(() => {
      const n = document.createElement("div");
      n.textContent = "SYNTHETIC GRID FIXTURE";
      Object.assign(n.style, {
        position: "fixed",
        top: "0",
        left: "0",
        zIndex: "9999",
        background: "#512a25",
        color: "#fff",
        padding: "4px",
      });
      document.body.append(n);
    });
    await page.screenshot({
      path: ".local/browser-checks/synthetic-tactical-grid-mobile.png",
    });
    await page.addInitScript(() => {
      const get = Storage.prototype.getItem,
        set = Storage.prototype.setItem;
      Storage.prototype.getItem = function (k) {
        if (k === "hajin-coordinate-grid-v1")
          throw Error("Synthetic storage unavailable");
        return get.call(this, k);
      };
      Storage.prototype.setItem = function (k, v) {
        if (k === "hajin-coordinate-grid-v1")
          throw Error("Synthetic storage unavailable");
        return set.call(this, k, v);
      };
    });
    await ready();
    await page.locator("#toggle-key").click();
    assert.equal(await page.locator("#show-coordinate-grid").isChecked(), true);
    await page.locator("#show-coordinate-grid").uncheck();
    assert.equal(await page.locator(".hajin-coordinate-grid").count(), 0);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    return [
      "calibrated A1–J9 SVG grid has21boundaries/90labels and stays within1screenpixel through zoom/reset/mobile resize",
      "G6 pointer/center readout is separate from pixels and noninteractive grid permits right-click POI placement",
      "grid toggle is keyboard usable, independent of source masks, persisted and tolerant of unavailable storage",
    ];
  } finally {
    await context.close();
  }
}
