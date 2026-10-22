import {
  matchesTokens,
  createReaderContext,
  readReaderContext,
  verifyReaderContext,
  writeHomeSearch,
  readHomeSearch,
} from "../../src/domain/reader-flow.mjs";
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { featurePages } from "../../src/ui/private-pages.mjs";
import { featurePages as mapPages } from "../../src/ui/maps-page.mjs";
import { renderLayout, setNavigation } from "../../src/ui/render.mjs";
const source = (name) =>
  readFileSync(new URL(`../../${name}`, import.meta.url), "utf8");
test("Wave2 quantity is additional output, not target stock", () => {
  const markup = featurePages([])[0].body;
  assert.match(markup, /Additional output quantity/);
  assert.doesNotMatch(markup, /Target output quantity/);
});
test("Wave2 catalog nonadjacent all-token matching and private query", () => {
  const listeners = {},
    fields = {
      q: { value: "" },
      type: { value: "", options: [{ value: "" }, { value: "item" }] },
      pack: { value: "", options: [{ value: "" }, { value: "fixture:pack" }] },
    };
  const cards = [
    "alpha copper supply",
    "alpha copper supply spare",
    "alpha iron",
  ].map((text) => ({
    dataset: { search: text, type: "item", pack: "fixture:pack" },
    hidden: false,
  }));
  const form = {
    dataset: { defaultPack: "fixture:pack" },
    querySelector: (s) =>
      fields[s === "#catalog-search" ? "q" : s.match(/name="(.*?)"/)[1]],
    addEventListener: (name, fn) => {
      listeners[name] = fn;
    },
  };
  let address = "";
  const document = {
    querySelector: (s) =>
      s === "#catalog-filters" ? form : s === ".home-search" ? null : {},
    querySelectorAll: (s) => (s === "[data-record-card]" ? cards : []),
  };
  vm.runInNewContext(
    source("src/client/catalog.mjs").replace(/^import .*?;\n/gms, ""),
    {
      matchesTokens,
      document,
      location: { search: "", pathname: "/catalog/" },
      URLSearchParams,
      history: {
        replaceState: (_, __, url) => {
          address = url;
        },
      },
      window: { addEventListener() {} },
    },
  );
  fields.q.value = "copper alpha";
  listeners.input();
  assert.deepEqual(
    cards.map((c) => !c.hidden),
    [true, true, false],
  );
  assert(!address.includes("q="));
});
test("Wave2 map shell leads with useful list", () => {
  const s = mapPages([])[0].body;
  assert(s.indexOf('id="location-list"') < s.indexOf('id="location-map"'));
});
test("Wave2 closed secondary nav identifies section", () => {
  setNavigation([{ path: "/maps/", title: "Maps", page: "maps" }]);
  assert.match(
    renderLayout({ title: "Maps", page: "maps", body: "" }),
    /<summary>More[^<]*Maps/,
  );
});
test("Wave2 zero-goal result is actionable without empty panels", () => {
  const nodes = new Map();
  const $ = (s) => {
    if (!nodes.has(s))
      nodes.set(s, {
        innerHTML: "",
        addEventListener() {},
        focus() {},
        querySelectorAll() {
          return [];
        },
      });
    return nodes.get(s);
  };
  vm.runInNewContext(
    source("src/client/planner.mjs").replace(/^import .*?;\n/gms, ""),
    {
      $,
      esc: String,
      state: {
        pack: { recipes: [], objectives: [], guides: [], items: [] },
        profile: { goals: [], routes: {}, spoilers: false },
      },
      init: (fn) => {
        fn();
        return Promise.resolve();
      },
      error: (e) => {
        throw e;
      },
      planShared: () => ({ goals: [], ledger: [], schedule: [] }),
      URL,
      location: { href: "http://localhost/planner/" },
      document: { addEventListener() {} },
      WeakMap,
    },
  );
  const markup = $("#plan-output").innerHTML;
  assert.match(markup, /Add a goal/);
  assert.doesNotMatch(markup, /Executable-now trial schedule/);
  assert.match(markup, /href="[^\"]*inventory/);
});

const memory = () => {
  const values = new Map();
  return {
    values,
    getItem: (key) => values.get(key) || null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
};
const fixture = () => ({
  id: "fixture:private",
  contentVersion: "1",
  items: [{ id: "fixture:copper", name: "Synthetic copper" }],
  locations: [],
});
const tokenOf = (url) =>
  new URL(url, "http://localhost").searchParams.get("context");
test("reader context stores bounded identities only and rejects same-version drift", async () => {
  const storage = memory(),
    pack = fixture(),
    now = 1000;
  const url = await createReaderContext(pack, pack.items[0].id, "local", {
    storage,
    now,
  });
  assert(!url.includes(pack.id));
  assert(!url.includes("copper"));
  const entry = readReaderContext(tokenOf(url), "local", { storage, now });
  assert.deepEqual(Object.keys(entry).sort(), [
    "contentVersion",
    "destination",
    "digest",
    "expiresAt",
    "needsOnly",
    "packId",
    "targetId",
  ]);
  assert.equal(
    (await verifyReaderContext(pack, entry, false, { now })).id,
    pack.items[0].id,
  );
  const changed = structuredClone(pack);
  changed.items[0].name = "Changed private name";
  await assert.rejects(
    verifyReaderContext(changed, entry, false, { now }),
    /unavailable or has changed/,
  );
  assert.throws(
    () => readReaderContext(tokenOf(url), "maps", { storage, now }),
    /unavailable/,
  );
  assert.throws(
    () =>
      readReaderContext(tokenOf(url), "local", {
        storage,
        now: now + 30 * 60_000,
      }),
    /unavailable/,
  );
  assert.throws(
    () => readReaderContext(tokenOf(url), "local", { storage: memory(), now }),
    /unavailable/,
  );
});
test("reader contexts bound entries and fail on denial/quota/malformed data", async () => {
  const storage = memory(),
    pack = fixture(),
    now = 1000;
  for (let i = 0; i < 25; i++)
    await createReaderContext(pack, pack.items[0].id, "maps", {
      storage,
      now: now + i,
    });
  const raw = [...storage.values.values()][0];
  assert.equal(Object.keys(JSON.parse(raw)).length, 20);
  assert(raw.length <= 32768);
  const denied = {
    getItem() {
      throw Error("denied");
    },
    setItem() {
      throw Error("quota");
    },
  };
  await assert.rejects(
    createReaderContext(pack, pack.items[0].id, "local", {
      storage: denied,
      now,
    }),
    /unavailable/,
  );
  const quota = {
    getItem() {
      return null;
    },
    setItem() {
      throw Error("quota");
    },
  };
  await assert.rejects(
    createReaderContext(pack, pack.items[0].id, "local", {
      storage: quota,
      now,
    }),
    /unavailable/,
  );
  storage.setItem("dmz-reader-context-v1", "not json");
  assert.throws(
    () => readReaderContext(crypto.randomUUID(), "local", { storage, now }),
    /unavailable/,
  );
  await assert.rejects(
    createReaderContext(
      { ...pack, id: "x".repeat(257) },
      pack.items[0].id,
      "local",
      { storage: memory(), now },
    ),
    /unavailable/,
  );
});
test("context permission does not override current spoiler choice or missing target", async () => {
  const storage = memory(),
    pack = fixture();
  pack.items[0].spoiler = true;
  const url = await createReaderContext(pack, pack.items[0].id, "local", {
    storage,
  });
  const entry = readReaderContext(tokenOf(url), "local", { storage });
  await assert.rejects(verifyReaderContext(pack, entry, false), /unavailable/);
  await verifyReaderContext(pack, entry, true);
  await assert.rejects(
    verifyReaderContext({ ...pack, id: "fixture:other" }, entry, true),
    /unavailable/,
  );
});
test("home search is opaque, single-use, token-bound and expires", () => {
  const storage = memory(),
    now = 1000,
    url = writeHomeSearch("secret synthetic query", { storage, now });
  const token = new URL(url, "http://localhost").searchParams.get("search");
  assert(!url.includes("secret"));
  assert.throws(() => readHomeSearch(crypto.randomUUID(), { storage, now }));
  assert.equal(
    readHomeSearch(token, { storage, now }),
    "secret synthetic query",
  );
  assert.throws(() => readHomeSearch(token, { storage, now }));
  const second = writeHomeSearch("new query", { storage, now });
  assert.throws(() =>
    readHomeSearch(
      new URL(second, "http://localhost").searchParams.get("search"),
      { storage, now: 121000 },
    ),
  );
  assert.throws(() => writeHomeSearch("x".repeat(201), { storage, now }));
});
test("all-token matcher keeps punctuation literal and ignores empty tokens", () => {
  assert(matchesTokens("Alpha, copper alloy", "  ALLOY alpha, "));
  assert(!matchesTokens("spoiler-protected record", "hidden sentinel"));
  assert(matchesTokens("anything", "   "));
});
test("in-memory navigation context is rechecked for expiry on later render", async () => {
  const storage = memory(),
    pack = fixture(),
    now = 1000;
  const url = await createReaderContext(pack, pack.items[0].id, "local", {
    storage,
    now,
  });
  const entry = readReaderContext(tokenOf(url), "local", { storage, now });
  await assert.rejects(
    verifyReaderContext(pack, entry, false, { now: now + 30 * 60_000 }),
    /unavailable/,
  );
});
