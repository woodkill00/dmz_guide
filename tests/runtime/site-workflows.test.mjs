import test from "node:test";
import assert from "node:assert/strict";
import {
  siteTopics,
  taskWorkflows,
  mapWorkflows,
  workflowLink,
  workspacePreferences,
} from "../../src/domain/site-workflows.mjs";
import { features } from "../../src/ui/feature-registry.mjs";
import {
  validateSaveReceipt,
  receiptAdmission,
} from "../../src/domain/save-receipt.mjs";
import {
  publishSaveReceipt,
  subscribeSaveReceipts,
} from "../../src/storage/save-events.mjs";
import { previewSavedWorkspace } from "../../src/storage/workspace-preview.mjs";
import { newProfile } from "../../src/domain/profile.mjs";
import { emptyArmory } from "../../src/domain/armory-workspace.mjs";
import { loadFixturePack } from "../helpers/catalog.mjs";

test("FR01/02/10/14 all14 help topics and task/map links resolve exact registry owners", () => {
  assert.equal(siteTopics.length, 14);
  assert.equal(new Set(siteTopics.map((t) => t.id)).size, 14);
  for (const [id, , hash] of [
    ...siteTopics.flatMap((t) => t.links),
    ...taskWorkflows,
    ...mapWorkflows.map((id) => [id]),
  ]) {
    assert.ok(features.some((f) => f.id === id));
    assert.ok(workflowLink(id, hash).startsWith("/"));
  }
  assert.equal(workflowLink("quality"), "/quality/");
  assert.equal(workflowLink("data-review"), "/data-review/");
  assert.throws(() => workflowLink("forged-tool"));
});
test("FR05 receipt admission rejects extra/private/unsafe/stale/future values and duplicate/older revisions", () => {
  const now = Date.now(),
    r = {
      version: 1,
      owner: "profile",
      key: "official:mw4-dmz-starter",
      revision: 2,
      savedAt: new Date(now).toISOString(),
    };
  assert.deepEqual(validateSaveReceipt(r, now), r);
  for (const bad of [
    { ...r, quantity: 7 },
    { ...r, owner: "unknown" },
    { ...r, key: "a".repeat(101) },
    { ...r, revision: 1.5 },
    { ...r, revision: 0 },
    { ...r, revision: Number.MAX_SAFE_INTEGER + 1 },
    { ...r, savedAt: new Date(now + 300001).toISOString() },
    { ...r, savedAt: new Date(now - 31 * 86400000).toISOString() },
    { ...r, owner: "armory", key: "foreign" },
  ])
    assert.throws(() => validateSaveReceipt(bad, now));
  const admit = receiptAdmission();
  assert.ok(admit(r));
  assert.equal(admit(r), null);
  assert.equal(admit({ ...r, revision: 1 }), null);
  assert.ok(admit({ ...r, revision: 3 }));
});
test("FR05 publisher/subscriber send metadata only and notification failures cannot throw", () => {
  const old = {
    window: globalThis.window,
    localStorage: globalThis.localStorage,
    BroadcastChannel: globalThis.BroadcastChannel,
  };
  const sent = [],
    received = [];
  try {
    globalThis.window = new EventTarget();
    globalThis.localStorage = {
      setItem() {
        throw Error("denied");
      },
    };
    globalThis.BroadcastChannel = class {
      postMessage(r) {
        sent.push(r);
      }
      close() {}
    };
    const stop = subscribeSaveReceipts((r, remote) =>
      received.push({ r, remote }),
    );
    assert.doesNotThrow(() => publishSaveReceipt("profile", "test:profile", 1));
    assert.equal(received.length, 1);
    assert.equal(sent.length, 1);
    assert.equal(received[0].remote, false);
    assert.deepEqual(Object.keys(sent[0]).sort(), [
      "key",
      "owner",
      "revision",
      "savedAt",
      "version",
    ]);
    assert.doesNotThrow(() => publishSaveReceipt("armory", "bad-key", 2));
    assert.equal(sent.length, 1);
    stop();
  } finally {
    for (const [key, value] of Object.entries(old))
      if (value === undefined) delete globalThis[key];
      else globalThis[key] = value;
  }
});
test("FR06 exact UI preferences are bounded and preserve only known topic IDs", () => {
  const valid = {
    version: 1,
    density: "compact",
    topics: ["recovery", "maps"],
  };
  assert.deepEqual(workspacePreferences(JSON.stringify(valid)), valid);
  for (const value of [
    { ...valid, topics: ["forged"] },
    { ...valid, topics: ["maps", "maps"] },
    { ...valid, extra: true },
    { ...valid, density: "tiny" },
  ])
    assert.equal(
      workspacePreferences(JSON.stringify(value)).density,
      "comfortable",
    );
  assert.equal(workspacePreferences("{".repeat(3000)).density, "comfortable");
});
test("FR04 saved snapshot preview validates7b guide+armory without writes and exposes omissions", async () => {
  const pack = loadFixturePack("official-starter"),
    profile = newProfile({ ...pack, schemaVersion: 2 });
  profile.inventory["mw4:dmz-cash"] = 7000000000;
  profile.revision = 2;
  const previous = structuredClone(profile);
  previous.revision = 1;
  previous.inventory["mw4:dmz-cash"] = 6209662;
  const armory = emptyArmory();
  armory.revision = 1;
  const reads = [];
  const read = async (db, store, key) => {
    reads.push({ db, store, key });
    return db === "dmz-guide-local"
      ? { value: profile, previous }
      : { value: armory, previous: null };
  };
  const result = await previewSavedWorkspace({ packId: pack.id }, read);
  assert.equal(result.bundle.modules.length, 2);
  assert.ok(result.projection.omitted.includes("map"));
  assert.ok(result.projection.omitted.includes("field"));
  assert.equal(
    JSON.parse(result.bundle.modules.find((m) => m.id === "profile").text)
      .inventory["mw4:dmz-cash"],
    7000000000,
  );
  const prior = await previewSavedWorkspace(
    { packId: pack.id, previous: true },
    read,
  );
  assert.equal(prior.bundle.modules.length, 1);
  assert.equal(JSON.parse(prior.bundle.modules[0].text).revision, 1);
  assert.equal(profile.revision, 2);
  assert.ok(reads.every((r) => ["profiles", "workspace"].includes(r.store)));
  await assert.rejects(
    previewSavedWorkspace({ packId: pack.id }, async () => undefined),
    /No saved records/,
  );
  await assert.rejects(
    previewSavedWorkspace({ packId: pack.id }, async () => ({
      value: { bad: true },
    })),
  );
  await assert.rejects(previewSavedWorkspace({ packId: "bad/identity" }, read));
});

test("FR04 present corrupt profile cannot be hidden in a mixed valid armory preview", async () => {
  const pack = loadFixturePack("official-starter"),
    armory = emptyArmory();
  for (const value of [null, false, 0, undefined]) {
    await assert.rejects(
      previewSavedWorkspace({ packId: pack.id }, async (db) =>
        db === "dmz-guide-local"
          ? { value, previous: null }
          : { value: armory, previous: null },
      ),
    );
  }
});
