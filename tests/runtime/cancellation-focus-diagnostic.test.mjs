// Dispatch-only regression: these tests do not claim real browser acceptance.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
const source = readFileSync(
  new URL("../browser/independent-upgrade-spending.mjs", import.meta.url),
  "utf8",
);
const dispatch = source
  .slice(
    source.indexOf("export async function runIndependentUpgradeSpending("),
    source.indexOf("  async function transactionJourney(surface) {"),
  )
  .replace("export ", "");
async function exercise(options = {}, failureAt = null) {
  const calls = [],
    files = [];
  const sandbox = {
    assert,
    process: { version: "synthetic-node", platform: "synthetic-os" },
    console: { log() {} },
    mkdir: async () => {},
    execFileSync: () => "synthetic-source",
    writeFile: async (path, value) =>
      files.push({ path, value: JSON.parse(value) }),
    calls,
    failureAt,
  };
  const other = [
    "transactionJourney",
    "failedPurchase",
    "inventoryGuards",
    "failedNavigation",
    "observedCurrencyBoundary",
    "migrationAndSnapshots",
    "protectedMigration",
    "privateDisplayAndPaging",
    "responsive",
  ]
    .map(
      (name) =>
        `async function ${name}(...args) { calls.push({name:"${name}",args}); }`,
    )
    .join("\n");
  vm.runInNewContext(
    dispatch +
      `
    async function cancelledNavigation(attempt) {
      calls.push({name:"cancelledNavigation",args:[attempt]});
      if(attempt === failureAt) throw new Error("Synthetic first failure");
    }
    ${other}
  }\n globalThis.run = runIndependentUpgradeSpending;`,
    sandbox,
  );
  let error;
  try {
    await sandbox.run({
      browser: {
        browserType: () => ({ name: () => "synthetic-browser" }),
        version: () => "synthetic-browser-version",
      },
      base: "http://example.invalid",
      ...options,
    });
  } catch (reason) {
    error = reason;
  }
  return { calls, files, error };
}
test("supplemental cancellation diagnostics dispatch exactly 20 unchanged scenarios", async () => {
  const { calls, files, error } = await exercise({
    focusedCancellationOnly: true,
  });
  assert.equal(error, undefined);
  assert.equal(calls.length, 20);
  assert.deepEqual(
    calls.map((call) => call.name),
    Array(20).fill("cancelledNavigation"),
  );
  assert.deepEqual(
    calls.map((call) => call.args[0]),
    Array.from({ length: 20 }, (_, i) => i + 1),
  );
  assert.equal(files[0].value.result, "PASS");
  assert.equal(files[0].value.mode, "focused-cancellation");
  assert.equal(files[0].value.requestedCancellationContexts, 20);
});
test("supplemental cancellation diagnostics fail fast and preserve failed evidence", async () => {
  const { calls, files, error } = await exercise(
    { focusedCancellationOnly: true },
    3,
  );
  assert.equal(error.message, "Synthetic first failure");
  assert.equal(calls.length, 3);
  assert.equal(files[0].value.result, "FAIL");
  assert.equal(files[0].value.failure.message, "Synthetic first failure");
});
test("default spending suite keeps its original five cancellation contexts and other journeys", async () => {
  const { calls, files, error } = await exercise();
  assert.equal(error, undefined);
  assert.deepEqual(
    calls
      .filter((call) => call.name === "cancelledNavigation")
      .map((call) => call.args[0]),
    [1, 2, 3, 4, 5],
  );
  assert.equal(calls[0].name, "transactionJourney");
  assert.equal(calls.at(-1).name, "responsive");
  assert.equal(files[0].value.mode, "full-suite");
  assert.equal(files[0].value.requestedCancellationContexts, 5);
});
