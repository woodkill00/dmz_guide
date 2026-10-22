import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const helper = await import("../../src/client/inventory-window.mjs");
const source = await readFile("src/client/profile.mjs", "utf8");
for (const count of [100, 1000, 5000]) {
  test(`inventory ${count} mounts at most 50 rows`, () => {
    const fields = { innerHTML: "" },
      completion = { innerHTML: "" };
    const items = Array.from({ length: count }, (_, i) => ({
      id: `demo:item-${i}`,
      name: `Fictional ${i}`,
      unit: "units",
    }));
    const render = source.slice(
      source.indexOf("let inventoryDraft = null;"),
      source.indexOf('$("#inventory-form")?.addEventListener'),
    );
    const filter = source.slice(
      source.indexOf("function filterInventory("),
      source.indexOf("for (const [id, direction]"),
    );
    const nodes = {
      "#inventory-fields": fields,
      "#completion-fields": completion,
      "#inventory-query": { value: "" },
      "#inventory-view": { value: "all" },
      "#inventory-pagination": {},
      "#inventory-page-status": {},
      "#inventory-count": {},
      "#inventory-previous": { setAttribute() {} },
      "#inventory-next": { setAttribute() {} },
    };
    vm.runInNewContext(`${render}\n${filter}\nrender();`, {
      ...helper,
      registerDraftGuard() {},
      document: { addEventListener() {} },
      $: (selector) => nodes[selector],
      state: {
        pack: { items, objectives: [] },
        profile: { inventory: {}, reserves: {}, completion: {} },
      },
      esc: (s) => s,
    });
    assert(
      (fields.innerHTML.match(/data-inventory-item=/g) || []).length <= 50,
    );
  });
}

test("all-page raw draft, checkpoint and deterministic invalid recovery contract", () => {
  assert(
    helper,
    "A tested full raw draft must exist before windowing replaces DOM authority",
  );
  const items = Array.from({ length: 101 }, (_, i) => ({
    id: `demo:item-${i}`,
    name: `Fictional ${i}`,
    category: "fixture",
  }));
  const profile = { inventory: {}, reserves: {} };
  const draft = helper.createInventoryDraft(items, profile);
  draft.set("inventory", items[0].id, "0003", profile);
  draft.set("reserves", items[75].id, "4", profile);
  assert(draft.isDirty());
  assert.equal(draft.raw.get(`owned:${items[0].id}`), "0003");
  assert.equal(profile.inventory[items[0].id], 3);
  assert.equal(profile.reserves[items[75].id], 4);
  assert.equal(draft.firstInvalid(), null);
  draft.checkpoint();
  assert.equal(draft.isDirty(), false);
  draft.set("reserves", items[75].id, "1000001", profile);
  draft.set("inventory", items[75].id, "", profile);
  assert.deepEqual(draft.firstInvalid(), {
    id: items[75].id,
    field: "inventory",
    name: `owned:${items[75].id}`,
    index: 75,
  });
  assert(Number.isNaN(profile.inventory[items[75].id]));
  draft.set("inventory", items[75].id, "2.5", profile);
  assert.equal(draft.raw.get(`owned:${items[75].id}`), "2.5");
  assert(draft.isDirty(), "Failed save does not call checkpoint");
  assert.equal(draft.raw.get(`owned:${items[0].id}`), "0003");
});
test("bounded page zero, middle and boundary states preserve stable order", () => {
  assert(helper);
  const ids = Array.from({ length: 101 }, (_, i) => `demo:item-${i}`);
  assert.deepEqual(helper.inventoryPage(ids, -1), {
    ids: ids.slice(0, 50),
    page: 0,
    pages: 3,
    first: 1,
    last: 50,
  });
  assert.deepEqual(helper.inventoryPage(ids, 1), {
    ids: ids.slice(50, 100),
    page: 1,
    pages: 3,
    first: 51,
    last: 100,
  });
  assert.deepEqual(helper.inventoryPage(ids, 99), {
    ids: ids.slice(100),
    page: 2,
    pages: 3,
    first: 101,
    last: 101,
  });
  assert.deepEqual(helper.inventoryPage([], 99), {
    ids: [],
    page: 0,
    pages: 1,
    first: 0,
    last: 0,
  });
});

const common = await readFile("src/client/common.mjs", "utf8");
test("shared export rejects full invalid profile and requests raw recovery without downloading", () => {
  let recovered = 0,
    downloads = 0;
  const source = common
    .slice(
      common.indexOf("export function exportProfile()"),
      common.indexOf("async function requestDeparture"),
    )
    .replace("export ", "");
  const state = {
    loading: false,
    pack: { id: "demo:pack" },
    profile: { packId: "demo:pack", inventory: { "demo:offscreen": NaN } },
  };
  vm.runInNewContext(`${source}\nexportProfile();`, {
    state,
    validateProfile(profile) {
      assert(Number.isNaN(profile.inventory["demo:offscreen"]));
      throw new Error("invalid quantity");
    },
    error() {},
    draftGuard: {
      revealInvalid() {
        recovered++;
      },
    },
    download() {
      downloads++;
    },
  });
  assert.equal(recovered, 1);
  assert.equal(downloads, 0);
});
test("failed full save requests draft recovery but never writes or clears raw checkpoint", async () => {
  let recovered = 0,
    writes = 0,
    saved = 0;
  const profile = { packId: "demo:pack", inventory: { "demo:offscreen": NaN } };
  const context = {
    state: {
      profile,
      pack: { id: "demo:pack" },
      saving: false,
      loading: false,
    },
    document: {
      querySelectorAll: () => [],
      dispatchEvent() {
        saved++;
      },
    },
    validateProfile() {
      throw new Error("invalid quantity");
    },
    error() {},
    status() {},
    draftGuard: {
      revealInvalid() {
        recovered++;
      },
    },
    saveProfile() {
      writes++;
    },
  };
  vm.runInNewContext(
    `${common.slice(common.indexOf("export async function persist")).replace("export ", "")}\nglobalThis.save = persist;`,
    context,
  );
  assert.equal(await context.save(), false);
  assert.equal(recovered, 1);
  assert.equal(writes, 0);
  assert.equal(saved, 0);
  assert.equal(context.state.profile, profile);
});

for (const boundary of [true, false]) {
  test(`pager explicitly retains activated button focus before ${boundary ? "boundary no-op" : "row replacement"}`, () => {
    let active = { name: "old row input" },
      rendered = 0;
    const button = {
      addEventListener(_event, listener) {
        this.click = listener;
      },
      getAttribute() {
        return String(boundary);
      },
      focus() {
        active = this;
      },
    };
    const context = {
      $: () => button,
      state: { loading: false, saving: false },
      inventoryPageNumber: 0,
      filterInventory() {
        assert.equal(active, button);
        rendered++;
      },
    };
    const listeners = source.slice(
      source.indexOf("for (const [id, direction]"),
      source.indexOf('$("#inventory-query")?.addEventListener'),
    );
    vm.runInNewContext(listeners, context);
    button.click({ currentTarget: button });
    assert.equal(active, button);
    assert.equal(rendered, boundary ? 0 : 1);
    assert.equal(context.inventoryPageNumber, boundary ? 0 : 1);
  });
}
