import assert from "node:assert/strict";
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
        if (message.type() === "error")
          failures.push("Console: " + message.text());
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
