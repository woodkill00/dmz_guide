import test from "node:test";
import assert from "node:assert/strict";
import {
  newProfile,
  validateProfile,
  previewUpgradeMigration,
} from "../../src/domain/profile.mjs";
import { upgradeFixture } from "../helpers/upgrades.mjs";
test("migration preview preserves ambiguous unlocked and missing inventory without mutation", () => {
  const p = upgradeFixture();
  const before = { ...newProfile(p), schemaVersion: 1 };
  delete before.upgradeProgress;
  delete before.watchPins;
  before.completion = {
    "test:first": "unlocked",
    "test:second": "completed",
    "old:unresolved": "locked",
  };
  const original = structuredClone(before),
    result = previewUpgradeMigration(before, p);
  assert.deepEqual(before, original);
  assert.equal(result.candidate.schemaVersion, 2);
  assert.deepEqual(result.candidate.upgradeProgress["test:first"], {
    completion: "unknown",
    availability: "unknown",
    reviewRequired: true,
    legacyState: "unlocked",
  });
  assert.equal(
    result.candidate.upgradeProgress["test:second"].completion,
    "completed",
  );
  assert.deepEqual(result.candidate.completion, { "old:unresolved": "locked" });
  assert.deepEqual(
    previewUpgradeMigration(result.candidate, p).candidate,
    result.candidate,
  );
  validateProfile(result.candidate);
});
test("strict v2 values, byte bounds, pins and missing/zero roundtrip", () => {
  const pack = upgradeFixture(),
    p = newProfile(pack);
  p.inventory[pack.items[0].id] = 0;
  p.watchPins = [pack.items[0].id];
  validateProfile(p);
  for (const mutate of [
    (q) => q.watchPins.push(q.watchPins[0]),
    (q) =>
      (q.upgradeProgress["test:first"] = {
        completion: "unlocked",
        availability: "available",
        reviewRequired: false,
      }),
    (q) =>
      (q.upgradeProgress["test:first"] = {
        completion: "unknown",
        availability: "unknown",
        reviewRequired: "yes",
      }),
    (q) => (q.inventory[pack.items[0].id] = 0.5),
  ]) {
    const q = structuredClone(p);
    mutate(q);
    assert.throws(() => validateProfile(q));
  }
  const large = newProfile(pack);
  for (let i = 0; i < 9999; i++)
    large.inventory[`test:${String(i).padStart(95, "0")}`] = 1000000;
  assert.throws(() => validateProfile(large), /byte/);
});
test("content rebind flags changed evidence without revoking history or inferring new tiers", async () => {
  const { previewContentRebind } = await import(
    "../../src/domain/profile-preview.mjs"
  );
  const old = upgradeFixture(),
    p = newProfile(old);
  p.upgradeProgress["test:first"] = {
    completion: "completed",
    availability: "available",
    reviewRequired: false,
  };
  p.watchPins = [old.items[0].id];
  const next = structuredClone(old);
  next.contentVersion = "changed";
  next.objectives[0].requirements[0].quantity = 9;
  const r = previewContentRebind(p, next, old);
  assert.equal(
    r.candidate.upgradeProgress["test:first"].completion,
    "completed",
  );
  assert(r.candidate.upgradeProgress["test:first"].reviewRequired);
  assert.equal(r.candidate.upgradeProgress["test:second"], undefined);
  assert.deepEqual(r.candidate.watchPins, p.watchPins);
  assert.equal(p.contentVersion, old.contentVersion);
});
test("same source ID with changed provenance flags historical completion for review", async () => {
  const { previewContentRebind } = await import(
    "../../src/domain/profile-preview.mjs"
  );
  const before = upgradeFixture(),
    profile = newProfile(before);
  profile.upgradeProgress["test:first"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  const next = structuredClone(before);
  next.contentVersion = "new";
  next.sources[0].provenance.buildStatus = "unknown";
  const r = previewContentRebind(profile, next, before);
  assert(r.changed.includes("test:first"));
  assert.equal(
    r.candidate.upgradeProgress["test:first"].completion,
    "completed",
  );
});
test("all four archival legacy states map explicitly; v2 remains idempotent and unresolved IDs survive", () => {
  for (const [legacy, completion, availability, reviewRequired] of [
    ["unknown", "unknown", "unknown", false],
    ["locked", "unknown", "locked", false],
    ["unlocked", "unknown", "unknown", true],
    ["completed", "completed", "unknown", false],
  ]) {
    const pack = upgradeFixture(),
      profile = { ...newProfile(pack), schemaVersion: 1 };
    delete profile.upgradeProgress;
    delete profile.watchPins;
    profile.completion = { "test:first": legacy, "retired:keep": "unlocked" };
    const result = previewUpgradeMigration(profile, pack);
    assert.deepEqual(result.candidate.upgradeProgress["test:first"], {
      completion,
      availability,
      reviewRequired,
      legacyState: legacy,
    });
    assert.equal(result.candidate.completion["retired:keep"], "unlocked");
    assert.equal(profile.schemaVersion, 1);
    assert.deepEqual(
      previewUpgradeMigration(result.candidate, pack).candidate,
      result.candidate,
    );
  }
});
test("requirement-only source changes retain completion and require rebind review", async () => {
  const { previewContentRebind } = await import(
    "../../src/domain/profile-preview.mjs"
  );
  const before = upgradeFixture(),
    profile = newProfile(before);
  const source = structuredClone(before.sources[0]);
  source.id = "test:requirement-source";
  before.sources.push(source);
  before.objectives[0].requirements[0].sourceIds = [source.id];
  profile.upgradeProgress["test:first"] = {
    completion: "completed",
    availability: "unknown",
    reviewRequired: false,
  };
  const next = structuredClone(before);
  next.contentVersion = "new";
  next.sources.at(-1).provenance.buildStatus = "unknown";
  const result = previewContentRebind(profile, next, before);
  assert(result.changed.includes("test:first"));
  assert.equal(
    result.candidate.upgradeProgress["test:first"].completion,
    "completed",
  );
  assert.equal(
    result.candidate.upgradeProgress["test:first"].reviewRequired,
    true,
  );
  assert.equal(profile.upgradeProgress["test:first"].reviewRequired, false);
});
