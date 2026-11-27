import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import {
  monitorBrowser,
  expectConsoleErrors,
  expectResponseErrors,
  expectScriptCancellation,
} from "../browser/health.mjs";
const message = (text) => ({ type: () => "error", text: () => text });
test("deliberate script cancellation is exact, context-local, bounded and never admits generic failures", async () => {
  const url = "http://127.0.0.1:4174/assets/src/client/dashboard.mjs";
  const fixture = async () => {
    const f = await setup();
    const verify = expectScriptCancellation(f.context, {
      label: "Synthetic interrupted script",
      url,
      errorText: "NS_ERROR_ABORT",
    });
    return { ...f, verify };
  };
  const emit = (page, changes = {}) =>
    page.emit("requestfailed", {
      url: () => changes.url ?? url,
      method: () => changes.method ?? "GET",
      resourceType: () => changes.type ?? "script",
      failure: () => ({ errorText: changes.reason ?? "NS_ERROR_ABORT" }),
    });
  const f = await fixture();
  emit(f.page);
  f.verify();
  f.check();
  emit(f.page);
  assert.throws(f.check, /No unexpected/);
  for (const changes of [
    { url: url + "?x=1" },
    { url: url.replace("4174", "4175") },
    { method: "POST" },
    { type: "image" },
    { reason: "NS_ERROR_FAILURE" },
  ]) {
    const bad = await fixture();
    emit(bad.page, changes);
    assert.throws(bad.check);
    assert.equal((await bad.check.diagnostics()).failures.length, 1);
  }
  const missing = await fixture();
  assert.throws(missing.verify, /exact script/);
  const strict = await setup();
  emit(strict.page);
  assert.throws(strict.check, /No unexpected/);
});
test("owned context close drains only pending declared artwork and never waives active request failures", async () => {
  let closed = 0;
  const browser = {
    newContext: async () =>
      Object.assign(new EventEmitter(), { close: async () => closed++ }),
  };
  const url = "http://127.0.0.1:4174/local-camo-images/han-86/smoke.webp";
  const health = monitorBrowser(browser, {
    optionalArtwork: { urls: [url], maxCount: 1 },
  });
  const context = await browser.newContext(),
    page = new EventEmitter();
  context.emit("page", page);
  const request = {
    url: () => url,
    method: () => "GET",
    resourceType: () => "image",
    failure: () => ({ errorText: "<unknown error>" }),
  };
  page.emit("request", request);
  const closing = context.close();
  await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(closed, 0, "Native close waits for the already pending image");
  page.emit("requestfinished", request);
  await closing;
  assert.equal(closed, 1);
  health();
  const active = await browser.newContext(),
    activePage = new EventEmitter();
  active.emit("page", activePage);
  activePage.emit("request", request);
  activePage.emit("requestfailed", request);
  await active.close();
  assert.throws(health, /No unexpected/);
  assert(
    (await health.diagnostics()).failures.some((value) =>
      value.includes("<unknown error>"),
    ),
  );
});
async function setup(options) {
  const browser = { newContext: async () => new EventEmitter() };
  const check = monitorBrowser(browser, options),
    context = await browser.newContext(),
    page = new EventEmitter();
  context.emit("page", page);
  return { browser, check, context, page };
}

test("optional camo art permits only declared image GET 404s with matching console evidence", async () => {
  const url = "http://127.0.0.1:4174/local-camo-images/han-86/smoke.webp";
  const options = { optionalArtwork: { urls: [url], maxCount: 1 } };
  const emit = (page, change = {}) =>
    page.emit("response", {
      status: () => change.status ?? 404,
      url: () => change.url ?? url,
      request: () => ({
        method: () => change.method ?? "GET",
        resourceType: () => change.type ?? "image",
      }),
    });
  const good = await setup(options);
  emit(good.page);
  good.page.emit("console", {
    type: () => "error",
    text: () =>
      "Failed to load resource: the server responded with a status of 404 (Not Found)",
    location: () => ({ url }),
  });
  good.check();
  assert.deepEqual(
    (await good.check.diagnostics()).optionalArtwork[0].responses,
    [url],
  );
  emit(good.page);
  assert.throws(good.check, /No unexpected/);
  for (const change of [
    { status: 500 },
    { method: "POST" },
    { type: "fetch" },
    { url: url + "?extra=1" },
    { url: url + "#fragment" },
    { url: url.replace("4174", "4175") },
    { url: url.replace("smoke", "unknown") },
  ]) {
    const f = await setup(options);
    emit(f.page, change);
    assert.throws(f.check, /No unexpected/);
  }
  const orphan = await setup(options);
  orphan.page.emit("console", {
    type: () => "error",
    text: () =>
      "Failed to load resource: the server responded with a status of 404 (Not Found)",
    location: () => ({ url }),
  });
  assert.throws(orphan.check, /matching exact/);
  const strict = await setup();
  emit(strict.page);
  assert.throws(strict.check, /No unexpected/);
});
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
