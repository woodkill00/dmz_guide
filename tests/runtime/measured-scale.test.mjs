import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const profileSource = await readFile("src/client/profile.mjs", "utf8");
const filterSource = profileSource.slice(
  profileSource.indexOf("function filterInventory()"),
  profileSource.indexOf('$("#inventory-query")?.addEventListener'),
);

for (const count of [100, 1000, 5000]) {
  test(`inventory filter ${count} records preserves stable results with bounded indexed lookup work`, () => {
    let comparisons = 0,
      lookups = 0;
    const items = Array.from({ length: count }, (_, i) => ({
      get id() {
        comparisons++;
        return `demo:item-${i}`;
      },
      name: `Fixture ${i}`,
      category: "fictional",
    }));
    const nodes = items.map((item, i) => ({
      dataset: { inventoryItem: item.id },
      hidden: false,
      raw: i % 2 ? "" : "0003",
    }));
    const inventoryIndex = new Map(items.map((item) => [item.id, item]));
    const get = inventoryIndex.get.bind(inventoryIndex);
    inventoryIndex.get = (id) => {
      lookups++;
      return get(id);
    };
    comparisons = 0;
    const elements = {
      "#inventory-query": { value: "Fixture 1" },
      "#inventory-view": { value: "all" },
      "#inventory-count": { textContent: "" },
    };
    vm.runInNewContext(`${filterSource}\nfilterInventory();`, {
      $: (selector) => elements[selector],
      document: { querySelectorAll: () => nodes },
      state: { pack: { items }, profile: { inventory: {}, reserves: {} } },
      inventoryIndex,
      planShared: () => ({ ledger: [] }),
    });
    const sourceComparisons = comparisons;
    assert.deepEqual(
      nodes
        .filter((node) => !node.hidden)
        .map((node) => node.dataset.inventoryItem),
      items
        .filter((item) => item.name.includes("Fixture 1"))
        .map((item) => item.id),
    );
    assert(
      nodes.every((node, i) => node.raw === (i % 2 ? "" : "0003")),
      "View filtering does not rewrite raw values",
    );
    // Exclude the independent expected-output calculation above from source work.
    assert.equal(
      lookups,
      count,
      `Each fieldset needs exactly one indexed lookup; observed${lookups}, linear comparisons${sourceComparisons}`,
    );
    assert(
      sourceComparisons <= count,
      `No repeated full-list searches: ${sourceComparisons}`,
    );
  });
}

const schema = JSON.parse(await readFile("schemas/pack.schema.json", "utf8"));
const manifest = {
  packs: [
    "/assets/content/packs/demo-training.json",
    "/assets/content/packs/official-starter.json",
  ],
  catalogs: [
    {
      id: "demo:training-pack",
      title: "Fictional training",
      path: "/assets/content/packs/demo-training.json",
    },
    {
      id: "official:mw4-dmz-starter",
      title: "Starter",
      path: "/assets/content/packs/official-starter.json",
    },
  ],
};
const loaderModule = () => import("../../src/content/catalog-loader.mjs");
test("catalog descriptors reject malformed, ambiguous and unsafe identities before payload requests", async () => {
  const { parseCatalogManifest } = await loaderModule();
  assert.equal(
    parseCatalogManifest(JSON.stringify(manifest)).catalogs.length,
    2,
  );
  for (const change of [
    (m) => delete m.catalogs,
    (m) => {
      m.catalogs = [];
      m.packs = [];
    },
    (m) => m.catalogs.push(m.catalogs[0]),
    (m) => (m.catalogs[0].id = "demo:x?y"),
    (m) => (m.catalogs[0].id = `demo:${"a".repeat(200)}`),
    (m) => (m.catalogs[0].title = ""),
    (m) => (m.catalogs[0].title = "x".repeat(201)),
    (m) =>
      (m.catalogs[0].path = "https://evil.test/assets/content/packs/one.json"),
    (m) => (m.catalogs[0].path += "?x=1"),
    (m) => (m.catalogs[0].path += "#secret"),
    (m) => (m.catalogs[0].path = "/assets/content/packs/../one.json"),
    (m) => (m.catalogs[0].path = "/assets/content/packs/unlisted.json"),
    (m) => m.packs.push(m.packs[0]),
    (m) => (m.extra = "x".repeat(65536)),
  ]) {
    const altered = structuredClone(manifest);
    change(altered);
    assert.throws(() => parseCatalogManifest(JSON.stringify(altered)));
  }
});
test("exact catalog loader requests only selected payload and caches successful validation", async () => {
  const { createCatalogLoader, parseCatalogManifest } = await loaderModule();
  const { loadFixturePack } = await import("../helpers/catalog.mjs");
  const calls = [];
  const loader = createCatalogLoader({
    manifest: parseCatalogManifest(JSON.stringify(manifest)),
    schema,
    fetcher: async (path) => {
      calls.push(path);
      assert.equal(
        path,
        manifest.packs[0],
        "Unrelated payload must not be requested",
      );
      return new Response(JSON.stringify(loadFixturePack("demo-training")), {
        status: 200,
      });
    },
  });
  const first = await loader.getPublished("demo:training-pack");
  assert.equal(first.id, "demo:training-pack");
  assert.equal(await loader.getPublished("demo:training-pack"), first);
  assert.deepEqual(calls, [manifest.packs[0]]);
  await assert.rejects(loader.getPublished("demo:unknown"));
  assert.equal(calls.length, 1);
});
test("failed or mismatched catalog payloads are not cached and explicit retry can recover", async () => {
  const { createCatalogLoader, parseCatalogManifest } = await loaderModule();
  const { loadFixturePack } = await import("../helpers/catalog.mjs");
  const wrong = loadFixturePack("official-starter");
  let attempt = 0;
  const loader = createCatalogLoader({
    manifest: parseCatalogManifest(JSON.stringify(manifest)),
    schema,
    fetcher: async () => {
      attempt++;
      if (attempt === 1)
        return new Response('{"schemaVersion":1}', { status: 200 });
      if (attempt === 2)
        return new Response(JSON.stringify(wrong), { status: 200 });
      if (attempt === 3) return new Response("unavailable", { status: 503 });
      return new Response(JSON.stringify(loadFixturePack("demo-training")), {
        status: 200,
      });
    },
  });
  for (let i = 0; i < 3; i++)
    await assert.rejects(loader.getPublished("demo:training-pack"));
  assert.equal(
    (await loader.getPublished("demo:training-pack")).id,
    "demo:training-pack",
  );
  assert.equal(attempt, 4);
});

async function initializationHarness({
  requested = "demo:training-pack",
  listing,
  malformed = false,
} = {}) {
  const { createCatalogLoader, parseCatalogManifest } = await loaderModule();
  const { ID } = await import("../../src/content/limits.mjs");
  const { validatePack } = await import("../../src/content/validate.mjs");
  const { loadFixturePack } = await import("../helpers/catalog.mjs");
  const common = await readFile("src/client/common.mjs", "utf8");
  const source = common
    .slice(
      common.indexOf("let catalogLoader = null;"),
      common.indexOf("export async function persist"),
    )
    .replaceAll("export ", "");
  const element = (disabled = false, startup = false) => ({
    disabled,
    value: "",
    hidden: true,
    textContent: "",
    listeners: {},
    hasAttribute: (name) => startup && name === "data-startup-disabled",
    addEventListener(type, listener) {
      this.listeners[type] = listener;
    },
    setAttribute(name, value) {
      this[name] = value;
    },
  });
  const select = element(true, true),
    input = element(),
    backup = element(true, true),
    main = element(),
    errorNode = element(),
    note = element();
  const controls = [select, input, backup];
  const calls = [],
    events = [],
    statuses = [];
  let renders = 0;
  const state = {
    pack: null,
    profile: null,
    revision: 0,
    packs: [],
    loading: true,
    saving: false,
  };
  const nodes = {
    "#pack-select": select,
    "#export-current-profile": backup,
    "#error": errorNode,
    "#pack-note": note,
  };
  const context = vm.createContext({
    state,
    createCatalogLoader: (options) =>
      createCatalogLoader({ ...options, fetcher: context.fetch }),
    parseCatalogManifest,
    validatePack,
    ID,
    URL,
    Event,
    $: (selector) => nodes[selector],
    esc: (value) => String(value),
    exportProfile() {},
    error(reason) {
      errorNode.hidden = false;
      errorNode.textContent = reason.message;
    },
    status(value) {
      statuses.push(value);
    },
    requestDeparture: async (proceed) => proceed(),
    document: {
      querySelectorAll: (selector) => (selector === "a[href]" ? [] : controls),
      querySelector: () => main,
      dispatchEvent: (event) => events.push(event.type),
    },
    location: {
      href: `http://fixture.test/inventory/?pack=${encodeURIComponent(requested)}`,
    },
    history: { replaceState() {} },
    readRecord: async () => null,
    listRecords: listing || (async () => []),
    loadProfile: async () => null,
    newProfile: (pack) => ({ packId: pack.id }),
    validateProfile() {},
    fetch: async (path) => {
      calls.push(path);
      if (path.includes("schema")) return new Response(JSON.stringify(schema));
      if (path.endsWith("manifest.json"))
        return new Response(JSON.stringify(manifest));
      if (path === manifest.packs[0])
        return new Response(JSON.stringify(loadFixturePack("demo-training")));
      return new Response(
        malformed
          ? '{"schemaVersion":1}'
          : JSON.stringify(loadFixturePack("official-starter")),
      );
    },
    render: () => {
      renders++;
    },
  });
  vm.runInContext(
    `${source}\nglobalThis.start = () => init(render); globalThis.getBaseline = (id) => getCatalog(id, { publishedOnly: true });`,
    context,
  );
  await context.start();
  return {
    state,
    select,
    input,
    backup,
    calls,
    events,
    statuses,
    errorNode,
    renders: () => renders,
    getBaseline: context.getBaseline,
  };
}

test("selected initialization completes without waiting for unrelated local discovery", async () => {
  const harness = await initializationHarness({
    listing: () => new Promise(() => {}),
  });
  assert.equal(harness.state.pack.id, "demo:training-pack");
  assert.equal(harness.state.loading, false);
  assert.equal(harness.backup.disabled, false);
  assert.equal(harness.input.disabled, false);
  assert.equal(harness.calls.includes(manifest.packs[1]), false);
  assert.equal(harness.renders(), 1);
});
test("unknown startup retains disabled mutations then explicit known recovery restores original enabled controls", async () => {
  const harness = await initializationHarness({ requested: "demo:unknown" });
  assert.equal(harness.state.pack, null);
  assert.equal(harness.backup.disabled, true);
  assert.equal(harness.select.disabled, false);
  harness.select.value = "demo:training-pack";
  harness.select.listeners.change();
  for (let i = 0; i < 20 && !harness.state.pack; i++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.state.pack.id, "demo:training-pack");
  assert.equal(harness.backup.disabled, false);
  assert.equal(harness.input.disabled, false);
});
test("failed accepted switch preserves exact active profile, raw input, checkpoint render count and selection", async () => {
  const harness = await initializationHarness({ malformed: true });
  harness.input.value = "";
  const profile = harness.state.profile;
  harness.select.value = "official:mw4-dmz-starter";
  harness.select.listeners.change();
  for (let i = 0; i < 20 && harness.state.loading; i++)
    await new Promise((resolve) => setImmediate(resolve));
  assert.equal(harness.state.pack.id, "demo:training-pack");
  assert.equal(harness.state.profile, profile);
  assert.equal(harness.input.value, "");
  assert.equal(harness.select.value, "demo:training-pack");
  assert.equal(
    harness.renders(),
    1,
    "No checkpoint-replacing render after failure",
  );
  assert.deepEqual(
    harness.events,
    ["pack-changing"],
    "No destructive event after failed switch",
  );
  assert.match(harness.errorNode.textContent, /No catalog switch occurred/);
});

test("private import fallback ignores stale cached overlays after authoritative local record disappears", async () => {
  const harness = await initializationHarness();
  harness.state.packs[0] = {
    ...harness.state.packs[0],
    title: "STALE PRIVATE OVERLAY",
  };
  const baseline = await harness.getBaseline("demo:training-pack");
  assert.notEqual(baseline.title, "STALE PRIVATE OVERLAY");
  assert.equal(baseline.id, "demo:training-pack");
  harness.state.packs.push({
    id: "demo:deleted-private-only",
    title: "STALE PRIVATE ONLY",
  });
  assert.equal(await harness.getBaseline("demo:deleted-private-only"), null);
  const editor = await readFile("src/client/editor.mjs", "utf8");
  assert.match(
    editor,
    /getCatalog\(parsed\.pack\.id,\s*\{\s*publishedOnly:\s*true\s*\}\)/,
  );
});
test("deferred discovery failure never claims an unavailable startup catalog is active", async () => {
  let rejectListing;
  const listing = new Promise((_, reject) => {
    rejectListing = reject;
  });
  const harness = await initializationHarness({
    requested: "demo:unknown",
    listing: () => listing,
  });
  harness.errorNode.hidden = true;
  rejectListing(new Error("Injected listing failure"));
  await new Promise((resolve) => setImmediate(resolve));
  assert.match(harness.errorNode.textContent, /No catalog is active/);
  assert.doesNotMatch(
    harness.errorNode.textContent,
    /current catalog remains available/,
  );
});
