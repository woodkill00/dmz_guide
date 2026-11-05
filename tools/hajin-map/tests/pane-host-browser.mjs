import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";
import { chromium, firefox, webkit } from "playwright";
const root = fileURLToPath(new URL("../", import.meta.url));
const server = await createServer({
  root,
  configFile: false,
  cacheDir: root + ".local/pane-host-vite",
  server: { host: "127.0.0.1", port: 5288, strictPort: true, hmr: false },
  plugins: [
    {
      name: "pane-host-fixture",
      configureServer(vite) {
        vite.middlewares.use("/__pane-host", (_req, res) => {
          res.setHeader("content-type", "text/html");
          res.end(
            '<!doctype html><html lang="en" data-ui-variant="modern"><head><title>Synthetic pane boundary</title></head><body><button id="origin">Origin</button><button id="destination">Destination</button><aside id="ui-map-task"><section id="map-key"><button id="layer-control">Layer control</button></section></aside><div id="original-parent"><dialog id="workspace-dialog"><label>Title<input id="point-title" value="Synthetic retained draft"></label><button id="editor-action">Editor action</button></dialog><span id="original-next"></span></div></body></html>',
          );
        });
      },
    },
  ],
});
await server.listen();
try {
  for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
    const browser = await engine.launch();
    try {
      const page = await browser.newPage(),
        errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("http://127.0.0.1:5288/__pane-host");
      await page.evaluate(async () => {
        const { mountPaneHost } = await import("/src/workspace/pane-host.ts");
        let state = { dirty: false, committing: false, processing: false },
          mode = "immediate",
          result = true,
          clean = true,
          resolveSave,
          discardCalls = 0,
          saveCalls = 0,
          events = [],
          valid = true;
        const dialog = document.querySelector("#workspace-dialog");
        const host = mountPaneHost(dialog, {
          getState: () => ({ ...state }),
          save: async () => {
            saveCalls++;
            if (mode === "throw") throw Error("Synthetic save failed");
            const confirmed =
              mode === "held"
                ? await new Promise((resolve) => {
                    resolveSave = resolve;
                  })
                : result;
            if (confirmed && clean)
              state = { dirty: false, committing: false, processing: false };
            return confirmed;
          },
          discard: () => {
            discardCalls++;
            state = { dirty: false, committing: false, processing: false };
          },
          revealTask: () => {
            document.querySelector("#ui-map-task").hidden = false;
          },
        });
        window.paneFixture = {
          host,
          setState: (change) => Object.assign(state, change),
          setSave: (options) => {
            mode = options.mode ?? "immediate";
            result = options.result ?? true;
            clean = options.clean ?? true;
          },
          resolve: (value) => resolveSave(value),
          setValid: (value) => {
            valid = value;
          },
          request: (id) =>
            host.request({
              id,
              label: "Open " + id,
              run: () => {
                events.push(id);
                document.querySelector("#destination").focus();
              },
              revalidate: () => valid,
            }),
          read: () => ({
            state: { ...state },
            saveCalls,
            discardCalls,
            events: [...events],
            snapshot: host.snapshot(),
            title: document.querySelector("#point-title").value,
          }),
        };
      });
      const read = () => page.evaluate(() => window.paneFixture.read());
      // Clean admission/open/layers are synchronous and reuse exact controls.
      const sync = await page.evaluate(() => {
        const f = window.paneFixture;
        f.host.open();
        const opened = {
          open: document.querySelector("#workspace-dialog").open,
          modal: document.querySelector("#workspace-dialog").matches(":modal"),
          keyHidden: document.querySelector("#map-key").hidden,
          focus: document.activeElement.id,
        };
        f.host.layers();
        return {
          opened,
          layers: {
            keyHidden: document.querySelector("#map-key").hidden,
            open: document.querySelector("#workspace-dialog").open,
            focus: document.activeElement.id,
          },
          request: f.request("clean"),
        };
      });
      assert(sync.opened.open && !sync.opened.modal && sync.opened.keyHidden);
      assert.equal(sync.opened.focus, "point-title");
      assert.equal(sync.layers.keyHidden, false);
      assert.equal(sync.layers.open, false);
      assert.equal(sync.layers.focus, "layer-control");
      assert(sync.request);
      assert.deepEqual((await read()).events, ["clean"]);
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.host.open();
        f.setState({ dirty: true });
        f.request("first");
        f.request("second");
      });
      const guard = page.locator("#ui-pane-departure-guard");
      await guard.waitFor();
      assert.equal((await read()).snapshot.pending.id, "first");
      assert.match(await guard.innerText(), /Open first/);
      assert.doesNotMatch(await guard.innerText(), /Open second/);
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      assert((await read()).state.dirty);
      assert.equal((await read()).snapshot.pending, null);
      assert.equal((await read()).title, "Synthetic retained draft");
      // True result alone is not enough if current draft/write state is still unsettled.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setSave({ result: true, clean: false });
        f.request("unclean");
      });
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          window.paneFixture.read().saveCalls === 1 &&
          !window.paneFixture.read().snapshot.saving,
      );
      assert.equal((await read()).snapshot.pending.id, "unclean");
      assert.deepEqual((await read()).events, ["clean"]);
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      // Failed/unconfirmed retains exact first intent, no timer/false receipt navigation.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setSave({ result: false });
        f.request("unknown");
      });
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.waitForFunction(
        () =>
          window.paneFixture.read().saveCalls === 2 &&
          !window.paneFixture.read().snapshot.saving,
      );
      assert.equal((await read()).snapshot.pending.id, "unknown");
      assert.deepEqual((await read()).events, ["clean"]);
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      // Rejected save and Escape keep the original draft and do not invent success.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setState({ dirty: true });
        f.setSave({ mode: "throw" });
        f.request("save-error");
      });
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.waitForFunction(
        () => !window.paneFixture.read().snapshot.saving,
      );
      assert.match(await guard.innerText(), /Synthetic save failed/);
      assert.equal((await read()).snapshot.pending.id, "save-error");
      await page.keyboard.press("Escape");
      await guard.waitFor({ state: "hidden" });
      assert.equal((await read()).snapshot.pending, null);
      assert.equal((await read()).title, "Synthetic retained draft");
      // An already-rendered Discard button cannot bypass a newly preparing/committing owner.
      for (const busy of ["processing", "committing"]) {
        await page.evaluate((busy) => {
          const f = window.paneFixture;
          f.setState({ dirty: true, processing: false, committing: false });
          f.request("busy-" + busy);
          f.setState({ [busy]: true });
        }, busy);
        await guard
          .getByRole("button", { name: "Discard and continue", exact: true })
          .click();
        assert.equal((await read()).discardCalls, 0);
        assert(
          await guard
            .getByRole("button", { name: "Discard and continue", exact: true })
            .isDisabled(),
        );
        await guard.getByRole("button", { name: "Stay", exact: true }).click();
      }
      // Save freezes the destination while the real callback is unresolved; Stay only cancels navigation.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setState({ dirty: true, processing: false, committing: false });
        f.setSave({ mode: "held" });
        f.request("held");
      });
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.evaluate(() => window.paneFixture.request("cannot-retarget"));
      assert.equal((await read()).snapshot.pending.id, "held");
      assert(
        await guard
          .getByRole("button", { name: "Discard and continue", exact: true })
          .isDisabled(),
      );
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      await page.evaluate(() => window.paneFixture.resolve(true));
      await page.waitForFunction(
        () => !window.paneFixture.read().snapshot.saving,
      );
      assert.deepEqual((await read()).events, ["clean"]);
      assert.equal((await read()).snapshot.pending, null);
      // Actual confirmed clean Save revalidates and executes once, without delayed focus theft.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setState({ dirty: true });
        f.setSave({ result: true });
        f.request("confirmed");
      });
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await guard.waitFor({ state: "hidden" });
      assert.deepEqual((await read()).events, ["clean", "confirmed"]);
      assert.equal(
        await page.evaluate(() => document.activeElement.id),
        "destination",
      );
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setState({ dirty: true });
        f.setValid(false);
        f.request("removed");
      });
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.waitForFunction(
        () => !window.paneFixture.read().snapshot.saving,
      );
      assert.deepEqual((await read()).events, ["clean", "confirmed"]);
      assert.match(await guard.innerText(), /unavailable|no longer/i);
      await guard.getByRole("button", { name: "Stay", exact: true }).click();
      // Real transactional modal retains sole top-layer ownership; no guard is stacked over it.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setValid(true);
        f.host.modal();
        f.setState({ dirty: true });
        f.request("behind-modal");
      });
      assert(
        await page
          .locator("#workspace-dialog")
          .evaluate((n) => n.matches(":modal")),
      );
      assert(await guard.isHidden());
      assert.equal((await read()).snapshot.pending, null);
      await page.evaluate(() =>
        document.querySelector("#workspace-dialog").close(),
      );
      // Explicit Discard delegates to the provided owner and preserves destination identity.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setState({ dirty: true });
        f.request("discarded");
      });
      await guard
        .getByRole("button", { name: "Discard and continue", exact: true })
        .click();
      await guard.waitFor({ state: "hidden" });
      assert.equal((await read()).discardCalls, 1);
      assert.deepEqual((await read()).events, [
        "clean",
        "confirmed",
        "discarded",
      ]);
      // A pre-existing commit becoming clean never auto-navigates; Continue is explicit.
      const beforeContinue = (await read()).events;
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setState({ dirty: false, committing: true });
        f.request("busy-finished");
      });
      assert(
        await guard
          .getByRole("button", { name: "Continue", exact: true })
          .isDisabled(),
      );
      await page.evaluate(() => {
        window.paneFixture.setState({ committing: false });
        window.paneFixture.host.refresh();
      });
      assert.deepEqual((await read()).events, beforeContinue);
      await guard
        .getByRole("button", { name: "Continue", exact: true })
        .click();
      assert.deepEqual((await read()).events, [
        ...beforeContinue,
        "busy-finished",
      ]);
      const completedEvents = (await read()).events;
      // Destroy invalidates late Save completion, removes listeners/guard and restores the exact original node.
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.setState({ dirty: true });
        f.setSave({ mode: "held" });
        f.request("after-destroy");
      });
      await guard
        .getByRole("button", { name: "Save and continue", exact: true })
        .click();
      await page.evaluate(() => {
        const f = window.paneFixture;
        f.host.destroy();
        f.resolve(true);
      });
      await page.waitForTimeout(25);
      assert.equal(await guard.count(), 0);
      assert.equal(
        await page.locator("#original-parent > #workspace-dialog").count(),
        1,
      );
      assert.equal((await read()).title, "Synthetic retained draft");
      assert.deepEqual((await read()).events, completedEvents);
      assert.deepEqual(errors, []);
      console.log(
        name +
          " pane host PASS: synchronous single owner, frozen dirty intent, real Save/Discard/Stay, busy guards, revalidation, modal ownership, late cleanup",
      );
    } finally {
      await browser.close();
    }
  }
} finally {
  await server.close();
}
