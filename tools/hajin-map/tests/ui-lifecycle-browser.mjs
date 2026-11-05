// Actual app/store; held durable acknowledgements are synthetic, not provider data.
import assert from "node:assert/strict";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
process.env.DMZ_UI_VARIANT = "modern";
const server = await createServer({
  cacheDir: ".local/ui-lifecycle-071-vite",
  server: { host: "127.0.0.1", port: 5289, strictPort: true, hmr: false },
  define: { "import.meta.env.VITE_LOCAL_PROVIDER_SNAPSHOTS": '"0"' },
});
await server.listen();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        page = await context.newPage(),
        errors = [],
        external = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await context.route("**/*", (route) => {
        const url = new URL(route.request().url());
        if (url.origin !== "http://127.0.0.1:5289") external.push(url.href);
        return url.origin === "http://127.0.0.1:5289"
          ? route.continue()
          : route.abort();
      });
      const syntheticImage = await page.evaluate(() => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 128;
        canvas.getContext("2d").fillRect(0, 0, 128, 128);
        return canvas.toDataURL().split(",")[1];
      });
      await context.route("**/maps/hajin/v1/background.webp", (route) =>
        route.fulfill({
          contentType: "image/png",
          body: Buffer.from(syntheticImage, "base64"),
        }),
      );
      await context.route("**/src/workspace/store.ts", async (r) => {
        const response = await r.fetch();
        let source = await response.text();
        assert.ok(source.includes("export async function openWorkspace("));
        source = source.replace(
          "export async function openWorkspace(",
          "async function originalWorkspace(",
        );
        source +=
          '\nexport async function openWorkspace(options){const real=await originalWorkspace(options);return {...real,read:async()=>{if(window.__rejectVerificationOnce){window.__rejectVerificationOnce=false;throw Error("Synthetic verification read failed after durable write");}const result=await real.read();if(window.__tamperNextRead&&result.current){window.__tamperNextRead=false;window.__tamperedRead=true;const altered=structuredClone(result);altered.current.data.annotations.at(-1).title="Synthetic unmatched payload";return altered;}return result;},commit:async(...args)=>{window.__saveAttempts=(window.__saveAttempts??0)+1;if(window.__denySave)throw Error("Synthetic denied write");const receipt=await real.commit(...args);window.__realWrites=(window.__realWrites??0)+1;if(window.__holdSave)await new Promise(resolve=>window.__releaseSave=resolve);if(window.__failVerificationAfterWrite)window.__rejectVerificationOnce=true;return window.__invalidReceipt?{...receipt,revision:receipt.revision+7}:receipt;}};}';
        await r.fulfill({ response, body: source });
      });
      await context.route("**/maps/hajin/official/markers.json", (r) =>
        r.fulfill({
          json: {
            schemaVersion: 1,
            sourcePage:
              "https://www.callofduty.com/guides/modernwarfare4/dmz-maps/hajin",
            capturedAt: "2026-11-05T00:00:00Z",
            categories: [],
            records: [],
          },
        }),
      );
      await page.goto("http://127.0.0.1:5289/");
      await page.waitForSelector(
        'html[data-ui-surface="map"][data-ui-variant="modern"][data-ui-contract="071-v1"][data-ui-mounted="071-v1"][data-ui-adapter="map-pane"]',
      );
      await page.locator("#workspace-open").click();
      await page.locator("#point-title").fill("Synthetic retained point");
      await page.locator("#point-owned").check();
      await page.locator("#workspace-tab-icons").click();
      const guard = page.locator("#ui-pane-departure-guard");
      await guard.waitFor({ state: "visible" });
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      assert.equal(
        await page.locator("#point-title").inputValue(),
        "Synthetic retained point",
      );
      await page.evaluate(() => (window.__holdSave = true));
      await page.locator("#workspace-tab-icons").click();
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.waitForFunction(() => !!window.__releaseSave);
      assert.equal(
        await guard
          .getByRole("button", { name: "Discard and continue" })
          .isEnabled(),
        false,
      );
      assert.equal(
        await page.locator("#point-title").inputValue(),
        "Synthetic retained point",
      );
      assert.equal(await page.locator("#icon-studio").count(), 0);
      // A confirmed real IDB write exists; its owning save receipt is still pending.
      const saved = await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const s = await openWorkspace();
        try {
          return (await s.read()).current;
        } finally {
          s.close();
        }
      });
      assert.equal(saved.data.annotations.length, 1);
      assert.equal(saved.data.annotations[0].title, "Synthetic retained point");
      await page.evaluate(() => {
        window.__holdSave = false;
        window.__releaseSave();
      });
      await guard.waitFor({ state: "hidden" });
      await page.locator('#workspace-tab-icons[aria-current="true"]').waitFor();
      assert.equal(await page.locator("#point-title").count(), 0);
      await page.locator("#workspace-tab-points").click();
      await page.locator("#point-title").fill("Synthetic discarded point");
      await page.locator("#workspace-tab-health").click();
      await guard.getByRole("button", { name: "Discard and continue" }).click();
      await page
        .locator('#workspace-tab-health[aria-current="true"]')
        .waitFor();
      const after = await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const s = await openWorkspace();
        try {
          return (await s.read()).current;
        } finally {
          s.close();
        }
      });
      assert.equal(after.revision, saved.revision);
      assert.equal(after.data.annotations.length, 1);
      // Definitively denied persistence retains the original draft and destination; Retry is explicit.
      await page.locator("#workspace-tab-points").click();
      await page.locator("#point-title").fill("Synthetic denied then retried");
      await page.locator("#point-owned").check();
      await page.evaluate(() => (window.__denySave = true));
      await page.locator("#workspace-tab-icons").click();
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#workspace-content")
            .getAttribute("aria-busy") === "false",
      );
      assert(await guard.isVisible());
      assert.equal(
        await page.locator("#point-title").inputValue(),
        "Synthetic denied then retried",
      );
      assert.equal(await page.locator("#icon-studio").count(), 0);
      assert(
        await guard
          .getByRole("button", { name: "Save and continue", exact: true })
          .isEnabled(),
      );
      const denied = await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const store = await openWorkspace();
        try {
          return {
            current: (await store.read()).current,
            attempts: window.__saveAttempts,
            writes: window.__realWrites,
          };
        } finally {
          store.close();
        }
      });
      assert.equal(denied.current.revision, after.revision);
      assert.equal(denied.current.data.annotations.length, 1);
      assert.equal(denied.writes, 1);
      assert.equal(denied.attempts, 2);
      await page.evaluate(() => (window.__denySave = false));
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await guard.waitFor({ state: "hidden" });
      await page.locator('#workspace-tab-icons[aria-current="true"]').waitFor();
      const retried = await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const store = await openWorkspace();
        try {
          return (await store.read()).current;
        } finally {
          store.close();
        }
      });
      assert.equal(retried.revision, after.revision + 1);
      assert.equal(retried.data.annotations.length, 2);
      assert.equal(
        retried.data.annotations.filter(
          (a) => a.title === "Synthetic denied then retried",
        ).length,
        1,
      );
      // A real committed payload with an invalid acknowledgement is unconfirmed, never replayed.
      await page.locator("#workspace-tab-points").click();
      await page.locator("#point-title").fill("Synthetic unconfirmed point");
      await page.locator("#point-owned").check();
      await page.evaluate(() => (window.__invalidReceipt = true));
      await page.locator("#workspace-tab-icons").click();
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("#workspace-content")
            .getAttribute("aria-busy") === "false",
      );
      assert(await guard.isVisible());
      assert.equal(await page.locator("#icon-studio").count(), 0);
      assert(
        await guard
          .getByRole("button", { name: "Save and continue", exact: true })
          .isDisabled(),
      );
      assert(
        await guard
          .getByRole("button", { name: "Discard and continue", exact: true })
          .isDisabled(),
      );
      const unknown = await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const store = await openWorkspace();
        try {
          return {
            current: (await store.read()).current,
            attempts: window.__saveAttempts,
            writes: window.__realWrites,
          };
        } finally {
          store.close();
        }
      });
      assert.equal(unknown.current.revision, retried.revision + 1);
      assert.equal(unknown.current.data.annotations.length, 3);
      assert.equal(unknown.writes, 3);
      assert.equal(unknown.attempts, 4);
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      await page.evaluate(() => {
        window.__invalidReceipt = false;
        window.__tamperNextRead = true;
      });
      await page.locator("#workspace-check-save").click();
      await page.waitForFunction(() => window.__tamperedRead === true);
      assert.equal(
        await page.locator("#point-title").inputValue(),
        "Synthetic unconfirmed point",
      );
      assert(await page.locator("#workspace-check-save").isVisible());
      // Same revision with a different payload is not reconciliation or permission to discard.
      await page.locator("#workspace-tab-icons").click();
      assert(await guard.isVisible());
      assert(
        await guard
          .getByRole("button", { name: "Discard and continue", exact: true })
          .isDisabled(),
      );
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      await page.locator("#workspace-check-save").click();
      await page.locator("#workspace-check-save").waitFor({ state: "hidden" });
      assert.equal(await page.locator("#icon-studio").count(), 0);
      assert(
        await page
          .locator('#workspace-tab-points[aria-current="true"]')
          .count(),
      );
      const reconciled = await page.evaluate(async () => {
        const { openWorkspace } = await import("/src/workspace/store.ts");
        const store = await openWorkspace();
        try {
          return {
            current: (await store.read()).current,
            attempts: window.__saveAttempts,
            writes: window.__realWrites,
          };
        } finally {
          store.close();
        }
      });
      assert.deepEqual(reconciled.current, unknown.current);
      assert.equal(reconciled.attempts, unknown.attempts);
      assert.equal(reconciled.writes, unknown.writes);
      await page.locator("#workspace-tab-icons").click();
      await page.locator('#workspace-tab-icons[aria-current="true"]').waitFor();
      assert(await guard.isHidden());
      await page.locator('#icon-design-description').fill('Synthetic guarded icon');
      await page.evaluate(()=>{window.__holdSave=true;window.__releaseSave=undefined;});
      await page.locator('#workspace-tab-health').click();
      await guard.getByRole('button',{name:'Save and continue',exact:true}).click();
      await page.waitForFunction(()=>typeof window.__releaseSave==='function');
      await page.waitForFunction(()=>document.querySelector('#ui-pane-departure-status').textContent.includes('Still waiting'),{},{timeout:13000});
      assert(await guard.getByRole('button',{name:'Discard and continue'}).isDisabled());
      const savedIcon=await page.evaluate(async()=>{const {openWorkspace}=await import('/src/workspace/store.ts');const store=await openWorkspace();try{return(await store.read()).current;}finally{store.close();}});
      assert.equal(savedIcon.data.icons.length,reconciled.current.data.icons.length+1);
      assert.equal(savedIcon.revision,reconciled.current.revision+1);
      assert.deepEqual(savedIcon.data.annotations,reconciled.current.data.annotations);
      assert.equal(await page.locator('#workspace-tab-health[aria-current=true]').count(),0);
      await page.evaluate(()=>{window.__holdSave=false;window.__releaseSave();});
      await guard.waitFor({state:'hidden'});
      await page.locator('#workspace-tab-health[aria-current=true]').waitFor();
      await page.locator('#workspace-tab-points').click();
      await page.locator('#point-title').fill('Synthetic verification failure point');
      await page.locator('#point-owned').check();
      await page.evaluate(()=>window.__failVerificationAfterWrite=true);
      await page.locator('#workspace-tab-icons').click();
      await guard.getByRole('button',{name:'Save and continue',exact:true}).click();
      try{await page.waitForFunction(()=>document.querySelector('#workspace-message').textContent.includes('Synthetic verification read failed'));}catch(cause){console.error('Synthetic verification case',await page.evaluate(()=>({status:document.querySelector('#workspace-message').textContent,guard:document.querySelector('#ui-pane-departure-status').textContent,attempts:window.__saveAttempts,writes:window.__realWrites,fail:window.__failVerificationAfterWrite,once:window.__rejectVerificationOnce,title:document.querySelector('#point-title')?.value})));throw cause;}
      assert(await guard.getByRole('button',{name:'Save and continue',exact:true}).isDisabled(),'A committed write with failed verification is not retryable');
      assert(await guard.getByRole('button',{name:'Discard and continue',exact:true}).isDisabled());
      const afterReadFailure=await page.evaluate(async()=>{window.__failVerificationAfterWrite=false;const {openWorkspace}=await import('/src/workspace/store.ts');const store=await openWorkspace();try{return{current:(await store.read()).current,attempts:window.__saveAttempts,writes:window.__realWrites};}finally{store.close();}});
      assert.equal(afterReadFailure.current.revision,savedIcon.revision+1);
      assert.equal(afterReadFailure.current.data.annotations.length,savedIcon.data.annotations.length+1);
      await guard.getByRole('button',{name:'Stay',exact:true}).click();
      await page.locator('#workspace-check-save').click();
      await page.locator('#workspace-check-save').waitFor({state:'hidden'});
      assert.deepEqual(await page.evaluate(()=>({attempts:window.__saveAttempts,writes:window.__realWrites})),{attempts:afterReadFailure.attempts,writes:afterReadFailure.writes});
      await page.locator('#workspace-tab-icons').click();
      await page.locator('#workspace-tab-icons[aria-current=true]').waitFor();
      assert.deepEqual(errors, []);
      assert.deepEqual(external, []);
      await context.close();
      console.log(
        `${name} full-app pane lifecycle PASS: held durable receipt, frozen departure, original draft, guarded discard, exact revision/nonmutation, denied-save explicit retry, invalid receipt and exact-payload reconciliation without replay, guarded SVG watchdog, committed-write/read-failure confirmation without replay`,
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
