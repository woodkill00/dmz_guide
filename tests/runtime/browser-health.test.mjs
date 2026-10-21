import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  monitorBrowser,
  expectConsoleErrors,
  expectResponseErrors,
} from "../browser/health.mjs";
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

const url = "http://127.0.0.1:4174/api/save";
const diagnostic =
  "Failed to load resource: the server responded with a status of 409 (Conflict)";
async function fixture() {
  const browser = {
    async newContext() {
      return new EventEmitter();
    },
  };
  const health = monitorBrowser(browser);
  const context = await browser.newContext();
  const verify = expectResponseErrors(context, {
    label: "Isolated stale-save test",
    method: "POST",
    url,
    status: 409,
    count: 1,
  });
  const page = new EventEmitter();
  context.emit("page", page);
  const response = (changes = {}) =>
    page.emit("response", {
      status: () => changes.status ?? 409,
      url: () => changes.url ?? url,
      request: () => ({ method: () => changes.method ?? "POST" }),
    });
  const console = (text = diagnostic, location = url) =>
    page.emit("console", {
      type: () => "error",
      text: () => text,
      location: () => ({ url: location }),
    });
  return { health, verify, response, console, page, context };
}

test("negative HTTP scope requires exactly one genuine method/URL/status result", async () => {
  for (const withDiagnostic of [false, true]) {
    const f = await fixture();
    f.response();
    if (withDiagnostic) f.console();
    assert.equal(f.verify().responses.length, 1);
    assert.doesNotThrow(f.health);
  }
});

test("negative HTTP scope does not swallow wrong target, method, status or count", async () => {
  for (const changes of [
    { url: "http://127.0.0.1:4174/api/catalog" },
    { url: "http://127.0.0.1:9999/api/save" },
    { url: url + "?unexpected=1" },
    { method: "GET" },
    { status: 403 },
    { status: 500 },
  ]) {
    const f = await fixture();
    f.response();
    f.response(changes);
    assert.throws(f.health, /No unexpected/);
  }
  const excess = await fixture();
  excess.response();
  excess.response();
  assert.throws(excess.health, /No unexpected/);
  const missing = await fixture();
  assert.throws(missing.health, /required exact negative HTTP result/);
  assert.throws(missing.verify, /required exact negative HTTP result/);
});

test("conflict scope preserves console, CSP, script and request health", async () => {
  for (const emit of [
    (f) =>
      f.console("Refused to execute inline script because it violates CSP"),
    (f) => f.console(diagnostic, "http://127.0.0.1:4174/assets/studio.mjs"),
    (f) => {
      f.console();
      f.console();
    },
    (f) => f.page.emit("pageerror", new Error("Unexpected script failure")),
    (f) =>
      f.page.emit("requestfailed", {
        url: () => url,
        failure: () => ({ errorText: "ERR_CONNECTION_RESET" }),
      }),
  ]) {
    const f = await fixture();
    f.response();
    emit(f);
    assert.throws(f.health, /No unexpected/);
  }
});

test("negative HTTP expectation cannot be silently replaced", async () => {
  const f = await fixture();
  assert.throws(
    () =>
      expectResponseErrors(f.context, {
        label: "Another scope",
        method: "POST",
        url,
        status: 409,
      }),
    /cannot be silently replaced/,
  );
});

test("health diagnostics retain blob schemes, console locations and error bodies", async () => {
  const { check, page } = await setup();
  const blob = "blob:http://127.0.0.1:4174/synthetic-picture-id";
  const icon = "http://127.0.0.1:4174/favicon.ico";
  page.emit("requestfailed", {
    url: () => blob,
    failure: () => ({ errorText: "net::ERR_FILE_NOT_FOUND" }),
  });
  page.emit("console", {
    type: () => "error",
    text: () => "Failed to load resource: 404",
    location: () => ({ url: icon }),
  });
  page.emit("response", {
    status: () => 422,
    url: () => "http://127.0.0.1:4174/api/changes",
    request: () => ({ method: () => "GET" }),
    text: async () => '{"code":"INVALID_CONTENT"}',
  });
  const diagnostics = await check.diagnostics();
  assert.equal(diagnostics.failures.length, 3);
  assert(diagnostics.failures[0].includes(blob));
  assert(diagnostics.failures[1].includes(icon));
  assert.deepEqual(diagnostics.responses, [
    {
      status: 422,
      method: "GET",
      url: "http://127.0.0.1:4174/api/changes",
      page: null,
      body: '{"code":"INVALID_CONTENT"}',
    },
  ]);
  diagnostics.failures.length = 0;
  assert.throws(check, /No unexpected/);
  assert.equal((await check.diagnostics()).failures.length, 3);
});
