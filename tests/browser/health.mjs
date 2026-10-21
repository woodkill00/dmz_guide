import assert from "node:assert/strict";
const expectedConsole = new WeakMap();
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
export function monitorBrowser(browser) {
  const failures = [],
    original = browser.newContext.bind(browser);
  browser.newContext = async (...args) => {
    const context = await original(...args);
    context.on("page", (page) => {
      page.on("pageerror", (error) =>
        failures.push("JavaScript: " + error.message),
      );
      page.on("console", (message) => {
        if (message.type() !== "error") return;
        const expected = expectedConsole.get(context),
          text = message.text();
        if (
          expected &&
          expected.observed.length < expected.maxCount &&
          expected.patterns.some((pattern) => pattern.test(text))
        ) {
          expected.observed.push(text);
          return;
        }
        failures.push("Console: " + text);
      });
      page.on("requestfailed", (request) => {
        const reason = request.failure()?.errorText || "";
        if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(reason))
          failures.push(
            "Request: " + new URL(request.url()).pathname + " " + reason,
          );
      });
      page.on("response", (response) => {
        if (response.status() >= 400)
          failures.push(
            "HTTP " +
              response.status() +
              ": " +
              new URL(response.url()).pathname,
          );
      });
    });
    return context;
  };
  return () =>
    assert.deepEqual(
      failures,
      [],
      "No unexpected console errors, script errors or failed HTTP requests across contexts",
    );
}
