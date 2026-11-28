import assert from "node:assert/strict";
/** Unlike waitForFunction in the pinned runner, await an async predicate on every poll. */
export async function pollBrowser(
  page,
  predicate,
  arg,
  { timeout = 15000, interval = 25 } = {},
) {
  assert(Number.isFinite(timeout) && timeout > 0 && timeout <= 30000);
  assert(Number.isFinite(interval) && interval > 0 && interval <= timeout);
  let timer;
  const deadline = performance.now() + timeout;
  try {
    return await Promise.race([
      (async () => {
        while (performance.now() < deadline) {
          const value = await page.evaluate(predicate, arg);
          if (value) return value;
          await new Promise((resolve) =>
            setTimeout(
              resolve,
              Math.min(interval, Math.max(0, deadline - performance.now())),
            ),
          );
        }
        throw Error(`Browser state did not settle within ${timeout}ms`);
      })(),
      new Promise((_, reject) => {
        timer = setTimeout(
          () =>
            reject(Error(`Browser state did not settle within ${timeout}ms`)),
          timeout,
        );
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
