import { renderAccessDetails } from "../../src/ui/key-access-view.mjs";
import test from "node:test";
import assert from "node:assert/strict";
import {
  allKeys,
  keyAccess,
  keyUseId,
  validateKeyAccess,
  validateSupplemental,
  requiredKeyChain,
  requiredBy,
  KEY_ACCESS_SOURCES,
} from "../../src/content/key-access.mjs";
import supplemental from "../../src/ui/key-supplemental.json" with { type: "json" };
import { featurePages } from "../../src/ui/keys-page.mjs";
const fixture = () => structuredClone(keyAccess);
const report = {
  url: KEY_ACCESS_SOURCES[1],
  label: "Synthetic edge fixture; not a game fact",
  date: "2026-11-02",
};
const edge = (u, target, possible = false) =>
  Object.assign(u, {
    requiredUses: possible ? [] : [target.id],
    possibleUses: possible ? [target.id] : [],
    status: possible ? "unconfirmed-identity" : "community-reported",
    sources: [{ ...report }],
  });
test("055 twenty unique keys cover exactly twenty-five uses in fifteen authored location groups", () => {
  assert.equal(allKeys.length, 20);
  assert.equal(keyAccess.uses.length, 25);
  assert.equal(keyAccess.groups.length, 15);
  for (const k of allKeys)
    for (const l of k.locations)
      assert.equal(
        keyAccess.uses.filter((u) => u.id === keyUseId(k, l)).length,
        1,
      );
  assert.equal(
    keyAccess.uses.filter((u) => u.keyId === "police-station-armory").length,
    4,
  );
  const pages = featurePages();
  assert.equal(pages.length, 21);
  const html = pages[0].body;
  assert.equal((html.match(/data-key-group=/g) || []).length, 15);
  assert.equal((html.match(/data-key-row /g) || []).length, 25);
  assert(html.includes("Access keys needed first"));
  assert(html.includes("Not recorded"));
});
test("055 exact-use prerequisite chains order ancestors first and reverse only required edges", () => {
  const v = fixture(),
    [a, b, c] = v.uses;
  edge(a, b);
  edge(b, c);
  validateKeyAccess(v, allKeys);
  assert.deepEqual(
    requiredKeyChain(a, v.uses).map((u) => u.id),
    [c.id, b.id, a.id],
  );
  assert.deepEqual(
    requiredBy(c.id, v.uses).map((u) => u.id),
    [b.id],
  );
  // A different use of a multi-location key must retain its own scope.
  const police = v.uses.filter((u) => u.keyId === "police-station-armory");
  edge(police[0], c);
  validateKeyAccess(v, allKeys);
  assert.deepEqual(
    requiredKeyChain(police[1], v.uses).map((u) => u.id),
    [police[1].id],
  );
});
test("055 synthetic unconfirmed hospital identity never becomes a required chain or reverse prerequisite", () => {
  const possible = fixture();
  const lab = possible.uses.find((u) => u.keyId === "hospital-chemical-lab"),
    locker = possible.uses.find((u) => u.keyId === "hospital-chemical-lockers");
  delete locker.ownerReport;
  edge(locker, lab, true);
  validateKeyAccess(possible, allKeys);
  assert.equal(locker.status, "unconfirmed-identity");
  assert.deepEqual(locker.requiredUses, []);
  assert.deepEqual(locker.possibleUses, [lab.id]);
  assert.deepEqual(
    requiredKeyChain(locker, possible.uses).map((u) => u.id),
    [locker.id],
  );
  assert.deepEqual(requiredBy(lab.id, possible.uses), []);
  const html = renderAccessDetails(
    allKeys.find((k) => k.id === "hospital-chemical-lockers"),
    possible,
  );
  assert(html.includes("Possible access key"));
  assert(html.includes("identity unconfirmed"));
  assert(!html.includes('class="key-access-chain"'));
  assert(html.includes("identity unconfirmed"));
  const v = fixture(),
    [a, b, c] = v.uses;
  edge(a, b, true);
  edge(b, c);
  validateKeyAccess(v, allKeys);
  assert.deepEqual(
    requiredKeyChain(a, v.uses).map((u) => u.id),
    [a.id],
  );
});
test("055 graph refuses cycles, dangling/self/same-key edges, duplicates and missing or moved use bindings", () => {
  for (const alter of [
    (v) => edge(v.uses[0], { id: "missing" }),
    (v) => edge(v.uses[0], v.uses[0]),
    (v) => {
      edge(v.uses[0], v.uses[1]);
      edge(v.uses[1], v.uses[0], true);
    },
    (v) => {
      edge(v.uses[0], v.uses[1]);
      v.uses[0].requiredUses.push(v.uses[1].id);
    },
    (v) => v.uses.pop(),
    (v) => v.uses.push(v.uses[0]),
    (v) => (v.uses[0].grid = "J9"),
    (v) => (v.uses[0].groupId = "missing"),
    (v) => {
      const p = v.uses.filter((u) => u.keyId === "police-station-armory");
      edge(p[0], p[1]);
    },
  ]) {
    const v = fixture();
    alter(v);
    assert.throws(() => validateKeyAccess(v, allKeys));
  }
});
test("055 source/status validation fails closed for unknown or misleading relationship claims", () => {
  for (const alter of [
    (v) => (v.uses[0].status = "verified"),
    (v) => {
      edge(v.uses[0], v.uses[1]);
      v.uses[0].sources = [];
    },
    (v) => {
      edge(v.uses[0], v.uses[1]);
      v.uses[0].status = "unknown";
    },
    (v) => {
      edge(v.uses[0], v.uses[1], true);
      v.uses[0].status = "community-reported";
    },
    (v) => {
      edge(v.uses[0], v.uses[1]);
      v.uses[0].sources[0].url = "javascript:alert(1)";
    },
    (v) => (v.uses[0].note = "x".repeat(401)),
  ]) {
    const v = fixture();
    alter(v);
    assert.throws(() => validateKeyAccess(v, allKeys));
  }
});
test("055 supplemental records preserve independent provenance and reject duplicate base identities", () => {
  assert.equal(validateSupplemental(supplemental).keys.length, 2);
  for (const alter of [
    (v) => (v.keys[0].id = "mirae-electrical-room"),
    (v) => (v.keys[0].sources = []),
    (v) => (v.keys[0].sources[0].url = "https://unapproved.invalid"),
    (v) => (v.keys[0].locations = []),
    (v) => (v.checkedAt = "2026-02-30"),
    (v) => (v.keys[0].status = "verified"),
  ]) {
    const v = structuredClone(supplemental);
    alter(v);
    assert.throws(() => validateSupplemental(v));
  }
});

test("056 player report establishes only the named hospital chain and preserves separate website context", () => {
  const lab = keyAccess.uses.find((u) => u.keyId === "hospital-chemical-lab"),
    locker = keyAccess.uses.find(
      (u) => u.keyId === "hospital-chemical-lockers",
    );
  assert.equal(locker.status, "player-reported");
  assert.equal(locker.ownerReport.date, "2026-11-02");
  assert.deepEqual(locker.possibleUses, []);
  assert.deepEqual(
    requiredKeyChain(locker, keyAccess.uses).map((u) => u.id),
    [lab.id, locker.id],
  );
  assert.deepEqual(
    requiredBy(lab.id, keyAccess.uses).map((u) => u.id),
    [locker.id],
  );
  const html = renderAccessDetails(allKeys.find((k) => k.id === locker.keyId));
  assert(html.includes("Bring first · player-reported"));
  assert(html.includes("Player report · 2026-11-02"));
  assert(html.includes("Website context:"));
  assert(!html.includes("Possible access key"));
  const independent = fixture();
  independent.uses.find((u) => u.id === locker.id).sources = [];
  validateKeyAccess(independent, allKeys);
});
test("056 player provenance is required, bounded, calendar-valid, status-bound and escaped", () => {
  for (const alter of [
    (u) => delete u.ownerReport,
    (u) => (u.ownerReport.date = "2026-02-30"),
    (u) => (u.ownerReport.statement = ""),
    (u) => (u.ownerReport.statement = "x".repeat(401)),
    (u) => (u.ownerReport.url = "https://example.invalid"),
    (u) => (u.status = "community-reported"),
  ]) {
    const v = fixture();
    alter(v.uses.find((u) => u.status === "player-reported"));
    assert.throws(() => validateKeyAccess(v, allKeys));
  }
  const v = fixture();
  v.uses.find((u) => u.status === "player-reported").ownerReport.statement =
    '<script>alert("fixture")</script>';
  validateKeyAccess(v, allKeys);
  const html = renderAccessDetails(
    allKeys.find((k) => k.id === "hospital-chemical-lockers"),
    v,
  );
  assert(html.includes("&lt;script&gt;"));
  assert(!html.includes("<script>"));
});
