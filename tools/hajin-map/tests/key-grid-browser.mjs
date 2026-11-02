// Synthetic background only; does not fetch providers or read owner-local game assets.
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
import assert from "node:assert/strict";
const server = await createServer({
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
  server: { host: "127.0.0.1", port: 5277, strictPort: true, hmr: false },
});
await server.listen();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext(),
        page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const painter = await context.newPage();
      const image = await painter.evaluate(() => {
        const c = document.createElement("canvas");
        c.width = c.height = 128;
        const x = c.getContext("2d");
        x.fillStyle = "#304837";
        x.fillRect(0, 0, 128, 128);
        return c.toDataURL().split(",")[1];
      });
      await painter.close();
      await context.route("**/maps/hajin/v1/background.webp", (route) =>
        route.fulfill({
          body: Buffer.from(image, "base64"),
          contentType: "image/png",
        }),
      );
      await page.goto(
        "http://127.0.0.1:5277/?key-grid=F5&key-name=Hospital%20Lab",
      );
      await page.locator('#map[data-key-grid-target="F5"]').waitFor();
      assert.match(
        await page.locator(".key-grid-context").innerText(),
        /Hospital Lab · grid F5/,
      );
      assert.match(
        await page.locator(".key-grid-context").innerText(),
        /Door position is not verified/,
      );
      const rectangle = page.locator('path[stroke="#f4ca72"]');
      assert.equal(await rectangle.count(), 1);
      assert(
        await rectangle.evaluate((e) => {
          const a = e.getBoundingClientRect(),
            b = document.querySelector("#map").getBoundingClientRect();
          return (
            a.width > 30 &&
            a.height > 30 &&
            a.left >= b.left &&
            a.right <= b.right &&
            a.top >= b.top &&
            a.bottom <= b.bottom
          );
        }),
      );
      await page.setViewportSize({ width: 390, height: 844 });
      assert(await page.locator(".key-grid-context").isVisible());
      await page.getByRole("button", { name: "Dismiss key area" }).click();
      assert.equal(await rectangle.count(), 0);
      assert.equal(await page.locator(".key-grid-context").count(), 0);
      await page.goto("http://127.0.0.1:5277/?key-grid=F5&key-grid=G6");
      await page.locator("#zoom-in:enabled").waitFor();
      assert.equal(await page.locator(".key-grid-context").count(), 0);
      assert.deepEqual(errors, []);
      console.log(
        name +
          " key-grid browser PASS: calibrated visible polygon, public label, mobile, dismiss, duplicate rejection",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
