import test from "node:test";
import assert from "node:assert/strict";
import { reconcileFindings } from "../../scripts/content-verification.mjs";
const row = (id, field = "picture") => ({
  id,
  binding: "a".repeat(64),
  packId: "synthetic:public",
  recordId: id,
  kind: "item",
  title: "Synthetic " + id,
  field,
  message: "Synthetic gap",
  readerURL: "/items/" + id + "/",
  editorURL: "/local-services/author/?id=" + id,
});
const report = (findings) => ({
  format: "dmz-content-audit",
  version: 1,
  eligibleGaps: findings.length,
  indexedGaps: findings.length,
  limited: false,
  findings,
});
const proof = (r, kind = "factual-correction") => ({
  id: r.id,
  binding: r.binding,
  kind,
  evidence: "content/synthetic.json",
  reason: "SYNTHETIC source-supported correction.",
});
test("112 every baseline finding has one exact disposition; new/still-unknown facts stay open", () => {
  const before = report([row("a"), row("b"), row("c", "description")]);
  const after = report([{ ...row("b"), binding: "b".repeat(64) }, row("d")]);
  const original = JSON.stringify([before, after]);
  const result = reconcileFindings(before, after, [
    proof(before.findings[0]),
    proof(before.findings[2], "classification-correction"),
  ]);
  assert.deepEqual(result.counts, {
    baseline: 3,
    factualCorrections: 1,
    classificationCorrections: 1,
    outstandingBaseline: 1,
    newFindings: 1,
    current: 2,
  });
  assert.deepEqual(
    result.baseline.map((r) => r.disposition),
    ["factual-correction", "unresolved-source", "classification-correction"],
  );
  assert.equal(result.baseline[1].changedEvidence, true);
  assert.match(result.baseline[1].reason, /missing|unverified|unrecorded/i);
  assert.equal(result.newFindings[0].id, "d");
  assert.equal(JSON.stringify([before, after]), original);
});
test("112 reconciliation refuses disappearing, stale, duplicate, limited or unrelated evidence", () => {
  const a = row("a"),
    before = report([a]),
    after = report([]);
  for (const evidence of [
    [],
    [proof({ ...a, binding: "b".repeat(64) })],
    [proof(a), proof(a)],
    [proof(row("other"))],
    [{ ...proof(a), kind: "checked" }],
  ]) {
    assert.throws(() => reconcileFindings(before, after, evidence));
  }
  assert.throws(() => reconcileFindings(before, before, [proof(a)]));
  assert.throws(() =>
    reconcileFindings({ ...before, limited: true, eligibleGaps: 2 }, after, [
      proof(a),
    ]),
  );
  assert.throws(() => reconcileFindings(report([a, a]), after, [proof(a)]));
});
