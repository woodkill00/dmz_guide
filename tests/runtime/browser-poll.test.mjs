import test from "node:test";
import assert from "node:assert/strict";
import { pollBrowser } from "../browser/poll.mjs";
test("async browser polling awaits false results and preserves predicate arguments", async () => {
  let calls = 0;
  const page = {
    evaluate: async (fn, arg) => {
      await new Promise((r) => setTimeout(r, 2));
      calls++;
      return fn(arg, calls);
    },
  };
  assert.equal(
    await pollBrowser(page, (value, n) => n >= 3 && value, "saved", {
      timeout: 1000,
      interval: 2,
    }),
    "saved",
  );
  assert.equal(calls, 3);
});
test("async browser polling rejects false and stalled evaluations within its deadline", async () => {
  for (const evaluate of [async () => false, () => new Promise(() => {})]) {
    const start = performance.now();
    await assert.rejects(
      pollBrowser({ evaluate }, () => true, undefined, {
        timeout: 30,
        interval: 2,
      }),
      /did not settle/,
    );
    assert(performance.now() - start < 1000);
  }
});
