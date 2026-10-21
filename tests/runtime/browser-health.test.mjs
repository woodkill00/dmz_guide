import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { monitorBrowser, expectConsoleErrors } from "../browser/health.mjs";
const message = (text) => ({ type: () => "error", text: () => text });
async function setup() {
  const browser = { newContext: async () => new EventEmitter() };
  const check = monitorBrowser(browser),
    context = await browser.newContext(),
    page = new EventEmitter();
  context.emit("page", page);
  return { browser, check, context, page };
}
test("negative codec diagnostic allowance is exact, context-local and bounded", async () => {
  const { browser, check, context, page } = await setup();
  const report = expectConsoleErrors(context, {
    label: "Deliberately malformed raster",
    patterns: [/^Image corrupt or truncated\.$/],
    maxCount: 1,
  });
  page.emit("console", message("Image corrupt or truncated."));
  check();
  assert.deepEqual(report().observed, ["Image corrupt or truncated."]);
  const other = await browser.newContext(),
    second = new EventEmitter();
  other.emit("page", second);
  second.emit("console", message("Image corrupt or truncated."));
  assert.throws(check, /unexpected console errors/);
});
test("codec allowance never hides CSP, extra diagnostics or script errors", async () => {
  for (const failure of [
    "CSP blocked inline style",
    "Image corrupt or truncated.",
  ]) {
    const { check, context, page } = await setup();
    expectConsoleErrors(context, {
      label: "Negative raster",
      patterns: [/^Image corrupt or truncated\.$/],
      maxCount: 1,
    });
    page.emit("console", message("Image corrupt or truncated."));
    page.emit("console", message(failure));
    assert.throws(check, /unexpected console errors/);
  }
  const { check, context, page } = await setup();
  expectConsoleErrors(context, {
    label: "Negative raster",
    patterns: [/^Image corrupt or truncated\.$/],
    maxCount: 1,
  });
  page.emit(
    "pageerror",
    new Error("Unexpected decoder implementation exception"),
  );
  assert.throws(check, /unexpected console errors/);
});
