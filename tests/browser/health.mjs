import assert from "node:assert/strict";
import { readWeaponCamos } from "../../src/content/weapon-camos.mjs";
import { camoImagePath } from "../../src/domain/weapon-camos.mjs";
export async function optionalCamoArtwork(base) {
  const catalog = await readWeaponCamos();
  return {
    urls: catalog.weapons.flatMap((weapon) =>
      weapon.rows.map(
        (row) => new URL(camoImagePath(weapon.id, row.id), base).href,
      ),
    ),
    // Four complete catalog visits per context; repeated failures remain bounded.
    maxCount:
      catalog.weapons.reduce((n, weapon) => n + weapon.rows.length, 0) * 4,
  };
}
const expectedConsole = new WeakMap();
const expectedResponses = new WeakMap();
/** Only an isolated negative-test context may declare exact, bounded codec diagnostics. */
export function expectConsoleErrors(context, { label, patterns, maxCount }) {
  assert(typeof label === "string" && label.length > 0);
  assert(
    Array.isArray(patterns) &&
      patterns.length > 0 &&
      patterns.every(
        (p) =>
          p instanceof RegExp &&
          p.source.startsWith("^") &&
          p.source.endsWith("$") &&
          !p.global &&
          !p.sticky,
      ),
  );
  assert(Number.isInteger(maxCount) && maxCount > 0 && maxCount <= 4);
  assert(
    !expectedConsole.has(context),
    "Expected diagnostic scope cannot be silently replaced",
  );
  const expectation = { label, patterns, maxCount, observed: [] };
  expectedConsole.set(context, expectation);
  return () => ({ label, observed: [...expectation.observed] });
}
/** A genuine negative API test may allow only an exact, bounded HTTP result. */
export function expectResponseErrors(
  context,
  { label, method, url, status, count = 1 },
) {
  assert(typeof label === "string" && label.length > 0);
  assert(["POST", "PUT", "PATCH", "DELETE"].includes(method));
  const target = new URL(url);
  assert(
    ["http:", "https:"].includes(target.protocol) &&
      !target.hash &&
      !target.search,
  );
  assert(Number.isInteger(status) && status >= 400 && status <= 599);
  assert(Number.isInteger(count) && count > 0 && count <= 4);
  assert(
    !expectedResponses.has(context),
    "Expected HTTP scope cannot be silently replaced",
  );
  const expected = {
    label,
    method,
    url: target.href,
    status,
    count,
    responses: [],
    console: [],
  };
  expectedResponses.set(context, expected);
  return () => {
    assert.equal(
      expected.responses.length,
      count,
      `${label}: required exact negative HTTP result`,
    );
    return {
      label,
      responses: [...expected.responses],
      console: [...expected.console],
    };
  };
}
export function monitorBrowser(browser, { optionalArtwork } = {}) {
  const artworkURLs = new Set(optionalArtwork?.urls || []);
  for (const raw of artworkURLs) {
    const url = new URL(raw);
    assert(
      ["http:", "https:"].includes(url.protocol) &&
        !url.search &&
        !url.hash &&
        !url.username &&
        !url.password,
    );
    assert(
      /^\/local-camo-images\/[a-z0-9-]+\/[a-z0-9-]+\.webp$/.test(url.pathname),
    );
  }
  if (optionalArtwork)
    assert(
      Number.isInteger(optionalArtwork.maxCount) &&
        optionalArtwork.maxCount > 0,
    );
  const artworkObservations = [];
  const failures = [],
    responses = [],
    pendingDiagnostics = [],
    contexts = [],
    original = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await original(...args);
    const artwork = { responses: [], console: [] };
    artworkObservations.push(artwork);
    contexts.push(context);
    context.on("page", (page) => {
      page.on("pageerror", (error) =>
        failures.push("JavaScript: " + error.message),
      );
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const expected = expectedConsole.get(context),
          responseScope = expectedResponses.get(context),
          text = message.text();
        // Chrome emits this exact resource diagnostic for the genuine conflict.
        // Its location must identify the exact failed API URL, not a page script.
        if (
          responseScope?.status === 409 &&
          responseScope.console.length < responseScope.count &&
          text ===
            "Failed to load resource: the server responded with a status of 409 (Conflict)" &&
          message.location().url === responseScope.url
        ) {
          responseScope.console.push(text);
          return;
        }
        if (
          expected &&
          expected.observed.length < expected.maxCount &&
          expected.patterns.some((pattern) => pattern.test(text))
        ) {
          expected.observed.push(text);
          return;
        }
        const location = message.location?.();
        if (
          artworkURLs.has(location?.url) &&
          text ===
            "Failed to load resource: the server responded with a status of 404 (Not Found)"
        ) {
          artwork.console.push(location.url);
          return;
        }
        failures.push(
          "Console: " + text + (location?.url ? " at " + location.url : ""),
        );
      });
      page.on("requestfailed", (request) => {
        const reason = request.failure()?.errorText || "";
        if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(reason))
          failures.push("Request: " + request.url() + " " + reason);
      });
      page.on("response", (response) => {
        if (
          response.status() === 404 &&
          artworkURLs.has(response.url()) &&
          response.request().method() === "GET" &&
          response.request().resourceType() === "image" &&
          artwork.responses.length < optionalArtwork.maxCount
        ) {
          artwork.responses.push(response.url());
          return;
        }
        const expected = expectedResponses.get(context);
        if (
          expected &&
          expected.responses.length < expected.count &&
          response.status() === expected.status &&
          response.url() === expected.url &&
          response.request().method() === expected.method
        ) {
          expected.responses.push({
            method: expected.method,
            url: expected.url,
            status: expected.status,
          });
          return;
        }
        if (response.status() >= 400) {
          failures.push("HTTP " + response.status() + ": " + response.url());
          const diagnostic = {
            status: response.status(),
            method: response.request().method(),
            url: response.url(),
            page: page.url?.() || null,
          };
          responses.push(diagnostic);
          if (response.text)
            pendingDiagnostics.push(
              response.text().then(
                (body) => {
                  diagnostic.body = body.slice(0, 8192);
                },
                (error) => {
                  diagnostic.bodyError = error.message;
                },
              ),
            );
        }
      });
    });
    return context;
  };
  const check = () => {
    for (const artwork of artworkObservations) {
      for (const url of new Set(artwork.console))
        assert(
          artwork.console.filter((value) => value === url).length <=
            artwork.responses.filter((value) => value === url).length,
          "Optional-art console requires matching exact image GET 404",
        );
    }
    for (const context of contexts) {
      const expected = expectedResponses.get(context);
      if (expected)
        assert.equal(
          expected.responses.length,
          expected.count,
          `${expected.label}: required exact negative HTTP result`,
        );
    }
    assert.deepEqual(
      failures,
      [],
      "No unexpected console errors, script errors or failed HTTP requests across contexts",
    );
  };
  check.diagnostics = async () => {
    await Promise.all(pendingDiagnostics);
    return {
      failures: [...failures],
      responses: responses.map((value) => ({ ...value })),
      optionalArtwork: artworkObservations.map((value) => ({
        responses: [...value.responses],
        console: [...value.console],
      })),
    };
  };
  return check;
}
