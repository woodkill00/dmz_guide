import test from "node:test";
import assert from "node:assert/strict";
import { newProfile } from "../../src/domain/profile.mjs";
import { profileChangeSummary } from "../../src/domain/profile-preview.mjs";
const pack = {
  id: "demo:pack",
  title: "Training catalog",
  contentVersion: "1",
  items: [{ id: "demo:wire", name: "Training Wire" }],
  recipes: [{ id: "demo:recipe", name: "Training Tool" }],
  objectives: [{ id: "demo:secret", name: "Secret Objective", spoiler: true }],
  guides: [],
  maps: [],
  locations: [],
};
test("C4: spoiler-only replacement explicitly reports preference", () => {
  const before = newProfile(pack),
    after = { ...before, spoilers: true };
  const summary = profileChangeSummary(before, after, pack);
  assert.equal(
    summary.sections.find((s) => s.title === "Spoiler preference").changes
      .length,
    1,
  );
  assert.equal(summary.sections.filter((s) => s.changes.length).length, 1);
  assert.deepEqual(before, newProfile(pack));
});
test("C4: full replacement includes named quantities, reserve, progress, goal order and routes", () => {
  const before = newProfile(pack),
    after = structuredClone(before);
  after.inventory["demo:wire"] = 7;
  after.reserves["demo:wire"] = 2;
  after.completion["demo:secret"] = "completed";
  after.goals = [{ id: "demo:recipe", quantity: 3 }];
  after.routes["demo:wire"] = "demo:recipe";
  after.contentVersion = "legacy";
  const summary = profileChangeSummary(before, after, pack);
  for (const title of [
    "Inventory",
    "Protected reserves",
    "Progress",
    "Goals in priority order",
    "Crafting routes",
    "Catalog and version",
  ])
    assert(
      summary.sections.find((s) => s.title === title).changes.length,
      title,
    );
  const text = JSON.stringify(summary);
  assert.match(text, /Training Wire/);
  assert.match(text, /Training Tool/);
  assert(!text.includes("demo:secret"));
  assert(!text.includes("Secret Objective"));
  assert.equal(summary.unresolvedCount, 0);
});
test("C4: all unknown keys/versions and hidden references stay out of safe advanced projection", () => {
  const before = newProfile(pack),
    after = structuredClone(before);
  after.inventory["unknown:spoiler-string"] = 8;
  after.contentVersion = "Secret Objective";
  after.goals = [{ id: "demo:secret", quantity: 1 }];
  after.spoilers = true;
  const text = JSON.stringify(profileChangeSummary(before, after, pack));
  for (const secret of [
    "unknown:spoiler-string",
    "Secret Objective",
    "demo:secret",
  ])
    assert(!text.includes(secret), secret);
  assert.match(text, /Unresolved/);
});
test("C4: identical profile has no false changes; known hostile labels remain strings", () => {
  const before = newProfile(pack);
  assert(
    profileChangeSummary(before, structuredClone(before), pack).sections.every(
      (s) => !s.changes.length,
    ),
  );
  const malicious = {
    ...pack,
    items: [{ id: "demo:wire", name: "<img src=x onerror=alert(1)>" }],
  };
  const after = structuredClone(before);
  after.inventory["demo:wire"] = 1;
  const summary = profileChangeSummary(before, after, malicious);
  assert.equal(
    summary.sections.find((s) => s.title === "Inventory").changes[0].label,
    malicious.items[0].name,
  );
});
test("C4: current explicit reveal permits distinct inert historical versions", () => {
  const before = {
    ...newProfile(pack),
    contentVersion: "old-1",
    spoilers: true,
  };
  const after = { ...before, contentVersion: "old-2" };
  const summary = profileChangeSummary(before, after, pack);
  assert.equal(summary.currentVersion, "old-1");
  assert.equal(summary.proposedVersion, "old-2");
  const hidden = profileChangeSummary(
    { ...before, spoilers: false },
    after,
    pack,
  );
  assert(!JSON.stringify(hidden).includes("old-1"));
  assert(!JSON.stringify(hidden).includes("old-2"));
});

test("B10 migration/rebind counts never disclose protected or unresolved references", async () => {
  const { safeReferenceCount } = await import(
    "../../src/domain/profile-preview.mjs"
  );
  assert.equal(safeReferenceCount(["demo:secret"], pack, false), null);
  assert.equal(safeReferenceCount(["retired:unknown"], pack, false), null);
  assert.equal(safeReferenceCount(["demo:secret"], pack, true), 1);
  const previous = {
    ...pack,
    objectives: [{ id: "retired:known", name: "Known previous upgrade" }],
  };
  assert.equal(safeReferenceCount(["retired:known"], pack, false, previous), 1);
  assert.equal(safeReferenceCount([], pack, false), 0);
});

test("B10 unchanged unresolved private references do not expose counts", () => {
  const profile = newProfile(pack);
  profile.inventory["old:unresolved"] = 42;
  const summary = profileChangeSummary(profile, profile, pack);
  assert.equal(
    summary.unresolvedCount,
    "Withheld while private details are protected",
  );
  assert(!JSON.stringify(summary).includes("42"));
  assert.equal(
    profileChangeSummary(
      { ...profile, spoilers: true },
      { ...profile, spoilers: true },
      pack,
    ).unresolvedCount,
    1,
  );
});
