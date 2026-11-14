import test from "node:test";
import assert from "node:assert/strict";
import {
  emptySourceReviewLog,
  recordSourceDecision,
  validateSourceReviewLog,
  verifySourceDecisions,
} from "../../src/domain/source-review-log.mjs";

const entry = {
  claimId: "claim:damage",
  candidateDigest: "a".repeat(64),
  decision: "opened-studio",
  at: "2026-11-14T03:00:00.000Z",
  citation: "https://example.org/patch",
  sourceDate: "2026-11-14",
  currentBuild: "build.1",
  candidateBuild: "build.2",
  proposed: JSON.stringify({ value: 25, status: "observed" }),
  verifiedAt: null,
};

test("source decision is scoped to candidate digest and verifies only after current catalog matches", () => {
  const log = recordSourceDecision(emptySourceReviewLog("test:pack"), entry);
  assert.equal(log.entries.length, 1);
  assert.equal(
    recordSourceDecision(log, { ...entry, decision: "rejected" }).entries
      .length,
    1,
  );
  assert.equal(
    verifySourceDecisions(log, {
      id: "test:pack",
      claims: [{ id: "claim:damage", value: 20, status: "observed" }],
    }).changed,
    false,
  );
  const verified = verifySourceDecisions(log, {
    id: "test:pack",
    claims: [{ id: "claim:damage", value: 25, status: "observed" }],
  });
  assert.equal(verified.changed, true);
  assert.equal(verified.log.entries[0].decision, "verified-in-catalog");
  assert.throws(() => validateSourceReviewLog(log, "other:pack"), /Invalid/);
  assert.throws(
    () => recordSourceDecision(log, { ...entry, candidateDigest: "bad" }),
    /Invalid/,
  );
});
