import test from "node:test";
import assert from "node:assert/strict";
import { loadFixturePack } from "../helpers/catalog.mjs";
import {
  newProfile,
  validateProfile,
  parseProfile,
  resetProfile,
} from "../../src/domain/profile.mjs";
import {
  emptyFieldOps,
  journalInventory,
} from "../../src/domain/field-ops-state.mjs";
import {
  fieldCandidate,
  previewRunChanges,
  previewFieldChanges,
  previewTransfer,
  previewReturnCarried,
  previewFieldUndo,
  addDiscovery,
} from "../../src/domain/field-ops.mjs";
import {
  matchScanText,
  combineScanRows,
} from "../../src/domain/stash-scan.mjs";
import { validateCollectionHandoff } from "../../src/domain/collection-handoff.mjs";
const pack = loadFixturePack("official-starter"),
  id = "mw4:bandage";
const profile = () => {
  const p = newProfile(pack);
  p.inventory[id] = 10;
  return p;
};
test("FO-2 transfers conserve stock and carried gear is independent of FOB inventory", () => {
  const p = profile(),
    before = JSON.stringify(p),
    out = previewTransfer(p, pack, id, 3).candidate;
  assert.equal(out.inventory[id], 7);
  assert.equal(out.fieldOps.carried[id], 3);
  assert.equal(JSON.stringify(p), before);
  const back = previewReturnCarried(out, pack).candidate;
  assert.equal(back.inventory[id], 10);
  assert.equal(back.fieldOps.carried[id], 0);
  assert.throws(() => previewTransfer(p, pack, id, 11), /Not enough/);
  assert.throws(
    () => previewTransfer(newProfile(pack), pack, id, 1),
    /entered stock/,
  );
});
test("FO-1/3 absolute scans preserve unseen items, duplicate receipts and invalid batch rows fail atomically", () => {
  const p = profile(),
    fingerprint = "a".repeat(64),
    raw = JSON.stringify(p);
  const next = previewFieldChanges(
    p,
    pack,
    [{ itemId: id, pool: "stash", mode: "set", quantity: 14 }],
    { receipts: [fingerprint] },
  ).candidate;
  assert.equal(next.inventory[id], 14);
  assert.equal(JSON.stringify(p), raw);
  assert.throws(
    () =>
      previewFieldChanges(
        next,
        pack,
        [{ itemId: id, pool: "stash", mode: "set", quantity: 14 }],
        { receipts: [fingerprint] },
      ),
    /already applied/,
  );
  assert.throws(
    () =>
      previewFieldChanges(p, pack, [
        { itemId: id, pool: "stash", mode: "set", quantity: 11 },
        { itemId: "missing:item", pool: "stash", mode: "set", quantity: 2 },
      ]),
    /missing/,
  );
  assert.equal(JSON.stringify(p), raw);
  assert.throws(
    () =>
      previewFieldChanges(newProfile(pack), pack, [
        { itemId: id, pool: "stash", mode: "delta", quantity: -1 },
      ]),
    /unknown stock/,
  );
  assert.throws(
    () =>
      previewFieldChanges(p, pack, [
        { itemId: id, pool: "stash", mode: "set", quantity: 1000001 },
      ]),
    /allowed range/,
  );
});
test("FO-4 quantity journal includes missing versus zero and undo rejects intervening edits", () => {
  const p = profile();
  p.fieldOps = emptyFieldOps();
  const next = previewTransfer(p, pack, id, 2).candidate;
  journalInventory(p, next, { label: "Prepare gear", kind: "transfer" });
  assert.equal(next.fieldOps.history.length, 1);
  assert.equal(
    next.fieldOps.history[0].changes.find((c) => c.pool === "carried").before,
    null,
  );
  const undo = previewFieldUndo(next, pack, next.fieldOps.history[0].id);
  assert.equal(undo.candidate.inventory[id], 10);
  assert.equal(undo.candidate.fieldOps.carried[id], undefined);
  assert.equal(undo.changes.length, 2);
  const changed = structuredClone(next);
  changed.inventory[id] = 7;
  assert.throws(
    () => previewFieldUndo(changed, pack, next.fieldOps.history[0].id),
    /Later edits/,
  );
  journalInventory(next, undo.candidate, { kind: "undo", undoOf: undo.undoOf });
  assert.throws(
    () => previewFieldUndo(undo.candidate, pack, undo.undoOf),
    /already undone/,
  );
});
test("FO-4 old profiles remain unchanged; field metadata survives backups and reset clears compartments/discoveries", () => {
  const p = profile(),
    raw = JSON.stringify(p);
  assert.deepEqual(journalInventory(null, structuredClone(p)), p);
  assert.equal(JSON.stringify(p), raw);
  const next = previewTransfer(p, pack, id, 1).candidate;
  journalInventory(p, next);
  assert.deepEqual(parseProfile(JSON.stringify(next)), next);
  const reset = resetProfile(next, pack);
  assert.deepEqual(reset.fieldOps.carried, {});
  assert.deepEqual(reset.inventory, {});
  const bad = structuredClone(next);
  bad.fieldOps.unknown = true;
  assert.throws(() => validateProfile(bad), /field operations/);
});
test("FO-4 history compacts by total changes, not unbounded snapshots", () => {
  let p = profile();
  p.fieldOps = emptyFieldOps();
  for (let i = 0; i < 80; i++) {
    const next = structuredClone(p);
    next.inventory[id] = i + 20;
    journalInventory(p, next);
    p = next;
  }
  assert.equal(p.fieldOps.history.length, 64);
  validateProfile(p);
});
test("FO-6 discoveries remain private observations; invalid item/location references rejected", () => {
  const p = profile(),
    entry = {
      itemId: id,
      quantity: 2,
      place: "Synthetic warehouse",
      locationId: null,
      container: "Synthetic locker",
      notes: "Player report",
      photoId: null,
    };
  const next = addDiscovery(p, pack, entry);
  assert.equal(next.fieldOps.discoveries.length, 1);
  assert.deepEqual(p, profile());
  assert.throws(
    () => addDiscovery(p, pack, { ...entry, locationId: "missing:place" }),
    /known location/,
  );
  assert.equal(next.inventory[id], 10);
});
test("FO-1 OCR rows require exact identity and valid count; overlapping rows cannot silently sum", () => {
  const rows = matchScanText("Bandage 12\nMysterious doodad 4\nBandage", pack);
  assert.equal(rows[0].itemId, id);
  assert.equal(rows[0].quantity, 12);
  assert.equal(rows[1].itemId, "");
  assert.equal(rows[2].quantity, null);
  assert.throws(
    () =>
      combineScanRows([
        { ...rows[0], selected: true },
        { ...rows[0], selected: true },
      ]),
    /more than once/,
  );
  assert.throws(
    () => combineScanRows([{ ...rows[1], selected: true }]),
    /Map every/,
  );
  assert.equal(
    combineScanRows([{ ...rows[0], selected: true }])[0].mode,
    "set",
  );
});
test("FO-5 collection plan has bounded explicit schema and no credentials/coordinates", () => {
  const plan = {
    kind: "dmz-collection-plan",
    version: 1,
    packId: pack.id,
    contentVersion: pack.contentVersion,
    createdAt: new Date().toISOString(),
    scope: "unfinished",
    items: [
      {
        itemId: id,
        name: "Bandage",
        needed: 4,
        minimum: false,
        areas: [{ id: "mw4:chang-san-air-base", name: "Chang-san Air Base" }],
      },
    ],
  };
  validateCollectionHandoff(plan);
  assert.throws(
    () => validateCollectionHandoff({ ...plan, token: "secret" }),
    /identity/,
  );
  assert.throws(
    () =>
      validateCollectionHandoff({
        ...plan,
        items: [{ ...plan.items[0], needed: -1 }],
      }),
    /item/,
  );
});

test("FO-3 ordered run reports combine repeated item/pool rows once", () => {
  const p = profile(),
    next = previewRunChanges(p, pack, [
      { itemId: id, pool: "stash", mode: "delta", quantity: 4 },
      { itemId: id, pool: "stash", mode: "delta", quantity: -1 },
    ]);
  assert.equal(next.candidate.inventory[id], 13);
  assert.equal(next.changes.length, 1);
  assert.equal(next.changes[0].before, 10);
  assert.equal(next.changes[0].after, 13);
});
import { quickCollect } from "../../src/domain/quick-collect.mjs";
import { upgradeBudget } from "../../src/domain/upgrade-budget.mjs";

test("FO-2 carried counts never satisfy existing mission/upgrade collection forecasts", () => {
  const base = profile();
  const withCarried = fieldCandidate(base, pack);
  withCarried.fieldOps.carried["mw4:ingredient-control-unit"] = 999;
  const original = quickCollect(pack, base, { crafting: true });
  assert.equal(original.status, "ok");
  assert(
    original.items.some(
      (row) => row.id === "mw4:ingredient-control-unit" && row.remaining > 0,
    ),
  );
  assert.deepEqual(
    quickCollect(pack, withCarried, { crafting: true }),
    original,
  );
  assert.deepEqual(upgradeBudget(pack, withCarried), upgradeBudget(pack, base));
});
