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
const expectedScriptAborts = new WeakMap();
export function expectScriptCancellation(
  context,
  { label, url, errorText, count = 1 },
) {
  const target = new URL(url);
  assert(
    label &&
      ["http:", "https:"].includes(target.protocol) &&
      !target.search &&
      !target.hash &&
      !target.username &&
      !target.password,
  );
  assert(
    ["net::ERR_ABORTED", "NS_ERROR_ABORT", "Blocked by Web Inspector"].includes(
      errorText,
    ),
    "Only explicit browser cancellation diagnostics may be scoped",
  );
  assert(Number.isInteger(count) && count > 0 && count <= 4);
  assert(!expectedScriptAborts.has(context));
  const scope = { label, url: target.href, errorText, count, observed: [] };
  expectedScriptAborts.set(context, scope);
  return () => {
    assert.equal(
      scope.observed.length,
      count,
      `${label}: exact script cancellations required`,
    );
    return [...scope.observed];
  };
}
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
    const pendingArtwork = new Set();
    const requestDetails = new WeakMap();
    const seen = Object.fromEntries(
      ["start", "finish", "failure", "response"].map((kind) => [
        kind,
        new WeakSet(),
      ]),
    );
    const contextOrigin = new Error("Browser context created").stack
      ?.split("\n")
      .slice(1, 7);
    const first = (kind, value) => {
      if (seen[kind].has(value)) return false;
      seen[kind].add(value);
      return true;
    };
    const requestPage = (request) => {
      try {
        return request.frame?.()?.page?.();
      } catch {
        return null;
      }
    };
    function onRequest(request, page) {
      if (!first("start", request)) return;
      if (
        artworkURLs.has(request.url()) &&
        request.method() === "GET" &&
        request.resourceType() === "image"
      ) {
        pendingArtwork.add(request);
        requestDetails.set(request, {
          started: performance.now(),
          page: page?.url?.()?.split(/[?#]/)[0] || null,
        });
      }
    }
    function onFinished(request) {
      if (first("finish", request)) pendingArtwork.delete(request);
    }
    let closingRequested = false;
    if (typeof context.close === "function") {
      const close = context.close.bind(context);
      context.close = async (...closeArgs) => {
        closingRequested = true;
        // Do not manufacture failed lazy-image requests by tearing down an
        // otherwise healthy context mid-response. Never waive a real failure.
        const deadline = performance.now() + 2500;
        while (pendingArtwork.size && performance.now() < deadline)
          await new Promise((resolve) => setTimeout(resolve, 25));
        if (pendingArtwork.size)
          failures.push(
            "Optional artwork did not settle before owned context close: " +
              [...pendingArtwork].map((request) => request.url()).join(", "),
          );
        if (pendingArtwork.size)
          failures.push(
            "Pending artwork lifecycle: " +
              JSON.stringify({
                contextOrigin,
                requests: [...pendingArtwork].slice(0, 12).map((request) => ({
                  url: request.url(),
                  page: requestDetails.get(request)?.page,
                  ageMs: Math.round(
                    performance.now() -
                      (requestDetails.get(request)?.started ??
                        performance.now()),
                  ),
                })),
              }),
          );
        return close(...closeArgs);
      };
    }
    artworkObservations.push(artwork);
    contexts.push(context);
    context.on("request", (request) =>
      onRequest(request, requestPage(request)),
    );
    context.on("requestfinished", onFinished);
    context.on("requestfailed", (request) =>
      onFailed(request, requestPage(request)),
    );
    context.on("response", (response) =>
      onResponse(response, requestPage(response.request())),
    );
    context.on("page", (page) => {
      page.on("request", (request) => onRequest(request, page));
      page.on("requestfinished", onFinished);
      page.on("pageerror", (error) =>
        failures.push(
          "JavaScript: " +
            error.message +
            " " +
            JSON.stringify({
              page: page.url?.()?.split(/[?#]/)[0] || null,
              contextOrigin,
              stack: error.stack?.slice(0, 1600),
            }),
        ),
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
      page.on("requestfailed", (request) => onFailed(request, page));
      page.on("response", (response) => onResponse(response, page));
    });
    function onFailed(request, page) {
      if (!first("failure", request)) return;
      pendingArtwork.delete(request);
      const reason = request.failure()?.errorText || "";
      const expected = expectedScriptAborts.get(context);
      if (
        expected &&
        expected.observed.length < expected.count &&
        request.url() === expected.url &&
        request.method() === "GET" &&
        request.resourceType() === "script" &&
        reason === expected.errorText
      ) {
        expected.observed.push({
          url: request.url(),
          method: request.method(),
          type: request.resourceType(),
          reason,
        });
        return;
      }
      if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(reason))
        failures.push(
          "Request: " +
            request.url() +
            " " +
            reason +
            " " +
            JSON.stringify({
              page: page?.url?.() || null,
              method: request.method?.() || null,
              type: request.resourceType?.() || null,
              closingRequested,
            }),
        );
    }
    function onResponse(response, page) {
      if (!first("response", response)) return;
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
          page: page?.url?.() || null,
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
    }
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
      const script = expectedScriptAborts.get(context);
      if (script)
        assert.equal(
          script.observed.length,
          script.count,
          `${script.label}: exact script cancellations required`,
        );
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
