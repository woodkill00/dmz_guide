import assert from "node:assert/strict";
import { chromium, firefox, webkit } from "playwright";
import { pageEditorFixture } from "../helpers/page-editor.mjs";
import { templateSection } from "../../src/domain/editor-experience.mjs";

for (const [name, engine] of Object.entries({ chromium, firefox, webkit })) {
  if (process.env.PAGE_EDITOR_ENGINE && process.env.PAGE_EDITOR_ENGINE !== name)
    continue;
  const f = await pageEditorFixture(),
    browser = await engine.launch(),
    context = await browser.newContext(),
    page = await context.newPage(),
    errors = [];
  page.on("dialog", (d) => d.accept());
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(f.url("test:order"));
    await page.locator("#pe-add-section:enabled").waitFor();
    await page
      .locator("#pe-pattern-import")
      .evaluate((n) => (n.closest("details").open = true));
    await page.evaluate(() => {
      const original = File.prototype.text;
      File.prototype.text = function () {
        if (this.name.startsWith("held-"))
          return new Promise((resolve) => {
            window.__releasePattern = () => original.call(this).then(resolve);
          });
        return original.call(this);
      };
    });
    const library = (label) =>
      JSON.stringify({
        version: 1,
        patterns: [
          { version: 1, name: label, sections: [templateSection("tips")] },
        ],
      });
    for (const invalid of [false, true]) {
      await page.locator("#pe-pattern-import").setInputFiles({
        name: "held-" + invalid + ".json",
        mimeType: "application/json",
        buffer: Buffer.from(invalid ? "{invalid" : library("Older candidate")),
      });
      await page.waitForFunction(
        () => typeof window.__releasePattern === "function",
      );
      await page.locator("#pe-pattern-import").setInputFiles({
        name: "latest.json",
        mimeType: "application/json",
        buffer: Buffer.from(library("Newest candidate")),
      });
      await page.locator("#pe-pattern-apply:enabled").waitFor();
      await page.evaluate(async () => {
        await window.__releasePattern();
        window.__releasePattern = null;
      });
      await page.locator("#pe-pattern-apply").click();
      assert.equal(
        await page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("dmz-editor-patterns-v1"))
              .patterns[0].name,
        ),
        "Newest candidate",
      );
      assert.equal(await page.locator("#pe-error").textContent(), "");
    }
    await page.locator("#pe-show-history").click();
    await page
      .getByRole("button", { name: "Reload checkpoint status", exact: true })
      .waitFor();
    // Commit an old owner's write, hold only its acknowledgement, then replace
    // the lifecycle owner as on a persisted browser return. The current owner
    // must obtain the real checksum before the old failure/success arrives.
    for (const failure of [false, true]) {
      let release, held;
      const admitted = new Promise((resolve) => (held = resolve)),
        gate = new Promise((resolve) => (release = resolve));
      let captured = false;
      const handler = async (route) => {
        if (
          route.request().method() !== "POST" ||
          route.request().postDataJSON()?.action !== "checkpoint-save" ||
          captured
        )
          return route.continue();
        captured = true;
        const response = await route.fetch();
        assert.equal(response.status(), 200);
        held();
        await gate;
        if (failure)
          await route.fulfill({
            status: 409,
            contentType: "application/json",
            body: JSON.stringify({
              error: { message: "Synthetic stale owner conflict" },
            }),
          });
        else await route.fulfill({ response });
      };
      await page.route("**/api/page-edits/tools", handler);
      await page
        .getByLabel("Task 1", { exact: true })
        .fill("Old lifecycle " + failure);
      await admitted;
      await page.evaluate(() => {
        window.dispatchEvent(
          new PageTransitionEvent("pagehide", { persisted: true }),
        );
        window.dispatchEvent(
          new PageTransitionEvent("pageshow", { persisted: true }),
        );
      });
      await page.waitForFunction(() =>
        document
          .querySelector("#pe-disk-status")
          .textContent.startsWith("Disk checkpoint:"),
      );
      await page
        .getByLabel("Task 1", { exact: true })
        .fill("Current lifecycle " + failure);
      release();
      await page.waitForFunction(() =>
        document
          .querySelector("#pe-disk-status")
          .textContent.includes("Disk checkpoint saved"),
      );
      const s = await f.get("test:order"),
        query = new URLSearchParams({
          action: "checkpoint",
          target: JSON.stringify(s.target),
        });
      const metadata = await (
        await fetch(f.app.url + "/api/page-edits/tools?" + query, {
          headers: f.headers,
        })
      ).json();
      query.set("id", metadata.revision);
      const saved = await (
        await fetch(f.app.url + "/api/page-edits/tools?" + query, {
          headers: f.headers,
        })
      ).json();
      assert.equal(saved.value.record.steps[0], "Current lifecycle " + failure);
      await page.unroute("**/api/page-edits/tools", handler);
    }
    assert.equal((await f.get("test:order")).document.revision, 0);
    // Seed two saved layouts through the same canonical API, without changing
    // game facts, then exercise both independent snapshot read paths.
    for (let revision = 1; revision <= 2; revision++) {
      const s = await f.get("test:order");
      s.document.sections[0].title = "Synthetic saved layout " + revision;
      const preview = await f.post("/api/page-edits/preview", {
        target: s.target,
        record: s.record,
        document: s.document,
        contentVersion: s.pack.contentVersion,
        uploads: [],
        repositoryRevision: s.repositoryRevision,
        pageRevision: s.pageRevision,
      });
      await f.post("/api/page-edits/commit", {
        operationId: revision.toString(16).padStart(32, "0"),
        target: s.target,
        expectedRevision: preview.expectedRevision,
        expectedDocumentRevision: preview.expectedDocumentRevision,
        previewDigest: preview.previewDigest,
      });
    }
    await page.locator("#pe-history-refresh").click();
    await page
      .getByRole("button", { name: "Compare revision 2", exact: true })
      .waitFor();
    for (const type of ["checkpoint", "history"]) {
      for (const invalidate of ["newer", "edit", "lifecycle"]) {
        let release, admit, complete;
        const admitted = new Promise((r) => (admit = r)),
          gate = new Promise((r) => (release = r)),
          completed = new Promise((r) => (complete = r));
        let captured = false;
        const handler = async (route) => {
          const u = new URL(route.request().url());
          if (
            route.request().method() !== "GET" ||
            u.searchParams.get("action") !== type ||
            !u.searchParams.has("id") ||
            captured
          )
            return route.continue();
          captured = true;
          const response = await route.fetch();
          assert.equal(response.status(), 200);
          admit();
          await gate;
          await route.fulfill({ response });
          complete();
        };
        await page.route("**/api/page-edits/tools?**", handler);
        const first =
            type === "checkpoint"
              ? "Compare previous checkpoint"
              : "Compare revision 1",
          second =
            type === "checkpoint"
              ? "Compare current checkpoint"
              : "Compare revision 2",
          label =
            type === "checkpoint"
              ? "Current disk checkpoint"
              : "Saved revision 2";
        await page.getByRole("button", { name: first, exact: true }).click();
        await admitted;
        if (invalidate === "newer") {
          await page.getByRole("button", { name: second, exact: true }).click();
          await page.waitForFunction(
            (label) =>
              document
                .querySelector("#pe-restore-description")
                .textContent.startsWith(label),
            label,
          );
        } else if (invalidate === "edit") {
          await page
            .getByLabel("Task 1", { exact: true })
            .fill("Invalidates delayed comparison " + type);
        } else {
          await page.evaluate(() => {
            window.dispatchEvent(
              new PageTransitionEvent("pagehide", { persisted: true }),
            );
            window.dispatchEvent(
              new PageTransitionEvent("pageshow", { persisted: true }),
            );
          });
        }
        release();
        await completed;
        await page.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r)),
            ),
        );
        if (invalidate === "newer") {
          assert(
            (
              await page.locator("#pe-restore-description").textContent()
            ).startsWith(label),
          );
          await page.locator("#pe-restore-cancel").click();
        } else
          assert.equal(
            await page.locator("#pe-restore-apply").isDisabled(),
            true,
          );
        await page.unroute("**/api/page-edits/tools?**", handler);
      }
    }
    const unavailablePicture = async (route) => {
      const response = await route.fetch(),
        body = await response.json();
      body.referencedAssets = [
        { id: "test:missing-source-picture", sha256: null },
      ];
      await route.fulfill({ response, json: body });
    };
    await page.route("**/api/page-edits/tools?**", unavailablePicture);
    await page
      .getByRole("button", { name: "Compare revision 2", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector("#pe-restore-description")
        .textContent.includes("Missing/unverified referenced pictures"),
    );
    await page.locator("#pe-restore-confirm").check();
    assert.equal(await page.locator("#pe-restore-apply").isDisabled(), true);
    await page.unroute("**/api/page-edits/tools?**", unavailablePicture);
    let releaseStatus, statusAdmitted, statusFinished;
    const statusGate = new Promise((r) => (releaseStatus = r)),
      statusReady = new Promise((r) => (statusAdmitted = r)),
      statusComplete = new Promise((r) => (statusFinished = r));
    const heldStatus = async (route) => {
      if (
        new URL(route.request().url()).searchParams.get("action") !== "refresh"
      )
        return route.continue();
      const response = await route.fetch();
      statusAdmitted();
      await statusGate;
      await route.fulfill({ response });
      statusFinished();
    };
    await page.route("**/api/page-edits/tools?**", heldStatus);
    await page
      .getByRole("button", { name: "Check refresh status", exact: true })
      .click();
    await statusReady;
    const statusStart = Date.now();
    await page
      .locator("#pe-refresh-status")
      .filter({ hasText: /status timed out/ })
      .waitFor({ timeout: 20000 });
    assert(
      Date.now() - statusStart < 19500,
      "A held GET/body is bounded, not just rejected-request retries",
    );
    releaseStatus();
    await statusComplete;
    await page.unroute("**/api/page-edits/tools?**", heldStatus);
    const retainedTask = await page
      .getByLabel("Task 1", { exact: true })
      .inputValue();
    await page.evaluate(() =>
      window.dispatchEvent(new Event("beforeunload", { cancelable: true })),
    );
    await page
      .getByRole("button", { name: "Reload checkpoint status", exact: true })
      .click();
    await page.waitForFunction(() =>
      document
        .querySelector("#pe-disk-status")
        .textContent.startsWith("Disk checkpoint:"),
    );
    assert.equal(
      await page.getByLabel("Task 1", { exact: true }).inputValue(),
      retainedTask,
      "Canceling departure keeps the draft and permits fresh optional reads",
    );
    assert.equal((await f.get("test:order")).document.revision, 2);
    assert.deepEqual(errors, []);
    console.log(
      `094 ${name}: held pattern reads; checkpoint acknowledgements after lifecycle replacement; checkpoint/history Compare ordering, edit and lifecycle invalidation PASS`,
    );
  } finally {
    await context.close();
    await browser.close();
    await f.close();
  }
}
