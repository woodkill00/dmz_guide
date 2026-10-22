import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const { filterInventoryIds } = await import(
  "../../src/client/inventory-window.mjs"
);
for (const count of [100, 1000, 5000]) {
  test(`inventory filter ${count} preserves stable full-catalog results with one indexed lookup per record`, () => {
    const items = Array.from({ length: count }, (_, i) => ({
      id: `demo:item-${i}`,
      name: `Fixture ${i}`,
      category: "fictional",
    }));
    const index = new Map(items.map((item) => [item.id, item]));
    const get = index.get.bind(index);
    let lookups = 0;
    index.get = (id) => {
      lookups++;
      return get(id);
    };
    const profile = { inventory: {}, reserves: {} };
    assert.deepEqual(
      filterInventoryIds(index, profile, "Fixture 1", "all"),
      items
        .filter((item) => item.name.includes("Fixture 1"))
        .map((item) => item.id),
    );
    assert.equal(lookups, count);
    profile.reserves[items[count - 1].id] = 2;
    assert.deepEqual(filterInventoryIds(index, profile, "", "owned"), [
      items[count - 1].id,
    ]);
    assert.deepEqual(
      filterInventoryIds(index, profile, "", "needed", new Set([items[2].id])),
      [items[2].id],
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
    focus() {
      if (context.document.activeElement !== this) focusChanges++;
      context.document.activeElement = this;
    },
  });
  const select = element(true, true),
    input = element(),
    backup = element(true, true),
    main = element(),
    errorNode = element(),
    note = element(),
    saveStatus = element();
  const controls = [select, input, backup];
  const calls = [],
    events = [],
    statuses = [];
  let renders = 0,
    focusChanges = 0;
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
    "#save-status": saveStatus,
  };
  const context = vm.createContext({
    state,
    statusRevision: 0,
    hasUnsavedDraft: () => false,
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
      context.statusRevision++;
      saveStatus.textContent = value;
      statuses.push(value);
    },
    requestDeparture: async (proceed) => proceed(),
    document: {
      activeElement: input,
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
    `${common.slice(common.indexOf("export function error(reason)"), common.indexOf("let statusRevision = 0;")).replaceAll("export ", "")}\n${source}\nglobalThis.start = () => init(render); globalThis.getBaseline = (id) => getCatalog(id, { publishedOnly: true });`,
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
    focus: (node) => {
      context.document.activeElement = node;
    },
    activeElement: () => context.document.activeElement,
    focusChanges: () => focusChanges,
    setStatus: context.status,
    setDirty: (value) => {
      context.hasUnsavedDraft = () => value;
    },
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

async function delayedInvalidCatalog() {
  let finish;
  const pending = new Promise((resolve) => {
    finish = resolve;
  });
  const harness = await initializationHarness({ listing: () => pending });
  return {
    harness,
    finish: async () => {
      finish([{ value: { pack: { id: "local:invalid-probe" } } }]);
      await new Promise((resolve) => setImmediate(resolve));
    },
  };
}
test("deferred invalid catalog marks otherwise unchanged healthy selected status without delaying readiness", async () => {
  const { harness, finish } = await delayedInvalidCatalog();
  assert.equal(harness.state.loading, false);
  assert.equal(harness.statuses.at(-1), "Saved locally · no account or sync");
  await finish();
  assert.match(
    harness.errorNode.textContent,
    /^An invalid local catalog was retained but not listed/,
  );
  assert.match(harness.statuses.at(-1), /storage available.*content warning/i);
  assert.doesNotMatch(harness.statuses.at(-1), /storage unavailable/i);
});
for (const laterStatus of [
  "Unsaved inventory edits",
  "Saved locally · revision 3",
  "Saved locally · no account or sync",
]) {
  test(`deferred invalid catalog preserves newer user status: ${laterStatus}`, async () => {
    const { harness, finish } = await delayedInvalidCatalog();
    harness.setStatus(laterStatus);
    const count = harness.statuses.length;
    await finish();
    assert.equal(harness.statuses.at(-1), laterStatus);
    assert.equal(
      harness.statuses.length,
      count,
      "Even equal-text later status must not be overwritten",
    );
  });
}
test("deferred invalid catalog cannot overwrite a dirty draft even before its status handler", async () => {
  const { harness, finish } = await delayedInvalidCatalog();
  harness.setDirty(true);
  const count = harness.statuses.length;
  await finish();
  assert.equal(harness.statuses.length, count);
});

test("deferred invalid catalog does not replace status while a save is in flight", async () => {
  const { harness, finish } = await delayedInvalidCatalog();
  harness.state.saving = true;
  const count = harness.statuses.length;
  await finish();
  assert.equal(harness.statuses.length, count);
});

for (const target of ["input", "backup"]) {
  test(`delayed discovery warning does not steal ${target} focus or change its raw draft/model`, async () => {
    const { harness, finish } = await delayedInvalidCatalog();
    harness.input.value = "";
    harness.state.profile.inventory = { "demo:wire": NaN };
    const profile = harness.state.profile;
    harness.setDirty(true);
    harness.focus(harness[target]);
    const count = harness.focusChanges();
    await finish();
    assert.equal(harness.activeElement(), harness[target]);
    assert.equal(
      harness.focusChanges(),
      count,
      "No forced focus/blur side effects",
    );
    assert.equal(harness.input.value, "");
    assert.equal(harness.state.profile, profile);
    assert(Number.isNaN(profile.inventory["demo:wire"]));
    assert.match(harness.errorNode.textContent, /invalid local catalog/);
  });
}
