import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";
const source = (await readFile("tests/browser/upgrades-studio.mjs", "utf8"))
  .replace(/^import[\s\S]*?;\n/gm, "")
  .replace("export async function", "async function");
const clone = (value) => structuredClone(value);
async function exercise(mode) {
  const packs = [1, 2].map((schemaVersion) => ({
    schemaVersion,
    contentVersion: "initial",
    description: "FICTIONAL Studio ownership test",
    assets: [],
    objectives: [
      {
        description: "FICTIONAL objective",
        upgrade: { prerequisiteStatus: "unknown" },
        requirements: [{ consumption: "consumed" }],
      },
    ],
  }));
  const keys = ["demo-training", "upgrade-observations"];
  const servers = [],
    selected = { key: keys[0], draft: clone(packs[0]) };
  let contextClosed = 0,
    advanced,
    imported,
    current;
  const makeServer = () => {
    const server = {
      url: `http://fixture.invalid/${servers.length}`,
      entries: keys.map((key, i) => ({
        key,
        pack: clone(current?.entries[i].pack || packs[i]),
      })),
      closes: 0,
      async close() {
        this.closes++;
        assert.equal(this.closes, 1, "No stale/double server close");
        if (mode === "cleanup" && servers.length > 1)
          throw new Error("cleanup sentinel");
      },
    };
    servers.push(server);
    current = server;
    return server;
  };
  const original = makeServer();
  const get = (path) =>
    path.split(".").reduce((value, key) => value[key], selected.draft);
  const set = (path, value) => {
    const parts = path.split(".");
    const key = parts.pop();
    parts.reduce((value, key) => value[key], selected.draft)[key] = value;
  };
  const locator = (selector) => ({
    locator: () => locator("details"),
    evaluate: async () => true,
    click: async () => {},
    fill: async (value) => set(selector.match(/data-path="([^"]+)"/)[1], value),
    inputValue: async () => {
      if (
        ["assertion", "cleanup"].includes(mode) &&
        selector.includes("consumption")
      )
        return "unknown";
      return get(selector.match(/data-path="([^"]+)"/)[1]);
    },
    selectOption: async (value) =>
      set(selector.match(/data-path="([^"]+)"/)[1], value),
    isVisible: async () => false,
  });
  const page = {
    locator,
    goto: async () => {},
    waitForSelector: async () => {},
    waitForFunction: async () => {},
    waitForResponse: async () => ({
      status: () => 200,
      finished: async () => null,
      text: async () => "ok",
    }),
    waitForEvent: async () => ({ path: async () => "virtual-export" }),
    selectOption: async (selector, key) => {
      if (selector === "#pack-select") {
        selected.key = key;
        selected.draft = clone(current.entries.find((e) => e.key === key).pack);
      }
    },
    fill: async (_, value) => {
      advanced = JSON.parse(value);
    },
    click: async (selector) => {
      if (selector === "#load-json") selected.draft = clone(advanced);
      if (selector === "#save-repository")
        current.entries.find((e) => e.key === selected.key).pack = clone(
          selected.draft,
        );
      if (selector === "#apply-import") selected.draft = clone(imported);
    },
    setInputFiles: async (_, file) => {
      imported = JSON.parse(file.buffer.toString());
    },
    check: async () => {},
  };
  const context = {
    newPage: async () => {
      if (mode === "new-page") throw new Error("new-page sentinel");
      return page;
    },
    close: async () => {
      contextClosed++;
      if (mode === "context-close") throw new Error("context-close sentinel");
    },
  };
  const sandbox = {
    assert,
    JSON,
    Buffer,
    process: { env: {} },
    readFile: async () => JSON.stringify({ pack: selected.draft }),
    writeFile: async () => {},
    mkdir: async () => {},
    fetch: async () => ({
      status: 200,
      json: async () => ({ entries: clone(current.entries) }),
    }),
  };
  vm.runInNewContext(
    `${source}\nglobalThis.run=runUpgradeStudioRoundtrip;`,
    sandbox,
  );
  let result, failure;
  try {
    result = await sandbox.run({
      browser: {
        browserType: () => ({ name: () => "synthetic" }),
        newContext: async () => {
          if (mode === "new-context") throw new Error("new-context sentinel");
          return context;
        },
      },
      repository: "fictional",
      author: original,
      createAuthorServer: async () => {
        if (mode === "restart") throw new Error("restart sentinel");
        return makeServer();
      },
    });
  } catch (error) {
    failure = error;
  }
  return { servers, contextClosed, result, failure };
}
for (const mode of [
  "new-context",
  "new-page",
  "restart",
  "assertion",
  "context-close",
  "cleanup",
])
  test(`Studio helper owns current server through ${mode} failure`, async () => {
    const outcome = await exercise(mode);
    assert(outcome.failure, "The original failure must propagate");
    assert.equal(outcome.result, undefined);
    assert(outcome.servers.every((server) => server.closes === 1));
    assert.equal(outcome.contextClosed, mode === "new-context" ? 0 : 1);
    if (mode === "assertion" || mode === "cleanup") {
      assert.match(outcome.failure.message, /Guided Studio preserves/);
      if (mode === "cleanup")
        assert.match(outcome.failure.cause.message, /Guided Studio preserves/);
    } else
      assert.match(outcome.failure.message, new RegExp(`${mode} sentinel`));
  });
test("Studio helper hands only the latest open server back after both isolated roundtrips", async () => {
  const outcome = await exercise("success");
  assert.equal(outcome.failure, undefined);
  assert.equal(outcome.servers.length, 3);
  assert.equal(outcome.contextClosed, 1);
  assert.deepEqual(
    outcome.servers.map((s) => s.closes),
    [1, 1, 0],
  );
  assert.equal(outcome.result, outcome.servers[2]);
  await outcome.result.close();
  assert(outcome.servers.every((server) => server.closes === 1));
});
